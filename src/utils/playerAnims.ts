import Phaser from 'phaser';
import { TEX, ANIM, PLAYER_SHEETS } from './assetKeys';

/**
 * Registers Shushki's frame-based animations from the animation sheets.
 * Every registration is guarded by texture existence so a missing/failed sheet
 * silently degrades to the legacy single-frame poses (see Player.hasFrameAnims).
 *
 * JUMP is registered but not yet triggered by gameplay — ready for a future
 * jump mechanic (start → loop → land).
 */
export function registerPlayerAnims(scene: Phaser.Scene): void {
  const make = (
    key: string,
    tex: string,
    opts: { start?: number; end?: number; frameRate: number; repeat?: number },
  ): void => {
    if (!scene.textures.exists(tex) || scene.anims.exists(key)) return;
    const total = PLAYER_SHEETS[tex]?.frames ?? 1;
    const start = opts.start ?? 0;
    const end = Math.min(opts.end ?? total - 1, total - 1);
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(tex, { start, end }),
      frameRate: opts.frameRate,
      repeat: opts.repeat ?? 0,
    });
  };

  make(ANIM.idle, TEX.shushkiAnimIdle, { frameRate: 6, repeat: -1 });
  make(ANIM.run, TEX.shushkiAnimRun, { frameRate: 12, repeat: -1 });
  make(ANIM.jumpStart, TEX.shushkiAnimJump, { start: 0, end: 1, frameRate: 12 });
  make(ANIM.jumpLoop, TEX.shushkiAnimJump, { start: 2, end: 3, frameRate: 8, repeat: -1 });
  make(ANIM.jumpLand, TEX.shushkiAnimJump, { start: 4, end: 5, frameRate: 12 });
  make(ANIM.attack, TEX.shushkiAnimAttack, { frameRate: 22 });
  make(ANIM.hurt, TEX.shushkiAnimHurt, { frameRate: 10 });
  make(ANIM.death, TEX.shushkiAnimDeath, { frameRate: 9 });
}

/** True when the frame-based player animations are available. */
export function hasPlayerAnims(scene: Phaser.Scene): boolean {
  return scene.anims.exists(ANIM.idle) && scene.anims.exists(ANIM.run);
}
