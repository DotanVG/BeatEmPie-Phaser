import type { PieType } from '../types/game';
import type { GameScene } from '../scenes/GameScene';
import type { Enemy } from '../entities/Enemy';
import { PIE_TYPES, PIE_ORDER, PIE_BY_ID } from '../data/pieTypes';
import { SCORING } from '../data/balance';
import { ARENA, DEPTHS } from '../game/constants';
import { AUDIO } from '../utils/assetKeys';
import { GameEvents } from '../game/GameEvents';
import { Cooldown } from '../utils/timers';
import { clamp, distance } from '../utils/math';
import { PieWarningMarker } from '../entities/PieWarningMarker';
import { PieDrop } from '../entities/PieDrop';
import { PiePuddle } from '../entities/PiePuddle';

interface ResolvedTarget {
  tx: number;
  ty: number;
  homing?: Enemy;
}

/**
 * Owns the entire pie pipeline: selection, per-pie cooldowns, limited charges,
 * the sky-drop (warning → fall → impact) and resolving each of the 10 effects.
 */
export class PieSystem {
  readonly pies: PieType[] = PIE_TYPES;
  selectedIndex = 0;

  private cooldowns = new Map<string, Cooldown>();
  private charges = new Map<string, number>();
  private drops: PieDrop[] = [];
  private puddles: PiePuddle[] = [];

  constructor(private scene: GameScene) {
    for (const pie of PIE_TYPES) {
      this.cooldowns.set(pie.id, new Cooldown(pie.cooldownMs));
      if (pie.maxUses !== undefined) this.charges.set(pie.id, pie.maxUses);
    }
  }

  get selectedPie(): PieType {
    return PIE_TYPES[this.selectedIndex];
  }

  isUnlocked(pie: PieType): boolean {
    return this.scene.currentWaveNumber >= pie.unlockWave;
  }

  getCooldownProgress(pieId: string): number {
    return this.cooldowns.get(pieId)?.progress ?? 1;
  }

  getCharges(pieId: string): number | null {
    return this.charges.has(pieId) ? (this.charges.get(pieId) as number) : null;
  }

  // --- Selection ------------------------------------------------------------
  selectIndex(index: number): void {
    if (index < 0 || index >= PIE_TYPES.length) return;
    const pie = PIE_TYPES[index];
    if (!this.isUnlocked(pie)) {
      this.scene.effects.floatingText(this.scene.player.x, this.scene.player.y - 130, `${pie.emoji} locked`, {
        color: '#9aa0c0',
        fontSize: 26,
      });
      return;
    }
    this.selectedIndex = index;
    this.scene.audio.playSfx(AUDIO.pieSelect, 0.6);
    this.scene.bus.emit(GameEvents.PIE_SELECTED, { index, id: pie.id });
  }

  selectById(id: string): void {
    const idx = PIE_ORDER.indexOf(id);
    if (idx >= 0) this.selectIndex(idx);
  }

  cyclePie(dir: number): void {
    let idx = this.selectedIndex;
    for (let i = 0; i < PIE_TYPES.length; i++) {
      idx = (idx + dir + PIE_TYPES.length) % PIE_TYPES.length;
      if (this.isUnlocked(PIE_TYPES[idx])) {
        this.selectIndex(idx);
        return;
      }
    }
  }

  refillPumpkin(amount = 1): void {
    const pie = PIE_BY_ID['pumpkin'];
    if (pie?.maxUses === undefined) return;
    const next = Math.min(pie.maxUses, (this.charges.get('pumpkin') ?? 0) + amount);
    this.charges.set('pumpkin', next);
    this.scene.bus.emit(GameEvents.PIE_CHARGES_CHANGED, { id: 'pumpkin', charges: next });
  }

  // --- Dropping -------------------------------------------------------------
  /** Drop the selected pie at an explicit ground point (mouse click). */
  dropAtPoint(px: number, py: number): boolean {
    return this.attemptDrop({ x: px, y: py });
  }

  /**
   * Drop at a pointer location (mouse click or mobile screen tap), gated to the playable
   * vertical band. Shared by InputSystem (mouse) and TouchControls (touch) so both behave
   * identically.
   */
  dropAtScreenPoint(worldX: number, worldY: number): boolean {
    if (worldY < ARENA.minY - 240 || worldY > ARENA.maxY + 80) return false;
    return this.dropAtPoint(worldX, worldY);
  }

  /** Drop the selected pie auto-targeting the nearest enemy / in front (space bar). */
  dropAuto(): boolean {
    return this.attemptDrop();
  }

