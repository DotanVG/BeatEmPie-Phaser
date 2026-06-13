import Phaser from 'phaser';
import { DEPTHS } from '../game/constants';
import { clamp } from '../utils/math';

/** Slim progress bar showing the selected pie's cooldown (0 → 1 = ready). */
export class CooldownMeter {
  private bg: Phaser.GameObjects.Graphics;
  private fill: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    private x: number,
    private y: number,
    private w = 260,
    private h = 14,
  ) {
    this.bg = scene.add.graphics().setDepth(DEPTHS.UI).setScrollFactor(0);
    this.fill = scene.add.graphics().setDepth(DEPTHS.UI_TOP).setScrollFactor(0);
    this.bg.fillStyle(0x000000, 0.5);
    this.bg.fillRoundedRect(this.x - 3, this.y - 3, this.w + 6, this.h + 6, 5);
  }

  set(progress: number): void {
    const r = clamp(progress, 0, 1);
    const ready = r >= 1;
    this.fill.clear();
    this.fill.fillStyle(ready ? 0x6ee7a8 : 0xffe08a, ready ? 1 : 0.9);
    if (r > 0) this.fill.fillRoundedRect(this.x, this.y, this.w * r, this.h, 4);
  }
}
