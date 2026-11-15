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

  /** 0 (just started) → 1 (ready). */
  get progress(): number {
    if (this.durationMs <= 0) return 1;
    return 1 - this.remaining / this.durationMs;
  }
}