  private attemptDrop(preferred?: { x: number; y: number }): boolean {
    const pie = this.selectedPie;
    const cd = this.cooldowns.get(pie.id) as Cooldown;

    if (!this.isUnlocked(pie)) {
      this.deny(`${pie.emoji} locked`);
      return false;
    }
    if (this.charges.has(pie.id) && (this.charges.get(pie.id) as number) <= 0) {
      this.deny('No charges!');
      return false;
    }
    if (!cd.ready) return false;

    const { tx, ty, homing } = this.resolveTarget(pie, preferred);

    // Consume cost
    cd.start(pie.cooldownMs);
    if (this.charges.has(pie.id)) {
      const left = (this.charges.get(pie.id) as number) - 1;
      this.charges.set(pie.id, left);
      this.scene.bus.emit(GameEvents.PIE_CHARGES_CHANGED, { id: pie.id, charges: left });
    }

    this.scene.player.callPie(tx);
    this.scene.audio.playSfx(AUDIO.pieCall, 0.8);
    this.scene.bus.emit(GameEvents.PIE_DROPPED, { id: pie.id });

    const marker = new PieWarningMarker(this.scene, tx, ty, pie.warningRadius, pie.color);
    this.scene.time.delayedCall(pie.skyDropDelayMs, () => {
      marker.destroyMarker();
      this.drops.push(new PieDrop(this.scene, pie, tx, ty, (ix, iy) => this.resolveImpact(pie, ix, iy), homing));
    });
    return true;
  }

  private deny(message: string): void {
    this.scene.effects.floatingText(this.scene.player.x, this.scene.player.y - 130, message, {
      color: '#ff5470',
      fontSize: 26,
    });
  }

  private resolveTarget(pie: PieType, preferred?: { x: number; y: number }): ResolvedTarget {
    const player = this.scene.player;
    const front = { x: this.clampX(player.x + player.facingSign * 150), y: this.clampY(player.y) };

    if (pie.targetMode === 'homing') {
      const e = this.scene.getNearestEnemy(player.x, player.y);
      return e ? { tx: e.x, ty: e.y, homing: e } : { tx: front.x, ty: front.y };
    }
    if (pie.targetMode === 'nearestEnemy') {
      const e = this.scene.getNearestEnemy(player.x, player.y);
      return e ? { tx: e.x, ty: e.y } : { tx: front.x, ty: front.y };
    }
    if (pie.targetMode === 'screenWide') {
      return { tx: player.x, ty: player.y };
    }
    // groundTarget / puddle / lineTrail
    if (preferred) return { tx: this.clampX(preferred.x), ty: this.clampY(preferred.y) };
    const e = this.scene.getNearestEnemy(player.x, player.y);
    return e ? { tx: this.clampX(e.x), ty: this.clampY(e.y) } : { tx: front.x, ty: front.y };
  }

  // --- Impact resolution ----------------------------------------------------
  private resolveImpact(pie: PieType, x: number, y: number): void {
    this.scene.audio.playSfx(pie.soundKey);
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

      case 'homing':
        this.scene.effects.ring(x, y, pie.impactRadius, pie.color, 260);
        this.damageArea(x, y, pie.impactRadius, pie.damage, pie.knockbackForce ?? 0, pie.id);
        break;

      case 'heavy':
        this.scene.effects.groundCrack(x, y, clamp(pie.impactRadius / 120, 1, 2.4));
        this.scene.effects.ring(x, y, pie.impactRadius, pie.color, 480);
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

  private resolveChain(pie: PieType, x: number, y: number): void {
    const primary = this.scene.getNearestEnemy(x, y);
    if (!primary) return;
    const hit = new Set<Enemy>();
    const points: Array<{ x: number; y: number }> = [{ x, y }];
    let current: Enemy | null = primary;
    let dmg = pie.damage;
    const maxChains = pie.chainCount ?? 3;

    for (let i = 0; i < maxChains && current; i++) {
      hit.add(current);
      points.push({ x: current.x, y: current.y });
      current.takeDamage(dmg, { pieId: pie.id });
      if (i > 0) this.scene.combat.addBonus(SCORING.lemonChainHit, 'CHAIN', current.x, current.y);
      dmg *= 0.85;
      current = this.nearestExcluding(current.x, current.y, hit, pie.chainRange ?? 250);
    }
    this.scene.effects.lightning(points, pie.color);
  }

  private resolveUltimate(pie: PieType): void {
    this.scene.effects.fullscreenFlash(pie.color, 0.7, 560);
    this.scene.effects.cameraFlash(0xffffff, 200);
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

  // --- Helpers --------------------------------------------------------------
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

  // --- Frame update ---------------------------------------------------------
  update(deltaMs: number): void {
    for (const cd of this.cooldowns.values()) cd.update(deltaMs);

    for (let i = this.drops.length - 1; i >= 0; i--) {
      this.drops[i].update(deltaMs);
      if (this.drops[i].isDone) this.drops.splice(i, 1);
    }

    const enemies = this.scene.getActiveEnemies();
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      this.puddles[i].update(deltaMs, enemies);
      if (this.puddles[i].isDead) this.puddles.splice(i, 1);
    }
  }
}
