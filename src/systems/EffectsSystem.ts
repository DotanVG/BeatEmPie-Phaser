import Phaser from 'phaser';
import { DEPTHS, GAME_WIDTH, GAME_HEIGHT } from '../game/constants';
import { TEX } from '../utils/assetKeys';
import { FloatingText, FloatingTextOptions } from '../ui/FloatingText';
import type { ParticleMeta } from '../types/game';
import { FX } from '../data/balance';

type ShakeKind = 'small' | 'medium' | 'big';

/** All non-gameplay visual feedback: particles, rings, lightning, shakes, flashes, text. */
export class EffectsSystem {
  constructor(private scene: Phaser.Scene) {}

  /** One-shot particle explosion using a pie/effect's particle metadata. */
  burst(x: number, y: number, meta: ParticleMeta): void {
    const emitter = this.scene.add.particles(x, y, TEX.particle, {
      speed: { min: meta.speed * 0.35, max: meta.speed },
      angle: { min: 0, max: 360 },
      lifespan: meta.lifespan,
      scale: { start: 0.7 * meta.scale, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: meta.tints,
      blendMode: 'ADD',
      emitting: false,
    });
    emitter.setDepth(DEPTHS.EFFECT);
    emitter.explode(meta.count, x, y);
    this.scene.time.delayedCall(meta.lifespan + 150, () => emitter.destroy());
  }

  /** Expanding hollow ring (impact / shockwave). */
  ring(x: number, y: number, radius: number, color: number, durationMs = 420): void {
    const g = this.scene.add.graphics({ x, y }).setDepth(DEPTHS.EFFECT);
    const state = { r: radius * 0.25, a: 0.9 };
    this.scene.tweens.add({
      targets: state,
      r: radius,
      a: 0,
      duration: durationMs,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        g.clear();
        g.lineStyle(7, color, state.a);
        g.strokeCircle(0, 0, state.r);
      },
      onComplete: () => g.destroy(),
    });
  }

  floatingText(x: number, y: number, text: string, opts?: FloatingTextOptions): void {
    FloatingText.spawn(this.scene, x, y, text, opts);
  }

  shake(kind: ShakeKind = 'small'): void {
    const cfg = kind === 'big' ? FX.shakeBig : kind === 'medium' ? FX.shakeMedium : FX.shakeSmall;
    this.scene.cameras.main.shake(cfg.duration, cfg.intensity);
  }

  cameraFlash(color = 0xffffff, durationMs = 220): void {
    this.scene.cameras.main.flash(durationMs, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff);
  }

  /** Full-screen tinted overlay that fades — used for Pumpkin's ultimate blast. */
  fullscreenFlash(color: number, alpha = 0.7, durationMs = 520): void {
    const rect = this.scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color, alpha)
      .setDepth(DEPTHS.EFFECT)
      .setScrollFactor(0);
    this.scene.tweens.add({ targets: rect, alpha: 0, duration: durationMs, onComplete: () => rect.destroy() });
  }

  /** Polyline lightning bolt (Lemon Meringue chain). */
  lightning(points: Array<{ x: number; y: number }>, color = 0xffe24a): void {
    if (points.length < 2) return;
    const g = this.scene.add.graphics().setDepth(DEPTHS.EFFECT);
    g.lineStyle(6, 0xffffff, 1);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
    g.strokePath();
    g.lineStyle(3, color, 1);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
    g.strokePath();
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 280, onComplete: () => g.destroy() });
  }

  /** Cracked-ground decal that lingers then fades (Meat Pie). */
  groundCrack(x: number, y: number, scale = 1): void {
    const img = this.scene.add
      .image(x, y, TEX.groundCrack)
      .setDepth(DEPTHS.ENVIRONMENT)
      .setScale(scale)
      .setAlpha(0.85);
    this.scene.tweens.add({ targets: img, alpha: 0, duration: 1500, delay: 700, onComplete: () => img.destroy() });
  }

  /** Brief physics freeze for weighty impacts. Uses the scene clock so it self-resumes. */
  hitPause(ms: number = FX.hitPauseMs): void {
    const world = this.scene.physics.world;
    if (world.isPaused) return;
    world.isPaused = true;
    this.scene.time.delayedCall(ms, () => {
      world.isPaused = false;
    });
  }
}
