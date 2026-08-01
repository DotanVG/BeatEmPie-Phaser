import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './constants';
import { selectPixelScale } from './pixelScalePolicy';

/**
 * Keeps the fixed 1920x1080 framebuffer on a discrete, centered display scale.
 *
 * Phaser still owns canvas CSS dimensions, centering, bounds, and pointer mapping
 * through ScaleManager.setZoom(). This controller only selects the zoom level.
 */
export function installPixelPerfectScale(game: Phaser.Game): void {
  const parent = document.getElementById('game-root');
  if (!parent) return;

  let frameRequest: number | null = null;

  const sync = (): void => {
    frameRequest = null;
    const bounds = parent.getBoundingClientRect();
    const decision = selectPixelScale(bounds.width, bounds.height, GAME_WIDTH, GAME_HEIGHT);

    if (game.scale.zoom !== decision.scale) {
      game.scale.setZoom(decision.scale);
    } else {
      // Bounds and input transforms can change without crossing a scale threshold.
      game.scale.refresh();
    }

    const canvas = game.canvas;
    canvas.dataset.pixelScale = String(decision.scale);
    canvas.dataset.pixelScaleMode = decision.mode;
    if (decision.downscaleDivisor === null) {
      delete canvas.dataset.pixelDownscaleDivisor;
    } else {
      canvas.dataset.pixelDownscaleDivisor = String(decision.downscaleDivisor);
    }
  };

  const queueSync = (): void => {
    if (frameRequest !== null) cancelAnimationFrame(frameRequest);
    frameRequest = requestAnimationFrame(sync);
  };

  const resizeObserver = new ResizeObserver(queueSync);
  resizeObserver.observe(parent);
  window.addEventListener('resize', queueSync);
  window.visualViewport?.addEventListener('resize', queueSync);
  window.addEventListener('orientationchange', queueSync);
  document.addEventListener('fullscreenchange', queueSync);
  document.addEventListener('webkitfullscreenchange', queueSync as EventListener);

  game.events.once('destroy', () => {
    if (frameRequest !== null) cancelAnimationFrame(frameRequest);
    resizeObserver.disconnect();
    window.removeEventListener('resize', queueSync);
    window.visualViewport?.removeEventListener('resize', queueSync);
    window.removeEventListener('orientationchange', queueSync);
    document.removeEventListener('fullscreenchange', queueSync);
    document.removeEventListener('webkitfullscreenchange', queueSync as EventListener);
  });

  queueSync();
}
