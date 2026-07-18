import type { PieTargetMode } from '../types/game';

export interface TargetPoint {
  x: number;
  y: number;
}

export interface TargetBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface ResolvedDropPoint {
  tx: number;
  ty: number;
  /** Which enemy pick (if any) the caller should attach for homing. */
  homing: 'strongest' | null;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/**
 * Pure targeting rule for every pie drop — extracted so it is unit-testable.
 *
 * THE contract (see tests/pieTargeting.test.mjs):
 * - Every mode except `homing` lands EXACTLY at the clicked point (arena-clamped)
 *   whenever a click/tap point is provided. That includes Lemon Meringue
 *   (chain starts at the impact point) and Pumpkin (ultimate hits everything,
 *   the pie itself falls at the click).
 * - `homing` (Strawberry, the assassin) ignores the click and hunts the
 *   strongest opponent; with no enemies it drops in front of the player.
 * - Without a click point (Space / auto-drop button): nearest enemy, else in
 *   front of the player.
 */
export function resolveDropPoint(
  mode: PieTargetMode,
  preferred: TargetPoint | undefined,
  player: TargetPoint & { facingSign: number },
  nearestEnemy: TargetPoint | null,
  strongestEnemy: TargetPoint | null,
  bounds: TargetBounds,
): ResolvedDropPoint {
  const cl = (p: TargetPoint): { tx: number; ty: number } => ({
    tx: clamp(p.x, bounds.minX, bounds.maxX),
    ty: clamp(p.y, bounds.minY, bounds.maxY),
  });
  const front = cl({ x: player.x + player.facingSign * 150, y: player.y });

  if (mode === 'homing') {
    return strongestEnemy ? { ...cl(strongestEnemy), homing: 'strongest' } : { ...front, homing: null };
  }
  // All other modes: an explicit click/tap ALWAYS wins.
  if (preferred) return { ...cl(preferred), homing: null };
  // Auto-drop fallbacks.
  if (mode === 'screenWide') return { tx: clamp(player.x, bounds.minX, bounds.maxX), ty: clamp(player.y, bounds.minY, bounds.maxY), homing: null };
  return nearestEnemy ? { ...cl(nearestEnemy), homing: null } : { ...front, homing: null };
}
