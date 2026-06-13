import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import type { Enemy } from '../entities/Enemy';
import type { Pickup } from '../entities/Pickup';

/** Wires up the arcade-physics overlaps: player↔enemies (contact damage) and player↔pickups. */
export class CollisionSystem {
  constructor(private scene: GameScene) {}

  setup(): void {
    const s = this.scene;
    s.physics.add.overlap(s.player, s.enemies, this.onPlayerEnemy, undefined, this);
    s.physics.add.overlap(s.player, s.pickups, this.onPlayerPickup, undefined, this);
  }

  private onPlayerEnemy: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_playerObj, enemyObj) => {
    const enemy = enemyObj as unknown as Enemy;
    if (!enemy.isAlive || !this.scene.player.isAlive) return;
    this.scene.player.takeDamage(enemy.def.contactDamage, enemy.x, enemy.y);
  };

  private onPlayerPickup: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_playerObj, pickupObj) => {
    const pickup = pickupObj as unknown as Pickup;
    if (pickup.isCollected) return;
    this.scene.collectPickup(pickup);
  };
}
