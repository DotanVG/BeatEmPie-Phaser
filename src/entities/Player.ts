import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { PLAYER } from '../data/balance';
import { ARENA, DEPTHS } from '../game/constants';
import { GameEvents } from '../game/GameEvents';
import { TEX, ANIM, AUDIO, PLAYER_FRAME } from '../utils/assetKeys';
import { Cooldown } from '../utils/timers';
import { hitFlash } from '../utils/animation';
import { facingFromDelta, flipForFacing } from '../utils/direction';
import type { Facing } from '../utils/direction';
import { hasPlayerAnims } from '../utils/playerAnims';

/**
 * Shushki — the player. Free 2D movement within the arena band, a dashing burst,
 * invulnerability frames, knockback and a "call pie" pose.
 *
 * Uses the frame-based animation sheets (idle/run/attack/hurt/death, authored
 * facing RIGHT) when they loaded; otherwise falls back to the legacy
 * single-frame textures + procedural squash (authored facing LEFT).
 * JUMP animations are registered and ready but not yet driven by gameplay.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  health: number;
  readonly maxHealth = PLAYER.maxHealth;
  facing: Facing = 'right';

  readonly dashCooldown = new Cooldown(PLAYER.dashCooldownMs);

  private gscene: GameScene;
  private shadow: Phaser.GameObjects.Image;
  private moveX = 0;
  private moveY = 0;
  private dashTimer = 0;
  private knockbackTimer = 0;
  private invulnTimer = 0;
  private callPoseTimer = 0;
  private walkPhase = 0;
  private walkFrameTimer = 0;
  private walkFrame = 0;
  private baseScale = 0.82;
  private dead = false;
  /** Frame-based animation sheets loaded — use real anims instead of pose swaps. */
  private readonly useAnims: boolean;

  constructor(scene: GameScene, x: number, y: number) {
    const withAnims = hasPlayerAnims(scene);
    super(scene, x, y, withAnims ? TEX.shushkiAnimIdle : TEX.shushkiIdle, withAnims ? 0 : undefined);
    this.useAnims = withAnims;
    this.gscene = scene;
    this.health = this.maxHealth;

    this.shadow = scene.add
      .image(x, y, TEX.shadow)
      .setDepth(DEPTHS.SHADOW)
      .setScale(1.4)
      .setAlpha(0.5);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    if (this.useAnims) this.baseScale = 1.15; // ~131px art in a 180px frame ≈ legacy display height
    this.setScale(this.baseScale);
    this.setDepth(DEPTHS.PLAYER);
    this.setCollideWorldBounds(false);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    if (this.useAnims) {
      // Frames are bottom-anchored on the 152x180 canvas; size the body around
      // the actual character, not the (mostly empty) frame.
      body.setSize(64, 100);
      body.setOffset((PLAYER_FRAME.width - 64) / 2, PLAYER_FRAME.height - 2 - 100);
      this.play(ANIM.idle);
    } else {
      // Tighter body than the tall sprite for fairer hits.
      body.setSize(this.width * 0.55, this.height * 0.7);
    }
  }

  get isAlive(): boolean {
    return !this.dead && this.active;
  }

  get isDashing(): boolean {
    return this.dashTimer > 0;
  }

  get facingSign(): number {
    return this.facing === 'left' ? -1 : 1;
  }

  /** Called every frame by InputSystem with the intended move direction (-1..1). */
  setMoveDirection(x: number, y: number): void {
    this.moveX = x;
    this.moveY = y;
  }

  faceToward(worldX: number): void {
    if (worldX < this.x - 4) this.facing = 'left';
    else if (worldX > this.x + 4) this.facing = 'right';
  }

  tryDash(): boolean {
    if (!this.dashCooldown.ready || this.isDashing || this.dead) return false;
    let dx = this.moveX;
    let dy = this.moveY;
    if (dx === 0 && dy === 0) dx = this.facingSign; // dash forward if standing still
    const len = Math.hypot(dx, dy) || 1;
    this.setVelocity((dx / len) * PLAYER.dashSpeed, (dy / len) * PLAYER.dashSpeed);
    this.dashTimer = PLAYER.dashDurationMs;
    this.invulnTimer = Math.max(this.invulnTimer, PLAYER.dashDurationMs + 60);
    this.dashCooldown.start();
    if (this.useAnims) this.play(ANIM.jumpLoop, true);
    else this.setTexture(TEX.shushkiJump);
    this.gscene.audio.playSfx(AUDIO.pieCall, 0.4);
    this.gscene.effects.ring(this.x, this.y, 90, 0xffe08a, 260);
    return true;
  }

  /** Visual flourish when a pie is summoned. */
  callPie(targetX: number): void {
    this.faceToward(targetX);
    this.callPoseTimer = this.useAnims ? 340 : 220;
    if (this.useAnims && !this.dead) this.play(ANIM.attack, false);
    this.gscene.effects.ring(this.x, this.y - this.displayHeight * 0.3, 60, 0xfff4d6, 240);
  }

  takeDamage(amount: number, fromX?: number, fromY?: number): void {
    if (this.dead || this.invulnTimer > 0 || this.isDashing) return;
    this.health = Math.max(0, this.health - amount);
    this.invulnTimer = PLAYER.invulnMs;

    hitFlash(this.gscene, this, 120);
    if (this.useAnims && this.health > 0) this.play(ANIM.hurt, false);
    this.gscene.audio.playSfx(AUDIO.playerHurt);
    this.gscene.effects.shake('medium');
    this.gscene.effects.floatingText(this.x, this.y - this.displayHeight * 0.5, `-${amount}`, {
      color: '#ff5470',
      fontSize: 36,
    });

    if (fromX !== undefined && fromY !== undefined) {
      const ang = Math.atan2(this.y - fromY, this.x - fromX);
      this.setVelocity(Math.cos(ang) * PLAYER.knockbackForce, Math.sin(ang) * PLAYER.knockbackForce);
      this.knockbackTimer = 200;
    }

    this.gscene.bus.emit(GameEvents.PLAYER_DAMAGED, { amount, x: this.x, y: this.y });
    this.gscene.bus.emit(GameEvents.PLAYER_HEALTH_CHANGED, { health: this.health, max: this.maxHealth });

    if (this.health <= 0) this.defeat();
  }

  private defeat(): void {
    this.dead = true;
    this.setVelocity(0, 0);
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.gscene.bus.emit(GameEvents.PLAYER_DIED, {});
    if (this.useAnims) {
      // Full collapse animation, ending face-up with X-X eyes.
      this.setScale(this.baseScale);
      this.play(ANIM.death, false);
    } else {
      this.gscene.tweens.add({
        targets: this,
        angle: this.facing === 'left' ? 90 : -90,
        alpha: 0.6,
        y: this.y + 30,
        duration: 500,
        ease: 'Quad.easeIn',
      });
    }
  }

  /** Driven by GameScene.update so it pauses with the scene. */
  tick(deltaMs: number): void {
    this.dashCooldown.update(deltaMs);
    this.gscene.bus.emit(GameEvents.DASH_COOLDOWN_CHANGED, { progress: this.dashCooldown.progress });

    if (this.dead) {
      // Keep the death animation fully visible — no invulnerability blink.
      this.setAlpha(this.useAnims ? 1 : 0.6);
      this.syncShadow();
      return;
    }

    if (this.invulnTimer > 0) {
      this.invulnTimer -= deltaMs;
      this.setAlpha(this.invulnTimer > 0 && Math.floor(this.invulnTimer / 80) % 2 === 0 ? 0.4 : 1);
    } else {
      this.setAlpha(1);
    }

    if (this.dashTimer > 0) {
      this.dashTimer -= deltaMs;
      if (this.dashTimer <= 0 && !this.useAnims) this.setTexture(TEX.shushkiIdle);
    } else if (this.knockbackTimer > 0) {
      this.knockbackTimer -= deltaMs;
      const b = this.body as Phaser.Physics.Arcade.Body;
      this.setVelocity(b.velocity.x * 0.86, b.velocity.y * 0.86);
    } else {
      const len = Math.hypot(this.moveX, this.moveY);
      if (len > 0) {
        this.setVelocity((this.moveX / len) * PLAYER.speed, (this.moveY / len) * PLAYER.speed);
        // Face the horizontal movement direction (scaled so the touch joystick's fractional
        // values still register through facingFromDelta's ±1 threshold).
        this.facing = facingFromDelta(this.moveX * 100, this.facing);
      } else {
        this.setVelocity(0, 0);
      }
    }

    if (this.callPoseTimer > 0) this.callPoseTimer -= deltaMs;
    if (this.useAnims) this.updateAnimPose();
    else this.updatePose(deltaMs);
    this.clampToArena();
    this.syncShadow();
  }

  /** Frame-animation state selection. Art faces RIGHT, so flip when facing left. */
  private updateAnimPose(): void {
    this.setFlipX(this.facing === 'left');

    if (this.isDashing) {
      this.play(ANIM.jumpLoop, true);
      return;
    }

    // Let one-shot attack / hurt animations finish before resuming locomotion.
    const current = this.anims.currentAnim?.key;
    if (this.anims.isPlaying && (current === ANIM.attack || current === ANIM.hurt)) return;

    const moving = Math.hypot(this.moveX, this.moveY) > 0.1;
    this.play(moving ? ANIM.run : ANIM.idle, true);
  }

  /** Legacy procedural posing for the single-frame textures (authored facing LEFT). */
  private updatePose(deltaMs: number): void {
    this.setFlipX(flipForFacing(this.facing));

    if (this.callPoseTimer > 0) {
      this.setTexture(TEX.shushkiJump);
      this.setScale(this.baseScale, this.baseScale * 1.06);
      return;
    }

    const moving = !this.isDashing && Math.hypot(this.moveX, this.moveY) > 0.1;
    if (this.isDashing) {
      this.setScale(this.baseScale * 1.1, this.baseScale * 0.92);
      return;
    }

    if (moving) {
      this.walkPhase += deltaMs / 90;
      this.walkFrameTimer += deltaMs;
      if (this.walkFrameTimer >= 120) {
        this.walkFrameTimer = 0;
        this.walkFrame = this.walkFrame === 0 ? 1 : 0;
      }
      this.setTexture(this.walkFrame === 0 ? TEX.shushkiIdle : TEX.shushkiWalk);
      this.setScale(this.baseScale, this.baseScale * (1 + Math.sin(this.walkPhase) * 0.05));
    } else {
      this.walkPhase = 0;
      this.walkFrameTimer = 0;
      this.walkFrame = 0;
      this.setTexture(TEX.shushkiIdle);
      this.setScale(this.baseScale);
    }
  }

  private clampToArena(): void {
    this.x = Phaser.Math.Clamp(this.x, ARENA.minX, ARENA.maxX);
    this.y = Phaser.Math.Clamp(this.y, ARENA.minY, ARENA.maxY);
  }

  private syncShadow(): void {
    // Anim frames are bottom-anchored in a taller canvas, so the feet sit lower.
    const feet = this.displayHeight * (this.useAnims ? 0.47 : 0.42);
    this.shadow.setPosition(this.x, this.y + feet);
    this.shadow.setVisible(this.visible);
  }

  override destroy(fromScene?: boolean): void {
    this.shadow?.destroy();
    super.destroy(fromScene);
  }
}
