import Phaser from 'phaser';
import { DEPTHS } from '../game/constants';
import { emojiPadding } from '../utils/text';

export interface FloatingTextOptions {
  color?: string;
  fontSize?: number;
  rise?: number;
  durationMs?: number;
  strokeThickness?: number;
}

/** A short-lived rising/fading text used for damage numbers, combos and status pops. */
export class FloatingText {
  static spawn(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    opts: FloatingTextOptions = {},
  ): Phaser.GameObjects.Text {
    const { color = '#fff4d6', fontSize = 34, rise = 72, durationMs = 760, strokeThickness = 6 } = opts;
    const label = scene.add
      .text(x, y, text, {
        fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
        fontSize: `${fontSize}px`,
        color,
        fontStyle: 'bold',
        stroke: '#0b0d2b',
        strokeThickness,
        padding: emojiPadding(fontSize),
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.FLOATING_TEXT);

    scene.tweens.add({
      targets: label,
      y: y - rise,
      alpha: { from: 1, to: 0 },
      scaleX: { from: 0.6, to: 1.05 },
      scaleY: { from: 0.6, to: 1.05 },
      duration: durationMs,
      ease: 'Quad.easeOut',
      onComplete: () => label.destroy(),
    });

    return label;
  }
}
