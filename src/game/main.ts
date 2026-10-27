import Phaser from 'phaser';
import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { gameConfig } from './config';
import { installFullscreenButton } from './fullscreen';
import { installOrientationGate } from './orientation';
import { showLoadError } from './landing';

if (location.hostname === 'beat-em-pie.vercel.app') {
  const beforeSend = <T extends { url: string }>(event: T): T => ({
    ...event, url: location.origin + location.pathname,
  });
  inject({ beforeSend });
  injectSpeedInsights({ beforeSend });
}

/**
 * Entry point. Boots the Phaser game (the HTML pre-loader is removed in BootScene).
 * Deferred to its own task so evaluating the bundle and booting Phaser (renderer init)
 * aren't one long main-thread block on mobile; the HTML loader stays painted meanwhile.
 */
setTimeout(() => {
  try {
    const game = new Phaser.Game(gameConfig);
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
