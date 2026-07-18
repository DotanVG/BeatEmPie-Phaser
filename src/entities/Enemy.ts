import Phaser from 'phaser';
import type { EnemyType, StatusKind } from '../types/game';
import type { GameScene } from '../scenes/GameScene';
import { DEPTHS } from '../game/constants';
import { GameEvents } from '../game/GameEvents';
import { StatusController, StatusApply } from './StatusController';
import { hitFlash } from '../utils/animation';
import { emojiText } from '../utils/text';
import { SCORING } from '../data/balance';
import { TEX } from '../utils/assetKeys';

/** Zombie-green flash tint for confused (mushroomed) enemies. */
const ZOMBIE_TINT = 0x63e06a;

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
  private iceImage?: Phaser.GameObjects.Image;
  private blinkPhase = 0;
  private blinkOn = true;
  private arcTimer = 0;
  private flameTimer = 0;
  private trailTimer = 0;

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
    this.iceImage?.destroy();
    this.iceImage = undefined;

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
      this.updateStatusFx(deltaMs);
      return;
    }

    if (this.status.isFrozen || this.status.isStunned) {
      this.setVelocity(0, 0);
      this.updateStatusFx(deltaMs);
      return;
    }

    if (this.status.isConfused) {
      this.updateConfused(deltaMs);
    } else {
      this.updateAI(deltaMs);
    }

    this.setFlipX((this.body as Phaser.Physics.Arcade.Body).velocity.x < -2);
    this.updateStatusFx(deltaMs);
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

  /**
   * All per-frame status visuals:
   * - the dominant emoji blinks slowly at first, exponentially faster as the
   *   effect nears its end, then vanishes with the effect;
   * - frozen enemies are encased in a translucent ice crystal sized to them;
   * - stunned (lemon) enemies get little electric arcs wrapping the body;
   * - confused (mushroom) enemies flash zombie-green;
   * - burning enemies visibly carry flames even after leaving the trail;
   * - chocolate-covered enemies drip a goo trail that lingers behind them.
   */
  private updateStatusFx(deltaMs: number): void {
    const icon = this.status.dominantIcon;
    const remain = this.status.dominantRemainingFraction;

    // Accelerating blink: ~1.6Hz fresh -> ~12Hz right before the effect breaks.
    if (remain !== null) {
      const freq = 1.6 + 10.4 * Math.pow(1 - remain, 3);
      this.blinkPhase += (deltaMs / 1000) * freq;
      this.blinkOn = Math.sin(this.blinkPhase * Math.PI * 2) > -0.35;
    } else {
      this.blinkPhase = 0;
      this.blinkOn = true;
    }

    if (!icon) {
      this.statusText?.setVisible(false);
    } else {
      if (!this.statusText) {
        this.statusText = emojiText(this.gscene, this.x, this.y, icon, 30).setDepth(DEPTHS.FLOATING_TEXT);
      }
      this.statusText
        .setText(icon)
        .setVisible(this.blinkOn)
        .setPosition(this.x, this.y - this.displayHeight * 0.62);
    }

    this.updateIceBlock();

    // Zombie-green flashing while mushroomed.
    if (this.status.isConfused) {
      this.setTint(this.blinkOn ? ZOMBIE_TINT : this.def.tint);
    }

    // Electric arcs while paralyzed by the lemon chain.
    this.arcTimer -= deltaMs;
    if (this.status.isStunned && this.arcTimer <= 0) {
      this.arcTimer = 150 + Math.random() * 140;
      const r = this.def.bodyRadius;
      const y1 = this.y + Phaser.Math.Between(-r, r) * 0.6;
      const y2 = this.y + Phaser.Math.Between(-r, r) * 0.6;
      this.gscene.effects.lightning(
        [{ x: this.x - r * 0.95, y: y1 }, { x: this.x + r * 0.95, y: y2 }],
        0xffe24a,
      );
    }

    // Visible flames while burning (inside the trail or lingering after it).
    this.flameTimer -= deltaMs;
    if (this.status.has('burning') && this.flameTimer <= 0) {
      this.flameTimer = 120 + Math.random() * 100;
      const flame = this.gscene.add
        .image(this.x + Phaser.Math.Between(-14, 14), this.y + Phaser.Math.Between(-6, 10), TEX.fireTrail)
        .setDepth(this.depth + 1)
        .setTint(Math.random() < 0.5 ? 0xff9a33 : 0xffd166)
        .setAlpha(0.85)
        .setScale(Phaser.Math.FloatBetween(0.45, 0.8));
      this.gscene.tweens.add({
        targets: flame,
        y: flame.y - 26,
        alpha: 0,
        scaleY: flame.scaleY * 1.5,
        duration: 320,
        ease: 'Quad.easeOut',
        onComplete: () => flame.destroy(),
      });
    }

    // Chocolate drip trail that outlives the puddle contact.
    this.trailTimer -= deltaMs;
    if (this.status.has('chocolateDot') && this.trailTimer <= 0) {
      this.trailTimer = 110;
      const blob = this.gscene.add
        .image(this.x + Phaser.Math.Between(-10, 10), this.y + this.displayHeight * 0.34, TEX.particle)
        .setDepth(DEPTHS.PUDDLE)
        .setTint(0x6b4226)
        .setAlpha(0.55)
        .setScale(Phaser.Math.FloatBetween(0.9, 1.7), Phaser.Math.FloatBetween(0.5, 0.8));
      this.gscene.tweens.add({
        targets: blob,
        alpha: 0,
        duration: 1500,
        ease: 'Quad.easeIn',
        onComplete: () => blob.destroy(),
      });
    }
  }

  /** Translucent teal ice crystal encasing a frozen enemy; shatters on thaw. */
  private updateIceBlock(): void {
    if (this.status.isFrozen) {
      if (!this.iceImage) {
        const r = this.def.bodyRadius;
        this.iceImage = this.gscene.add
          .image(this.x, this.y, TEX.ice)
          .setDepth(this.depth + 2)
          .setTint(0x8fe0ff)
          .setAlpha(0.5);
        // The bigger the fish, the bigger the ice.
        this.iceImage.setDisplaySize(r * 2.9, r * 2.6);
      }
      this.iceImage
        .setPosition(this.x, this.y)
        .setAlpha(0.42 + 0.12 * Math.sin(this.blinkPhase * Math.PI * 2));
    } else if (this.iceImage) {
      // Shatter.
      this.gscene.effects.burst(this.x, this.y, {
        tints: [0x8fe0ff, 0xdff4ff, 0xffffff],
        count: 12,
        speed: 260,
        lifespan: 380,
        scale: 0.9,
      });
      this.iceImage.destroy();
      this.iceImage = undefined;
    }
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
    this.iceImage?.destroy();
    this.iceImage = undefined;
    super.destroy(fromScene);
  }
}
