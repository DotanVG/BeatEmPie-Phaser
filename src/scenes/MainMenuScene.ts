import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, DEPTHS } from '../game/constants';
import { TEX, AUDIO } from '../utils/assetKeys';
import { AudioSystem } from '../systems/AudioSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { PIE_TYPES } from '../data/pieTypes';
import { ENEMY_TYPES } from '../data/enemyTypes';
import type { PieType, EnemyKind } from '../types/game';
import { ANIM } from '../utils/assetKeys';
import { hasPlayerAnims } from '../utils/playerAnims';
import { makeButton } from '../ui/Button';
import { withEmojiPadding } from '../utils/text';
import { popIn, pulse } from '../utils/animation';
import { PieInfoCard } from '../ui/PieInfoCard';
import { stepFloaters, type MenuFloaterBounds, type MenuFloaterState } from '../utils/menuFloaters';
import { getHudRightInset } from '../game/displayPolicy';
import { installMissClickPuff, menuPieDrop } from '../ui/menuPieFx';

interface MenuFloater {
  image: Phaser.GameObjects.Image;
  spinDegPerSecond: number;
  state: MenuFloaterState;
}

interface ShowcaseIcon {
  image: Phaser.GameObjects.Image;
  pie: PieType;
  baseY: number;
  baseScale: number;
  hovered: boolean;
}

interface MenuSwimmer {
  image: Phaser.GameObjects.Image;
  vx: number;
  baseY: number;
  bobPhase: number;
  radius: number;
  dying: boolean;
}

