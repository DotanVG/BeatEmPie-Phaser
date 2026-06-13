import Phaser from 'phaser';
import { DEPTHS } from '../game/constants';

/**
 * Pulsing target reticle drawn on the ground before a pie lands, so the player can
 * read where the sky-drop will hit. Can follow a moving target (homing pies).
 */
export class PieWarningMarker {
  private g: Phaser.GameObjects.Graphics;
  private tween: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number, radius: number, color: number) {
    this.g = scene.add.graphics({ x, y }).setDepth(DEPTHS.WARNING);
    this.g.fillStyle(color, 0.16);
    this.g.fillCircle(0, 0, radius);
    this.g.lineStyle(5, color, 0.95);
    this.g.strokeCircle(0, 0, radius);
    this.g.lineStyle(3, color, 0.7);
    this.g.beginPath();
    this.g.moveTo(-radius, 0);
    this.g.lineTo(radius, 0);
    this.g.moveTo(0, -radius);
    this.g.lineTo(0, radius);
    this.g.strokePath();

    this.tween = scene.tweens.add({
      targets: this.g,
      scaleX: { from: 0.85, to: 1.06 },
      scaleY: { from: 0.85, to: 1.06 },
      alpha: { from: 0.65, to: 1 },
      duration: 280,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  setPosition(x: number, y: number): void {
    this.g.setPosition(x, y);
  }

  destroyMarker(): void {
    this.tween.stop();
    this.g.destroy();
  }
}
