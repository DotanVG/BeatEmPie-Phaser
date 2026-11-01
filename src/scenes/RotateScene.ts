import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../game/constants';
import { getRotatePromptLayout, type SafeInsets } from '../game/displayPolicy';

// Easing helper — same curve Phaser's Sine.easeInOut uses
const sineEaseInOut = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;

// Phone rotation cycle breakdown (ms):
//   0–990   : rotate 0° → -90° (easeInOut, counterclockwise)
//   990–1800: hold at -90°     (810 ms)
//   1800–2790: rotate -90° → 0° (easeInOut)
//   2790–3150: hold at 0°      (360 ms)
const PHONE_IN = 990;
const PHONE_HOLD_END = 1800; // PHONE_IN + 810
const PHONE_OUT_END = 2790;  // PHONE_HOLD_END + 990
const PHONE_CYCLE = 3150;

// Arrow fill/deplete cycle (ms): 0 → 1 → 0, triangle wave
const ARROW_CYCLE = 1600;

// Unscaled prompt artwork bounds (world px), centered on the content container's origin.
const CONTENT_WIDTH = 860;
const CONTENT_HEIGHT = 640;
// Phone + arrow pivot, relative to the content origin.
const PHONE_Y = -85;

/** Resolve env(safe-area-inset-*) to pixels via a throwaway probe element. */
function readSafeInsets(): SafeInsets {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;' +
    'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) ' +
    'env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const insets = {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
  probe.remove();
  return insets;
}

/**
 * Fullscreen "rotate your device" overlay rendered entirely through Phaser's own pipeline.
 * Launched by orientation.ts when a touch device enters portrait; stopped on landscape.
 *
 * Animation is driven by wall-clock time (Date.now() - startTime) so it is immune to
 * delta = 0 / corrupted delta on mobile WebGL. update() advances the animation each frame;
 * a setInterval fallback takes over if update() ever stops firing.
 */
export class RotateScene extends Phaser.Scene {
  private phoneContainer!: Phaser.GameObjects.Container;
  private arrowGfx!: Phaser.GameObjects.Graphics;
  private content!: Phaser.GameObjects.Container;
  private layoutW = -1;
  private layoutH = -1;

  private startTime = 0;
  private elapsed = 0;
  private arrowElapsed = 0;
  private frameCount = 0;
  private prefersReduced = false;

  // setInterval fallback — kicks in when Phaser's game loop isn't ticking
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastIntervalFrame = -1;

  constructor() {
    super({ key: 'RotateScene', active: false });
  }

  create(): void {
    this.startTime = Date.now();
    this.elapsed = 0;
    this.arrowElapsed = 0;
    this.frameCount = 0;

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // Dark backdrop — a flat fill, so stretching it with the canvas is harmless.
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x07091e, 0.97);

    // Everything with a shape lives in one container that layout() counter-scales against
    // the CSS canvas stretch, so the prompt keeps its aspect ratio in portrait.
    const parts: Phaser.GameObjects.GameObject[] = [];

    // Violet radial glow (faked with stacked low-alpha circles)
    for (let i = 5; i >= 1; i--) {
      parts.push(this.add.circle(0, PHONE_Y - 30, 300 * (i / 5), 0x3a2b6b, 0.05 * i));
    }

    // Phone shape — drawn on a container so rotation works as a unit
    const phoneW = 160;
    const phoneH = 290;
    const r = 18;

    const phoneGfx = this.make.graphics({}, false);
    phoneGfx.lineStyle(8, COLORS.gold, 1);
    phoneGfx.fillStyle(COLORS.gold, 0.08);
    phoneGfx.fillRoundedRect(-phoneW / 2, -phoneH / 2, phoneW, phoneH, r);
    phoneGfx.strokeRoundedRect(-phoneW / 2, -phoneH / 2, phoneW, phoneH, r);

    const sw = phoneW * 0.72;
    const sh = phoneH * 0.58;
    phoneGfx.fillStyle(COLORS.gold, 0.14);
    phoneGfx.fillRoundedRect(-sw / 2, -sh / 2 + 10, sw, sh, 8);

    phoneGfx.fillStyle(COLORS.gold, 0.85);
    phoneGfx.fillRoundedRect(-22, -phoneH / 2 + 14, 44, 8, 4);
    phoneGfx.fillCircle(0, phoneH / 2 - 20, 12);

    this.phoneContainer = this.add.container(0, PHONE_Y, [phoneGfx]);
    parts.push(this.phoneContainer);

    // Curved rotation arrow — arc length animated via progressive fill
    this.arrowGfx = this.add.graphics();
    parts.push(this.arrowGfx);

    // Labels
    parts.push(
      this.add
        .text(0, 165, 'Rotate your device', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '72px',
          color: COLORS.goldHex,
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );

    parts.push(
      this.add
        .text(0, 260, 'BeatEmPie plays best in landscape 🥧', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '42px',
          color: '#fff4d6',
        })
        .setOrigin(0.5)
        .setAlpha(0.72),
    );

    this.content = this.add.container(cx, cy, parts);
    this.layoutW = -1;
    this.layoutH = -1;
    this.layout();

