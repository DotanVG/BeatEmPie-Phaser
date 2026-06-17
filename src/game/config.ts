import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './constants';
import { BootScene } from '../scenes/BootScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { GameScene } from '../scenes/GameScene';
import { PauseScene } from '../scenes/PauseScene';
import { GameOverScene } from '../scenes/GameOverScene';
import { VictoryScene } from '../scenes/VictoryScene';
import { RotateScene } from '../scenes/RotateScene';

/** Phaser game configuration: pixel-art, fluid (RESIZE) full-bleed canvas, Arcade physics. */
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  // Matches the #game-root shell background (and the centred-camera margins).
  backgroundColor: '#0b0d2b',
  pixelArt: true,
  roundPixels: true,
  scale: {
    // RESIZE keeps the canvas matching the live viewport (no pixel distortion). Each scene's
    // camera then uniformly scales + centres the 1920x1080 design into it (see game/layout.ts),
    // so the canvas is full-bleed with the game background filling the margin on the longer axis.
    mode: Phaser.Scale.RESIZE,
    // Centring is handled per-camera (viewport offset), not by the Scale Manager.
    autoCenter: Phaser.Scale.NO_CENTER,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    // Round the scaled canvas to whole pixels (no sub-pixel blur on the pixel-art canvas).
    autoRound: true,
    expandParent: false,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, PreloadScene, MainMenuScene, GameScene, PauseScene, GameOverScene, VictoryScene, RotateScene],
};
