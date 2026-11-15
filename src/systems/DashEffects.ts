import type Phaser from 'phaser';
import { DASH_FX, PLAYER } from '../data/balance';
import { DEPTHS } from '../game/constants';
import { TEX } from '../utils/assetKeys';

type BurstConfig = typeof DASH_FX.dust | typeof DASH_FX.pebbles | typeof DASH_FX.skid;
type Particle = {
  life: number; age: number; x: number; y: number; vx: number; vy: number; gravity: number;
  size: number; growth: number; length: number; angle: number; tint: number; alpha: number;
  kind: 'dust' | 'pixel' | 'line';
};

/** One scene-wide cosmetic pool. No physics, gameplay RNG, timers or per-dash objects. */
export class DashEffects {
  private readonly visual: Phaser.GameObjects.Image;
  private readonly smear: Phaser.GameObjects.Graphics;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly ghosts: { image: Phaser.GameObjects.Image; age: number }[];
  private readonly particles: Particle[];
  private source?: Phaser.GameObjects.Sprite;
  private age = 0;
  private skidAge = -1;
  private ghostClock = 0;
  private dx = 1;
  private dy = 0;
  private baseScale = 1;
  private feet = 0;
  private sourceAlpha = 1;
  private previousX = 0;
  private previousY = 0;
  private rng = DASH_FX.rngSeed as number;
  private destroyed = false;

  constructor(scene: Phaser.Scene) {
    this.visual = scene.add.image(0, 0, TEX.shushkiIdle).setDepth(DEPTHS.PLAYER).setVisible(false);
    this.smear = scene.add.graphics().setDepth(DEPTHS.PLAYER);
    this.graphics = scene.add.graphics().setDepth(DEPTHS.PLAYER - 1);
    this.ghosts = Array.from({ length: DASH_FX.ghost.limit }, () => ({
      image: scene.add.image(0, 0, TEX.shushkiIdle).setDepth(DEPTHS.PLAYER - 1).setVisible(false), age: -1,
    }));
    // Data slots share one Graphics object: no emitter/node allocation on launch.
    this.particles = Array.from({ length: DASH_FX.particles.limit }, () => ({
      life: 1, age: -1, x: 0, y: 0, vx: 0, vy: 0, gravity: 0, size: 0, growth: 1,
      length: 0, angle: 0, tint: 0, alpha: 0, kind: 'pixel',
    }));
    scene.events.once('shutdown', this.destroy, this);
  }

  begin(source: Phaser.GameObjects.Sprite, dx: number, dy: number, scale: number, feet: number): void {
    if (this.destroyed) return;
    this.cancel();
    this.source = source;
    this.sourceAlpha = source.alpha;
    this.dx = dx;
    this.dy = dy;
    this.baseScale = scale;
    this.feet = feet;
    this.previousX = source.x;
    this.previousY = source.y;
    this.age = 0;
    this.skidAge = -1;
    this.ghostClock = 0;
    this.burst(DASH_FX.dust, -1, 'dust');
    this.burst(DASH_FX.pebbles, -1, 'pixel');
    for (let i = 0; i < DASH_FX.lines.count; i++) {
      const p = this.particles.find(p => p.age < 0);
      if (!p) break;
      const cfg = DASH_FX.lines;
      const rear = this.range(cfg.rear[0], cfg.rear[1]);
      const offset = this.range(-cfg.spread, cfg.spread);
      p.kind = 'line';
      p.age = 0;
      p.life = cfg.lifeMs;
      p.x = source.x - dx * rear - dy * offset;
      p.y = source.y - dy * rear + dx * offset;
      const speed = this.range(cfg.speed[0], cfg.speed[1]);
      p.vx = -dx * speed;
      p.vy = -dy * speed;
      p.gravity = 0;
      p.size = cfg.width;
      p.length = this.range(cfg.length[0], cfg.length[1]);
      p.angle = Math.atan2(dy, dx);
      p.growth = 1;
      p.tint = cfg.tint;
      p.alpha = cfg.alpha;
    }
    this.present();
  }

