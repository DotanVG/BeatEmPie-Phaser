import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../game/constants';
import { TEX, AUDIO } from '../utils/assetKeys';
import { AudioSystem } from '../systems/AudioSystem';
import { makeButton } from '../ui/Button';

interface ResultData {
  score: number;
  wave: number;
  record: boolean;
  highScore: number;
}

/** Defeat summary with restart / menu and a high-score notice. */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(data: ResultData): void {
    this.sound.stopAll();
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, TEX.bgGradient);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0b0d2b, 0.55);

    const audio = new AudioSystem(this);
    audio.playMusic(AUDIO.musicGameOver, false);

    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, 230, '💀 GAME OVER', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '110px',
        color: COLORS.dangerHex,
        fontStyle: 'bold',
        stroke: '#0b0d2b',
        strokeThickness: 10,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 380, `Shushki fell on Wave ${data.wave}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '40px',
        color: COLORS.cream,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 470, `SCORE  ${data.score}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '56px',
        color: COLORS.goldHex,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 540, data.record ? '🏆 NEW BEST SCORE!' : `Best  ${data.highScore}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '36px',
        color: data.record ? '#6ee7a8' : '#9aa0c0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    makeButton(this, cx - 220, 720, '↻  Retry', () => this.restart(), { width: 380 });
    makeButton(this, cx + 220, 720, '☰  Menu', () => this.toMenu(), { width: 380 });

    this.add
      .text(cx, GAME_HEIGHT - 60, 'Press R to retry', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '28px',
        color: '#7a7fb0',
      })
      .setOrigin(0.5);

    this.input.keyboard?.once('keydown-R', () => this.restart());
  }

  private restart(): void {
    this.sound.stopAll();
    this.scene.start('GameScene');
  }

  private toMenu(): void {
    this.sound.stopAll();
    this.scene.start('MainMenuScene');
  }
}
