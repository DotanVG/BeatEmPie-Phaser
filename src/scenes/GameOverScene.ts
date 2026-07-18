import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../game/constants';
import { TEX, AUDIO } from '../utils/assetKeys';
import { AudioSystem } from '../systems/AudioSystem';
import { makeButton } from '../ui/Button';
import { withEmojiPadding } from '../utils/text';
import { popIn } from '../utils/animation';
import { installMissClickPuff } from '../ui/menuPieFx';

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
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, TEX.bgGradient).setAlpha(0);
    const dim = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0b0d2b, 0.55)
      .setAlpha(0);

    const audio = new AudioSystem(this);
    audio.playMusic(AUDIO.musicGameOver, false);
    installMissClickPuff(this);

    const cx = GAME_WIDTH / 2;

    // GAME OVER title fades in first…
    const title = this.add
      .text(
        cx,
        230,
        '💀 GAME OVER',
        withEmojiPadding(
          {
            fontFamily: 'Trebuchet MS, sans-serif',
            fontSize: '110px',
            color: COLORS.dangerHex,
            fontStyle: 'bold',
            stroke: '#0b0d2b',
            strokeThickness: 10,
          },
          110,
        ),
      )
      .setOrigin(0.5)
      .setAlpha(0);

    // …then the rest of the page follows.
    const rest: Phaser.GameObjects.GameObject[] = [];

    rest.push(
      this.add
        .text(cx, 380, `Shushki fell on Wave ${data.wave}`, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '40px',
          color: COLORS.cream,
        })
        .setOrigin(0.5)
        .setAlpha(0),
    );

    rest.push(
      this.add
        .text(cx, 470, `SCORE  ${data.score}`, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '56px',
          color: COLORS.goldHex,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setAlpha(0),
    );

    rest.push(
      this.add
        .text(
          cx,
          540,
          data.record ? '🏆 NEW BEST SCORE!' : `Best  ${data.highScore}`,
          withEmojiPadding(
            {
              fontFamily: 'Trebuchet MS, sans-serif',
              fontSize: '36px',
              color: data.record ? '#6ee7a8' : '#9aa0c0',
              fontStyle: 'bold',
            },
            36,
          ),
        )
        .setOrigin(0.5)
        .setAlpha(0),
    );

    rest.push(
      this.add
        .text(cx, GAME_HEIGHT - 60, this.sys.game.device.input.touch ? 'Tap Retry to jump straight back in' : 'Press R to retry', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '28px',
          color: '#7a7fb0',
        })
        .setOrigin(0.5)
        .setAlpha(0),
    );

    // Staged reveal: darken → title → everything else (+ buttons pop in).
    this.tweens.add({ targets: [bg, dim], alpha: { from: 0, to: 1 }, duration: 500, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: title, alpha: 1, duration: 900, delay: 250, ease: 'Quad.easeInOut' });
    this.tweens.add({ targets: rest, alpha: 1, duration: 600, delay: 1000, ease: 'Quad.easeOut' });

    this.time.delayedCall(1050, () => {
      const retry = makeButton(this, cx - 220, 720, '↻  Retry', () => this.restart(), { width: 380 });
      const menu = makeButton(this, cx + 220, 720, '☰  Menu', () => this.toMenu(), { width: 380 });
      [retry, menu].forEach((b, i) => {
        b.setScale(0);
        this.time.delayedCall(120 + i * 90, () => popIn(this, b, 1, 240));
      });
    });

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
