import Phaser from 'phaser';
import type { PieType } from '../types/game';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../game/constants';
import { withEmojiPadding } from '../utils/text';

const CARD_W = 980;
const CARD_H = 620;
const PAD = 56;
const DIM_DEPTH = 8000;

/**
 * Pie info card: opens on CLICK/TAP of a showcase icon (same interaction on
 * desktop and mobile), over a dimmed background. Closes on click/tap outside
 * the card or on the gold X. Text layout is overflow-safe: the description
 * wraps inside the card and steps its font size down until it fits.
 */
export class PieInfoCard {
  private dim: Phaser.GameObjects.Rectangle;
  private panel: Phaser.GameObjects.Container;
  private pieImage: Phaser.GameObjects.Image;
  private title: Phaser.GameObjects.Text;
  private desc: Phaser.GameObjects.Text;
  private unlock: Phaser.GameObjects.Text;
  private shown = false;

  constructor(private scene: Phaser.Scene) {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.dim = scene.add
      .rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x0b0d2b, 0.62)
      .setDepth(DIM_DEPTH)
      .setVisible(false);

    const bg = scene.add.graphics();
    bg.fillStyle(0x14123a, 0.97);
    bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 24);
    bg.lineStyle(6, 0xffe08a, 1);
    bg.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 24);

    this.pieImage = scene.add.image(0, -CARD_H / 2 + 150, '__DEFAULT').setScale(3.2);

    this.title = scene.add
      .text(0, -CARD_H / 2 + 292, '', withEmojiPadding({
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '48px',
        color: COLORS.goldHex,
        fontStyle: 'bold',
      }, 48))
      .setOrigin(0.5);

    this.desc = scene.add
      .text(0, -CARD_H / 2 + 360, '', withEmojiPadding({
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '34px',
        color: COLORS.cream,
        align: 'center',
        wordWrap: { width: CARD_W - PAD * 2 },
        lineSpacing: 10,
      }, 34))
      .setOrigin(0.5, 0);

    this.unlock = scene.add
      .text(0, CARD_H / 2 - 52, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '26px',
        color: '#9aa0c0',
      })
      .setOrigin(0.5);

    // Gold X, matching the game's other gold accents.
    const close = scene.add
      .text(CARD_W / 2 - 44, -CARD_H / 2 + 44, '✕', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '46px',
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

    // Click/tap on the dim (outside the card) closes it — desktop and mobile alike.
    this.dim.setInteractive();
    this.dim.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.insideCard(p.x, p.y)) this.hide();
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

    // Overflow-safe description: step the font down until the text fits the
    // space between the title block and the unlock footer.
    const maxHeight = CARD_H - 360 /* art + title */ - 90 /* footer */;
    for (const size of [34, 30, 26, 22]) {
      this.desc.setFontSize(size);
      this.desc.setWordWrapWidth(CARD_W - PAD * 2);
      this.desc.setText(`${pie.emoji} ${pie.description}`);
      if (this.desc.height <= maxHeight) break;
    }

    const extras: string[] = [];
    if (pie.maxUses !== undefined) extras.push(`${pie.maxUses} charges per run`);
    extras.push(pie.unlockWave > 0 ? `Unlocks at Wave ${pie.unlockWave}` : 'Available from the start');
    this.unlock.setText(extras.join('   •   '));

    this.dim.setVisible(true);
    this.panel.setVisible(true).setScale(0.9);
    this.scene.tweens.add({ targets: this.panel, scale: 1, duration: 150, ease: 'Back.easeOut' });
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
}
