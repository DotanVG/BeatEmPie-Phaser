import Phaser from 'phaser';
import { PIE_TYPES } from '../data/pieTypes';
import { TEX } from '../utils/assetKeys';

/**
 * Menu flavour of the sky-drop mechanic. Clicking a menu button summons a random
 * pie that falls fast (no warning marker, no delay) and splats on the button; the
 * button's action fires exactly at the splat. Whole thing stays well under ~0.6s
 * so it never feels sluggish. Clicking anything that is NOT a button puffs up a
 * blowfish that inflates and fades where the player clicked.
 */

const FALL_MS = 380;
const FALL_HEIGHT = 460;
const FX_DEPTH = 9000;

/** Drop a random pie onto (x, y); `onImpact` fires the moment it splats. */
export function menuPieDrop(scene: Phaser.Scene, x: number, y: number, onImpact: () => void): void {
  const pie = Phaser.Utils.Array.GetRandom(PIE_TYPES);
  if (!scene.textures.exists(pie.assetKey)) {
    onImpact();
    return;
  }

  const img = scene.add
    .image(x, y - FALL_HEIGHT, pie.assetKey)
    .setDepth(FX_DEPTH)
    .setScale(1.25);
  const spinDir = Math.random() < 0.5 ? -1 : 1;

  scene.tweens.add({
    targets: img,
    y,
    angle: spinDir * Phaser.Math.Between(160, 300),
    duration: FALL_MS,
    ease: 'Quad.easeIn',
    onComplete: () => {
      img.destroy();
      if (scene.textures.exists(TEX.pieSplat)) {
        const splat = scene.add
          .image(x, y, TEX.pieSplat)
          .setDepth(FX_DEPTH)
          .setTint(pie.color)
          .setScale(0.85);
        scene.tweens.add({
          targets: splat,
          scale: 1.2,
          alpha: 0,
          duration: 300,
          ease: 'Quad.easeOut',
          onComplete: () => splat.destroy(),
        });
      }
      onImpact();
    },
  });
}

/** Blowfish puff: inflates and fades out fast where the player clicked. */
export function menuPuff(scene: Phaser.Scene, x: number, y: number): void {
  if (!scene.textures.exists(TEX.pufferFish)) return;
  const img = scene.add
    .image(x, y, TEX.pufferFish)
    .setDepth(FX_DEPTH)
    .setTint(0xc7ff8a)
    .setAlpha(0.85)
    .setScale(0.45)
    .setAngle(Phaser.Math.Between(-20, 20));
  scene.tweens.add({
    targets: img,
    scale: 1.4,
    alpha: 0,
    duration: 550,
    ease: 'Cubic.easeOut',
    onComplete: () => img.destroy(),
  });
}

/** Puff a blowfish whenever the player clicks something that isn't interactive. */
export function installMissClickPuff(scene: Phaser.Scene): void {
  scene.input.on(
    Phaser.Input.Events.POINTER_DOWN,
    (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
      if (currentlyOver.length === 0) menuPuff(scene, pointer.x, pointer.y);
    },
  );
}
