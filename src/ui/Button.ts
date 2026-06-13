import Phaser from 'phaser';
import { withEmojiPadding } from '../utils/text';

export interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  fill?: number;
  textColor?: string;
}

/**
 * Reusable rounded button used by the menu / end scenes. Returns the container so callers
 * can animate it (entrance pop, pulse). The interactive surface is a plain Rectangle sized
 * to the full button so the whole visual area is reliably clickable; the rounded look is a
 * non-interactive Graphics overlay on top. The click fires on `pointerup` (not gated behind
 * an animation), so quick taps never get swallowed.
 */
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  opts: ButtonOptions = {},
): Phaser.GameObjects.Container {
  const { width = 360, height = 84, fontSize = 36, fill = 0x3a2b6b, textColor = '#fff4d6' } = opts;

  // Full-size interactive base — a Rectangle has a reliable, exact hit area.
  const base = scene.add.rectangle(0, 0, width, height, fill, 1).setInteractive({ useHandCursor: true });

  // Rounded border / corner mask drawn on top (purely cosmetic, not interactive).
  const border = scene.add.graphics();
  const draw = (hover: boolean) => {
    border.clear();
    base.setFillStyle(hover ? 0x5a44a0 : fill, 1);
    border.lineStyle(4, 0xffe08a, hover ? 1 : 0.7);
    border.strokeRoundedRect(-width / 2, -height / 2, width, height, 16);
  };
  draw(false);

  const text = scene.add
    .text(0, 0, label, withEmojiPadding({
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: `${fontSize}px`,
      color: textColor,
      fontStyle: 'bold',
    }, fontSize))
    .setOrigin(0.5);

  const container = scene.add.container(x, y, [base, border, text]).setSize(width, height);

  let pressed = false;
  let fired = false;
  const scaleTo = (s: number) => {
    scene.tweens.killTweensOf(container);
    scene.tweens.add({ targets: container, scale: s, duration: 110, ease: 'Quad.easeOut' });
  };

  base.on('pointerover', () => {
    draw(true);
    scaleTo(1.06);
  });
  base.on('pointerout', () => {
    draw(false);
    pressed = false;
    scaleTo(1);
  });
  base.on('pointerdown', () => {
    pressed = true;
    scene.tweens.killTweensOf(container);
    scene.tweens.add({ targets: container, scale: 0.95, duration: 70, yoyo: true, ease: 'Quad.easeOut' });
  });
  base.on('pointerup', () => {
    if (!pressed || fired) return;
    pressed = false;
    fired = true;
    onClick();
  });

  return container;
}
