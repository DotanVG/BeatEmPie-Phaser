import Phaser from 'phaser';
import { TEX } from '../utils/assetKeys';

/**
 * The game's own mouse cursor — a gold reticle sprite that follows the pointer.
 * The OS pointer is hidden via CSS (`cursor: none` on the canvas), so this is the
 * only cursor players see. Touch input never shows it (fingers aren't cursors);
 * it appears on the first real mouse move. Squashes slightly while pressed.
 */
export class GameCursor {
  private img: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    this.img = scene.add
      .image(-100, -100, TEX.cursor)
      .setDepth(10_000)
      .setScrollFactor(0)
      .setVisible(false);

    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
      scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
      scene.input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    });
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.wasTouch) {
      this.img.setVisible(false);
      return;
    }
    this.img.setVisible(true).setPosition(pointer.x, pointer.y);
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (pointer.wasTouch) return;
    this.img.setPosition(pointer.x, pointer.y).setScale(0.82);
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.wasTouch) return;
    this.img.setScale(1);
  }
}
