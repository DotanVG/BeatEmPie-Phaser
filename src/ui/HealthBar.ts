import Phaser from 'phaser';
import { DEPTHS } from '../game/constants';
import { clamp } from '../utils/math';

/** Player health bar — rounded background + colour-shifting fill + numeric label. */
export class HealthBar {
  private bg: Phaser.GameObjects.Graphics;
  private fill: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    private x: number,
    private y: number,
    private w = 460,
    private h = 34,
    private labelText = 'HP',
  ) {
    this.bg = scene.add.graphics().setDepth(DEPTHS.UI);
    this.fill = scene.add.graphics().setDepth(DEPTHS.UI);
    this.label = scene.add
      .text(x + 6, y + h / 2, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '24px',
        color: '#0b0d2b',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5)
      .setDepth(DEPTHS.UI_TOP);
    this.drawBg();
  }

  private drawBg(): void {
    this.bg.clear();
    this.bg.fillStyle(0x000000, 0.5);
    this.bg.fillRoundedRect(this.x - 4, this.y - 4, this.w + 8, this.h + 8, 8);
    this.bg.lineStyle(3, 0xffffff, 0.35);
    this.bg.strokeRoundedRect(this.x - 4, this.y - 4, this.w + 8, this.h + 8, 8);
  }

  set(current: number, max: number): void {
    const r = clamp(current / max, 0, 1);
    const color = r > 0.5 ? 0x6ee7a8 : r > 0.25 ? 0xffb340 : 0xff5470;
    this.fill.clear();
    this.fill.fillStyle(color, 1);
    if (r > 0) this.fill.fillRoundedRect(this.x, this.y, Math.max(8, this.w * r), this.h, 6);
    this.label.setText(`${this.labelText} ${Math.ceil(current)}/${max}`);
  }
}
