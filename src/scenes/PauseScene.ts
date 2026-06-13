import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../game/constants';
import { makeButton } from '../ui/Button';
import type { GameScene } from './GameScene';

/** Overlay launched on top of a paused GameScene. */
export class PauseScene extends Phaser.Scene {
  private gameScene!: GameScene;

  constructor() {
    super('PauseScene');
  }

  create(data: { gameScene: GameScene }): void {
    this.gameScene = data.gameScene;
    const cx = GAME_WIDTH / 2;

    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0b0d2b, 0.72);
    this.add
      .text(cx, 300, '⏸ PAUSED', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '96px',
        color: COLORS.goldHex,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    makeButton(this, cx, 480, '▶  Resume', () => this.resume());
    makeButton(this, cx, 590, '↻  Restart', () => this.restart());
    makeButton(this, cx, 700, '☰  Main Menu', () => this.toMenu());

    this.input.keyboard?.once('keydown-ESC', () => this.resume());
    this.input.keyboard?.once('keydown-P', () => this.resume());
  }

  private resume(): void {
    this.gameScene.resumeFromPause();
    this.scene.resume('GameScene');
    this.scene.stop();
  }

  private restart(): void {
    this.scene.stop();
    this.scene.start('GameScene');
  }

  private toMenu(): void {
    this.scene.stop('GameScene');
    this.scene.start('MainMenuScene');
    this.scene.stop();
  }
}
