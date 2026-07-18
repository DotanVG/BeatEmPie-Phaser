import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveDropPoint } from '../src/utils/pieTargeting.ts';

const bounds = { minX: 80, maxX: 1840, minY: 500, maxY: 970 };
const player = { x: 960, y: 700, facingSign: 1 };
const nearest = { x: 400, y: 600 };
const strongest = { x: 1500, y: 900 };
const click = { x: 1200, y: 800 };

const clickModes = ['groundTarget', 'nearestEnemy', 'screenWide', 'puddle', 'lineTrail'];

for (const mode of clickModes) {
  test(`${mode}: a click lands the pie EXACTLY at the clicked point`, () => {
    const r = resolveDropPoint(mode, click, player, nearest, strongest, bounds);
    assert.deepEqual({ tx: r.tx, ty: r.ty }, { tx: 1200, ty: 800 });
    assert.equal(r.homing, null);
  });
}

test('clicks outside the arena band are clamped to it', () => {
  const r = resolveDropPoint('groundTarget', { x: 20, y: 100 }, player, nearest, strongest, bounds);
  assert.deepEqual({ tx: r.tx, ty: r.ty }, { tx: 80, ty: 500 });
});

test('homing (Strawberry assassin) ignores the click and hunts the strongest enemy', () => {
  const r = resolveDropPoint('homing', click, player, nearest, strongest, bounds);
  assert.deepEqual({ tx: r.tx, ty: r.ty }, { tx: 1500, ty: 900 });
  assert.equal(r.homing, 'strongest');
});

test('homing with no enemies drops in front of the player', () => {
  const r = resolveDropPoint('homing', click, player, null, null, bounds);
  assert.deepEqual({ tx: r.tx, ty: r.ty }, { tx: 1110, ty: 700 });
  assert.equal(r.homing, null);
});

test('auto-drop (no click) falls back to the nearest enemy', () => {
  const r = resolveDropPoint('groundTarget', undefined, player, nearest, strongest, bounds);
  assert.deepEqual({ tx: r.tx, ty: r.ty }, { tx: 400, ty: 600 });
});

test('auto-drop with no enemies lands in front of the player', () => {
  const r = resolveDropPoint('groundTarget', undefined, player, null, null, bounds);
  assert.deepEqual({ tx: r.tx, ty: r.ty }, { tx: 1110, ty: 700 });
});

test('screenWide auto-drop (no click) centers on the player', () => {
  const r = resolveDropPoint('screenWide', undefined, player, nearest, strongest, bounds);
  assert.deepEqual({ tx: r.tx, ty: r.ty }, { tx: 960, ty: 700 });
});
