import type Phaser from 'phaser';

/**
 * Emoji glyphs render taller than their nominal font size, so a Phaser canvas `Text`
 * with no padding clips the top of the emoji (the ascent). Reserving proportional top
 * padding fixes the clipping uniformly across every screen and platform.
 */

/** Top/bottom padding (px) that clears emoji ascenders for a given font size. */
export function emojiPadding(sizePx: number): { top: number; bottom: number; left: number; right: number } {
  return { top: Math.ceil(sizePx * 0.22), bottom: Math.ceil(sizePx * 0.08), left: 2, right: 2 };
}

/** Create a centered, clip-free emoji text object. */
export function emojiText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  emoji: string,
  sizePx: number,
  extra: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, emoji, { fontSize: `${sizePx}px`, padding: emojiPadding(sizePx), ...extra })
    .setOrigin(0.5);
}

/** Merge emoji-safe padding into an existing (mixed text + emoji) style. */
export function withEmojiPadding(
  style: Phaser.Types.GameObjects.Text.TextStyle,
  sizePx: number,
): Phaser.Types.GameObjects.Text.TextStyle {
  return { ...style, padding: emojiPadding(sizePx) };
}
