import test from 'node:test';
import assert from 'node:assert/strict';

import { stepFloaters } from '../src/utils/menuFloaters.ts';

test('stepFloaters bounces floaters off the containing bounds', () => {
  const [floater] = stepFloaters(
    [{ x: 95, y: 60, vx: 40, vy: 0, radius: 10 }],
    { minX: 0, maxX: 100, minY: 0, maxY: 100 },
    0.5,
  );

  assert.equal(floater.x, 90);
  assert.equal(floater.vx, -40);
});

test('stepFloaters swaps horizontal momentum on a head-on collision', () => {
  const [left, right] = stepFloaters(
    [
      { x: 40, y: 50, vx: 25, vy: 0, radius: 10 },
      { x: 60, y: 50, vx: -25, vy: 0, radius: 10 },
    ],
    { minX: 0, maxX: 100, minY: 0, maxY: 100 },
    0.5,
  );

  assert.equal(left.vx, -25);
  assert.equal(right.vx, 25);
  assert.ok(Math.abs(left.x - right.x) >= left.radius + right.radius);
});
