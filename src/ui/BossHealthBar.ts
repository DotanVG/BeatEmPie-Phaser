import Phaser from 'phaser';
import { DEPTHS, GAME_WIDTH } from '../game/constants';
import { clamp } from '../utils/math';

/** Wide boss health bar across the top of the screen. Hidden until the boss spawns. */
export class BossHealthBar {
  private bg: Phaser.GameObjects.Graphics;
  private fill: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private x: number;
  private y = 120;
  private w = 1100;
  private h = 40;

  constructor(private scene: Phaser.Scene, name = 'Captain Leviathan') {
    this.x = (GAME_WIDTH - this.w) / 2;
    this.bg = scene.add.graphics().setDepth(DEPTHS.UI).setVisible(false);
    this.fill = scene.add.graphics().setDepth(DEPTHS.UI).setVisible(false);
    this.label = scene.add
      .text(GAME_WIDTH / 2, this.y - 26, `🐋 ${name}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '30px',
        color: '#ff8aa0',
        fontStyle: 'bold',
        stroke: '#0b0d2b',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.UI_TOP)      .setVisible(false);
  }

  show(): void {
    this.bg.clear();
    this.bg.fillStyle(0x000000, 0.55);
    this.bg.fillRoundedRect(this.x - 5, this.y - 5, this.w + 10, this.h + 10, 8);
    this.bg.lineStyle(3, 0xff5470, 0.6);
    this.bg.strokeRoundedRect(this.x - 5, this.y - 5, this.w + 10, this.h + 10, 8);
    this.bg.setVisible(true);
    this.fill.setVisible(true);
    this.label.setVisible(true);
    this.set(1, 1);
  }

  set(current: number, max: number): void {
    const r = clamp(current / max, 0, 1);
    this.fill.clear();
    this.fill.fillStyle(0xff5470, 1);
    if (r > 0) this.fill.fillRoundedRect(this.x, this.y, this.w * r, this.h, 6);
  }

  hide(): void {
    this.bg.setVisible(false);
    this.fill.setVisible(false);
    this.label.setVisible(false);
  }
}
