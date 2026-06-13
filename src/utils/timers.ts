import Phaser from 'phaser';

/** Schedule a one-shot callback on a scene's clock. Returns the timer event. */
export function after(
  scene: Phaser.Scene,
  delayMs: number,
  callback: () => void,
): Phaser.Time.TimerEvent {
  return scene.time.delayedCall(delayMs, callback);
}

/** Schedule a repeating callback. `repeat = -1` loops forever. */
export function every(
  scene: Phaser.Scene,
  delayMs: number,
  callback: () => void,
  repeat = -1,
): Phaser.Time.TimerEvent {
  return scene.time.addEvent({ delay: delayMs, loop: repeat === -1, repeat: repeat === -1 ? 0 : repeat, callback });
}

/**
 * A lightweight, frame-driven cooldown counter (ms). Decrements via `update(dt)`
 * and reports remaining time / ready state. Used for pies and the dash.
 */
export class Cooldown {
  private remaining = 0;
  constructor(public durationMs: number) {}

  start(durationMs = this.durationMs): void {
    this.durationMs = durationMs;
    this.remaining = durationMs;
  }

  update(deltaMs: number): void {
    if (this.remaining > 0) {
      this.remaining = Math.max(0, this.remaining - deltaMs);
    }
  }

  get ready(): boolean {
    return this.remaining <= 0;
  }

  get remainingMs(): number {
    return this.remaining;
  }

  /** 0 (just started) → 1 (ready). */
  get progress(): number {
    if (this.durationMs <= 0) return 1;
    return 1 - this.remaining / this.durationMs;
  }

  reset(): void {
    this.remaining = 0;
  }
}
