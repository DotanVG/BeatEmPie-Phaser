import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './constants';
import { BootScene } from '../scenes/BootScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { GameScene } from '../scenes/GameScene';
import { PauseScene } from '../scenes/PauseScene';
import { GameOverScene } from '../scenes/GameOverScene';
import { VictoryScene } from '../scenes/VictoryScene';

/** Phaser game configuration: pixel-art, CSS-stretched canvas shell, Arcade physics. */
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  // Matches the #game-root shell background.
  backgroundColor: '#0b0d2b',
  pixelArt: true,
  roundPixels: true,
  scale: {
    // Keep a stable 1920x1080 internal world while CSS stretches the canvas to the full shell.
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.NO_CENTER,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    // Round the scaled canvas to whole pixels (no sub-pixel blur on the pixel-art canvas).
    autoRound: true,
    // #game-root is explicitly sized in CSS; Phaser should keep its hands off the parent box.
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
