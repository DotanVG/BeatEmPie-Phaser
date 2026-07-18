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
  private flameNext = 0;

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

    // Chili: actual flames flickering in a random burning sequence along the trail.
    if (this.opts.statusKind === 'burning') {
      this.flameNext -= deltaMs;
      if (this.flameNext <= 0) {
        this.flameNext = Phaser.Math.Between(70, 190);
        this.spawnFlame();
      }
    }

    this.tickAcc += deltaMs;
    if (this.tickAcc < this.opts.tickRateMs) return;
    this.tickAcc -= this.opts.tickRateMs;

    for (const enemy of enemies) {
      if (!enemy.isAlive) continue;
      if (distance(this.x, this.y, enemy.x, enemy.y) > this.opts.radius + enemy.def.bodyRadius * 0.5) continue;

      enemy.takeDamage(this.opts.tickDamage, { pieId: this.opts.pieId, sourceStatus: this.opts.statusKind });
      if (!enemy.isAlive) continue;

      // Chocolate: goo splashes as they wade through it.
      if (this.opts.statusKind !== 'burning') this.spawnWadeSplash(enemy.x, enemy.y);

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
        // Chocolate: slow + tint while inside; the longer duration keeps the
        // goo-drip trail (see Enemy.updateStatusFx) going after they leave.
        enemy.applyStatus({
          kind: 'chocolateDot',
          durationMs: 1100,
          speedMultiplier: this.opts.slowMultiplier ?? 0.5,
          pieId: this.opts.pieId,
        });
      }
    }
  }

  /** One flame tongue at a random spot inside the trail: rises, stretches, fades. */
  private spawnFlame(): void {
    const ang = Math.random() * Math.PI * 2;
    const dist = Math.sqrt(Math.random()) * this.opts.radius * 0.8;
    const flame = this.scene.add
      .image(this.x + Math.cos(ang) * dist, this.y + Math.sin(ang) * dist * 0.5, TEX.fireTrail)
      .setDepth((this.opts.depth ?? DEPTHS.PUDDLE) + 1)
      .setTint(Math.random() < 0.4 ? 0xffd166 : 0xff9a33)
      .setAlpha(0)
      .setScale(Phaser.Math.FloatBetween(0.5, 1.05));
    this.scene.tweens.add({
      targets: flame,
      alpha: { from: 0.9, to: 0 },
      y: flame.y - Phaser.Math.Between(22, 40),
      scaleY: flame.scaleY * 1.6,
      scaleX: flame.scaleX * 0.7,
      duration: Phaser.Math.Between(300, 520),
      ease: 'Quad.easeOut',
      onComplete: () => flame.destroy(),
    });
  }

  /** Chocolate droplets kicked up by an enemy wading through the goo. */
  private spawnWadeSplash(ex: number, ey: number): void {
    for (let i = 0; i < 3; i++) {
      const drop = this.scene.add
        .image(ex + Phaser.Math.Between(-12, 12), ey + Phaser.Math.Between(0, 10), TEX.particle)
        .setDepth((this.opts.depth ?? DEPTHS.PUDDLE) + 1)
        .setTint(this.opts.color)
        .setAlpha(0.85)
        .setScale(Phaser.Math.FloatBetween(0.4, 0.8));
      this.scene.tweens.add({
        targets: drop,
        x: drop.x + Phaser.Math.Between(-26, 26),
        y: drop.y - Phaser.Math.Between(14, 34),
        alpha: 0,
        duration: Phaser.Math.Between(240, 380),
        ease: 'Quad.easeOut',
        onComplete: () => drop.destroy(),
      });
    }
  }

  destroyPuddle(): void {
    if (this.dead) return;
    this.dead = true;
    this.image.destroy();
  }
}
