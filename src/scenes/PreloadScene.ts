import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../game/constants';
import { PLAYER_IMAGES, MUSIC_FILES } from '../utils/assetKeys';
import { generatePlaceholderTextures } from '../utils/placeholders';

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
    for (const [key, path] of Object.entries(MUSIC_FILES)) this.load.audio(key, path);

    // Never let a missing asset abort the boot — just log and continue.
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[BeatEmPie] Asset failed to load (using fallback): ${file.key}`);
    });
  }

  create(): void {
    generatePlaceholderTextures(this);
    this.scene.start('MainMenuScene');
  }

  private buildLoadingBar(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.cameras.main.setBackgroundColor('#0b0d2b');

    this.add
      .text(cx, cy - 90, '🥧 BeatEmPie', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '72px',
        color: COLORS.goldHex,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const barW = 620;
    const barH = 36;
    const box = this.add.graphics();
    box.fillStyle(0x000000, 0.5);
    box.fillRoundedRect(cx - barW / 2 - 6, cy - barH / 2 - 6, barW + 12, barH + 12, 8);

    const bar = this.add.graphics();
    const label = this.add
      .text(cx, cy + 70, 'Heating the ovens…', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '28px',
        color: COLORS.cream,
      })
      .setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      bar.clear();
      bar.fillStyle(0xffe08a, 1);
      bar.fillRoundedRect(cx - barW / 2, cy - barH / 2, barW * value, barH, 6);
      label.setText(`Baking… ${Math.round(value * 100)}%`);
    });
  }
}
