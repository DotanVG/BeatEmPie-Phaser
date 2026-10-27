import Phaser from 'phaser';
import { gameConfig } from './config';
import { installFullscreenButton } from './fullscreen';
import { installOrientationGate } from './orientation';
import { showLoadError } from './landing';

/**
 * Boots the Phaser game after intentional entry (the HTML loader is removed in BootScene).
 * Deferred to its own task so evaluating the bundle and booting Phaser (renderer init)
 * aren't one long main-thread block on mobile; the HTML loader stays painted meanwhile.
 */
export function bootGame(audioContext?: AudioContext): void {
  setTimeout(() => {
    try {
      const game = new Phaser.Game({
        ...gameConfig,
        audio: audioContext ? { ...gameConfig.audio, context: audioContext } : gameConfig.audio,
      });
      game.scale.updateBounds();
      game.scale.refresh();

      // Landscape-only gate: pause gameplay + audio while a phone is held in portrait.
      installOrientationGate(game);
      installFullscreenButton(game);

      // Expose the instance for debugging during development only.
      if (import.meta.env.DEV) {
        (window as unknown as { game: Phaser.Game }).game = game;
      }
    } catch {
      showLoadError();
    }
  });
}
