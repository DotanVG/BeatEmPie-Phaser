import Phaser from 'phaser';
import type { PieType } from '../types/game';
import type { GameScene } from '../scenes/GameScene';
import type { Enemy } from '../entities/Enemy';
import { SCORING } from '../data/balance';
import { ARENA, DEPTHS } from '../game/constants';
import { TEX } from '../utils/assetKeys';
import { GameEvents } from '../game/GameEvents';
import { clamp, distance } from '../utils/math';
import { PiePuddle } from '../entities/PiePuddle';

/** Resolves pie impacts and owns the lingering hazards those impacts create. */
export class PieImpactSystem {
  private puddles: PiePuddle[] = [];

  constructor(private scene: GameScene) {}

  resolve(pie: PieType, x: number, y: number, target?: Enemy): void {
    this.scene.audio.playSfx(pie.soundKey);
    this.scene.effects.splat(x, y, pie.color, pie.impactRadius);
    this.scene.effects.burst(x, y, pie.particle);
    this.scene.bus.emit(GameEvents.PIE_IMPACT, { id: pie.id, x, y });

    switch (pie.effectType) {
      case 'damage':
        this.scene.effects.ring(x, y, pie.impactRadius, pie.color, 280);
        this.scene.effects.shake('small');
        this.damageArea(x, y, pie.impactRadius, pie.damage, pie.knockbackForce ?? 0, pie.id);
        break;

      case 'explosive': {
        this.scene.effects.ring(x, y, pie.impactRadius, pie.color, 420);
        this.scene.effects.shake('medium');
        this.scene.effects.hitPause();
        const { hits } = this.damageArea(x, y, pie.impactRadius, pie.damage, pie.knockbackForce ?? 0, pie.id);
        if (hits >= 2) this.scene.combat.addBonus(SCORING.cherryMultiHit * (hits - 1), 'CHERRY COMBO!', x, y);
        this.spawnCherryCluster(pie, x, y);
        break;
      }

      case 'freeze': {
        this.scene.effects.ring(x, y, pie.impactRadius, pie.color, 360);
        for (const e of this.enemiesInRadius(x, y, pie.impactRadius)) {
          e.takeDamage(pie.damage, { pieId: pie.id });
          if (!e.isAlive) continue;
          if (e.def.ccResist >= 0.4) {
            e.applyStatus({ kind: 'slowed', durationMs: pie.durationMs ?? 2000, speedMultiplier: pie.slowMultiplier ?? 0.4 });
          } else {
            e.applyStatus({ kind: 'frozen', durationMs: pie.freezeDurationMs ?? 1500 });
          }
        }
        break;
      }

      case 'chain':
        this.resolveChain(pie, x, y);
        break;

      case 'homing': {
        // Single-target assassin hit: no area damage, big instant advantage.
        // Missile blast visuals — flash + double ring at the strike.
        this.scene.effects.ring(x, y, pie.impactRadius * 0.6, pie.color, 260);
        this.scene.effects.ring(x, y, pie.impactRadius * 0.35, 0xffffff, 200);
        this.scene.effects.shake('small');
        const victim =
          target && target.isAlive ? target : this.scene.getNearestEnemy(x, y) ?? undefined;
        if (victim && distance(x, y, victim.x, victim.y) <= victim.def.bodyRadius + 48) {
          const dmg = victim.isBoss
            ? pie.bossDamage ?? pie.damage
            : victim.maxHealthValue >= (pie.bigEnemyThreshold ?? Number.POSITIVE_INFINITY)
              ? Math.ceil(victim.maxHealthValue / 2) // big enemies: dead in exactly 2 hits
              : Math.max(pie.damage, victim.health); // regulars: one shot
          victim.takeDamage(dmg, { pieId: pie.id, isCrit: true });
          if ((pie.knockbackForce ?? 0) > 0 && victim.isAlive) {
            victim.applyKnockback(x, y, pie.knockbackForce ?? 0);
          }
        }
        break;
      }

      case 'heavy':
        this.scene.effects.groundCrack(x, y, clamp(pie.impactRadius / 120, 1, 2.4));
        this.scene.effects.ring(x, y, pie.impactRadius, pie.color, 480);
        // The slab hits the waterline: big sea-splash on top of the crack.
        this.scene.effects.ring(x, y, pie.impactRadius * 0.7, 0x4f8cff, 380);
        this.scene.effects.ring(x, y, pie.impactRadius * 1.15, 0x9fd0ff, 560);
        this.scene.effects.burst(x, y, { tints: [0x4f8cff, 0x9fd0ff, 0xffffff], count: 36, speed: 540, lifespan: 640, scale: 1.5 });
        this.scene.effects.shake('big');
        this.scene.effects.hitPause(70);
        this.damageArea(x, y, pie.impactRadius, pie.damage, pie.knockbackForce ?? 0, pie.id);
        break;

      case 'confusion':
        this.scene.effects.ring(x, y, pie.impactRadius, pie.color, 420);
        for (const e of this.enemiesInRadius(x, y, pie.impactRadius)) {
          e.takeDamage(pie.damage, { pieId: pie.id });
          if (e.isAlive) e.applyStatus({ kind: 'confused', durationMs: pie.durationMs ?? 4000 });
        }
        break;

      case 'ultimate':
        this.resolveUltimate(pie);
        break;

      case 'dot':
        this.scene.effects.ring(x, y, pie.impactRadius, pie.color, 320);
        this.damageArea(x, y, pie.impactRadius * 0.6, pie.damage, 0, pie.id);
        this.puddles.push(
          new PiePuddle(this.scene, x, y, {
            radius: pie.impactRadius,
            lifetimeMs: pie.durationMs ?? 4000,
            color: pie.color,
            tickDamage: pie.tickDamage ?? 6,
            tickRateMs: pie.tickRateMs ?? 500,
            pieId: pie.id,
            statusKind: 'chocolateDot',
            slowMultiplier: pie.slowMultiplier ?? 0.5,
            depth: DEPTHS.PUDDLE,
          }),
        );
        break;

      case 'fireTrail':
        this.resolveFireTrail(pie, x, y);
        break;
    }
  }

