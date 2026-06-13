import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { DEPTHS, GAME_WIDTH, GAME_HEIGHT } from '../game/constants';
import { GameEvents } from '../game/GameEvents';
import { emojiText } from '../utils/text';

/**
 * On-screen controls for touch devices: a dynamic left-side virtual joystick (movement),
 * DROP / DASH buttons and a prev/next pie toggle on the right. Tapping anywhere else in the
 * playfield drops the selected pie at that point (mirrors a PC mouse click); the DROP button
 * auto-targets the nearest enemy (mirrors Space). Pie selection also works via the bottom slots.
 */
export class TouchControls {
  private moveVec = { x: 0, y: 0 };
  private base: Phaser.GameObjects.Arc;
  private thumb: Phaser.GameObjects.Arc;
  private joyPointerId = -1;
  private readonly radius = 130;
  private enabled = true;
  private buttons: { circle: Phaser.GameObjects.Arc; text: Phaser.GameObjects.Text }[] = [];
  /** Circular keep-out zones (control buttons) where a tap must NOT drop a pie. */
  private controlZones: { x: number; y: number; r: number }[] = [];
  private midEmoji!: Phaser.GameObjects.Text;

  constructor(private scene: GameScene) {
    this.base = scene.add
      .circle(220, GAME_HEIGHT - 230, this.radius, 0xffffff, 0.08)
      .setStrokeStyle(4, 0xffffff, 0.25)
      .setDepth(DEPTHS.UI_TOP)
      .setScrollFactor(0)
      .setVisible(false);
    this.thumb = scene.add
      .circle(220, GAME_HEIGHT - 230, this.radius * 0.45, 0xffe08a, 0.4)
      .setDepth(DEPTHS.UI_TOP)
      .setScrollFactor(0)
      .setVisible(false);

    this.makeButton(GAME_WIDTH - 200, GAME_HEIGHT - 200, 110, '🥧', 0xff6a4d, () => scene.pies.dropAuto());
    this.makeButton(GAME_WIDTH - 200, GAME_HEIGHT - 430, 84, '💨', 0x4f8cff, () => scene.player.tryDash());

    // Prev / next pie toggle above the dash button, with the current pie between the arrows.
    const togY = GAME_HEIGHT - 590;
    this.makeButton(GAME_WIDTH - 320, togY, 46, '↶', 0x6a6fae, () => scene.pies.cyclePie(-1));
    this.makeButton(GAME_WIDTH - 80, togY, 46, '↷', 0x6a6fae, () => scene.pies.cyclePie(1));
    this.midEmoji = emojiText(scene, GAME_WIDTH - 200, togY, scene.pies.selectedPie.emoji, 52)
      .setDepth(DEPTHS.UI_TOP)
      .setScrollFactor(0);
    this.controlZones.push({ x: GAME_WIDTH - 200, y: togY, r: 50 });
    scene.bus.on(GameEvents.PIE_SELECTED, () => this.midEmoji.setText(scene.pies.selectedPie.emoji));

    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
  }

  private makeButton(x: number, y: number, r: number, label: string, color: number, action: () => void): void {
    const btn = this.scene.add
      .circle(x, y, r, color, 0.3)
      .setStrokeStyle(4, color, 0.8)
      .setDepth(DEPTHS.UI_TOP)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    const text = emojiText(this.scene, x, y, label, Math.round(r * 0.8))
      .setDepth(DEPTHS.UI_TOP)
      .setScrollFactor(0);
    btn.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, e: Phaser.Types.Input.EventData) => {
      if (!this.enabled) return;
      e.stopPropagation();
      action();
    });
    this.buttons.push({ circle: btn, text });
    this.controlZones.push({ x, y, r });
  }

  /**
   * Show/hide the on-screen controls. Called when the game pauses (user pause or the
   * landscape gate) so the joystick + buttons can't be touched behind an overlay and the
   * stale move vector is cleared.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.joyPointerId = -1;
    this.moveVec = { x: 0, y: 0 };
    this.base.setVisible(false);
    this.thumb.setVisible(false);
    this.midEmoji.setVisible(enabled);
    for (const { circle, text } of this.buttons) {
      circle.setVisible(enabled);
      text.setVisible(enabled);
      if (enabled) circle.setInteractive({ useHandCursor: true });
      else circle.disableInteractive();
    }
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled) return;

    // Joystick: a touch starting in the lower-left region.
    if (this.joyPointerId < 0 && pointer.x <= GAME_WIDTH * 0.45 && pointer.y >= GAME_HEIGHT * 0.35) {
      this.joyPointerId = pointer.id;
      this.base.setPosition(pointer.x, pointer.y).setVisible(true);
      this.thumb.setPosition(pointer.x, pointer.y).setVisible(true);
      return;
    }

    // A tap on a control button is handled by that button — don't also drop a pie.
    for (const z of this.controlZones) {
      if (Math.hypot(pointer.x - z.x, pointer.y - z.y) <= z.r + 8) return;
    }
    // Leave the bottom selector bar to its own slot taps.
    if (pointer.y >= GAME_HEIGHT - 140) return;
    if (this.scene.isInputLocked) return;

    // Otherwise: tap-to-drop at that point, exactly like a PC left-click.
    this.scene.pies.dropAtScreenPoint(pointer.worldX, pointer.worldY);
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled) return;
    if (pointer.id !== this.joyPointerId) return;
    const dx = pointer.x - this.base.x;
    const dy = pointer.y - this.base.y;
    const len = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(len, this.radius);
    const nx = dx / len;
    const ny = dy / len;
    this.thumb.setPosition(this.base.x + nx * clamped, this.base.y + ny * clamped);
    const mag = clamped / this.radius;
    this.moveVec = { x: nx * mag, y: ny * mag };
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.joyPointerId) return;
    this.joyPointerId = -1;
    this.moveVec = { x: 0, y: 0 };
    this.base.setVisible(false);
    this.thumb.setVisible(false);
  }

  getMove(): { x: number; y: number } {
    return this.moveVec;
  }
}