/** Title screen: pitch, play button, controls, high score and a mute toggle. */
export class MainMenuScene extends Phaser.Scene {
  private audio!: AudioSystem;
  private floaters: MenuFloater[] = [];
  private muteLabel!: Phaser.GameObjects.Text;
  private pieCard!: PieInfoCard;
  private showcaseIcons: ShowcaseIcon[] = [];
  private swimmers: MenuSwimmer[] = [];
  private playButton!: Phaser.GameObjects.Container;
  private starting = false;
  private readonly relayoutTopRight = () => this.layoutTopRight();
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
    this.starting = false;
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, TEX.bgGradient);
    this.buildFloatingPies();
    installMissClickPuff(this);
    this.time.addEvent({ delay: 2600, loop: true, callback: () => this.spawnSwimmer() });

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

    this.buildPieShowcase(cx, 385);

    const play = makeButton(this, cx, 540, '▶  PLAY', () => this.startGame(), {
      width: 420,
      height: 100,
      fontSize: 48,
    });
    play.setDepth(5); // Shushki's game-start jump pops out from BEHIND this button
    this.playButton = play;
    popIn(this, play, 1, 280);
    this.time.delayedCall(320, () => pulse(this, play, 1, 1.04, 1100));

    // Controls line adapts to the device actually being used.
    const touchDevice = this.sys.game.device.input.touch;
    const controlsText = touchDevice
      ? 'Move: on-screen joystick   •   Drop pie: tap anywhere in the arena   •   🥧 button: auto-drop\nSelect pie: tap its slot   •   Cycle pie: ↶ / ↷ arrows   •   Dash: 💨 button'
      : 'Move: WASD / Arrows   •   Drop pie: Space or Click   •   Aim: Mouse\nSelect pie: 1-0   •   Cycle: Q / E   •   Dash: Shift   •   Pause: P / Esc';
    this.add
      .text(
        cx,
        700,
        controlsText,
        withEmojiPadding(
          {
            fontFamily: 'Trebuchet MS, sans-serif',
            fontSize: '28px',
            color: '#c9cdf0',
            align: 'center',
            lineSpacing: 12,
          },
          28,
        ),
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
    this.layoutTopRight();
    document.addEventListener('fullscreenchange', this.relayoutTopRight);
    document.addEventListener('webkitfullscreenchange', this.relayoutTopRight as EventListener);
    window.addEventListener('resize', this.relayoutTopRight);

    this.add
      .text(cx, GAME_HEIGHT - 40, 'A game by Dotan · Romi · Noam', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '24px',
        color: '#7a7fb0',
      })
      .setOrigin(0.5);

    this.input.keyboard?.once('keydown-ENTER', () => this.startGame());
    this.input.keyboard?.once('keydown-SPACE', () => this.startGame());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('fullscreenchange', this.relayoutTopRight);
      document.removeEventListener('webkitfullscreenchange', this.relayoutTopRight as EventListener);
      window.removeEventListener('resize', this.relayoutTopRight);
    });
  }

  update(time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 1 / 30);

    if (this.floaters.length > 0) {
      const stepped = stepFloaters(
        this.floaters.map((floater) => floater.state),
        this.floaterBounds,
        dt,
      );
      stepped.forEach((state, index) => {
        const floater = this.floaters[index];
        floater.state = state;
        floater.image.setPosition(state.x, state.y);
        floater.image.angle += floater.spinDegPerSecond * dt;
      });
    }

    // Showcase icons bob on a staggered sine wave; a hovered icon eases back to
    // its base position and holds still (it also grows via its own tween).
    this.showcaseIcons.forEach((icon, i) => {
      if (icon.hovered || this.pieCard.isShown) {
        icon.image.y = Phaser.Math.Linear(icon.image.y, icon.baseY, 0.25);
      } else {
        icon.image.y = icon.baseY + Math.sin(time / 1000 * 2.2 + i * 0.55) * 9;
      }
    });

    this.updateSwimmers(time, dt);
  }

  /**
   * The pie showcase row: real pie art bobbing on a staggered sine wave.
   * CLICK/TAP (desktop and mobile alike) opens the pie's info card; hovering
   * grows the icon and pauses its float so it reads as clickable.
   */
  private buildPieShowcase(cx: number, y: number): void {
    const iconSize = 76;
    const gap = 100;
    const startX = cx - ((PIE_TYPES.length - 1) * gap) / 2;

    this.pieCard = new PieInfoCard(this);

    PIE_TYPES.forEach((pie, i) => {
      const image = this.add
        .image(startX + i * gap, y, pie.assetKey)
        .setInteractive({ useHandCursor: true });
      const baseScale = iconSize / Math.max(image.width, image.height);
      image.setScale(baseScale);
      const icon: ShowcaseIcon = { image, pie, baseY: y, baseScale, hovered: false };

      image.on('pointerover', () => {
        icon.hovered = true;
        this.tweens.killTweensOf(image);
        this.tweens.add({ targets: image, scale: baseScale * 1.22, duration: 140, ease: 'Back.easeOut' });
      });
      image.on('pointerout', () => {
        icon.hovered = false;
        this.tweens.killTweensOf(image);
        this.tweens.add({ targets: image, scale: baseScale, duration: 140, ease: 'Quad.easeOut' });
      });
      image.on('pointerdown', () => this.pieCard.show(pie));

      this.showcaseIcons.push(icon);
    });
  }

  /** Up to 3 translucent enemies swim across the menu; a floater hit whacks them away. */
  private updateSwimmers(time: number, dt: number): void {
    for (let i = this.swimmers.length - 1; i >= 0; i--) {
      const s = this.swimmers[i];
      if (s.dying) continue;
      s.image.x += s.vx * dt;
      s.image.y = s.baseY + Math.sin(time / 1000 * 1.6 + s.bobPhase) * 12;

      const gone = s.vx > 0 ? s.image.x > GAME_WIDTH + 120 : s.image.x < -120;
      if (gone) {
        s.image.destroy();
        this.swimmers.splice(i, 1);
        continue;
      }

      // Whacked by a floating pie?
      for (const f of this.floaters) {
        if (Math.hypot(f.state.x - s.image.x, f.state.y - s.image.y) < f.state.radius + s.radius) {
          s.dying = true;
          this.tweens.add({
            targets: s.image,
            angle: s.vx > 0 ? 540 : -540,
            scale: s.image.scale * 0.3,
            alpha: 0,
            duration: 420,
            ease: 'Quad.easeIn',
            onComplete: () => {
              s.image.destroy();
              const idx = this.swimmers.indexOf(s);
              if (idx >= 0) this.swimmers.splice(idx, 1);
            },
          });
          break;
        }
      }
    }
  }

  private spawnSwimmer(): void {
    if (this.swimmers.length >= 3) return;
    const kinds: EnemyKind[] = ['fish', 'fish', 'angryFish', 'pufferFish', 'whale'];
    const def = ENEMY_TYPES[Phaser.Utils.Array.GetRandom(kinds)];
    const fromLeft = Math.random() < 0.5;
    const y = Phaser.Math.Between(120, GAME_HEIGHT - 140);
    const image = this.add
      .image(fromLeft ? -100 : GAME_WIDTH + 100, y, def.textureKey)
      .setTint(def.tint)
      .setAlpha(0.24)
      .setDepth(DEPTHS.BACKGROUND + 1)
      .setScale(def.scale * 0.9);
    // Placeholder fish art faces right; flip when swimming left.
    image.setFlipX(!fromLeft);
    this.swimmers.push({
      image,
      vx: (fromLeft ? 1 : -1) * Phaser.Math.Between(60, 140),
      baseY: y,
      bobPhase: Math.random() * Math.PI * 2,
      radius: def.bodyRadius * 0.9,
      dying: false,
    });
  }

  /** Menu pies fly around the full screen and bounce off walls and each other. */
  private buildFloatingPies(): void {
    const totalFloaters = 14;

    for (let i = 0; i < totalFloaters; i++) {
      const size = Phaser.Math.Between(46, 88);
      const radius = Math.round(size * 0.42);
      const state = this.placeFloater(radius);
      state.vx = Phaser.Math.FloatBetween(-180, 180);
      state.vy = Phaser.Math.FloatBetween(-150, 150);

      const pie = PIE_TYPES[i % PIE_TYPES.length];
      const image = this.add.image(state.x, state.y, pie.assetKey).setAlpha(0.24).setDepth(DEPTHS.BACKGROUND + 1);
      image.setScale(size / Math.max(image.width, image.height));

      this.floaters.push({
        image,
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
    this.muteLabel = this.add
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
    this.muteLabel.on('pointerdown', () => {
      // Pie falls onto the toggle; the sound state flips on splat.
      const cx = this.muteLabel.x - this.muteLabel.displayWidth / 2;
      const cy = this.muteLabel.y + this.muteLabel.displayHeight / 2;
      menuPieDrop(this, cx, cy, () => {
        const muted = !this.audio.isMuted();
        this.audio.setMuted(muted);
        this.muteLabel.setText(muted ? '🔇 Muted' : '🔊 Sound');
        if (!muted) this.audio.playMusic(AUDIO.musicMenu);
      });
    });
  }

  private layoutTopRight(): void {
    const button = document.getElementById('fullscreen-btn') as HTMLButtonElement | null;
    this.muteLabel?.setX(GAME_WIDTH - getHudRightInset(Boolean(button && !button.hidden)));
  }

  /**
   * Game-start flourish: Shushki jumps out from BEHIND the Play button, lands
   * below it, and the game begins seamlessly with her standing exactly there.
   */
  private startGame(): void {
    if (this.starting) return;
    this.starting = true;
    this.audio.playSfx(AUDIO.uiClick);
    this.pieCard.hide();

    const bx = this.playButton.x;
    const by = this.playButton.y;
    const landY = Math.min(by + 190, GAME_HEIGHT - 130);
    const useAnims = hasPlayerAnims(this);

    const shushki = this.add
      .sprite(bx, by + 26, useAnims ? TEX.shushkiAnimJump : TEX.shushkiJump)
      .setDepth(4) // behind the Play button (depth 5)
      .setScale(useAnims ? 1.15 : 0.82)
      .setAlpha(0);
    if (useAnims) shushki.play(ANIM.jumpStart);

    this.tweens.add({ targets: shushki, alpha: 1, duration: 90 });
    // Up from behind the button…
    this.tweens.add({
      targets: shushki,
      y: by - 170,
      duration: 380,
      ease: 'Quad.easeOut',
      onStart: () => {
        if (useAnims) shushki.play(ANIM.jumpLoop, true);
      },
      onComplete: () => {
        // …and down onto the "stage", in front of everything.
        shushki.setDepth(20);
        this.tweens.add({
          targets: shushki,
          y: landY,
          duration: 360,
          ease: 'Quad.easeIn',
          onComplete: () => {
            if (useAnims) shushki.play(ANIM.jumpLand, true);
            this.time.delayedCall(140, () => {
              this.sound.stopAll();
              this.scene.start('GameScene', { playerX: bx, playerY: landY });
            });
          },
        });
      },
    });
  }
}
