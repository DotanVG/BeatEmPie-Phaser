import Phaser from 'phaser';
import type { EnemyType, StatusKind } from '../types/game';
import type { GameScene } from '../scenes/GameScene';
import { DEPTHS } from '../game/constants';
import { GameEvents } from '../game/GameEvents';
import { StatusController, StatusApply } from './StatusController';
import { hitFlash } from '../utils/animation';
import { emojiText } from '../utils/text';
import { SCORING } from '../data/balance';

export interface DamageOpts {
  pieId?: string;
  sourceStatus?: StatusKind;
  fromDot?: boolean;
  isCrit?: boolean;
}

/**
 * Base enemy: health, status effects, knockback, contact behaviour and a chase AI.
 * Subclasses override `updateAI` for bespoke movement (zig-zag, puffer burst, boss phases).
 */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly def: EnemyType;
  health: number;
  readonly maxHealthValue: number;
  readonly status = new StatusController();
  readonly isBoss: boolean;

  protected gscene: GameScene;
  protected knockbackTimer = 0;
  protected allyHitCd = 0;
  protected wanderTimer = 0;
  protected wanderAngle = 0;
  protected dead = false;

  private statusText?: Phaser.GameObjects.Text;

  constructor(scene: GameScene, x: number, y: number, def: EnemyType) {
    super(scene, x, y, def.textureKey);
    this.gscene = scene;
    this.def = def;
    this.health = def.maxHealth;
    this.maxHealthValue = def.maxHealth;
    this.isBoss = def.id === 'bossWhale';

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(def.scale);
    this.setDepth(this.isBoss ? DEPTHS.ENEMY + 1 : DEPTHS.ENEMY);
    this.setTint(def.tint);
    this.setCollideWorldBounds(false);
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
  }

  get isAlive(): boolean {
    return !this.dead && this.active;
  }

  /** Restore the body tint based on the dominant active status (or the base tint). */
  refreshTint(): void {
    if (this.dead) return;
    const tint = this.status.dominantTint;
    this.setTint(tint ?? this.def.tint);
  }

  applyStatus(a: StatusApply): void {
    if (this.def.ccResist >= 1) return; // fully immune (none currently, but future-proof)
    const scaled: StatusApply = { ...a, durationMs: a.durationMs * (1 - this.def.ccResist) };
    this.status.apply(scaled, this);
  }

  applyKnockback(fromX: number, fromY: number, force: number): void {
    const resisted = force * (1 - this.def.knockbackResist);
    if (resisted <= 5) return;
    const ang = Math.atan2(this.y - fromY, this.x - fromX);
    this.setVelocity(Math.cos(ang) * resisted, Math.sin(ang) * resisted);
    this.knockbackTimer = 260;
  }

  takeDamage(amount: number, opts: DamageOpts = {}): void {
    if (this.dead) return;
    this.health -= amount;
    if (!opts.fromDot) hitFlash(this.gscene, this);

    // Damage numbers (DOT ticks shown smaller & dimmer to avoid spam).
    this.gscene.effects.floatingText(
      this.x,
      this.y - this.displayHeight * 0.4,
      `${Math.round(amount)}`,
      opts.fromDot
        ? { color: '#ffb340', fontSize: 22, rise: 40, durationMs: 460, strokeThickness: 4 }
        : { color: opts.isCrit ? '#ffe08a' : '#fff4d6', fontSize: opts.isCrit ? 42 : 30 },
    );

    this.gscene.bus.emit(GameEvents.ENEMY_DAMAGED, {
      enemy: this,
      amount,
      x: this.x,
      y: this.y,
      pieId: opts.pieId,
      isBoss: this.isBoss,
      fromDot: opts.fromDot,
    });

    if (this.health <= 0) {
      let special: string | undefined;
      if (opts.pieId === 'mushroom') special = 'mushroomAlly';
      else if (opts.sourceStatus === 'chocolateDot') special = 'chocolateDot';
      else if (opts.sourceStatus === 'burning' || opts.sourceStatus === 'fireDot') special = 'chiliBurn';
      this.die(opts.pieId, special);
    }
  }

  die(pieId?: string, special?: string): void {
    if (this.dead) return;
    this.dead = true;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.setVelocity(0, 0);
    this.statusText?.destroy();
    this.statusText = undefined;

    this.gscene.bus.emit(GameEvents.ENEMY_KILLED, {
      enemy: this,
      kind: this.def.id,
      x: this.x,
      y: this.y,
      scoreValue: this.def.scoreValue,
      pieId,
      special,
      isBoss: this.isBoss,
    });

    this.gscene.audio.playSfx('sfx-enemy-death');
    this.gscene.effects.burst(this.x, this.y, {
      tints: [this.def.tint, 0xffffff, 0xfff4d6],
      count: 14,
      speed: 240,
      lifespan: 480,
      scale: 1,
    });

    this.gscene.tweens.add({
      targets: this,
      scale: this.def.scale * 1.3,
      alpha: 0,
      angle: this.flipX ? -120 : 120,
      duration: 280,
      ease: 'Quad.easeIn',
      onComplete: () => this.destroy(),
    });
  }

  /** Per-frame logic, driven by GameScene.update (not preUpdate, so it pauses cleanly). */
  tick(deltaMs: number): void {
    if (this.dead) return;
    this.status.update(deltaMs, this);
    if (this.dead) return;

    if (this.knockbackTimer > 0) {
      this.knockbackTimer -= deltaMs;
      const b = this.body as Phaser.Physics.Arcade.Body;
      this.setVelocity(b.velocity.x * 0.9, b.velocity.y * 0.9);
      this.updateStatusIcon();
      return;
    }

    if (this.status.isFrozen || this.status.isStunned) {
      this.setVelocity(0, 0);
      this.updateStatusIcon();
      return;
    }

    if (this.status.isConfused) {
      this.updateConfused(deltaMs);
    } else {
      this.updateAI(deltaMs);
    }

    this.setFlipX((this.body as Phaser.Physics.Arcade.Body).velocity.x < -2);
    this.updateStatusIcon();
  }

  /** Default behaviour: swim straight at Shushki. */
  protected updateAI(_deltaMs: number): void {
    this.moveToward(this.gscene.player.x, this.gscene.player.y);
  }

  protected updateConfused(deltaMs: number): void {
    const ally = this.gscene.getNearestEnemy(this.x, this.y, this);
    if (ally) {
      this.moveToward(ally.x, ally.y);
      const reach = this.def.bodyRadius + ally.def.bodyRadius + 12;
      this.allyHitCd -= deltaMs;
      if (Phaser.Math.Distance.Between(this.x, this.y, ally.x, ally.y) < reach && this.allyHitCd <= 0) {
        this.allyHitCd = 650;
        ally.takeDamage(Math.round(this.def.contactDamage * 1.6), { pieId: 'mushroom' });
        this.gscene.effects.ring(ally.x, ally.y, 50, 0xc77aff, 260);
      }
    } else {
      // No allies — wander aimlessly.
      this.wanderTimer -= deltaMs;
      if (this.wanderTimer <= 0) {
        this.wanderTimer = 700 + Math.random() * 600;
        this.wanderAngle = Math.random() * Math.PI * 2;
      }
      const sp = this.def.speed * 0.5 * this.status.speedMultiplier;
      this.setVelocity(Math.cos(this.wanderAngle) * sp, Math.sin(this.wanderAngle) * sp);
    }
  }

  protected moveToward(tx: number, ty: number, scale = 1): void {
    const sp = this.def.speed * this.status.speedMultiplier * scale;
    const ang = Math.atan2(ty - this.y, tx - this.x);
    this.setVelocity(Math.cos(ang) * sp, Math.sin(ang) * sp);
  }

  private updateStatusIcon(): void {
    const icon = this.status.dominantIcon;
    if (!icon) {
      this.statusText?.setVisible(false);
      return;
    }
    if (!this.statusText) {
      this.statusText = emojiText(this.gscene, this.x, this.y, icon, 30).setDepth(DEPTHS.FLOATING_TEXT);
    }
    this.statusText.setText(icon).setVisible(true).setPosition(this.x, this.y - this.displayHeight * 0.62);
  }

  /** Bonus score lookups for special kills (used by CombatSystem). */
  static specialBonus(special?: string): number {
    switch (special) {
      case 'mushroomAlly':
        return SCORING.mushroomAllyKill;
      case 'chocolateDot':
        return SCORING.chocolateDotKill;
      case 'chiliBurn':
        return SCORING.chiliBurnKill;
      default:
        return 0;
    }
  }

  override destroy(fromScene?: boolean): void {
    this.statusText?.destroy();
    this.statusText = undefined;
    super.destroy(fromScene);
  }
}
