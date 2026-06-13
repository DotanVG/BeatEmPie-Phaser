import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { PLAYER } from '../data/balance';
import { ARENA, DEPTHS } from '../game/constants';
import { GameEvents } from '../game/GameEvents';
import { TEX, AUDIO } from '../utils/assetKeys';
import { Cooldown } from '../utils/timers';
import { hitFlash } from '../utils/animation';
import { facingFromDelta, flipForFacing } from '../utils/direction';
import type { Facing } from '../utils/direction';

/**
 * Shushki — the player. Free 2D movement within the arena band, a dashing burst,
 * invulnerability frames, knockback and a "call pie" pose. Animation is procedural
 * (texture swaps + squash) since the shipped art is single-frame.
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
  private baseScale = 0.82;
  private dead = false;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, TEX.shushkiIdle);
    this.gscene = scene;
    this.health = this.maxHealth;

    this.shadow = scene.add
      .image(x, y, TEX.shadow)
      .setDepth(DEPTHS.SHADOW)
      .setScale(1.4)
      .setAlpha(0.5);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(this.baseScale);
    this.setDepth(DEPTHS.PLAYER);
    this.setCollideWorldBounds(false);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    // Tighter body than the tall sprite for fairer hits.
    body.setSize(this.width * 0.55, this.height * 0.7);
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
    this.setTexture(TEX.shushkiJump);
    this.gscene.audio.playSfx(AUDIO.pieCall, 0.4);
    this.gscene.effects.ring(this.x, this.y, 90, 0xffe08a, 260);
    return true;
  }

  /** Visual flourish when a pie is summoned. */
  callPie(targetX: number): void {
    this.faceToward(targetX);
    this.callPoseTimer = 220;
    this.gscene.effects.ring(this.x, this.y - this.displayHeight * 0.3, 60, 0xfff4d6, 240);
  }

  takeDamage(amount: number, fromX?: number, fromY?: number): void {
    if (this.dead || this.invulnTimer > 0 || this.isDashing) return;
    this.health = Math.max(0, this.health - amount);
    this.invulnTimer = PLAYER.invulnMs;

    hitFlash(this.gscene, this, 120);
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
    this.gscene.tweens.add({
      targets: this,
      angle: this.facing === 'left' ? 90 : -90,
      alpha: 0.6,
      y: this.y + 30,
      duration: 500,
      ease: 'Quad.easeIn',
    });
  }

  /** Driven by GameScene.update so it pauses with the scene. */
  tick(deltaMs: number): void {
    this.dashCooldown.update(deltaMs);
    this.gscene.bus.emit(GameEvents.DASH_COOLDOWN_CHANGED, { progress: this.dashCooldown.progress });

    if (this.invulnTimer > 0) {
      this.invulnTimer -= deltaMs;
      this.setAlpha(this.invulnTimer > 0 && Math.floor(this.invulnTimer / 80) % 2 === 0 ? 0.4 : 1);
    } else {
      this.setAlpha(this.dead ? 0.6 : 1);
    }

    if (this.dead) {
      this.syncShadow();
      return;
    }

    if (this.dashTimer > 0) {
      this.dashTimer -= deltaMs;
      if (this.dashTimer <= 0) this.setTexture(TEX.shushkiIdle);
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

    this.updatePose(deltaMs);
    this.clampToArena();
    this.syncShadow();
  }

  private updatePose(deltaMs: number): void {
    this.setFlipX(flipForFacing(this.facing));

    if (this.callPoseTimer > 0) {
      this.callPoseTimer -= deltaMs;
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
      this.setTexture(TEX.shushkiWalk);
      this.setScale(this.baseScale, this.baseScale * (1 + Math.sin(this.walkPhase) * 0.05));
    } else {
      this.setTexture(TEX.shushkiIdle);
      this.setScale(this.baseScale);
    }
  }

  private clampToArena(): void {
    this.x = Phaser.Math.Clamp(this.x, ARENA.minX, ARENA.maxX);
    this.y = Phaser.Math.Clamp(this.y, ARENA.minY, ARENA.maxY);
  }

  private syncShadow(): void {
    this.shadow.setPosition(this.x, this.y + this.displayHeight * 0.42);
    this.shadow.setVisible(this.visible);
  }

  override destroy(fromScene?: boolean): void {
    this.shadow?.destroy();
    super.destroy(fromScene);
  }
}
