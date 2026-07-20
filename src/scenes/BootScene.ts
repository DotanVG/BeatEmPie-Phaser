import Phaser from 'phaser';
import { TEX, PLAYER_SHEETS, PLAYER_FRAME, PIE_IMAGES } from '../utils/assetKeys';
import { registerPlayerAnims } from '../utils/playerAnims';

/**
 * First scene. Preloads the tiny bit of art PreloadScene's baking animation needs
 * (Shushki's idle sheet + one pie) so it's ready before the real loading bar starts,
 * then hands off to the asset preloader.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    const idleSheet = PLAYER_SHEETS[TEX.shushkiAnimIdle];
    this.load.spritesheet(TEX.shushkiAnimIdle, idleSheet.path, {
      frameWidth: PLAYER_FRAME.width,
      frameHeight: PLAYER_FRAME.height,
    });
    this.load.image('pie-apple', PIE_IMAGES['pie-apple']);
    this.load.on('loaderror', () => {
      /* decorative art only — PreloadScene's baking animation tolerates missing art */
    });
  }

  create(): void {
    registerPlayerAnims(this);
    this.cameras.main.setBackgroundColor('#0b0d2b');
    document.getElementById('boot-loader')?.remove();
    this.scene.start('PreloadScene');
  }
}
