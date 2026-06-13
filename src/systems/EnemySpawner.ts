import type { EnemyKind } from '../types/game';
import type { GameScene } from '../scenes/GameScene';
import { Enemy } from '../entities/Enemy';
import { FishEnemy } from '../entities/FishEnemy';
import { AngryFishEnemy } from '../entities/AngryFishEnemy';
import { PufferFishEnemy } from '../entities/PufferFishEnemy';
import { WhaleEnemy } from '../entities/WhaleEnemy';
import { BossWhale } from '../entities/BossWhale';
import { ARENA } from '../game/constants';
import { randBetween } from '../utils/math';

/** Factory + spawn-point logic. Enemies enter from just outside the arena edges. */
export class EnemySpawner {
  constructor(private scene: GameScene) {}

  private construct(kind: EnemyKind, x: number, y: number): Enemy {
    switch (kind) {
      case 'fish':
        return new FishEnemy(this.scene, x, y);
      case 'angryFish':
        return new AngryFishEnemy(this.scene, x, y);
      case 'pufferFish':
        return new PufferFishEnemy(this.scene, x, y);
      case 'whale':
        return new WhaleEnemy(this.scene, x, y);
      case 'bossWhale':
        return new BossWhale(this.scene, x, y);
    }
  }

  /** Spawn at an exact world position (used by the boss summon). */
  spawnAt(kind: EnemyKind, x: number, y: number): Enemy {
    const enemy = this.construct(kind, x, y);
    this.scene.registerEnemy(enemy);
    return enemy;
  }

  /** Spawn just off a random screen edge so enemies swim into the arena. */
  spawnFromEdge(kind: EnemyKind): Enemy {
    const fromLeft = Math.random() < 0.5;
    const margin = 90;
    let x: number;
    let y: number;

    if (kind === 'bossWhale') {
      // Boss enters from the right, mid-arena.
      x = ARENA.maxX + 60;
      y = (ARENA.minY + ARENA.maxY) / 2;
    } else {
      x = fromLeft ? ARENA.minX - margin : ARENA.maxX + margin;
      y = randBetween(ARENA.minY, ARENA.maxY);
    }

    return this.spawnAt(kind, x, y);
  }
}
