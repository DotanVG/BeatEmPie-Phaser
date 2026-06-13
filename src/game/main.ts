import Phaser from 'phaser';
import { gameConfig } from './config';
import { installFullscreenButton } from './fullscreen';
import { installOrientationGate } from './orientation';

/** Entry point. Boots the Phaser game (the HTML pre-loader is removed in BootScene). */
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

export default game;
