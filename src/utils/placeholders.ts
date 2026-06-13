import Phaser from 'phaser';
import { TEX } from './assetKeys';
import { PIE_TYPES } from '../data/pieTypes';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../game/constants';

/**
 * Generates every non-shipped texture procedurally at load time. Enemy bodies are
 * drawn in white so they can be re-coloured per type via setTint; the boss is
 * drawn pre-coloured. Pies are drawn in their own colour. This guarantees the game
 * always has art even though only the player sprites + music are real assets.
 */
export function generatePlaceholderTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  const flush = (key: string, w: number, h: number) => {
    if (!scene.textures.exists(key)) g.generateTexture(key, w, h);
    g.clear();
  };

  // ---- Background gradient -------------------------------------------------
  g.fillGradientStyle(COLORS.bgTop, COLORS.bgTop, COLORS.bgBottom, COLORS.bgBottom, 1);
  g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  flush(TEX.bgGradient, GAME_WIDTH, GAME_HEIGHT);

  // ---- Soft drop shadow (stacked ellipses) ---------------------------------
  for (let i = 6; i >= 1; i--) {
    g.fillStyle(0x000000, 0.06);
    g.fillEllipse(60, 20, (i / 6) * 120, (i / 6) * 40);
  }
  flush(TEX.shadow, 120, 40);

  // ---- Particle (round) + spark (diamond) ----------------------------------
  g.fillStyle(0xffffff, 1);
  g.fillCircle(8, 8, 8);
  flush(TEX.particle, 16, 16);

  g.fillStyle(0xffffff, 1);
  g.beginPath();
  g.moveTo(8, 0);
  g.lineTo(16, 8);
  g.lineTo(8, 16);
  g.lineTo(0, 8);
  g.closePath();
  g.fillPath();
  flush(TEX.spark, 16, 16);

  // ---- Warning reticle (rings) ---------------------------------------------
  g.lineStyle(8, 0xffffff, 1);
  g.strokeCircle(128, 128, 110);
  g.lineStyle(4, 0xffffff, 0.6);
  g.strokeCircle(128, 128, 70);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(128, 128, 10);
  flush(TEX.warning, 256, 256);

  // ---- Chocolate puddle blob -----------------------------------------------
  g.fillStyle(0xffffff, 1);
  g.fillEllipse(100, 60, 190, 100);
  g.fillEllipse(40, 40, 60, 44);
  g.fillEllipse(160, 78, 56, 40);
  flush(TEX.puddle, 200, 120);

  // ---- Fire trail tile ------------------------------------------------------
  g.fillStyle(0xffffff, 1);
  g.fillEllipse(32, 40, 56, 36);
  g.beginPath();
  g.moveTo(32, 4);
  g.lineTo(48, 36);
  g.lineTo(16, 36);
  g.closePath();
  g.fillPath();
  flush(TEX.fireTrail, 64, 64);

  // ---- Ground crack ---------------------------------------------------------
  g.lineStyle(6, 0x000000, 0.55);
  g.beginPath();
  g.moveTo(150, 90);
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2;
    g.moveTo(150, 90);
    g.lineTo(150 + Math.cos(ang) * 140, 90 + Math.sin(ang) * 80);
  }
  g.strokePath();
  flush(TEX.groundCrack, 300, 180);

  // ---- Homing lock reticle --------------------------------------------------
  g.lineStyle(6, 0xff5a8a, 1);
  g.strokeRect(14, 14, 68, 68);
  g.lineStyle(6, 0xff5a8a, 1);
  // corner ticks
  const ticks: Array<[number, number, number, number]> = [
    [8, 8, 30, 8], [8, 8, 8, 30],
    [88, 8, 66, 8], [88, 8, 88, 30],
    [8, 88, 30, 88], [8, 88, 8, 66],
    [88, 88, 66, 88], [88, 88, 88, 66],
  ];
  g.beginPath();
  for (const [x1, y1, x2, y2] of ticks) {
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
  }
  g.strokePath();
  flush(TEX.lock, 96, 96);

  // ---- Pickup star ----------------------------------------------------------
  g.fillStyle(0xffe08a, 1);
  drawStar(g, 24, 24, 5, 22, 10);
  flush(TEX.pickup, 48, 48);

  // ---- Enemies --------------------------------------------------------------
  drawFish(g, false);
  flush(TEX.fish, 88, 60);

  drawFish(g, true);
  flush(TEX.angryFish, 88, 60);

  drawPuffer(g);
  flush(TEX.pufferFish, 80, 80);

  drawWhale(g, 0xffffff, false);
  flush(TEX.whale, 240, 140);

  drawWhale(g, 0x8a5ad6, true);
  flush(TEX.bossWhale, 380, 240);

  // ---- Pies (one texture per pie, in its own colour) -----------------------
  for (const pie of PIE_TYPES) {
    drawPie(g, pie.color);
    flush(pie.assetKey, 64, 64);
  }

  g.destroy();
}

