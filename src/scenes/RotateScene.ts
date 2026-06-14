import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../game/constants';

// Easing helper — same curve Phaser's Sine.easeInOut uses
const sineEaseInOut = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;

// Phone rotation cycle breakdown (ms):
//   0–990   : rotate 0° → 90°  (easeInOut)
//   990–1800: hold at 90°      (810 ms)
//   1800–2790: rotate 90° → 0° (easeInOut)
//   2790–3150: hold at 0°      (360 ms)
const PHONE_IN = 990;
const PHONE_HOLD_END = 1800; // PHONE_IN + 810
const PHONE_OUT_END = 2790;  // PHONE_HOLD_END + 990
const PHONE_CYCLE = 3150;

// Arrow alpha pulse (ms): 0.2 → 0.95 → 0.2, triangle wave
const ARROW_CYCLE = 2400;

/**
 * Fullscreen "rotate your device" overlay rendered entirely through Phaser's own pipeline.
 * Launched by orientation.ts when a touch device enters portrait; stopped on landscape.
 *
 * Animation is driven by update() delta time (not tweens) so it survives cases where
 * Phaser's rAF loop is delayed or throttled by the mobile browser on startup. A setInterval
 * fallback takes over automatically if update() itself never fires — the frame counter text
 * (top-left) makes this visible during QA: 0 = game loop dead, >0 = Phaser is ticking.
 */
export class RotateScene extends Phaser.Scene {
  private phoneContainer!: Phaser.GameObjects.Container;
  private arrowGfx!: Phaser.GameObjects.Graphics;
  private debugText!: Phaser.GameObjects.Text;

  private elapsed = 0;
  private arrowElapsed = 0;
  private frameCount = 0;
  private prefersReduced = false;

  // setInterval fallback — kicks in when Phaser's game loop isn't ticking
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastIntervalTime = 0;
  private lastIntervalFrame = -1;

  constructor() {
    super({ key: 'RotateScene', active: false });
  }

  create(): void {
    this.elapsed = 0;
    this.arrowElapsed = 0;
    this.frameCount = 0;

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // Dark backdrop
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x07091e, 0.97);

    // Violet radial glow (faked with stacked low-alpha circles)
    for (let i = 5; i >= 1; i--) {
      this.add.circle(cx, cy - 60, 320 * (i / 5), 0x3a2b6b, 0.05 * i);
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

    this.phoneContainer = this.add.container(cx, cy - 30, [phoneGfx]);

    // Curved rotation arrow — opacity animated separately
    this.arrowGfx = this.add.graphics();
    this.arrowGfx.setAlpha(0.2);
    this.drawRotationArrow(this.arrowGfx, cx, cy - 30);

    // Labels
    this.add
      .text(cx, cy + 220, 'Rotate your device', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '72px',
        color: COLORS.goldHex,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy + 315, 'BeatEmPie plays best in landscape 🥧', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '42px',
        color: '#fff4d6',
      })
      .setOrigin(0.5)
      .setAlpha(0.72);

    // Frame counter — confirms Phaser's game loop is running on mobile during QA.
    // "F:0" = game loop frozen (setInterval fallback driving animation).
    // "F:N" climbing = Phaser is ticking normally.
    this.debugText = this.add
      .text(10, 10, 'F:0', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#ffff00',
        backgroundColor: '#000000',
      })
      .setAlpha(0.8)
      .setDepth(100);

    this.prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.prefersReduced) {
      this.phoneContainer.rotation = Math.PI / 2;
      this.arrowGfx.setAlpha(0.55);
    }

    // Start the setInterval fallback immediately. intervalTick() yields to Phaser's
    // update() whenever it detects that frameCount has advanced, so there is no double-
    // drive when the game loop is healthy.
    this.lastIntervalTime = Date.now();
    this.lastIntervalFrame = -1;
    this.intervalId = setInterval(() => this.intervalTick(), 16);

    this.events.once('shutdown', () => this.clearInterval());

    this.scene.bringToTop();
  }

  update(_time: number, delta: number): void {
    this.frameCount++;
    this.debugText.setText(`F:${this.frameCount}`);

    if (this.prefersReduced) return;

    // Game loop is alive — advance time and apply animation
    this.elapsed = (this.elapsed + delta) % PHONE_CYCLE;
    this.arrowElapsed = (this.arrowElapsed + delta) % ARROW_CYCLE;
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

    const now = Date.now();
    const delta = now - this.lastIntervalTime;
    this.lastIntervalTime = now;

    if (this.frameCount !== this.lastIntervalFrame) {
      // Phaser's update() is running — let it own the animation, just track frame
      this.lastIntervalFrame = this.frameCount;
      return;
    }

    // update() hasn't fired since the last interval tick — game loop is frozen.
    // Drive animation ourselves using wall-clock delta.
    this.elapsed = (this.elapsed + delta) % PHONE_CYCLE;
    this.arrowElapsed = (this.arrowElapsed + delta) % ARROW_CYCLE;
    this.applyAnimation();
  }

  private applyAnimation(): void {
    // Phone rotation: 0° → 90° → hold → 90° → 0° → pause → repeat
    const t = this.elapsed;
    let angle: number;
    if (t < PHONE_IN) {
      angle = sineEaseInOut(t / PHONE_IN) * 90;
    } else if (t < PHONE_HOLD_END) {
      angle = 90;
    } else if (t < PHONE_OUT_END) {
      angle = (1 - sineEaseInOut((t - PHONE_HOLD_END) / (PHONE_OUT_END - PHONE_HOLD_END))) * 90;
    } else {
      angle = 0;
    }
    this.phoneContainer.setAngle(angle);

    // Arrow alpha: triangle wave 0.2 → 0.95 → 0.2
    const at = this.arrowElapsed / ARROW_CYCLE;
    const alphaT = at < 0.5 ? at * 2 : 2 - at * 2;
    this.arrowGfx.setAlpha(0.2 + alphaT * 0.75);
  }

  private clearInterval(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Draw a clockwise "hat" arc from upper-left through the top to upper-right, with an
   * arrowhead at the right end indicating the direction of rotation.
   */
  private drawRotationArrow(g: Phaser.GameObjects.Graphics, cx: number, cy: number): void {
    const radius = 215;
    const arcCy = cy + 55;

    const startDeg = 222;
    const endDeg = 318;
    const startRad = Phaser.Math.DegToRad(startDeg);
    const endRad = Phaser.Math.DegToRad(endDeg);

    g.lineStyle(8, COLORS.gold, 1);

    g.beginPath();
    g.arc(cx, arcCy, radius, startRad, endRad, false);
    g.strokePath();

    const ax = cx + radius * Math.cos(endRad);
    const ay = arcCy + radius * Math.sin(endRad);
    const tangent = endRad + Math.PI / 2;
    const headLen = 34;
    const spread = 0.42;

    g.beginPath();
    g.moveTo(ax - headLen * Math.cos(tangent - spread), ay - headLen * Math.sin(tangent - spread));
    g.lineTo(ax, ay);
    g.lineTo(ax - headLen * Math.cos(tangent + spread), ay - headLen * Math.sin(tangent + spread));
    g.strokePath();
  }
}