  /** Called after the player's normal pose/alpha update, on its explicit paused-aware clock. */
  tick(deltaMs: number, dashing: boolean): void {
    if (this.destroyed) return;
    this.updatePool(deltaMs);
    const s = this.source;
    if (!s) return;
    if (!s.active || !s.visible) { this.cancel(); return; }
    // Player owns invulnerability blink; hiding its render never changes visible/body/shadow.
    this.sourceAlpha = s.alpha;
    if (this.skidAge < 0) {
      this.age += deltaMs;
      if (!dashing) {
        this.skidAge = 0;
        this.burst(DASH_FX.skid, 1, 'pixel');
      } else {
        this.ghostClock += deltaMs;
        const count = Math.min(Math.floor(this.ghostClock / DASH_FX.ghost.intervalMs), DASH_FX.ghost.perPlayer);
        for (let i = 0; i < count; i++) {
          const t = (i + 1) / count;
          this.ghost(this.previousX + (s.x - this.previousX) * t, this.previousY + (s.y - this.previousY) * t);
        }
        this.ghostClock %= DASH_FX.ghost.intervalMs;
        this.previousX = s.x;
        this.previousY = s.y;
      }
    } else {
      this.skidAge += deltaMs;
      if (this.skidAge >= Math.max(DASH_FX.skid.lifeMs, DASH_FX.stretch.recoverMs)) {
        this.restore();
        return;
      }
    }
    this.present();
  }

  /** Interrupts release all slots immediately, including trails and launch particles. */
  cancel(): void {
    if (this.destroyed) return;
    this.restore();
    for (const g of this.ghosts) { g.age = -1; g.image.setVisible(false); }
    for (const p of this.particles) p.age = -1;
    this.graphics.clear();
  }

  private restore(): void {
    if (this.source?.active) this.source.setAlpha(this.sourceAlpha);
    this.source = undefined;
    this.visual.setScale(1).setRotation(0).setVisible(false);
    this.smear.clear();
  }

  private present(): void {
    const s = this.source!;
    const cfg = DASH_FX.stretch;
    const k = Math.sin(Math.PI * Math.min(1, this.age / PLAYER.dashDurationMs));
    let width = 1 + (cfg.width - 1) * k;
    let height = 1 + (cfg.height - 1) * k;
    let angle = 0;
    if (this.skidAge >= 0) {
      const t = Math.min(1, this.skidAge / cfg.recoverMs);
      width = 1 - (1 - cfg.squash) * Math.pow(2, -cfg.decay * t) * Math.cos(t * Math.PI * 2 * cfg.oscillations);
      height = 1;
      const lean = Math.max(0, 1 - this.skidAge / DASH_FX.skid.lifeMs);
      angle = -DASH_FX.skid.angle * (Math.sign(this.dx) || (s.flipX ? -1 : 1)) * lean * lean;
    }
    this.copy(s, this.visual);
    this.visual.setScale(this.baseScale * width, this.baseScale * height).setAngle(angle).setAlpha(this.sourceAlpha);
    this.smear.clear();
    const smear = this.skidAge < 0 && this.age < DASH_FX.smear.lifeMs;
    this.visual.setVisible(!smear);
    if (smear) {
      const cfg = DASH_FX.smear;
      const band = s.height * this.baseScale * cfg.height / cfg.colors.length;
      this.smear.setPosition(s.x, s.y).setRotation(Math.atan2(this.dy, this.dx));
      for (let i = 0; i < cfg.colors.length; i++) {
        const y = (i - cfg.colors.length / 2) * band;
        const length = cfg.length * (1 - i * cfg.bandLengthStep);
        this.smear.fillStyle(cfg.colors[i], cfg.alpha * this.sourceAlpha);
        this.quad(this.smear, 0, y, 0, y + band, -length, y + band * (1 + cfg.taper) / 2,
          -length, y + band * (1 - cfg.taper) / 2);
      }
    }
    s.setAlpha(0);
  }

  private copy(s: Phaser.GameObjects.Sprite, image: Phaser.GameObjects.Image): void {
    image.setTexture(s.texture.key, s.frame.name).setPosition(s.x, s.y)
      .setOrigin(s.originX, s.originY).setFlip(s.flipX, s.flipY);
  }