  /** Cherry cluster: bomblets arc out from the blast and pop around the impact. */
  private spawnCherryCluster(pie: PieType, x: number, y: number): void {
    const count = 6;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.4, 0.4);
      const dist = Phaser.Math.Between(95, 195);
      const px = this.clampX(x + Math.cos(ang) * dist);
      const py = this.clampY(y + Math.sin(ang) * dist);
      const cherry = this.scene.add
        .image(x, y, TEX.particle)
        .setTint(0xe23150)
        .setDepth(DEPTHS.PIE)
        .setScale(1.3);
      const state = { t: 0 };
      this.scene.tweens.add({
        targets: state,
        t: 1,
        duration: Phaser.Math.Between(230, 330),
        ease: 'Linear',
        onUpdate: () => {
          cherry.setPosition(
            Phaser.Math.Linear(x, px, state.t),
            Phaser.Math.Linear(y, py, state.t) - Math.sin(state.t * Math.PI) * 90,
          );
        },
        onComplete: () => {
          cherry.destroy();
          this.scene.effects.ring(px, py, 70, pie.color, 240);
          this.scene.effects.burst(px, py, { tints: [0xe23150, 0xff8a5c], count: 8, speed: 240, lifespan: 320, scale: 0.9 });
          this.damageArea(px, py, 74, pie.clusterDamage ?? 9, 70, pie.id);
        },
      });
    }
  }

  private resolveChain(pie: PieType, x: number, y: number): void {
    const primary = this.scene.getNearestEnemy(x, y);
    if (!primary || distance(x, y, primary.x, primary.y) > (pie.chainRange ?? 250)) {
      // Nothing in reach of the impact point — the bolt fizzles on the ground.
      this.scene.effects.lightning([{ x, y }, { x: x + 30, y: y + 10 }], pie.color);
      return;
    }
    const hit = new Set<Enemy>();
    const points: Array<{ x: number; y: number }> = [{ x, y }];
    let current: Enemy | null = primary;
    let dmg = pie.damage;
    const minDmg = pie.damage * 0.4;
    let hops = 0;

    // The chain keeps jumping while ANYONE unhit is within range of the last
    // strike — it covers every enemy in the connected area, no fixed cap.
    while (current) {
      hit.add(current);
      points.push({ x: current.x, y: current.y });
      current.takeDamage(dmg, { pieId: pie.id });
      // Electrocution: a short paralysis after the zap (ccResist scales it down).
      if (current.isAlive) current.applyStatus({ kind: 'stunned', durationMs: 1600, pieId: pie.id });
      if (hops > 0) this.scene.combat.addBonus(SCORING.lemonChainHit, 'CHAIN', current.x, current.y);
      dmg = Math.max(minDmg, dmg * 0.85);
      hops++;
      current = this.nearestExcluding(current.x, current.y, hit, pie.chainRange ?? 250);
    }
    this.scene.effects.lightning(points, pie.color);
  }

  private resolveUltimate(pie: PieType): void {
    this.scene.effects.fullscreenFlash(pie.color, 0.7, 560);
    this.scene.effects.cameraFlash(0xffffff, 200);
    // Pie sludge splatters across the screen, as if some flew onto the player.
    this.scene.effects.screenSludge(pie.color);
    this.scene.effects.shake('big');
    this.scene.effects.hitPause(80);
    const player = this.scene.player;
    let kills = 0;
    for (const e of this.scene.getActiveEnemies()) {
      e.takeDamage(pie.damage, { pieId: pie.id });
      if (e.isAlive) e.applyKnockback(player.x, player.y, pie.knockbackForce ?? 200);
      else kills++;
    }
    if (kills >= 2) this.scene.combat.addBonus(SCORING.pumpkinMultiKill * kills, 'PUMPKIN WIPE!', player.x, player.y - 120);
  }

  private resolveFireTrail(pie: PieType, x: number, y: number): void {
    this.scene.effects.ring(x, y, pie.impactRadius, pie.color, 300);
    this.damageArea(x, y, pie.impactRadius * 0.6, pie.damage, 0, pie.id);
    const laneHalf = 200;
    const step = 70;
    for (let sx = x - laneHalf; sx <= x + laneHalf; sx += step) {
      this.puddles.push(
        new PiePuddle(this.scene, this.clampX(sx), y, {
          radius: pie.impactRadius * 0.7,
          lifetimeMs: pie.durationMs ?? 4000,
          color: pie.color,
          tickDamage: pie.tickDamage ?? 5,
          tickRateMs: pie.tickRateMs ?? 400,
          pieId: pie.id,
          statusKind: 'burning',
          lingerTickDamage: Math.round((pie.tickDamage ?? 5) * 0.6),
          lingerMs: 1000,
          depth: DEPTHS.EFFECT,
        }),
      );
    }
  }

  private damageArea(
    x: number,
    y: number,
    radius: number,
    damage: number,
    knockback: number,
    pieId: string,
  ): { hits: number; kills: number } {
    let hits = 0;
    let kills = 0;
    for (const e of this.scene.getActiveEnemies()) {
      if (distance(x, y, e.x, e.y) > radius + e.def.bodyRadius) continue;
      hits++;
      e.takeDamage(damage, { pieId });
      if (knockback > 0 && e.isAlive) e.applyKnockback(x, y, knockback);
      if (!e.isAlive) kills++;
    }
    return { hits, kills };
  }

  private enemiesInRadius(x: number, y: number, radius: number): Enemy[] {
    return this.scene.getActiveEnemies().filter((e) => distance(x, y, e.x, e.y) <= radius + e.def.bodyRadius);
  }

  private nearestExcluding(x: number, y: number, exclude: Set<Enemy>, range: number): Enemy | null {
    let best: Enemy | null = null;
    let bestD = range;
    for (const e of this.scene.getActiveEnemies()) {
      if (exclude.has(e)) continue;
      const d = distance(x, y, e.x, e.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  private clampX(x: number): number {
    return clamp(x, ARENA.minX, ARENA.maxX);
  }

  private clampY(y: number): number {
    return clamp(y, ARENA.minY, ARENA.maxY);
  }

  update(deltaMs: number): void {
    const enemies = this.scene.getActiveEnemies();
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      this.puddles[i].update(deltaMs, enemies);
      if (this.puddles[i].isDead) this.puddles.splice(i, 1);
    }
  }
}
