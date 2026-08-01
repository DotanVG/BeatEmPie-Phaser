import assert from 'node:assert/strict';
import test from 'node:test';
import { selectPixelScale } from '../src/game/pixelScalePolicy.ts';

const decide = (width, height) => selectPixelScale(width, height, 1920, 1080);

test('uses exact integer scales at and above the internal resolution', () => {
  assert.deepEqual(decide(1920, 1080), {
    scale: 1,
    displayWidth: 1920,
    displayHeight: 1080,
    mode: 'integer-upscale',
    downscaleDivisor: null,
  });
  assert.equal(decide(2560, 1440).scale, 1);
  assert.equal(decide(3840, 2160).scale, 2);
});

test('letterboxes instead of selecting a fractional upscale', () => {
  const decision = decide(2560, 1440);
  assert.equal(decision.scale, 1);
  assert.equal(decision.displayWidth, 1920);
  assert.equal(decision.displayHeight, 1080);
  assert.equal(decision.mode, 'integer-upscale');
});

test('uses exact reciprocal scales below the internal resolution', () => {
  assert.deepEqual(decide(1440, 900), {
    scale: 0.5,
    displayWidth: 960,
    displayHeight: 540,
    mode: 'reciprocal-downscale',
    downscaleDivisor: 2,
  });
  assert.deepEqual(decide(852, 393), {
    scale: 1 / 3,
    displayWidth: 640,
    displayHeight: 360,
    mode: 'reciprocal-downscale',
    downscaleDivisor: 3,
  });
  assert.deepEqual(decide(568, 320), {
    scale: 0.25,
    displayWidth: 480,
    displayHeight: 270,
    mode: 'reciprocal-downscale',
    downscaleDivisor: 4,
  });
});

test('always returns finite whole CSS display dimensions', () => {
  for (const [width, height] of [
    [0, 0],
    [Number.NaN, Number.POSITIVE_INFINITY],
    [1170, 658],
    [1917, 1078],
  ]) {
    const decision = decide(width, height);
    assert.ok(Number.isFinite(decision.scale));
    assert.ok(Number.isInteger(decision.displayWidth));
    assert.ok(Number.isInteger(decision.displayHeight));
  }
});
