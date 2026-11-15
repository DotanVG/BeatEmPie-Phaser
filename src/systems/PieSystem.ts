import Phaser from 'phaser';
import type { PieType } from '../types/game';
import type { GameScene } from '../scenes/GameScene';
import type { Enemy } from '../entities/Enemy';
import { PIE_TYPES, PIE_BY_ID } from '../data/pieTypes';
import { ARENA, DEPTHS } from '../game/constants';
import { AUDIO, TEX } from '../utils/assetKeys';
import { GameEvents } from '../game/GameEvents';
import { Cooldown } from '../utils/timers';
import { distance } from '../utils/math';
import { PieWarningMarker } from '../entities/PieWarningMarker';
import { PieDrop } from '../entities/PieDrop';
import { PieImpactSystem } from './PieImpactSystem';
import { resolveDropPoint } from '../utils/pieTargeting';

interface ResolvedTarget {
  tx: number;
  ty: number;
  homing?: Enemy;
}

/**
 * Owns selection, per-pie cooldowns, limited charges and the sky-drop
 * (warning → fall → impact). PieImpactSystem resolves the effects.
 */
export class PieSystem {
  readonly pies: PieType[] = PIE_TYPES;
  selectedIndex = 0;

  private cooldowns = new Map<string, Cooldown>();
  private charges = new Map<string, number>();
  private drops: PieDrop[] = [];
  private impacts: PieImpactSystem;
  /** Missile lock reticles tracking Strawberry targets until the strike. */
  private locks: Array<{ img: Phaser.GameObjects.Image; enemy: Enemy; ttl: number }> = [];

  constructor(private scene: GameScene) {
    this.impacts = new PieImpactSystem(scene);
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

    cd.start(pie.cooldownMs);
    if (this.charges.has(pie.id)) {
      const left = (this.charges.get(pie.id) as number) - 1;
      this.charges.set(pie.id, left);
      this.scene.bus.emit(GameEvents.PIE_CHARGES_CHANGED, { id: pie.id, charges: left });
    }

    this.scene.player.callPie(tx);
    this.scene.audio.playSfx(AUDIO.pieCall, 0.8);
    this.scene.bus.emit(GameEvents.PIE_DROPPED, { id: pie.id });

    // Strawberry: lock-on reticle glued to the hunted target until the missile hits.
    if (pie.targetMode === 'homing' && homing) {
      const img = this.scene.add
        .image(homing.x, homing.y, TEX.lock)
        .setDepth(DEPTHS.WARNING)
        .setAlpha(0.95)
        .setScale(0.7);
      this.scene.tweens.add({ targets: img, scale: 1.05, duration: 260, yoyo: true, repeat: -1 });
      this.locks.push({ img, enemy: homing, ttl: pie.skyDropDelayMs + 700 });
      this.scene.audio.playSfx(pie.soundKey, 0.7);
    }

    const marker = new PieWarningMarker(this.scene, tx, ty, pie.warningRadius, pie.color);
    this.scene.time.delayedCall(pie.skyDropDelayMs, () => {
      marker.destroyMarker();
      this.drops.push(
        new PieDrop(this.scene, pie, tx, ty, (ix, iy, target) => this.impacts.resolve(pie, ix, iy, target), homing),
      );
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
    const nearest = this.scene.getNearestEnemy(player.x, player.y);
    const strongest = this.strongestEnemy();

    const point = resolveDropPoint(
      pie.targetMode,
      preferred,
      { x: player.x, y: player.y, facingSign: player.facingSign },
      nearest ? { x: nearest.x, y: nearest.y } : null,
      strongest ? { x: strongest.x, y: strongest.y } : null,
      { minX: ARENA.minX, maxX: ARENA.maxX, minY: ARENA.minY, maxY: ARENA.maxY },
    );
    return {
      tx: point.tx,
      ty: point.ty,
      homing: point.homing === 'strongest' ? strongest ?? undefined : undefined,
    };
  }

  /** Boss first, then highest max HP; distance to the player breaks ties. */
  private strongestEnemy(): Enemy | null {
    const player = this.scene.player;
    let best: Enemy | null = null;
    let bestKey = -Infinity;
    for (const e of this.scene.getActiveEnemies()) {
      const key = (e.isBoss ? 1_000_000 : 0) + e.maxHealthValue * 1000 - distance(player.x, player.y, e.x, e.y);
      if (key > bestKey) {
        bestKey = key;
        best = e;
      }
    }
    return best;
  }

  update(deltaMs: number): void {
    for (const cd of this.cooldowns.values()) cd.update(deltaMs);

    for (let i = this.drops.length - 1; i >= 0; i--) {
      this.drops[i].update(deltaMs);
      if (this.drops[i].isDone) this.drops.splice(i, 1);
    }

    // Impacts run after falling drops so new puddles tick in the same frame.
    this.impacts.update(deltaMs);

    for (let i = this.locks.length - 1; i >= 0; i--) {
      const lock = this.locks[i];
      lock.ttl -= deltaMs;
      if (lock.ttl <= 0 || !lock.enemy.isAlive) {
        lock.img.destroy();
        this.locks.splice(i, 1);
        continue;
      }
      lock.img.setPosition(lock.enemy.x, lock.enemy.y);
    }
  }
}
