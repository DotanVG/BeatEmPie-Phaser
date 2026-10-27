import test from 'node:test';
import assert from 'node:assert/strict';
import { connectLanding, enterGameplay, installDeferredStart, showLoadError } from '../src/game/landing.ts';

function mockDOM(t) {
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const button = new globalThis.EventTarget();
  const attributes = new Map();
  button.disabled = true;
  button.setAttribute = (name, value) => attributes.set(name, value);
  button.removeAttribute = name => attributes.delete(name);
  const root = new globalThis.EventTarget();
  let focused = false;
  let scrolled = false;
  root.focus = () => { focused = true; };
  const classes = new Set();
  const elements = {
    'start-game': button,
    landing: new globalThis.EventTarget(),
    'landing-status': { textContent: '', hidden: false },
    'load-error': { hidden: true },
    'game-root': root,
  };
  globalThis.document = {
    getElementById: id => elements[id],
    documentElement: { classList: { add: name => classes.add(name) } },
  };
  globalThis.window = new globalThis.EventTarget();
  globalThis.window.scrollTo = (x, y) => { scrolled = x === 0 && y === 0; };
  t.after(() => {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  });
  return { button, root, attributes, elements, classes, handedOff: () => focused && scrolled };
}

test('native entry calls the existing handler, hands off focus, and cleans up', t => {
  const dom = mockDOM(t);
  let starts = 0;
  const disconnect = connectLanding(() => { starts++; });
  assert.equal(dom.button.disabled, false);
  assert.match(dom.elements['landing-status'].textContent, /Ready/);
  dom.button.dispatchEvent(new globalThis.Event('click'));
  assert.equal(starts, 1);
  const key = new globalThis.Event('keydown');
  let nativeKeysKept = false;
  key.stopPropagation = () => { nativeKeysKept = true; };
  dom.elements.landing.dispatchEvent(key);
  assert.equal(nativeKeysKept, true);
  enterGameplay();
  assert.ok(dom.classes.has('game-active'));
  assert.ok(dom.handedOff());
  disconnect();
  dom.button.dispatchEvent(new globalThis.Event('click'));
  assert.equal(starts, 1);
  assert.equal(dom.button.disabled, true);
  showLoadError();
  assert.equal(dom.elements['landing-status'].hidden, true);
  assert.equal(dom.elements['load-error'].hidden, false);
});

test('loads only on Start, resumes audio before awaiting, and starts once when the menu is ready', async t => {
  const dom = mockDOM(t);
  const calls = [];
  let context;
  globalThis.window.AudioContext = class {
    constructor() { context = this; calls.push('context'); }
    resume() { calls.push('resume'); return Promise.resolve(); }
  };
  let finish;
  installDeferredStart(audio => {
    calls.push('load');
    assert.equal(audio, context);
    return new Promise(resolve => { finish = resolve; });
  });
  assert.deepEqual(calls, []);
  assert.equal(dom.button.disabled, false);
  dom.button.dispatchEvent(new globalThis.Event('click'));
  dom.button.dispatchEvent(new globalThis.Event('click'));
  dom.root.dispatchEvent(new globalThis.Event('click'));
  assert.deepEqual(calls, ['context', 'resume', 'load']);
  assert.equal(dom.button.disabled, true);
  assert.equal(dom.attributes.get('aria-busy'), 'true');
  assert.match(dom.elements['landing-status'].textContent, /Loading/);
  finish();
  await Promise.resolve();
  assert.equal(dom.button.disabled, true, 'import completion alone is not game readiness');
  let starts = 0;
  const disconnect = connectLanding(() => { starts++; });
  assert.equal(starts, 1);
  assert.equal(dom.attributes.has('aria-busy'), false);
  disconnect();
  connectLanding(() => { starts++; })();
  assert.equal(starts, 1, 'returning to a menu must not auto-start again');
});

for (const entry of ['Enter', ' ', 'game-region click']) {
  test(`${JSON.stringify(entry)} uses the same deferred loader without requiring Web Audio`, t => {
    const dom = mockDOM(t);
    let loads = 0;
    installDeferredStart(async audio => { assert.equal(audio, undefined); loads++; });
    if (entry === 'game-region click') {
      dom.root.dispatchEvent(new globalThis.Event('click'));
    } else {
      const key = new globalThis.Event('keydown', { cancelable: true });
      key.key = entry;
      globalThis.window.dispatchEvent(key);
      assert.equal(key.defaultPrevented, true);
    }
    assert.equal(loads, 1);
    let starts = 0;
    connectLanding(() => { starts++; })();
    assert.equal(starts, 1);
  });
}

test('shortcuts preserve native controls, prevented keys, and repeat keys', t => {
  mockDOM(t);
  let loads = 0;
  installDeferredStart(async () => { loads++; });
  for (const options of [{ repeat: true }, { prevented: true }, { native: true }, { key: 'Escape' }]) {
    const key = new globalThis.Event('keydown', { cancelable: true });
    key.key = options.key ?? 'Enter';
    key.repeat = options.repeat;
    if (options.prevented) key.preventDefault();
    if (options.native) Object.defineProperty(key, 'target', { value: { closest: () => ({}) } });
    globalThis.window.dispatchEvent(key);
  }
  assert.equal(loads, 0);
});

test('failed import shows a readable retry path and closes the unused audio context', async t => {
  const dom = mockDOM(t);
  let closed = false;
  globalThis.window.AudioContext = class {
    resume() { return Promise.resolve(); }
    close() { closed = true; return Promise.resolve(); }
  };
  installDeferredStart(async () => { throw new Error('network failed'); });
  dom.button.dispatchEvent(new globalThis.Event('click'));
  await new Promise(resolve => globalThis.setImmediate(resolve));
  assert.equal(closed, true);
  assert.equal(dom.elements['landing-status'].hidden, true);
  assert.equal(dom.elements['load-error'].hidden, false);
  assert.equal(dom.attributes.has('aria-busy'), false);
  assert.equal(dom.button.disabled, true);
});
