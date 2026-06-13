import type { StatusKind } from '../types/game';
import type { Enemy } from './Enemy';

export interface StatusApply {
  kind: StatusKind;
  durationMs: number;
  /** Movement multiplier while active (frozen/slowed). */
  speedMultiplier?: number;
  /** Damage-over-time settings. */
  tickDamage?: number;
  tickRateMs?: number;
  /** Pie that applied it — used for kill credit / scoring. */
  pieId?: string;
}

interface ActiveStatus extends StatusApply {
  timeLeft: number;
  tickAcc: number;
}

const STATUS_TINT: Partial<Record<StatusKind, number>> = {
  frozen: 0x7fd0ff,
  burning: 0xff7a33,
  fireDot: 0xff7a33,
  chocolateDot: 0xb5814f,
  confused: 0xc77aff,
  slowed: 0x9fd0ff,
  stunned: 0xffe08a,
};

const STATUS_ICON: Partial<Record<StatusKind, string>> = {
  frozen: '❄️',
  burning: '🔥',
  fireDot: '🔥',
  chocolateDot: '🍫',
  confused: '💫',
  slowed: '🐌',
  stunned: '⭐',
};

/** Precedence for the dominant tint + icon when several statuses overlap. */
const PRIORITY: StatusKind[] = [
  'frozen',
  'confused',
  'burning',
  'fireDot',
  'chocolateDot',
  'slowed',
  'stunned',
  'knockedBack',
];

/**
 * Per-enemy bag of timed status effects. Handles stacking-by-refresh, DOT ticks,
 * speed modification and the dominant visual indicator. Reusable across all enemy types.
 */
export class StatusController {
  private statuses = new Map<StatusKind, ActiveStatus>();

  apply(a: StatusApply, enemy: Enemy): void {
    // Re-applying refreshes duration (no infinite stacking).
    this.statuses.set(a.kind, { ...a, timeLeft: a.durationMs, tickAcc: 0 });
    enemy.refreshTint();
  }

  clear(kind: StatusKind, enemy: Enemy): void {
    if (this.statuses.delete(kind)) enemy.refreshTint();
  }

  clearAll(enemy: Enemy): void {
    if (this.statuses.size > 0) {
      this.statuses.clear();
      enemy.refreshTint();
    }
  }

  has(kind: StatusKind): boolean {
    return this.statuses.has(kind);
  }

  get isFrozen(): boolean {
    return this.statuses.has('frozen');
  }

  get isStunned(): boolean {
    return this.statuses.has('stunned');
  }

  get isConfused(): boolean {
    return this.statuses.has('confused');
  }

  get speedMultiplier(): number {
    if (this.statuses.has('frozen') || this.statuses.has('stunned')) return 0;
    let m = 1;
    for (const s of this.statuses.values()) {
      if (s.speedMultiplier !== undefined) m = Math.min(m, s.speedMultiplier);
    }
    return m;
  }

  get dominantTint(): number | null {
    for (const kind of PRIORITY) {
      if (this.statuses.has(kind)) return STATUS_TINT[kind] ?? null;
    }
    return null;
  }

  get dominantIcon(): string {
    for (const kind of PRIORITY) {
      if (this.statuses.has(kind)) return STATUS_ICON[kind] ?? '';
    }
    return '';
  }

  update(deltaMs: number, enemy: Enemy): void {
    if (this.statuses.size === 0) return;
    let changed = false;
    for (const [kind, s] of [...this.statuses]) {
      if (!enemy.isAlive) break;
      s.timeLeft -= deltaMs;
      if (s.tickDamage && s.tickRateMs) {
        s.tickAcc += deltaMs;
        while (s.tickAcc >= s.tickRateMs && enemy.isAlive) {
          s.tickAcc -= s.tickRateMs;
          enemy.takeDamage(s.tickDamage, { pieId: s.pieId, sourceStatus: kind, fromDot: true });
        }
      }
      if (s.timeLeft <= 0) {
        this.statuses.delete(kind);
        changed = true;
      }
    }
    if (changed && enemy.isAlive) enemy.refreshTint();
  }
}
