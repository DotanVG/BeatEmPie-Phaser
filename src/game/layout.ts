import type Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './constants';

/**
 * RESIZE-mode responsive camera.
 *
 * In RESIZE scale mode the canvas always matches the live viewport (full-bleed, no pixel
 * distortion), but a scene's 1920x1080 design would otherwise sit at the top-left and overflow.
 * This uniformly scales the design to fit (aspect preserved) and centres it by zooming the main
 * camera by the fit factor `min(vw/1920, vh/1080)` and centring it on the design midpoint
 * (960, 540). The leftover margin on the longer axis shows the scene/game background colour, so
 * there are no dead page bars.
 *
 * Centring uses camera scroll (`centerOn`), so any HUD that previously used `setScrollFactor(0)`
 * was switched to world space (default scrollFactor) to avoid drifting on non-16:9 screens — the
 * gameplay camera never scrolls during play (only brief shake), so this is behaviourally
 * equivalent. Phaser's input still maps pointers to world space correctly via the scroll/zoom-aware
 * `getWorldPoint` (TouchControls reads `worldX/worldY`).
 *
 * Re-applies on every ScaleManager resize and detaches on scene shutdown.
 */
export function applyResponsiveCamera(scene: Phaser.Scene): void {
  const apply = (): void => {
    const cam = scene.cameras?.main;
    if (!cam) return;
    const vw = scene.scale.width;
    const vh = scene.scale.height;
    if (vw <= 0 || vh <= 0) return;
    const zoom = Math.min(vw / GAME_WIDTH, vh / GAME_HEIGHT);
    cam.setViewport(0, 0, vw, vh);
    cam.setZoom(zoom);
    cam.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
  };

  apply();
  scene.scale.on('resize', apply);
  scene.events.once('shutdown', () => scene.scale.off('resize', apply));
}
