import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './constants';
import { BootScene } from '../scenes/BootScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { GameScene } from '../scenes/GameScene';
import { PauseScene } from '../scenes/PauseScene';
import { GameOverScene } from '../scenes/GameOverScene';
import { VictoryScene } from '../scenes/VictoryScene';

/** Phaser game configuration: pixel-art, responsive FIT scaling, Arcade physics. */
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  // Matches the #game-root letterbox bars so the FIT framing has no visible seam.
  backgroundColor: '#0b0d2b',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    // The #game-root flexbox centers the canvas. Phaser's own centering would ADD a margin
    // on top of that (double-offset → off-centre bars on non-16:9 screens), so disable it.
    autoCenter: Phaser.Scale.NO_CENTER,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    // Round the scaled canvas to whole pixels (no sub-pixel blur on the pixel-art canvas).
    autoRound: true,
    // #game-root is explicitly sized in CSS (100vw/100dvh); don't let Phaser fight it.
    expandParent: false,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, PreloadScene, MainMenuScene, GameScene, PauseScene, GameOverScene, VictoryScene],
};
