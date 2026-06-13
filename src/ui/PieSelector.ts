import Phaser from 'phaser';
import { DEPTHS, GAME_WIDTH, GAME_HEIGHT } from '../game/constants';
import { emojiText } from '../utils/text';
import { squash } from '../utils/animation';
import type { PieSystem } from '../systems/PieSystem';

interface Slot {
  x: number;
  y: number;
  emoji: Phaser.GameObjects.Text;
  num: Phaser.GameObjects.Text;
  charge: Phaser.GameObjects.Text;
}

/** Bottom selector bar: 10 pie slots with number, emoji, cooldown fill, charges, lock and selection. */
export class PieSelector {
  private overlay: Phaser.GameObjects.Graphics;
  private slots: Slot[] = [];
  private readonly size = 116;
  private readonly gap = 14;
  private scene: Phaser.Scene;
  private lastSelected = -1;

  constructor(scene: Phaser.Scene, private pies: PieSystem) {
    this.scene = scene;
    const count = pies.pies.length;
    const totalW = count * this.size + (count - 1) * this.gap;
    const startX = (GAME_WIDTH - totalW) / 2;
    const y = GAME_HEIGHT - this.size - 22;

    this.overlay = scene.add.graphics().setDepth(DEPTHS.UI).setScrollFactor(0);

    pies.pies.forEach((pie, i) => {
      const x = startX + i * (this.size + this.gap);
      const cx = x + this.size / 2;

      const hit = scene.add
        .rectangle(x, y, this.size, this.size, 0x000000, 0.001)
        .setOrigin(0, 0)
        .setDepth(DEPTHS.UI)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.pies.selectIndex(i));

      const emoji = emojiText(scene, cx, y + this.size / 2, pie.emoji, 58)
        .setDepth(DEPTHS.UI_TOP)
        .setScrollFactor(0);

      const num = scene.add
        .text(x + 8, y + 4, `${(i + 1) % 10}`, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '20px',
          color: '#ffe08a',
          fontStyle: 'bold',
        })
        .setDepth(DEPTHS.UI_TOP)
        .setScrollFactor(0);

      const charge = scene.add
        .text(x + this.size - 8, y + this.size - 26, '', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '22px',
          color: '#ffffff',
          fontStyle: 'bold',
          stroke: '#0b0d2b',
          strokeThickness: 4,
        })
        .setOrigin(1, 0)
        .setDepth(DEPTHS.UI_TOP)
        .setScrollFactor(0);

      this.slots.push({ x, y, emoji, num, charge });
    });
  }

  update(): void {
    // Pop the newly selected slot's icon.
    if (this.pies.selectedIndex !== this.lastSelected) {
      this.lastSelected = this.pies.selectedIndex;
      const sel = this.slots[this.pies.selectedIndex];
      if (sel) squash(this.scene, sel.emoji, 1, 1, 0.22);
    }

    this.overlay.clear();
    this.slots.forEach((slot, i) => {
      const pie = this.pies.pies[i];
      const unlocked = this.pies.isUnlocked(pie);
      const selected = this.pies.selectedIndex === i;
      const progress = this.pies.getCooldownProgress(pie.id);
      const charges = this.pies.getCharges(pie.id);

      // Panel
      this.overlay.fillStyle(selected ? 0x3a2b6b : 0x14123a, 0.85);
      this.overlay.fillRoundedRect(slot.x, slot.y, this.size, this.size, 12);

      // Cooldown fill (rises from the bottom as it becomes ready)
      if (unlocked && progress < 1) {
        const fillH = this.size * (1 - progress);
        this.overlay.fillStyle(0x000000, 0.55);
        this.overlay.fillRect(slot.x, slot.y, this.size, fillH);
      }

      // Lock dim
      if (!unlocked) {
        this.overlay.fillStyle(0x000000, 0.6);
        this.overlay.fillRoundedRect(slot.x, slot.y, this.size, this.size, 12);
      }

      // Border
      this.overlay.lineStyle(selected ? 5 : 2, selected ? 0xffe08a : 0x6a6fae, selected ? 1 : 0.6);
      this.overlay.strokeRoundedRect(slot.x, slot.y, this.size, this.size, 12);

      // Texts
      slot.emoji.setAlpha(unlocked ? (progress >= 1 ? 1 : 0.55) : 0.28);
      slot.charge.setText(charges !== null ? `x${charges}` : '');
      slot.charge.setColor(charges === 0 ? '#ff5470' : '#ffffff');
    });
  }
}
