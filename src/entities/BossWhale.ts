import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { ENEMY_TYPES } from '../data/enemyTypes';
import { ARENA } from '../game/constants';
import { GameEvents } from '../game/GameEvents';
import { AUDIO } from '../utils/assetKeys';
import { randBetween, pickRandom } from '../utils/math';
import type { GameScene } from '../scenes/GameScene';

type BossPhase = 'reposition' | 'charge' | 'summon' | 'splash' | 'recover';

/**
 * Boss Whale — Captain Leviathan. Cycles through reposition → (charge | summon |
 * splash) → recover (vulnerable window). Resistant to freeze/confusion via ccResist.
 */
export class BossWhale extends Enemy {
  private phase: BossPhase = 'reposition';
  private phaseTimer = 1400;
  private chargeDir = 1;
  private targetX = ARENA.maxX - 200;
  private targetY = (ARENA.minY + ARENA.maxY) / 2;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, ENEMY_TYPES.bossWhale);
    this.pickRepositionTarget();
  }

  override takeDamage(amount: number, opts: Parameters<Enemy['takeDamage']>[1] = {}): void {
    super.takeDamage(amount, opts);
    this.gscene.bus.emit(GameEvents.BOSS_HEALTH_CHANGED, {
      health: Math.max(0, this.health),
      max: this.maxHealthValue,
    });
  }

  protected override updateAI(deltaMs: number): void {
    this.phaseTimer -= deltaMs;
    switch (this.phase) {
      case 'reposition':
        this.moveToward(this.targetX, this.targetY, 0.85);
        if (
          Phaser.Math.Distance.Between(this.x, this.y, this.targetX, this.targetY) < 70 ||
          this.phaseTimer <= 0
        ) {
          this.startAttack();
        }
        break;

      case 'charge':
        this.setVelocity(this.chargeDir * this.def.speed * 3.1, 0);
        if (this.phaseTimer <= 0 || this.x < ARENA.minX + 160 || this.x > ARENA.maxX - 160) {
          this.enterRecover(1300);
        }
        break;

      case 'summon':
      case 'splash':
        this.setVelocity(0, 0);
        if (this.phaseTimer <= 0) this.enterRecover(this.phase === 'splash' ? 1500 : 1100);
        break;

      case 'recover':
        // Vulnerable window — sits still.
        this.setVelocity(0, 0);
        if (this.phaseTimer <= 0) this.beginReposition();
        break;
    }
  }

  private startAttack(): void {
    const choice = pickRandom(['charge', 'summon', 'splash'] as const);
    if (choice === 'charge') this.doCharge();
    else if (choice === 'summon') this.doSummon();
    else this.doSplash();
  }

  private doCharge(): void {
    this.phase = 'charge';
    this.phaseTimer = 1500;
    this.chargeDir = this.gscene.player.x >= this.x ? 1 : -1;
    this.gscene.audio.playSfx(AUDIO.heavyImpact, 0.6);
    this.gscene.effects.floatingText(this.x, this.y - 160, 'CHARGE!', { color: '#ff5470', fontSize: 48 });
  }

  private doSummon(): void {
    this.phase = 'summon';
    this.phaseTimer = 950;
    this.gscene.effects.ring(this.x, this.y, 260, 0x8a5ad6, 600);
    this.gscene.effects.floatingText(this.x, this.y - 160, 'SUMMON!', { color: '#c77aff', fontSize: 44 });
    for (let i = 0; i < 3; i++) {
      const sx = i === 0 ? ARENA.minX + 40 : ARENA.maxX - 40;
      const sy = randBetween(ARENA.minY, ARENA.maxY);
      this.gscene.spawnEnemyAt('fish', sx, sy);
    }
  }

  private doSplash(): void {
    this.phase = 'splash';
    this.phaseTimer = 800;
    this.gscene.effects.shake('big');
    this.gscene.effects.ring(this.x, this.y, 520, 0x6a7bd6, 700);
    this.gscene.effects.burst(this.x, this.y, {
      tints: [0x6a7bd6, 0xffffff, 0x9fd0ff],
      count: 36,
      speed: 480,
      lifespan: 620,
      scale: 1.5,
    });
    this.gscene.effects.floatingText(this.x, this.y - 160, 'SPLASH!', { color: '#6a7bd6', fontSize: 46 });

    const p = this.gscene.player;
    if (Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) < 520) {
      p.takeDamage(this.def.contactDamage, this.x, this.y);
    }
  }

  private enterRecover(ms: number): void {
    this.phase = 'recover';
    this.phaseTimer = ms;
  }

  private beginReposition(): void {
    this.pickRepositionTarget();
    this.phase = 'reposition';
    this.phaseTimer = 1700;
  }

  private pickRepositionTarget(): void {
    // Hover to the opposite horizontal side of the player, mid-height.
    const p = this.gscene.player;
    this.targetX = p.x < (ARENA.minX + ARENA.maxX) / 2 ? ARENA.maxX - 220 : ARENA.minX + 220;
    this.targetY = Phaser.Math.Clamp(p.y + randBetween(-120, 120), ARENA.minY + 40, ARENA.maxY - 40);
  }
}
