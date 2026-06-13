export type Facing = 'left' | 'right';

/** Returns the facing implied by a horizontal delta, keeping the previous facing when neutral. */
export function facingFromDelta(dx: number, previous: Facing): Facing {
  if (dx > 1) return 'right';
  if (dx < -1) return 'left';
  return previous;
}

/** Phaser flipX value for a given facing (sprites authored facing left). */
export function flipForFacing(facing: Facing): boolean {
  return facing === 'right';
}
