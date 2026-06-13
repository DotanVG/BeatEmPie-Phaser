import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../game/constants';
import { TEX, AUDIO } from '../utils/assetKeys';
import { AudioSystem } from '../systems/AudioSystem';
import { makeButton } from '../ui/Button';
import { emojiText, withEmojiPadding } from '../utils/text';
import { popIn } from '../utils/animation';

interface ResultData {
  score: number;
  wave: number;
  record: boolean;
  highScore: number;
}

/** Victory summary shown after Captain Leviathan is defeated. */
export class VictoryScene extends Phaser.Scene {
  constructor() {
    super('VictoryScene');
  }

  create(data: ResultData): void {
    this.sound.stopAll();
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, TEX.bgGradient);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x14123a, 0.45);

    const audio = new AudioSystem(this);
    audio.playMusic(AUDIO.musicVictory, false);

    const cx = GAME_WIDTH / 2;

    this.add
      .text(
        cx,
        230,
        '🥧 VICTORY! 🐋',
        withEmojiPadding(
          {
            fontFamily: 'Trebuchet MS, sans-serif',
            fontSize: '110px',
            color: COLORS.goldHex,
            fontStyle: 'bold',
            stroke: '#0b0d2b',
            strokeThickness: 10,
          },
          110,
        ),
      )
      .setOrigin(0.5);

    this.add
      .text(cx, 380, 'Captain Leviathan has been thoroughly pied!', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '40px',
        color: COLORS.cream,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 470, `FINAL SCORE  ${data.score}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '56px',
        color: COLORS.goldHex,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

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
      .setOrigin(0.5);

    // Confetti of pies.
    this.time.addEvent({
      delay: 220,
      loop: true,
      callback: () => {
        const x = Phaser.Math.Between(100, GAME_WIDTH - 100);
        const pie = emojiText(this, x, -40, '🥧', 48).setDepth(50);
        this.tweens.add({
          targets: pie,
          y: GAME_HEIGHT + 60,
          angle: Phaser.Math.Between(-180, 180),
          duration: Phaser.Math.Between(2200, 3600),
          onComplete: () => pie.destroy(),
        });
      },
    });

    const again = makeButton(this, cx - 220, 720, '↻  Play Again', () => this.restart(), { width: 380 });
    const menu = makeButton(this, cx + 220, 720, '☰  Menu', () => this.toMenu(), { width: 380 });
    [again, menu].forEach((b, i) => {
      b.setScale(0);
      this.time.delayedCall(120 + i * 90, () => popIn(this, b, 1, 240));
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
