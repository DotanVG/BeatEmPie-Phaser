import Phaser from 'phaser';
import type { PieType } from '../types/game';
import type { GameScene } from '../scenes/GameScene';
import type { Enemy } from './Enemy';
import { ARENA, DEPTHS } from '../game/constants';
import { clamp, lerp } from '../utils/math';

/**
 * A single magical pie falling from the sky onto its target. Shows a growing
 * ground shadow + spinning pie, and fires `onImpact(x, y)` the moment it lands.
 * Homing pies track their target and re-acquire if it dies mid-flight.
 */
export class PieDrop {
  private sprite: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;
  private startX: number;
  private startY = ARENA.skySpawnY;
  private tx: number;
  private ty: number;
  private elapsed = 0;
  private duration: number;
  private spin: number;
  private shadowTargetScale: number;
  private homing?: Enemy;
  private done = false;

  constructor(
    private scene: GameScene,
    private pie: PieType,
    targetX: number,
    targetY: number,
    private onImpact: (x: number, y: number) => void,
    homing?: Enemy,
  ) {
    this.tx = targetX;
    this.ty = targetY;
    this.startX = targetX;
    this.homing = homing;
    this.duration = pie.effectType === 'heavy' ? 480 : pie.effectType === 'ultimate' ? 420 : 360;
    this.spin = (Math.random() < 0.5 ? -1 : 1) * 0.012;
    this.shadowTargetScale = clamp(pie.impactRadius / 60, 0.5, 4);

    const scale = pie.effectType === 'heavy' ? 1.7 : pie.effectType === 'ultimate' ? 1.5 : 1.1;

    this.shadow = scene.add
      .image(this.tx, this.ty, 'tex-shadow')
      .setDepth(DEPTHS.SHADOW)
      .setAlpha(0.15)
      .setScale(0.3);

    this.sprite = scene.add
      .image(this.startX, this.startY, pie.assetKey)
      .setDepth(DEPTHS.PIE)
      .setScale(scale);

    scene.audio.playSfx('sfx-pie-fall', 0.5);
  }

  get isDone(): boolean {
    return this.done;
  }

  update(deltaMs: number): void {
    if (this.done) return;

    // Track / re-acquire homing target.
    if (this.homing) {
      if (this.homing.isAlive) {
        this.tx = this.homing.x;
        this.ty = this.homing.y;
      } else {
        const next = this.scene.getNearestEnemy(this.sprite.x, this.ty);
        this.homing = next ?? undefined;
      }
    }

    this.elapsed += deltaMs;
    const t = clamp(this.elapsed / this.duration, 0, 1);
    const easedY = t * t; // ease-in for an accelerating fall

    this.sprite.setPosition(lerp(this.startX, this.tx, t), lerp(this.startY, this.ty, easedY));
    this.sprite.rotation += this.spin * deltaMs;

    this.shadow.setPosition(this.tx, this.ty);
    this.shadow.setScale(lerp(0.3, this.shadowTargetScale, t));
    this.shadow.setAlpha(lerp(0.15, 0.4, t));

    if (t >= 1) this.impact();
  }

  private impact(): void {
    this.done = true;
    const ix = this.tx;
    const iy = this.ty;
    this.sprite.destroy();
    this.shadow.destroy();
    this.onImpact(ix, iy);
  }

  destroyDrop(): void {
    this.done = true;
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