function drawStar(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  points: number,
  outer: number,
  inner: number,
): void {
  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.fillPath();
}

function drawFish(g: Phaser.GameObjects.Graphics, angry: boolean): void {
  // Tail
  g.fillStyle(0xffffff, 1);
  g.beginPath();
  g.moveTo(6, 14);
  g.lineTo(6, 46);
  g.lineTo(30, 30);
  g.closePath();
  g.fillPath();
  // Body
  g.fillStyle(0xffffff, 1);
  g.fillEllipse(50, 30, 62, 42);
  // Fin
  g.fillStyle(0xe6e6e6, 1);
  g.fillTriangle(48, 9, 64, 9, 50, 22);
  // Eye
  g.fillStyle(0x222233, 1);
  g.fillCircle(66, 24, 5);
  if (angry) {
    g.lineStyle(4, 0x222233, 1);
    g.beginPath();
    g.moveTo(58, 14);
    g.lineTo(72, 20);
    g.strokePath();
  }
}

function drawPuffer(g: Phaser.GameObjects.Graphics): void {
  // Spikes
  g.fillStyle(0xe6e6e6, 1);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const bx = 40 + Math.cos(a) * 26;
    const by = 40 + Math.sin(a) * 26;
    const tx = 40 + Math.cos(a) * 38;
    const ty = 40 + Math.sin(a) * 38;
    const px = 40 + Math.cos(a + 0.18) * 26;
    const py = 40 + Math.sin(a + 0.18) * 26;
    g.fillTriangle(bx, by, tx, ty, px, py);
  }
  // Body
  g.fillStyle(0xffffff, 1);
  g.fillCircle(40, 40, 27);
  // Eyes
  g.fillStyle(0x222233, 1);
  g.fillCircle(50, 34, 5);
  g.fillCircle(30, 34, 5);
}

function drawWhale(g: Phaser.GameObjects.Graphics, bodyColor: number, boss: boolean): void {
  const cx = boss ? 190 : 120;
  const cy = boss ? 130 : 74;
  const bw = boss ? 300 : 184;
  const bh = boss ? 170 : 100;
  // Tail
  g.fillStyle(bodyColor, 1);
  g.beginPath();
  g.moveTo(cx - bw / 2 - (boss ? 30 : 18), cy - bh / 3);
  g.lineTo(cx - bw / 2 - (boss ? 30 : 18), cy + bh / 3);
  g.lineTo(cx - bw / 2 + (boss ? 30 : 24), cy);
  g.closePath();
  g.fillPath();
  // Body
  g.fillStyle(bodyColor, 1);
  g.fillEllipse(cx, cy, bw, bh);
  // Belly
  g.fillStyle(boss ? 0xb98ae8 : 0xdedede, 1);
  g.fillEllipse(cx + bw * 0.05, cy + bh * 0.22, bw * 0.7, bh * 0.4);
  // Eye
  g.fillStyle(0x222233, 1);
  g.fillCircle(cx + bw * 0.32, cy - bh * 0.12, boss ? 12 : 7);
  if (boss) {
    // Crown
    g.fillStyle(0xffd166, 1);
    const crownY = cy - bh / 2 - 6;
    const cxx = cx + 30;
    g.beginPath();
    g.moveTo(cxx - 60, crownY);
    g.lineTo(cxx - 40, crownY - 40);
    g.lineTo(cxx - 20, crownY);
    g.lineTo(cxx, crownY - 50);
    g.lineTo(cxx + 20, crownY);
    g.lineTo(cxx + 40, crownY - 40);
    g.lineTo(cxx + 60, crownY);
    g.closePath();
    g.fillPath();
  }
}

function drawPie(g: Phaser.GameObjects.Graphics, color: number): void {
  // Filling dome
  g.fillStyle(color, 1);
  g.fillCircle(32, 28, 21);
  // Crust base
  g.fillStyle(0xd9a066, 1);
  g.fillRoundedRect(6, 34, 52, 22, 7);
  // Crust lattice hint
  g.fillStyle(0xe8b87a, 1);
  g.fillRect(6, 34, 52, 5);
  // Shine
  g.fillStyle(0xffffff, 0.5);
  g.fillCircle(24, 22, 4);
}
