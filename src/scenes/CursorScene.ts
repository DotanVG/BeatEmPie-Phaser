import Phaser from 'phaser';
import { TEX } from '../utils/assetKeys';

/**
 * GLOBAL cursor overlay — a tiny always-running scene that keeps itself on top
 * of every other scene, so the game cursor exists on EVERY page automatically:
 * menus, gameplay, pause, game over, victory, and any future scene (settings,
 * etc.) with zero extra wiring. Launched once by PreloadScene.
 *
 * Behaviour:
 * - Only ever shown for mouse pointers (touch never draws a cursor).
 * - Hovering anything clickable (Phaser sets the canvas 'pointer' style for
 *   useHandCursor interactives — detected here) makes the reticle grow, pulse
 *   and slowly spin, so clickables feel reactive.
 * - `hitmarker()` flashes a Call-of-Duty-style X around the cursor on kills
 *   (gold for regular enemies, red + bigger for the boss).
 */
export class CursorScene extends Phaser.Scene {
  private img!: Phaser.GameObjects.Image;
  private baseScale = 1;
  private pulseTween?: Phaser.Tweens.Tween;
  private hovering = false;
  private moved = false;

  constructor() {
    super('CursorScene');
  }

  create(): void {
    this.img = this.add.image(-100, -100, TEX.cursor).setDepth(10_000).setVisible(false);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      if (!p.wasTouch) this.moved = true;
    });
  }

  update(): void {
    this.scene.bringToTop(); // stay above whatever scene just started

    const p = this.input.activePointer;
    if (!this.moved || p.wasTouch) {
      this.img.setVisible(false);
      return;
    }
    this.img.setVisible(true).setPosition(p.x, p.y);

    // Phaser flips the (CSS-hidden) canvas cursor to 'pointer' over any
    // useHandCursor interactive in ANY scene — a zero-coupling hover signal.
    const hover = this.game.canvas.style.cursor === 'pointer';
    if (hover !== this.hovering) {
      this.hovering = hover;
      this.pulseTween?.destroy();
      if (hover) {
        this.tweens.add({ targets: this, baseScale: 1.32, duration: 130, ease: 'Back.easeOut' });
        this.pulseTween = this.tweens.add({
          targets: this,
          baseScale: 1.48,
          duration: 420,
          delay: 130,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      } else {
        this.tweens.add({ targets: this, baseScale: 1, duration: 150, ease: 'Quad.easeOut' });
      }
    }

    if (this.hovering) this.img.angle += 2.4;
    else this.img.angle *= 0.8;

    this.img.setScale(this.baseScale * (p.isDown ? 0.82 : 1));
  }

  /** COD-style hitmarker: only the X's edges (never connected through the middle), red; bigger for the boss. */
  hitmarker(boss = false): void {
    if (!this.img.visible) return;
    const color = 0xff5470;
    const r0 = boss ? 16 : 12;
    const r1 = boss ? 40 : 30;
    const g = this.add.graphics({ x: this.img.x, y: this.img.y }).setDepth(9_999);
    g.lineStyle(boss ? 7 : 5, color, 1);
    g.beginPath();
    for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
      const k = Math.SQRT1_2;
      g.moveTo(dx * r0 * k, dy * r0 * k);
      g.lineTo(dx * r1 * k, dy * r1 * k);
    }
    g.strokePath();
    this.tweens.add({
      targets: g,
      scale: boss ? 1.7 : 1.45,
      alpha: 0,
      duration: boss ? 300 : 220,
      ease: 'Cubic.easeOut',
      onComplete: () => g.destroy(),
    });
  }
}
