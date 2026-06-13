import { Enemy } from './Enemy';
import { ENEMY_TYPES } from '../data/enemyTypes';
import type { GameScene } from '../scenes/GameScene';

/** Angry Fish — faster and more aggressive, approaches in a zig-zag weave. */
export class AngryFishEnemy extends Enemy {
  private phase = Math.random() * Math.PI * 2;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, ENEMY_TYPES.angryFish);
  }

  protected override updateAI(deltaMs: number): void {
    this.phase += deltaMs / 100;
    const p = this.gscene.player;
    const ang = Math.atan2(p.y - this.y, p.x - this.x);
    const sp = this.def.speed * this.status.speedMultiplier;
    const wobble = Math.sin(this.phase) * sp * 0.55;
    // forward + perpendicular weave
    this.setVelocity(
      Math.cos(ang) * sp - Math.sin(ang) * wobble,
      Math.sin(ang) * sp + Math.cos(ang) * wobble,
    );
  }
}
