import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../game/constants';
import { TEX, AUDIO } from '../utils/assetKeys';
import { AudioSystem } from '../systems/AudioSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { PIE_TYPES } from '../data/pieTypes';
import { makeButton } from '../ui/Button';
import { emojiText, withEmojiPadding } from '../utils/text';
import { popIn, pulse } from '../utils/animation';

/** Title screen: pitch, play button, controls, high score and a mute toggle. */
export class MainMenuScene extends Phaser.Scene {
  private audio!: AudioSystem;

  constructor() {
    super('MainMenuScene');
  }

  create(): void {
    this.sound.stopAll();
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, TEX.bgGradient);
    this.buildFloatingPies();

    this.audio = new AudioSystem(this);
    this.audio.playMusic(AUDIO.musicMenu);

    const cx = GAME_WIDTH / 2;

    const title = this.add
      .text(
        cx,
        180,
        '🥧 BeatEmPie',
        withEmojiPadding(
          {
            fontFamily: 'Trebuchet MS, sans-serif',
            fontSize: '108px',
            color: COLORS.goldHex,
            fontStyle: 'bold',
            stroke: '#0b0d2b',
            strokeThickness: 10,
          },
          108,
        ),
      )
      .setOrigin(0.5);
    popIn(this, title, 1, 360);

    this.add
      .text(cx, 290, 'Shushki fights waves of fish and whales by dropping magical pies from the sky!', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '32px',
        color: COLORS.cream,
        align: 'center',
        wordWrap: { width: 1200 },
      })
      .setOrigin(0.5);

    // Pie parade
    const pieRow = PIE_TYPES.map((p) => p.emoji).join('  ');
    emojiText(this, cx, 380, pieRow, 44);

    const play = makeButton(this, cx, 540, '▶  PLAY', () => this.startGame(), {
      width: 420,
      height: 100,
      fontSize: 48,
    });
    popIn(this, play, 1, 280);
    this.time.delayedCall(320, () => pulse(this, play, 1, 1.04, 1100));

    this.add
      .text(
        cx,
        700,
        'Move: WASD / Arrows   •   Drop pie: Space or Click   •   Aim: Mouse\nSelect pie: 1-0   •   Cycle: Q / E   •   Dash: Shift   •   Pause: P / Esc',
        {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '28px',
          color: '#c9cdf0',
          align: 'center',
          lineSpacing: 12,
        },
      )
      .setOrigin(0.5);

    this.add
      .text(cx, 840, `BEST SCORE  ${SaveSystem.getHighScore()}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '34px',
        color: COLORS.goldHex,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.buildMuteToggle();

    this.add
      .text(cx, GAME_HEIGHT - 40, 'A game by Dotan · Romi · Noam', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '24px',
        color: '#7a7fb0',
      })
      .setOrigin(0.5);

    this.input.keyboard?.once('keydown-ENTER', () => this.startGame());
    this.input.keyboard?.once('keydown-SPACE', () => this.startGame());
  }

  /** Slow drifting/bobbing pies behind the menu content for a little life. */
  private buildFloatingPies(): void {
    const pies = PIE_TYPES.map((p) => p.emoji);
    for (let i = 0; i < 7; i++) {
      const x = Phaser.Math.Between(120, GAME_WIDTH - 120);
      const y = Phaser.Math.Between(160, GAME_HEIGHT - 160);
      const e = emojiText(this, x, y, pies[i % pies.length], Phaser.Math.Between(40, 72))
        .setAlpha(0.16)
        .setDepth(-1);
      this.tweens.add({
        targets: e,
        y: y - Phaser.Math.Between(26, 60),
        duration: Phaser.Math.Between(2600, 4200),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: i * 180,
      });
      this.tweens.add({
        targets: e,
        angle: Phaser.Math.Between(-12, 12),
        duration: Phaser.Math.Between(3000, 5000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private buildMuteToggle(): void {
    const label = this.add
      .text(
        GAME_WIDTH - 40,
        40,
        this.audio.isMuted() ? '🔇 Muted' : '🔊 Sound',
        withEmojiPadding(
          {
            fontFamily: 'Trebuchet MS, sans-serif',
            fontSize: '30px',
            color: COLORS.cream,
          },
          30,
        ),
      )
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    label.on('pointerdown', () => {
      const muted = !this.audio.isMuted();
      this.audio.setMuted(muted);
      label.setText(muted ? '🔇 Muted' : '🔊 Sound');
      if (!muted) this.audio.playMusic(AUDIO.musicMenu);
    });
  }

  private startGame(): void {
    this.audio.playSfx(AUDIO.uiClick);
    this.sound.stopAll();
    this.scene.start('GameScene');
  }
}
