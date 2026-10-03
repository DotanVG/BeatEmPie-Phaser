import Phaser from 'phaser';

/**
 * Tween-driven "juice" helpers. The shipped art is single-frame, so motion comes
 * from procedural squash/stretch, bob, flashes and pops rather than frame anims.
 */

type Sprite = Phaser.GameObjects.Sprite | Phaser.Physics.Arcade.Sprite | Phaser.GameObjects.Image;

/** Latest flash per target, so an earlier flash's timer never ends a newer one early. */
const activeFlash = new WeakMap<Sprite, number>();

/**
 * Solid white flash on hit (Phaser 4 FILL tint mode). Afterwards the tint mode goes back to
 * MULTIPLY and `restore` re-applies the owner's own tint (enemies: base or status tint);
 * without one, the tint is cleared.
 */
export function hitFlash(scene: Phaser.Scene, target: Sprite, durationMs = 90, restore?: () => void): void {
  const id = (activeFlash.get(target) ?? 0) + 1;
  activeFlash.set(target, id);
  target.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
  scene.time.delayedCall(durationMs, () => {
    if (!target.active || activeFlash.get(target) !== id) return;
    target.setTintMode(Phaser.TintModes.MULTIPLY);
    if (restore) restore();
    else target.clearTint();
  });
}

/** Quick squash/stretch around a base scale (e.g. landing impact, footstep). */
export function squash(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject,
  baseScaleX: number,
  baseScaleY: number,
  amount = 0.18,
): void {
  const t = target as unknown as { scaleX: number; scaleY: number };
  scene.tweens.add({
    targets: t,
    scaleX: baseScaleX * (1 + amount),
    scaleY: baseScaleY * (1 - amount),
    duration: 80,
    yoyo: true,
    ease: 'Quad.easeOut',
  });
}

/** Scale a freshly-spawned object up from nothing with a bouncy ease. */
export function popIn(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject,
  finalScale = 1,
  durationMs = 220,
): void {
  const t = target as unknown as { scale: number };
  t.scale = 0;
  scene.tweens.add({
    targets: t,
    scale: finalScale,
    duration: durationMs,
    ease: 'Back.easeOut',
  });
}

/** Endless gentle pulse — used by warning markers and the selected-pie chip. */
export function pulse(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject,
  from = 1,
  to = 1.12,
  durationMs = 500,
): Phaser.Tweens.Tween {
  const t = target as unknown as { scale: number };
  t.scale = from;
  return scene.tweens.add({
    targets: t,
    scale: to,
    duration: durationMs,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
}
