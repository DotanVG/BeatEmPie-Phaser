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

/** Phaser game configuration: pixel-art, aspect-locked (FIT) canvas, Arcade physics. */
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  // Matches the #game-root shell background (and the letterbox/pillarbox gutters).
  backgroundColor: '#0b0d2b',
  pixelArt: true,
  roundPixels: true,
  scale: {
    // FIT scales the 1920x1080 world UNIFORMLY to fit the viewport, preserving aspect ratio
    // (slim navy gutters appear on non-16:9 screens) so text/icons/animations never distort.
    mode: Phaser.Scale.FIT,
    // Centre the scaled canvas so the gutters are symmetric.
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    // Round the scaled canvas to whole pixels (no sub-pixel blur on the pixel-art canvas).
    autoRound: true,
    // #game-root is explicitly sized in CSS to the full viewport; FIT measures it directly.
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
