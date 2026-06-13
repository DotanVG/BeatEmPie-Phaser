import { Enemy } from './Enemy';
import { ENEMY_TYPES } from '../data/enemyTypes';
import type { GameScene } from '../scenes/GameScene';

/** Whale — large, slow, tanky. Heavy contact damage and a big shove (def.pushForce). */
export class WhaleEnemy extends Enemy {
  private bob = 0;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, ENEMY_TYPES.whale);
  }

  protected override updateAI(deltaMs: number): void {
    this.bob += deltaMs / 240;
    const p = this.gscene.player;
    const ang = Math.atan2(p.y - this.y, p.x - this.x);
    const sp = this.def.speed * this.status.speedMultiplier;
    // Heavy, lumbering drift with a gentle vertical bob.
    this.setVelocity(Math.cos(ang) * sp, Math.sin(ang) * sp + Math.sin(this.bob) * 18);
  }
}