  private ghost(x: number, y: number): void {
    let count = 0;
    for (const g of this.ghosts) if (g.age >= 0) count++;
    if (count >= DASH_FX.ghost.perPlayer) return;
    const g = this.ghosts.find(g => g.age < 0);
    if (!g) return;
    this.copy(this.source!, g.image);
    g.image.setPosition(x, y).setScale(this.visual.scaleX, this.visual.scaleY)
      .setAngle(0).setTint(DASH_FX.ghost.tint).setAlpha(DASH_FX.ghost.alpha).setVisible(true);
    g.age = 0;
  }

  private burst(cfg: BurstConfig, direction: number, kind: 'dust' | 'pixel'): void {
    const s = this.source!;
    for (let i = 0; i < cfg.count; i++) {
      const p = this.particles.find(p => p.age < 0);
      if (!p) break;
      const speed = this.range(cfg.speed[0], cfg.speed[1]) * direction;
      p.age = 0;
      p.life = cfg.lifeMs;
      p.kind = kind;
      p.x = s.x - this.dx * DASH_FX.particles.rear + this.range(-DASH_FX.particles.spread, DASH_FX.particles.spread);
      p.y = s.y + this.feet;
      p.vx = this.dx * speed;
      p.vy = this.dy * speed - this.range(cfg.lift[0], cfg.lift[1]);
      p.gravity = cfg.gravity;
      p.size = this.range(cfg.size[0], cfg.size[1]);
      p.growth = cfg.growth;
      p.length = 0;
      p.angle = 0;
      p.tint = cfg.tint;
      p.alpha = cfg.alpha;
    }
  }

  private updatePool(deltaMs: number): void {
    for (const g of this.ghosts) {
      if (g.age < 0) continue;
      g.age += deltaMs;
      if (g.age >= DASH_FX.ghost.lifeMs) { g.age = -1; g.image.setVisible(false); }
      else g.image.setAlpha(DASH_FX.ghost.alpha * (1 - g.age / DASH_FX.ghost.lifeMs));
    }
    const g = this.graphics.clear();
    for (const p of this.particles) {
      if (p.age < 0) continue;
      p.age += deltaMs;
      if (p.age >= p.life) { p.age = -1; continue; }
      const t = deltaMs / 1000;
      p.x += p.vx * t;
      p.y += p.vy * t + p.gravity * t * t / 2;
      p.vy += p.gravity * t;
      const life = p.age / p.life;
      const size = p.size * (1 + (p.growth - 1) * life);
      g.fillStyle(p.tint, p.alpha * (1 - life));
      if (p.kind === 'line') {
        const dx = Math.cos(p.angle), dy = Math.sin(p.angle);
        const length = p.length * (1 - life);
        this.quad(g, p.x - dy * size, p.y + dx * size, p.x + dy * size, p.y - dx * size,
          p.x - dx * length, p.y - dy * length, p.x - dx * length, p.y - dy * length);
      } else if (p.kind === 'dust') {
        g.fillRect(Math.round(p.x - size / 2), Math.round(p.y - size / 4), size, size / 2);
        g.fillRect(Math.round(p.x - size / 4), Math.round(p.y - size / 2), size / 2, size);
      } else g.fillRect(Math.round(p.x), Math.round(p.y), size, size);
    }
  }

  private quad(g: Phaser.GameObjects.Graphics, ax: number, ay: number, bx: number, by: number,
    cx: number, cy: number, dx: number, dy: number): void {
    g.beginPath();
    g.moveTo(ax, ay); g.lineTo(bx, by); g.lineTo(cx, cy); g.lineTo(dx, dy);
    g.closePath(); g.fillPath();
  }

  private range(min: number, max: number): number {
    // Private xorshift32: never consumes Math.random or Phaser's shared RNG.
    let n = this.rng;
    n ^= n << 13; n ^= n >>> 17; n ^= n << 5;
    this.rng = n;
    return min + ((n >>> 0) / 0x100000000) * (max - min);
  }

  private destroy(): void {
    this.cancel();
    this.destroyed = true;
    this.visual.destroy(); this.smear.destroy(); this.graphics.destroy();
    for (const g of this.ghosts) g.image.destroy();
  }
}
