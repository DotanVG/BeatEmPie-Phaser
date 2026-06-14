import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../game/constants';

/**
 * Fullscreen "rotate your device" overlay rendered entirely through Phaser's own pipeline.
 * Launched by orientation.ts when a touch device enters portrait; stopped on landscape.
 * Using Phaser tweens guarantees animation — CSS keyframes and rAF loops can be frozen
 * by the WebGL compositor on iOS/Android, but Phaser's game loop cannot.
 */
export class RotateScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RotateScene', active: false });
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // Dark backdrop
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x07091e, 0.97);

    // Violet radial glow (faked with stacked low-alpha circles)
    for (let i = 5; i >= 1; i--) {
      this.add.circle(cx, cy - 60, 320 * (i / 5), 0x3a2b6b, 0.05 * i);
    }

    // Phone shape ─ drawn on a container so the tween rotates it as a unit
    const phoneW = 160;
    const phoneH = 290;
    const r = 18; // corner radius

    const phoneGfx = this.make.graphics({}, false);

    // Body
    phoneGfx.lineStyle(8, COLORS.gold, 1);
    phoneGfx.fillStyle(COLORS.gold, 0.08);
    phoneGfx.fillRoundedRect(-phoneW / 2, -phoneH / 2, phoneW, phoneH, r);
    phoneGfx.strokeRoundedRect(-phoneW / 2, -phoneH / 2, phoneW, phoneH, r);

    // Screen area
    const sw = phoneW * 0.72;
    const sh = phoneH * 0.58;
    phoneGfx.fillStyle(COLORS.gold, 0.14);
    phoneGfx.fillRoundedRect(-sw / 2, -sh / 2 + 10, sw, sh, 8);

    // Notch pill at top
    phoneGfx.fillStyle(COLORS.gold, 0.85);
    phoneGfx.fillRoundedRect(-22, -phoneH / 2 + 14, 44, 8, 4);

    // Home button dot
    phoneGfx.fillCircle(0, phoneH / 2 - 20, 12);

    const phoneContainer = this.add.container(cx, cy - 30, [phoneGfx]);

    // Curved rotation arrow ─ "hat" arc above the phone, opacity pulsed separately
    const arrowGfx = this.add.graphics();
    arrowGfx.setAlpha(0.2);
    this.drawRotationArrow(arrowGfx, cx, cy - 30);

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

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      phoneContainer.rotation = Math.PI / 2;
      arrowGfx.setAlpha(0.55);
    } else {
      // Phone tween: 0° → 90° (hold) → 0° (pause) → repeat
      // Timing mirrors the old rAF loop: ~3 s per cycle.
      this.tweens.add({
        targets: phoneContainer,
        rotation: Math.PI / 2,
        duration: 990,
        ease: 'Sine.easeInOut',
        yoyo: true,
        hold: 810,       // pause at 90° before reversing
        repeatDelay: 360, // pause at 0° before repeating
        repeat: -1,
      });

      // Arrow fades in while the phone rotates, fades out as it returns
      this.tweens.add({
        targets: arrowGfx,
        alpha: 0.95,
        duration: 1200,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
    }

    // Always render on top of every other active scene
    this.scene.bringToTop();
  }

  /**
   * Draw a clockwise "hat" arc from upper-left through the top to upper-right, with an
   * arrowhead at the right end indicating the direction of rotation.
   */
  private drawRotationArrow(g: Phaser.GameObjects.Graphics, cx: number, cy: number): void {
    const radius = 215;
    // Arc center sits slightly below the phone center so the arc wraps around it from above.
    const arcCy = cy + 55;

    // Angles (Phaser screen coords: 0=right, 90=down, 270=up)
    const startDeg = 222;
    const endDeg = 318;
    const startRad = Phaser.Math.DegToRad(startDeg);
    const endRad = Phaser.Math.DegToRad(endDeg);

    g.lineStyle(8, COLORS.gold, 1); // object alpha handles the fade

    // Arc (clockwise through 270° = top)
    g.beginPath();
    g.arc(cx, arcCy, radius, startRad, endRad, false);
    g.strokePath();

    // Arrowhead at the end point
    const ax = cx + radius * Math.cos(endRad);
    const ay = arcCy + radius * Math.sin(endRad);
    const tangent = endRad + Math.PI / 2; // clockwise tangent direction
    const headLen = 34;
    const spread = 0.42;

    g.beginPath();
    g.moveTo(ax - headLen * Math.cos(tangent - spread), ay - headLen * Math.sin(tangent - spread));
    g.lineTo(ax, ay);
    g.lineTo(ax - headLen * Math.cos(tangent + spread), ay - headLen * Math.sin(tangent + spread));
    g.strokePath();
  }
}
