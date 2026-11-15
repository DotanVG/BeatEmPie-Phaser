import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { URL } from 'node:url';
import { Buffer } from 'node:buffer';
import { DASH_FX, PLAYER } from '../src/data/balance.ts';

// Exercise the actual helper against tiny render doubles; no DOM/WebGL or Phaser runtime.
const helperUrl = new URL('../src/systems/DashEffects.ts', import.meta.url);
const compiled = ts.transpileModule(readFileSync(helperUrl, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText.replace(/from '(\.\.?\/[^']+)'/g, (_, path) => `from '${new URL(`${path}.ts`, helperUrl).href}'`);
const { DashEffects } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

function fixture() {
  const nodes = [];
  let shutdown;
  function image() {
    const node = {
      active: true, visible: true, alpha: 1, x: 600, y: 700, scaleX: 1, scaleY: 1,
      rotation: 0, angle: 0, originX: 0.5, originY: 0.5, flipX: false, flipY: false,
      height: 180, texture: { key: 'shared-sheet' }, frame: { name: 3 },
      setDepth() { return this; },
      setTexture(key, frame) { this.texture = { key }; this.frame = { name: frame }; return this; },
      setPosition(x, y) { Object.assign(this, { x, y }); return this; },
      setOrigin(x, y) { Object.assign(this, { originX: x, originY: y }); return this; },
      setFlip(x, y) { Object.assign(this, { flipX: x, flipY: y }); return this; },
      setScale(x, y = x) { Object.assign(this, { scaleX: x, scaleY: y }); return this; },
      setRotation(value) { this.rotation = value; return this; },
      setAngle(value) { this.angle = value; return this; },
      setTint(value) { this.tint = value; return this; },
      setVisible(value) { this.visible = value; return this; },
      setAlpha(value) { this.alpha = value; return this; },
      destroy() { this.active = false; },
    };
    nodes.push(node);
    return node;
  }
  function graphics() {
    const node = image();
    for (const method of ['clear', 'fillStyle', 'fillRect', 'beginPath', 'moveTo', 'lineTo', 'closePath', 'fillPath']) {
      node[method] = function () { return this; };
    }
    return node;
  }
  const scene = { add: { image, graphics }, events: { once(event, callback, context) {
    assert.equal(event, 'shutdown'); shutdown = () => callback.call(context);
  } } };
  const source = image();
  // Any cosmetic write to transforms or gameplay/body state fails immediately.
  source.setScale = source.setRotation = source.setAngle = () => assert.fail('physics sprite transformed');
  source.body = Object.freeze({ width: 64, height: 100, enable: true });
  const fx = new DashEffects(scene);
  const tick = (ms, dashing, alpha = 1) => { source.alpha = alpha; fx.tick(ms, dashing); };
  return { fx, source, nodes, shutdown: () => shutdown(), tick };
}
const live = fx => fx.particles.filter(p => p.age >= 0);
const ghosts = fx => fx.ghosts.filter(g => g.age >= 0);

test('dash mechanics remain pinned and cosmetics have finite budgets', () => {
  assert.equal(PLAYER.dashSpeed, 1150);
  assert.equal(PLAYER.dashDurationMs, 170);
  assert.equal(PLAYER.dashCooldownMs, 950);
  const player = readFileSync(new URL('../src/entities/Player.ts', import.meta.url), 'utf8');
  assert.match(player, /PLAYER.dashDurationMs \+ 60/);
  assert.match(player, /effects\.ring\(this.x, this.y, 90, 0xffe08a, 260\)/);
  assert.equal(DASH_FX.ghost.intervalMs, 25);
  assert.equal(DASH_FX.ghost.lifeMs, 280);
  assert.equal(DASH_FX.particles.limit, 192);
});

test('six layers mirror, share frozen frames, preserve the source, and expire', () => {
  for (const dx of [-1, 1]) {
    const { fx, source, nodes, tick, shutdown } = fixture();
    const count = nodes.length;
    const originalRandom = Math.random;
    Math.random = () => assert.fail('cosmetic consumed global RNG');
    try {
      fx.begin(source, dx, 0, 1.15, 84);
      assert.equal(live(fx).length, 18); // 5 clouds + 4 pebbles + 9 streaks
      assert.ok(live(fx).every(p => Math.sign(p.vx) === -dx));
      assert.equal(source.visible, true);
      assert.equal(source.alpha, 0);
      assert.equal(fx.visual.visible, false); // first 100 ms is the smear
      source.x += dx * 25;
      tick(50, true);
      const frozen = ghosts(fx)[0];
      assert.equal(frozen.image.texture.key, source.texture.key);
      assert.equal(frozen.image.frame.name, 3);
      const frozenX = frozen.image.x;
      source.frame.name = 7;
      source.x += dx * 25;
      tick(60, true, 0.4);
      assert.equal(fx.visual.visible, true);
      assert.ok(fx.visual.scaleX > 1.15);
      assert.equal(fx.visual.alpha, 0.4);
      assert.equal(frozen.image.frame.name, 3);
      assert.equal(frozen.image.x, frozenX);
      tick(60, false);
      assert.equal(fx.visual.angle, -22 * dx);
      assert.equal(fx.visual.scaleX, 1.15 * 0.8);
      const sparks = live(fx).filter(p => p.tint === DASH_FX.skid.tint);
      assert.equal(sparks.length, 12);
      assert.ok(sparks.every(p => Math.sign(p.vx) === dx));
      tick(1000, false);
      assert.equal(source.alpha, 1);
      assert.equal(source.visible, true);
      assert.equal(fx.visual.visible, false);
      assert.equal(fx.visual.rotation, 0);
      assert.equal(fx.visual.scaleX, 1);
      assert.equal(live(fx).length, 0);
      assert.equal(ghosts(fx).length, 0);
      assert.equal(nodes.length, count);
    } finally { Math.random = originalRandom; shutdown(); }
  }
});

test('pool exhaustion skips emissions, reuses slots, and interruption/shutdown restore render', () => {
  const { fx, source, nodes, tick, shutdown } = fixture();
  const count = nodes.length;
  fx.begin(source, 1, 0, 1.15, 84);
  for (const p of fx.particles) { p.age = 0; p.life = 5000; }
  tick(160, true);
  for (let i = 0; i < 20; i++) tick(1, true);
  assert.ok(ghosts(fx).length <= DASH_FX.ghost.perPlayer);
  tick(10, false); // full pool: skid burst must skip
  assert.equal(live(fx).length, DASH_FX.particles.limit);
  fx.cancel();
  assert.equal(source.alpha, 1);
  assert.equal(fx.visual.visible, false);
  assert.equal(fx.visual.scaleX, 1);
  assert.equal(live(fx).length, 0);
  assert.equal(ghosts(fx).length, 0);
  fx.begin(source, 0, -1, 1.15, 84);
  assert.equal(live(fx).length, 18);
  tick(0, true); // pause/no elapsed time preserves lifetime
  assert.ok(live(fx).every(p => p.age === 0));
  shutdown();
  assert.equal(source.alpha, 1);
  assert.ok(nodes.slice(1).every(node => !node.active));
  assert.equal(live(fx).length, 0);
  assert.equal(nodes.length, count);
  assert.doesNotThrow(() => { fx.cancel(); fx.tick(20, false); });
});
