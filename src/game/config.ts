import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './constants';
import { BootScene } from '../scenes/BootScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { GameScene } from '../scenes/GameScene';
import { PauseScene } from '../scenes/PauseScene';
import { GameOverScene } from '../scenes/GameOverScene';
import { VictoryScene } from '../scenes/VictoryScene';
import { CursorScene } from '../scenes/CursorScene';

/** Phaser game configuration: fixed pixel-art framebuffer, discrete display scale, Arcade physics. */
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  // Matches the #game-root shell background.
  backgroundColor: '#0b0d2b',
  pixelArt: true,
  roundPixels: true,
  scale: {
    // FIT still selects arbitrary ratios. NONE lets pixelPerfectScale.ts supply exact
    // integer / reciprocal zooms while Phaser retains centering and input transforms.
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    autoRound: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  // CursorScene is last: the global cursor overlay renders above everything.
  scene: [BootScene, PreloadScene, MainMenuScene, GameScene, PauseScene, GameOverScene, VictoryScene, CursorScene],
};
