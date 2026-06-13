import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, DEPTHS } from '../game/constants';
import { TEX, AUDIO } from '../utils/assetKeys';
import { AudioSystem } from '../systems/AudioSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { PIE_TYPES } from '../data/pieTypes';
import { makeButton } from '../ui/Button';
import { emojiText, withEmojiPadding } from '../utils/text';
import { popIn, pulse } from '../utils/animation';
import { stepFloaters, type MenuFloaterBounds, type MenuFloaterState } from '../utils/menuFloaters';

interface MenuFloater {
  text: Phaser.GameObjects.Text;
  spinDegPerSecond: number;
  state: MenuFloaterState;
}

/** Title screen: pitch, play button, controls, high score and a mute toggle. */
export class MainMenuScene extends Phaser.Scene {
  private audio!: AudioSystem;
  private floaters: MenuFloater[] = [];
  private readonly floaterBounds: MenuFloaterBounds = {
    minX: 40,
    maxX: GAME_WIDTH - 40,
    minY: 60,
    maxY: GAME_HEIGHT - 60,
  };

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

  update(_time: number, delta: number): void {
    if (this.floaters.length === 0) return;

    const stepped = stepFloaters(
      this.floaters.map((floater) => floater.state),
      this.floaterBounds,
      Math.min(delta / 1000, 1 / 30),
    );

    stepped.forEach((state, index) => {
      const floater = this.floaters[index];
      floater.state = state;
      floater.text.setPosition(state.x, state.y);
      floater.text.angle += floater.spinDegPerSecond * (delta / 1000);
    });
  }

  /** Menu pies fly around the full screen and bounce off walls and each other. */
  private buildFloatingPies(): void {
    const totalFloaters = 14;
    const pieEmojis = PIE_TYPES.map((pie) => pie.emoji);

    for (let i = 0; i < totalFloaters; i++) {
      const size = Phaser.Math.Between(46, 88);
      const radius = Math.round(size * 0.42);
      const state = this.placeFloater(radius);
      state.vx = Phaser.Math.FloatBetween(-180, 180);
      state.vy = Phaser.Math.FloatBetween(-150, 150);

      const text = emojiText(this, state.x, state.y, pieEmojis[i % pieEmojis.length], size)
        .setAlpha(0.24)
        .setDepth(DEPTHS.BACKGROUND + 1);

      this.floaters.push({
        text,
        state,
        spinDegPerSecond: Phaser.Math.FloatBetween(-22, 22),
      });
    }
  }

  private placeFloater(radius: number): MenuFloaterState {
    let candidate: MenuFloaterState = {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT / 2,
      vx: 0,
      vy: 0,
      radius,
    };

    for (let attempt = 0; attempt < 40; attempt++) {
      candidate = {
        x: Phaser.Math.Between(this.floaterBounds.minX + radius, this.floaterBounds.maxX - radius),
        y: Phaser.Math.Between(this.floaterBounds.minY + radius, this.floaterBounds.maxY - radius),
        vx: 0,
        vy: 0,
        radius,
      };

      const overlaps = this.floaters.some((floater) => {
        const dx = floater.state.x - candidate.x;
        const dy = floater.state.y - candidate.y;
        return Math.hypot(dx, dy) < floater.state.radius + candidate.radius + 24;
      });
      if (!overlaps) break;
    }

    return candidate;
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
