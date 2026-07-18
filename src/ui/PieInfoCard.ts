import Phaser from 'phaser';
import type { PieType } from '../types/game';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../game/constants';
import { withEmojiPadding } from '../utils/text';

const CARD_W = 660;
const CARD_H = 470;
const DIM_DEPTH = 8000;

/**
 * Main-menu pie info card: a dedicated panel over a dimmed background that
 * explains one pie's power (description includes the pie's emoji).
 *
 * Desktop: opens on icon hover; closes when the pointer leaves the card (unless
 * it moves onto another showcase icon, which swaps the card) or via the X.
 * Touch: opens on icon tap; closes on tap outside the card or on the yellow X.
 */
export class PieInfoCard {
  private dim: Phaser.GameObjects.Rectangle;
  private panel: Phaser.GameObjects.Container;
  private pieImage: Phaser.GameObjects.Image;
  private title: Phaser.GameObjects.Text;
  private desc: Phaser.GameObjects.Text;
  private unlock: Phaser.GameObjects.Text;
  private shown = false;

  constructor(
    private scene: Phaser.Scene,
    /** Returns the pie whose showcase icon is under (x, y), if any — lets a hover slide between icons. */
    private pieIconAt: (x: number, y: number) => PieType | null,
  ) {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.dim = scene.add
      .rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x0b0d2b, 0.62)
      .setDepth(DIM_DEPTH)
      .setVisible(false);

    const bg = scene.add.graphics();
    bg.fillStyle(0x14123a, 0.97);
    bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 20);
    bg.lineStyle(5, 0xffe08a, 1);
    bg.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 20);

    this.pieImage = scene.add.image(0, -CARD_H / 2 + 130, '__DEFAULT').setScale(2.6);

    this.title = scene.add
      .text(0, -CARD_H / 2 + 250, '', withEmojiPadding({
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '40px',
        color: COLORS.goldHex,
        fontStyle: 'bold',
      }, 40))
      .setOrigin(0.5);

    this.desc = scene.add
      .text(0, -CARD_H / 2 + 330, '', withEmojiPadding({
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '28px',
        color: COLORS.cream,
        align: 'center',
        wordWrap: { width: CARD_W - 90 },
        lineSpacing: 8,
      }, 28))
      .setOrigin(0.5, 0);

    this.unlock = scene.add
      .text(0, CARD_H / 2 - 46, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '24px',
        color: '#9aa0c0',
      })
      .setOrigin(0.5);

    // Yellow X, matching the other gold UI accents.
    const close = scene.add
      .text(CARD_W / 2 - 34, -CARD_H / 2 + 34, '✕', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '38px',
        color: COLORS.goldHex,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    close.on('pointerover', () => close.setScale(1.2));
    close.on('pointerout', () => close.setScale(1));
    close.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      this.hide();
    });

    this.panel = scene.add
      .container(cx, cy, [bg, this.pieImage, this.title, this.desc, this.unlock, close])
      .setDepth(DIM_DEPTH + 10)
      .setVisible(false);

    // Tap/click on the dim (outside the card) closes it.
    this.dim.setInteractive();
    this.dim.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.insideCard(p.x, p.y)) this.hide();
    });

    // Desktop: pointer leaving the card closes it — unless it lands on another icon.
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    });
  }

  get isShown(): boolean {
    return this.shown;
  }

  show(pie: PieType): void {
    this.shown = true;
    this.pieImage.setTexture(pie.assetKey);
    this.title.setText(pie.displayName);
    this.title.setColor(`#${pie.color.toString(16).padStart(6, '0')}`);
    this.desc.setText(`${pie.emoji} ${pie.description}`);
    const extras: string[] = [];
    if (pie.maxUses !== undefined) extras.push(`${pie.maxUses} charges per run`);
    extras.push(pie.unlockWave > 0 ? `Unlocks at Wave ${pie.unlockWave}` : 'Available from the start');
    this.unlock.setText(extras.join('   •   '));
    this.dim.setVisible(true);
    this.panel.setVisible(true).setScale(0.92);
    this.scene.tweens.add({ targets: this.panel, scale: 1, duration: 140, ease: 'Back.easeOut' });
  }

  hide(): void {
    if (!this.shown) return;
    this.shown = false;
    this.dim.setVisible(false);
    this.panel.setVisible(false);
  }

  private insideCard(x: number, y: number): boolean {
    return (
      Math.abs(x - GAME_WIDTH / 2) <= CARD_W / 2 + 14 && Math.abs(y - GAME_HEIGHT / 2) <= CARD_H / 2 + 14
    );
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (!this.shown || pointer.wasTouch) return;
    if (this.insideCard(pointer.x, pointer.y)) return;
    const over = this.pieIconAt(pointer.x, pointer.y);
    if (over) {
      this.show(over); // hovering another showcase icon swaps the card
      return;
    }
    this.hide();
  }
}
