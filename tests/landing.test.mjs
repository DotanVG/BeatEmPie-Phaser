import test from 'node:test';
import assert from 'node:assert/strict';
import { connectLanding, enterGameplay, showLoadError } from '../src/game/landing.ts';

// Exercise DOM entry wiring without booting Phaser or changing gameplay.
test('native entry is ready, calls the existing handler, hands off focus, and cleans up', () => {
  const button = new globalThis.EventTarget();
  button.disabled = true;
  const landing = new globalThis.EventTarget();
  const status = { textContent: '', hidden: false };
  const error = { hidden: true };
  let focused = false;
  let scrolled = false;
  const classes = new Set();
  const elements = {
    'start-game': button, landing, 'landing-status': status, 'load-error': error,
    'game-root': { focus: () => { focused = true; } },
  };
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  globalThis.document = {
    getElementById: id => elements[id],
    documentElement: { classList: { add: name => classes.add(name) } },
  };
  globalThis.window = { scrollTo: (x, y) => { scrolled = x === 0 && y === 0; } };
  try {
    let starts = 0;
    const disconnect = connectLanding(() => { starts++; });
    assert.equal(button.disabled, false);
    assert.match(status.textContent, /Ready/);
    button.dispatchEvent(new globalThis.Event('click'));
    assert.equal(starts, 1);
    const key = new globalThis.Event('keydown');
    let nativeKeysKept = false;
    key.stopPropagation = () => { nativeKeysKept = true; };
    landing.dispatchEvent(key);
    assert.equal(nativeKeysKept, true);
    enterGameplay();
    assert.ok(classes.has('game-active'));
    assert.ok(focused && scrolled);
    disconnect();
    button.dispatchEvent(new globalThis.Event('click'));
    assert.equal(starts, 1);
    assert.equal(button.disabled, true);
    showLoadError();
    assert.equal(status.hidden, true);
    assert.equal(error.hidden, false);
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});
