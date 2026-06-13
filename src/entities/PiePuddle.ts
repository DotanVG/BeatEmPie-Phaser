import Phaser from 'phaser';
import type { StatusKind } from '../types/game';
import type { Enemy } from './Enemy';
import { DEPTHS } from '../game/constants';
import { TEX } from '../utils/assetKeys';
import { distance } from '../utils/math';

export interface PuddleOptions {
  radius: number;
  lifetimeMs: number;
  color: number;
  tickDamage: number;
  tickRateMs: number;
  pieId: string;
  /** 'chocolateDot' for slowing goo, 'burning' for fire trail. */
  statusKind: StatusKind;
  /** Movement slow applied while inside (chocolate). */
  slowMultiplier?: number;
  /** Lingering burn after leaving the trail (chili). */
  lingerTickDamage?: number;
  lingerMs?: number;
  depth?: number;
}

/**
 * Area-denial hazard left on the ground: Chocolate Pie's slowing puddle or Chili
 * Pie's burning trail segment. Deals authoritative tick damage to enemies inside,
 * and applies a short status for the slow / lingering-burn behaviour + tint.
 */
export class PiePuddle {
  private image: Phaser.GameObjects.Image;
  private age = 0;
  private tickAcc = 0;
  private dead = false;

  constructor(
    private scene: Phaser.Scene,
    public x: number,
    public y: number,
    private opts: PuddleOptions,
  ) {
    const tex = opts.statusKind === 'burning' ? TEX.fireTrail : TEX.puddle;
    this.image = scene.add
      .image(x, y, tex)
      .setDepth(opts.depth ?? DEPTHS.PUDDLE)
      .setTint(opts.color)
      .setAlpha(0.8);
    // Scale the placeholder art so its footprint matches the gameplay radius.
    const baseW = tex === TEX.fireTrail ? 64 : 200;
    this.image.setScale((opts.radius * 2) / baseW);

    scene.tweens.add({
      targets: this.image,
      alpha: { from: 0.55, to: 0.85 },
      duration: 400,
      yoyo: true,
      repeat: -1,
    });
  }

  get isDead(): boolean {
    return this.dead;
  }

  update(deltaMs: number, enemies: Enemy[]): void {
    if (this.dead) return;
    this.age += deltaMs;

    // Fade out over the final stretch of life.
    const remaining = this.opts.lifetimeMs - this.age;
    if (remaining < 800) this.image.setAlpha(Math.max(0, remaining / 800) * 0.85);

    if (this.age >= this.opts.lifetimeMs) {
      this.destroyPuddle();
      return;
    }

    this.tickAcc += deltaMs;
    if (this.tickAcc < this.opts.tickRateMs) return;
    this.tickAcc -= this.opts.tickRateMs;

    for (const enemy of enemies) {
      if (!enemy.isAlive) continue;
      if (distance(this.x, this.y, enemy.x, enemy.y) > this.opts.radius + enemy.def.bodyRadius * 0.5) continue;

      enemy.takeDamage(this.opts.tickDamage, { pieId: this.opts.pieId, sourceStatus: this.opts.statusKind });
      if (!enemy.isAlive) continue;

      if (this.opts.statusKind === 'burning') {
        // Lingering burn that keeps ticking briefly after leaving the trail.
        enemy.applyStatus({
          kind: 'burning',
          durationMs: this.opts.lingerMs ?? 900,
          tickDamage: this.opts.lingerTickDamage ?? Math.round(this.opts.tickDamage * 0.6),
          tickRateMs: this.opts.tickRateMs,
          pieId: this.opts.pieId,
        });
      } else {
        // Chocolate: slow + tint while standing in the goo.
        enemy.applyStatus({
          kind: 'chocolateDot',
          durationMs: 520,
          speedMultiplier: this.opts.slowMultiplier ?? 0.5,
          pieId: this.opts.pieId,
        });
      }
    }
  }

  destroyPuddle(): void {
    if (this.dead) return;
    this.dead = true;
    this.image.destroy();
  }
}
