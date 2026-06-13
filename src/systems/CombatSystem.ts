import type { GameScene } from '../scenes/GameScene';
import { GameEvents } from '../game/GameEvents';
import { SCORING } from '../data/balance';
import { SaveSystem } from './SaveSystem';
import { Enemy } from '../entities/Enemy';

interface DamagedPayload {
  amount: number;
  x: number;
  y: number;
  isBoss?: boolean;
  fromDot?: boolean;
}

interface KilledPayload {
  x: number;
  y: number;
  scoreValue: number;
  special?: string;
  isBoss?: boolean;
}

/**
 * Scoring + combo logic. Listens on the gameplay bus for damage/kill/player-hit
 * events and maintains score, combo count and a decaying multiplier.
 */
export class CombatSystem {
  score = 0;
  combo = 0;
  comboMultiplier = 1;
  highScore: number;

  private comboTimer = 0;

  constructor(private scene: GameScene) {
    this.highScore = SaveSystem.getHighScore();
    scene.bus.on(GameEvents.ENEMY_DAMAGED, this.onEnemyDamaged, this);
    scene.bus.on(GameEvents.ENEMY_KILLED, this.onEnemyKilled, this);
    scene.bus.on(GameEvents.PLAYER_DAMAGED, this.onPlayerDamaged, this);
  }

  private onEnemyDamaged(p: DamagedPayload): void {
    if (p.fromDot) {
      this.addScore(1);
    } else if (p.isBoss) {
      this.addScore(Math.max(1, Math.round(p.amount / SCORING.bossDamageDivisor)));
    } else {
      this.addScore(SCORING.hitPoints);
    }
  }

  private onEnemyKilled(p: KilledPayload): void {
    this.combo += 1;
    this.comboTimer = SCORING.comboWindowMs;
    this.comboMultiplier = Math.min(SCORING.maxComboMultiplier, 1 + this.combo * SCORING.comboStep);

    const base = p.isBoss ? SCORING.bossKill : p.scoreValue || SCORING.killBase;
    const bonus = Enemy.specialBonus(p.special);
    const points = Math.round(base * this.comboMultiplier) + bonus;
    this.addScore(points, p.x, p.y, true);

    if (p.special && bonus > 0) {
      const label =
        p.special === 'mushroomAlly' ? 'BETRAYAL!' : p.special === 'chiliBurn' ? 'BURNED!' : 'MELTED!';
      this.scene.effects.floatingText(p.x, p.y - 70, label, { color: '#ffe08a', fontSize: 28 });
    }

    this.emitCombo();
  }

  private onPlayerDamaged(): void {
    this.resetCombo();
  }

  /** Flat bonus from a special pie interaction (cherry combo, chain hit, pumpkin wipe). */
  addBonus(points: number, label: string, x: number, y: number): void {
    this.addScore(points);
    this.scene.effects.floatingText(x, y - 40, `${label} +${points}`, { color: '#ffe08a', fontSize: 26 });
  }

  addScore(points: number, x?: number, y?: number, showText = false): void {
    this.score += points;
    this.scene.bus.emit(GameEvents.SCORE_CHANGED, { score: this.score });
    if (showText && x !== undefined && y !== undefined) {
      this.scene.effects.floatingText(x, y - 18, `+${points}`, { color: '#fff4d6', fontSize: 24, rise: 50 });
    }
  }

  private resetCombo(): void {
    if (this.combo > 0) {
      this.combo = 0;
      this.comboMultiplier = 1;
      this.emitCombo();
    }
  }

  private emitCombo(): void {
    this.scene.bus.emit(GameEvents.COMBO_CHANGED, { combo: this.combo, multiplier: this.comboMultiplier });
  }

  update(deltaMs: number): void {
    if (this.comboTimer > 0) {
      this.comboTimer -= deltaMs;
      if (this.comboTimer <= 0) this.resetCombo();
    }
  }

  /** Persist + report whether the run set a new record. */
  finalize(): boolean {
    const record = SaveSystem.submitScore(this.score);
    if (record) this.highScore = this.score;
    return record;
  }
}
