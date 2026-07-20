import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../game/constants';
import { PLAYER_IMAGES, PLAYER_SHEETS, PLAYER_FRAME, PIE_IMAGES, SFX_FILES, TEX, ANIM } from '../utils/assetKeys';
import { generatePlaceholderTextures } from '../utils/placeholders';
import { registerPlayerAnims } from '../utils/playerAnims';

/**
 * Loads the real assets (player sprites + music) with a progress bar, then
 * generates all placeholder textures. Missing/failed files are tolerated so the
 * game still boots — see the loaderror handler.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    this.buildLoadingBar();

    for (const [key, path] of Object.entries(PLAYER_IMAGES)) this.load.image(key, path);
    for (const [key, path] of Object.entries(PIE_IMAGES)) this.load.image(key, path);
    for (const [key, sheet] of Object.entries(PLAYER_SHEETS)) {
      this.load.spritesheet(key, sheet.path, {
        frameWidth: PLAYER_FRAME.width,
        frameHeight: PLAYER_FRAME.height,
      });
    }
    // Music is NOT loaded here — it's large and non-blocking; MainMenuScene loads it
    // in the background once the menu is already playable (see loadMusicDeferred).
    for (const [key, path] of Object.entries(SFX_FILES)) this.load.audio(key, path);

    // Never let a missing asset abort the boot — just log and continue.
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[BeatEmPie] Asset failed to load (using fallback): ${file.key}`);
    });
  }

  create(): void {
    generatePlaceholderTextures(this);
    registerPlayerAnims(this);
    // Launch the persistent cursor overlay exactly once; it outlives scene changes.
    this.scene.launch('CursorScene');
    this.scene.start('MainMenuScene');
  }

  private buildLoadingBar(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.cameras.main.setBackgroundColor('#0b0d2b');

    this.add
      .text(cx, cy - 190, '🥧 BeatEmPie', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '64px',
        color: COLORS.goldHex,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.buildOven(cx, cy - 30);

    const barW = 620;
    const barH = 36;
    const barY = cy + 150;
    const box = this.add.graphics();
    box.fillStyle(0x000000, 0.5);
    box.fillRoundedRect(cx - barW / 2 - 6, barY - barH / 2 - 6, barW + 12, barH + 12, 8);

    const bar = this.add.graphics();
    const label = this.add
      .text(cx, barY + 40, 'Heating the ovens…', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '28px',
        color: COLORS.cream,
      })
      .setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      bar.clear();
      bar.fillStyle(0xffe08a, 1);
      bar.fillRoundedRect(cx - barW / 2, barY - barH / 2, barW * value, barH, 6);
      label.setText(`Baking… ${Math.round(value * 100)}%`);
    });
  }

  /**
   * Procedural oven + Shushki tossing pies in, with rising steam puffs. Purely
   * decorative — needs the tiny idle sheet + one pie BootScene preloads; skips
   * itself cleanly if either is missing (still leaves the progress bar working).
   */
  private buildOven(cx: number, cy: number): void {
    const ovenW = 220;
    const ovenH = 160;

    const glow = this.add.circle(cx, cy, ovenW * 0.55, 0xff8a3d, 0.35);
    this.tweens.add({ targets: glow, alpha: 0.15, scale: 1.08, duration: 900, yoyo: true, repeat: -1 });

    const body = this.add.graphics();
    body.fillStyle(0x4a2c1a, 1);
    body.fillRoundedRect(cx - ovenW / 2, cy - ovenH / 2, ovenW, ovenH, 18);
    body.fillStyle(0x2a1810, 1);
    body.fillRoundedRect(cx - ovenW / 2 + 20, cy - ovenH / 2 + 20, ovenW - 40, ovenH - 40, 12);

    for (let i = 0; i < 4; i++) {
      const puff = this.add.circle(cx - 40 + i * 26, cy - ovenH / 2, 8, 0xffffff, 0.5);
      this.tweens.add({
        targets: puff,
        y: cy - ovenH / 2 - 70,
        alpha: 0,
        scale: 2.2,
        duration: 1400,
        delay: i * 340,
        repeat: -1,
        ease: 'Sine.easeOut',
      });
    }

    if (!this.textures.exists(TEX.shushkiAnimIdle)) return;

    const shushki = this.add.sprite(cx - ovenW / 2 - 70, cy + 30, TEX.shushkiAnimIdle).setScale(0.9);
    if (this.anims.exists(ANIM.idle)) shushki.play(ANIM.idle);

    const pieKeys = Object.keys(PIE_IMAGES).filter((key) => this.textures.exists(key));
    if (pieKeys.length === 0) return;

    this.time.addEvent({
      delay: 650,
      loop: true,
      callback: () => {
        const pie = this.add
          .image(shushki.x, shushki.y - 40, Phaser.Utils.Array.GetRandom(pieKeys))
          .setScale(0.6);
        this.tweens.add({
          targets: pie,
          x: cx,
          y: cy,
          scale: 0.1,
          alpha: 0,
          duration: 500,
          ease: 'Quad.easeIn',
          onComplete: () => pie.destroy(),
        });
      },
    });
  }
}
