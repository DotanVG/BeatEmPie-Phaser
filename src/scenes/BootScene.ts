import Phaser from 'phaser';

/** First scene. Minimal setup, then hands off to the asset preloader. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0b0d2b');
    document.getElementById('boot-loader')?.remove();
    this.scene.start('PreloadScene');
  }
}
