import { Enemy } from './Enemy';
import { ENEMY_TYPES } from '../data/enemyTypes';
import type { GameScene } from '../scenes/GameScene';

/** Small Fish — low health, fast, swims straight at the player in groups. */
export class FishEnemy extends Enemy {
  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, ENEMY_TYPES.fish);
  }
}
