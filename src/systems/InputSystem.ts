import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { ARENA, DEPTHS } from '../game/constants';

const KC = Phaser.Input.Keyboard.KeyCodes;

/**
 * Translates keyboard + mouse (+ optional touch via TouchControls) into player and
 * pie-system actions. Keyboard mapping:
 *   WASD / Arrows = move · Space = drop on nearest/front · 1-0 = select pie
 *   Q/E = cycle pie · Shift = dash · P/Esc = pause
 *   Mouse move = aim · Left click = drop at cursor
 */
export class InputSystem {
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private numberKeys: Phaser.Input.Keyboard.Key[] = [];
  private reticle!: Phaser.GameObjects.Graphics;

  constructor(private scene: GameScene) {}

  setup(): void {
    const kb = this.scene.input.keyboard;
    if (kb) {
      this.cursors = kb.createCursorKeys();
      this.keys = kb.addKeys('W,A,S,D,Q,E,P,ESC,SHIFT,SPACE') as Record<string, Phaser.Input.Keyboard.Key>;
      const codes = [KC.ONE, KC.TWO, KC.THREE, KC.FOUR, KC.FIVE, KC.SIX, KC.SEVEN, KC.EIGHT, KC.NINE, KC.ZERO];
      this.numberKeys = codes.map((c) => kb.addKey(c));
    }

    this.reticle = this.scene.add.graphics().setDepth(DEPTHS.WARNING - 1);
    this.reticle.lineStyle(3, 0xffe08a, 0.8);
    this.reticle.strokeCircle(0, 0, 22);
    this.reticle.lineBetween(-30, 0, -10, 0);
    this.reticle.lineBetween(10, 0, 30, 0);
    this.reticle.lineBetween(0, -30, 0, -10);
    this.reticle.lineBetween(0, 10, 0, 30);
    this.reticle.setVisible(false);

    this.scene.input.on('pointerdown', this.onPointerDown, this);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    // On touch devices the DROP button handles drops; tap-to-drop is mouse-only.
    if (this.scene.touch || this.scene.isInputLocked || !pointer.leftButtonDown()) return;
    const wy = pointer.worldY;
    if (wy >= ARENA.minY - 240 && wy <= ARENA.maxY + 80) {
      this.scene.pies.dropAtPoint(pointer.worldX, pointer.worldY);
    }
  }

  update(): void {
    const { player, pies } = this.scene;

    // --- Movement (keyboard or touch joystick) ---
    let mx = 0;
    let my = 0;
    if (this.keys) {
      if (this.cursors.left?.isDown || this.keys.A.isDown) mx -= 1;
      if (this.cursors.right?.isDown || this.keys.D.isDown) mx += 1;
      if (this.cursors.up?.isDown || this.keys.W.isDown) my -= 1;
      if (this.cursors.down?.isDown || this.keys.S.isDown) my += 1;
    }
    const touch = this.scene.touch?.getMove();
    if (touch && (touch.x !== 0 || touch.y !== 0)) {
      mx = touch.x;
      my = touch.y;
    }
    player.setMoveDirection(mx, my);

    if (!this.keys) {
      this.updateReticle();
      return;
    }

    // --- Actions ---
    if (Phaser.Input.Keyboard.JustDown(this.keys.SHIFT)) player.tryDash();
    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || (this.cursors.space && Phaser.Input.Keyboard.JustDown(this.cursors.space))) {
      pies.dropAuto();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.Q)) pies.cyclePie(-1);
    if (Phaser.Input.Keyboard.JustDown(this.keys.E)) pies.cyclePie(1);
    if (Phaser.Input.Keyboard.JustDown(this.keys.P) || Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
      this.scene.togglePause();
    }
    for (let i = 0; i < this.numberKeys.length; i++) {
      if (Phaser.Input.Keyboard.JustDown(this.numberKeys[i])) pies.selectIndex(i);
    }

    // Aim toward the cursor when standing still.
    if (mx === 0 && my === 0) {
      const p = this.scene.input.activePointer;
      if (p.worldY >= ARENA.minY - 200 && p.worldY <= ARENA.maxY + 80) player.faceToward(p.worldX);
    }

    this.updateReticle();
  }

  private updateReticle(): void {
    if (this.scene.sys.game.device.input.touch && !this.scene.input.mousePointer.active) {
      this.reticle.setVisible(false);
      return;
    }
    const p = this.scene.input.activePointer;
    const inArena = p.worldY >= ARENA.minY - 200 && p.worldY <= ARENA.maxY + 80;
    this.reticle.setVisible(inArena);
    if (inArena) this.reticle.setPosition(p.worldX, p.worldY);
  }

  dispose(): void {
    this.scene.input.off('pointerdown', this.onPointerDown, this);
  }
}
