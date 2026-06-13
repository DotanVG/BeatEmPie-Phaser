import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { ENEMY_TYPES } from '../data/enemyTypes';
import { AUDIO } from '../utils/assetKeys';
import type { GameScene } from '../scenes/GameScene';

type PufferState = 'approach' | 'charging' | 'cooldown';

/**
 * Puffer Fish — slow approacher that telegraphs (expands), then bursts a radial
 * shockwave damaging the player if too close. Can be frozen/confused mid-charge.
 */
export class PufferFishEnemy extends Enemy {
  private pufferState: PufferState = 'approach';
  private timer = 0;
  private readonly triggerRange = 200;
  private readonly burstRange = 230;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, ENEMY_TYPES.pufferFish);
  }

  protected override updateAI(deltaMs: number): void {
    const p = this.gscene.player;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);

    if (this.pufferState === 'approach') {
      if (dist < this.triggerRange) this.beginCharge();
      else this.moveToward(p.x, p.y);
    } else if (this.pufferState === 'charging') {
      this.setVelocity(0, 0);
      this.timer -= deltaMs;
      if (this.timer <= 0) this.burst();
    } else {
      this.timer -= deltaMs;
      this.moveToward(p.x, p.y, 0.35);
      if (this.timer <= 0) this.pufferState = 'approach';
    }
  }

  private beginCharge(): void {
    this.pufferState = 'charging';
    this.timer = 850;
    this.gscene.audio.playSfx(AUDIO.fire, 0.5);
    this.gscene.tweens.add({
      targets: this,
      scaleX: this.def.scale * 1.5,
      scaleY: this.def.scale * 1.5,
      duration: 850,
      ease: 'Quad.easeIn',
    });
    this.gscene.effects.ring(this.x, this.y, this.burstRange, 0xc7ff8a, 850);
  }

  private burst(): void {
    this.gscene.tweens.add({ targets: this, scaleX: this.def.scale, scaleY: this.def.scale, duration: 140 });
    this.gscene.effects.burst(this.x, this.y, {
      tints: [0xc7ff8a, 0xffffff, 0xa8e063],
      count: 22,
      speed: 360,
      lifespan: 460,
      scale: 1.2,
    });
    this.gscene.effects.shake('small');

    const p = this.gscene.player;
    if (Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) < this.burstRange) {
      p.takeDamage(this.def.contactDamage, this.x, this.y);
    }

    this.pufferState = 'cooldown';
    this.timer = 1500;
  }
}
