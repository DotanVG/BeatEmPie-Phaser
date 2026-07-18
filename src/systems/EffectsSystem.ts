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

  /** Pie splat left on the ground at an impact point, tinted per pie. No-op if the art is missing. */
  splat(x: number, y: number, color: number, radius: number): void {
    if (!this.scene.textures.exists(TEX.pieSplat)) return;
    const scale = Phaser.Math.Clamp(radius / 70, 0.9, 2.6);
    const img = this.scene.add
      .image(x, y, TEX.pieSplat)
      .setDepth(DEPTHS.PUDDLE)
      .setTint(color)
      .setAlpha(0.95)
      .setScale(scale * 0.6);
    this.scene.tweens.add({
      targets: img,
      scale: scale,
      duration: 120,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: img,
          alpha: 0,
          duration: 900,
          delay: 260,
          ease: 'Quad.easeIn',
          onComplete: () => img.destroy(),
        });
      },
    });
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

  /**
   * Chain lightning (Lemon Meringue): jagged, flickering multi-stroke bolts.
   * Each hop is a midpoint-displaced path drawn as glow -> colored body ->
   * white-hot core, with occasional thin forks and a strike flash at every
   * chained enemy. The whole bolt re-jitters twice (flicker) before fading.
   */
  lightning(points: Array<{ x: number; y: number }>, color = 0xffe24a): void {
    if (points.length < 2) return;
    const g = this.scene.add.graphics().setDepth(DEPTHS.EFFECT);

    const jagged = (a: { x: number; y: number }, b: { x: number; y: number }): Array<{ x: number; y: number }> => {
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Phaser.Math.Clamp(Math.round(dist / 26), 3, 14);
      const nx = -(b.y - a.y) / (dist || 1); // unit normal
      const ny = (b.x - a.x) / (dist || 1);
      const path = [{ x: a.x, y: a.y }];
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        // Largest jitter mid-bolt, pinched at both ends — reads as electricity.
        const amp = Math.sin(t * Math.PI) * Phaser.Math.Clamp(dist * 0.14, 8, 26);
        const off = Phaser.Math.FloatBetween(-amp, amp);
        path.push({ x: a.x + (b.x - a.x) * t + nx * off, y: a.y + (b.y - a.y) * t + ny * off });
      }
      path.push({ x: b.x, y: b.y });
      return path;
    };

    const strokePath = (path: Array<{ x: number; y: number }>): void => {
      g.beginPath();
      g.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) g.lineTo(path[i].x, path[i].y);
      g.strokePath();
    };

    const draw = (): void => {
      g.clear();
      for (let i = 1; i < points.length; i++) {
        const path = jagged(points[i - 1], points[i]);
        g.lineStyle(13, color, 0.22);
        strokePath(path);
        g.lineStyle(6, color, 0.75);
        strokePath(path);
        g.lineStyle(2.5, 0xffffff, 1);
        strokePath(path);

        // Occasional thin fork darting off a mid vertex.
        if (path.length > 4 && Math.random() < 0.7) {
          const v = path[Phaser.Math.Between(1, path.length - 2)];
          const ang = Phaser.Math.FloatBetween(0, Math.PI * 2);
          const len = Phaser.Math.Between(24, 58);
          const mid = { x: v.x + Math.cos(ang) * len * 0.5, y: v.y + Math.sin(ang) * len * 0.5 };
          const end = {
            x: v.x + Math.cos(ang + Phaser.Math.FloatBetween(-0.5, 0.5)) * len,
            y: v.y + Math.sin(ang + Phaser.Math.FloatBetween(-0.5, 0.5)) * len,
          };
          g.lineStyle(2, 0xffffff, 0.85);
          strokePath([v, mid, end]);
        }
      }
      // Strike flash on every chained enemy (skip the sky impact point 0).
      for (let i = 1; i < points.length; i++) {
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(points[i].x, points[i].y, 9);
        g.fillStyle(color, 0.35);
        g.fillCircle(points[i].x, points[i].y, 20);
      }
    };

    draw();
    this.scene.time.delayedCall(45, () => g.active !== false && draw());
    this.scene.time.delayedCall(95, () => g.active !== false && draw());
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 200, delay: 150, onComplete: () => g.destroy() });
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
