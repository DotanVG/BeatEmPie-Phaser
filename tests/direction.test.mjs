import test from 'node:test';
import assert from 'node:assert/strict';

import { facingFromDelta, flipForFacing } from '../src/utils/direction.ts';

test('facingFromDelta keeps the last facing for neutral horizontal movement', () => {
  assert.equal(facingFromDelta(0.4, 'left'), 'left');
  assert.equal(facingFromDelta(-0.4, 'right'), 'right');
});

test('flipForFacing matches the authored Shushki sprites that face left by default', () => {
  assert.equal(flipForFacing('left'), false);
  assert.equal(flipForFacing('right'), true);
});