    // We intentionally ignore prefers-reduced-motion: this overlay is functional
    // instruction, not decorative animation. A static phone at 90° gave no visual
    // feedback that the device needed rotating, which looked like a frozen bug.
    this.prefersReduced = false;

    // Start the setInterval fallback immediately. intervalTick() yields to Phaser's
    // update() whenever it detects that frameCount has advanced, so there is no double-
    // drive when the game loop is healthy.
    this.lastIntervalFrame = -1;
    this.intervalId = setInterval(() => this.intervalTick(), 16);

    this.events.once('shutdown', () => this.clearInterval());

    this.scene.bringToTop();
  }

  update(_time: number, _delta: number): void {
    this.frameCount++;

    if (this.prefersReduced) return;

    // Use wall-clock elapsed so animation is immune to delta=0 / corrupted delta on mobile.
    const wallMs = Date.now() - this.startTime;
    this.elapsed = wallMs % PHONE_CYCLE;
    this.arrowElapsed = wallMs % ARROW_CYCLE;

    this.applyAnimation();
  }

  /**
   * setInterval fallback — fires ~60fps via the JS event loop rather than rAF.
   * Detects whether Phaser's update() has ticked since the last interval call by
   * comparing frameCount. If yes → yield (Phaser is handling animation). If no →
   * advance time and drive the objects directly.
   */
  private intervalTick(): void {
    if (this.prefersReduced) return;

    if (this.frameCount !== this.lastIntervalFrame) {
      // Phaser's update() is running — let it own the animation, just track frame
      this.lastIntervalFrame = this.frameCount;
      return;
    }

    // update() hasn't fired since the last interval tick — game loop is frozen.
    // Drive animation from the same wall-clock source.
    const wallMs = Date.now() - this.startTime;
    this.elapsed = wallMs % PHONE_CYCLE;
    this.arrowElapsed = wallMs % ARROW_CYCLE;
    this.applyAnimation();
  }

  private computeAngle(t: number): number {
    if (t < PHONE_IN) return sineEaseInOut(t / PHONE_IN) * -90;
    if (t < PHONE_HOLD_END) return -90;
    if (t < PHONE_OUT_END) return (1 - sineEaseInOut((t - PHONE_HOLD_END) / (PHONE_OUT_END - PHONE_HOLD_END))) * -90;
    return 0;
  }

  /** Re-fit the prompt whenever the canvas' on-screen size changes (URL bar, rotation). */
  private layout(): void {
    const canvas = this.game.canvas;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === this.layoutW && h === this.layoutH) return;
    this.layoutW = w;
    this.layoutH = h;

    const { x, y, scaleX, scaleY } = getRotatePromptLayout({
      worldWidth: GAME_WIDTH,
      worldHeight: GAME_HEIGHT,
      viewportWidth: w,
      viewportHeight: h,
      safe: readSafeInsets(),
      contentWidth: CONTENT_WIDTH,
      contentHeight: CONTENT_HEIGHT,
    });
    this.content.setPosition(x, y).setScale(scaleX, scaleY);
  }

  private applyAnimation(): void {
    this.layout();
    this.phoneContainer.setAngle(this.computeAngle(this.elapsed));

    // Fill fraction: triangle wave 0 → 1 → 0
    const at = this.arrowElapsed / ARROW_CYCLE;
    const fillT = at < 0.5 ? at * 2 : 2 - at * 2;
    this.drawRotationArrow(this.arrowGfx, 0, PHONE_Y, fillT);
  }

  private clearInterval(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Draw a counterclockwise "hat" arc from upper-right through the top to upper-left,
   * progressively filled from right (origin) to left (destination) by `fillT` (0–1), with
   * the arrowhead tracking the leading (fill-front) end indicating the direction of rotation.
   */
  private drawRotationArrow(g: Phaser.GameObjects.Graphics, cx: number, cy: number, fillT: number): void {
    const radius = 215;
    const arcCy = cy + 20;

    const destDeg = 222; // left end — destination
    const originDeg = 318; // right end — start of fill
    const currentDeg = originDeg - fillT * (originDeg - destDeg);

    const currentRad = Phaser.Math.DegToRad(currentDeg);
    const originRad = Phaser.Math.DegToRad(originDeg);
    const destRad = Phaser.Math.DegToRad(destDeg);

    g.clear();
    g.lineStyle(8, COLORS.gold, 1);

    g.beginPath();
    g.arc(cx, arcCy, radius, currentRad, originRad, false);
    g.strokePath();

    // Arrowhead tracks the leading edge of the fill, pointing further counterclockwise.
    const ax = cx + radius * Math.cos(currentRad);
    const ay = arcCy + radius * Math.sin(currentRad);
    const tangent = currentRad - Math.PI / 2;
    const headLen = 34;
    const spread = 0.42;

    g.beginPath();
    g.moveTo(ax - headLen * Math.cos(tangent - spread), ay - headLen * Math.sin(tangent - spread));
    g.lineTo(ax, ay);
    g.lineTo(ax - headLen * Math.cos(tangent + spread), ay - headLen * Math.sin(tangent + spread));
    g.strokePath();
  }
}
