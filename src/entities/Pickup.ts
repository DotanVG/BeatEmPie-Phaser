import Phaser from 'phaser';
import { DEPTHS } from '../game/constants';
import { TEX } from '../utils/assetKeys';
import { emojiText } from '../utils/text';
import type { GameScene } from '../scenes/GameScene';

export type PickupKind = 'pumpkin' | 'health';

/**
 * Floating collectible. Picked up on player overlap (handled by CollisionSystem),
 * granting a Pumpkin charge or a chunk of health.
 */
export class Pickup extends Phaser.Physics.Arcade.Image {
  readonly kind: PickupKind;
  private label: Phaser.GameObjects.Text;
  private collected = false;

  constructor(scene: GameScene, x: number, y: number, kind: PickupKind) {
    super(scene, x, y, TEX.pickup);
    this.kind = kind;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTHS.PIE);
    this.setTint(kind === 'pumpkin' ? 0xff8a33 : 0x6ee7a8);
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    this.label = emojiText(scene, x, y, kind === 'pumpkin' ? '🎃' : '❤️', 34).setDepth(DEPTHS.PIE + 1);

    scene.tweens.add({
      targets: [this, this.label],
      y: y - 18,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  get isCollected(): boolean {
    return this.collected;
  }

  collect(): PickupKind {
    this.collected = true;
    this.label.destroy();
    this.destroy();
    return this.kind;
  }

  override destroy(fromScene?: boolean): void {
    this.label?.destroy();
    super.destroy(fromScene);
  }
}
