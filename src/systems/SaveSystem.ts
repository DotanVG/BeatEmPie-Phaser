import type { SaveData } from '../types/game';

/**
 * Thin, defensive wrapper over localStorage. All access is wrapped in try/catch
 * so private-mode / disabled storage never crashes the game (it just stops persisting).
 */
const KEY = 'beatempie.save.v1';

const DEFAULTS: SaveData = {
  highScore: 0,
  musicVolume: 0.5,
  sfxVolume: 0.7,
  muted: false,
};

export class SaveSystem {
  static load(): SaveData {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...DEFAULTS };
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      return { ...DEFAULTS, ...parsed };
    } catch {
      return { ...DEFAULTS };
    }
  }

  static save(data: SaveData): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* storage unavailable — ignore */
    }
  }

  static getHighScore(): number {
    return this.load().highScore;
  }

  /** Persists score only if it beats the stored high score. Returns true if it was a record. */
  static submitScore(score: number): boolean {
    const data = this.load();
    if (score > data.highScore) {
      data.highScore = score;
      this.save(data);
      return true;
    }
    return false;
  }

  static patch(partial: Partial<SaveData>): SaveData {
    const data = { ...this.load(), ...partial };
    this.save(data);
    return data;
  }
}
