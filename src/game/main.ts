import Phaser from 'phaser';
import { gameConfig } from './config';
import { installFullscreenButton } from './fullscreen';
import { installOrientationGate } from './orientation';
import { applyResponsiveCamera } from './layout';

/** Entry point. Boots the Phaser game (the HTML pre-loader is removed in BootScene). */
const game = new Phaser.Game(gameConfig);
game.scale.updateBounds();
game.scale.refresh();

// RESIZE mode: the canvas tracks the live viewport, so every scene's 1920x1080 design must be
// uniformly scaled + centred into it. Wire each scene's camera now and on every (re)create.
game.events.once(Phaser.Core.Events.READY, () => {
  for (const scene of game.scene.getScenes(false)) {
    scene.events.on(Phaser.Scenes.Events.CREATE, () => applyResponsiveCamera(scene));
    applyResponsiveCamera(scene); // covers any scene already created by the time READY fires
  }
});

// Landscape-only gate: pause gameplay + audio while a phone is held in portrait.
installOrientationGate(game);
installFullscreenButton(game);

// Expose the instance for debugging during development only.
if (import.meta.env.DEV) {
  (window as unknown as { game: Phaser.Game }).game = game;
}

export default game;
