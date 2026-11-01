import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { EventEmitter } from 'node:events';

import {
  getHudRightInset,
  getRotatePromptLayout,
  hasManagedGameScene,
  measureViewport,
  shouldShowFullscreenButton,
  shouldShowRotateGate,
} from '../src/game/displayPolicy.ts';

function createListenerTarget() {
  const listeners = new Map();

  return {
    addEventListener(type, listener) {
      const bucket = listeners.get(type) ?? [];
      bucket.push(listener);
      listeners.set(type, bucket);
    },
    removeEventListener(type, listener) {
      const bucket = listeners.get(type) ?? [];
      listeners.set(
        type,
        bucket.filter((entry) => entry !== listener),
      );
    },
    emit(type, event) {
      for (const listener of listeners.get(type) ?? []) {
        listener(event);
      }
    },
  };
}

async function loadOrientationGate() {
  const sourcePath = path.resolve('src/game/orientation.ts');
  const tempPath = path.resolve('tests/.tmp-orientation-gate.test.ts');
  const source = await fs.readFile(sourcePath, 'utf8');
  const patchedSource = source.replace(
    "from './displayPolicy';",
    "from '../src/game/displayPolicy.ts';",
  );

  await fs.writeFile(tempPath, patchedSource);
  try {
    const moduleUrl = `${pathToFileURL(tempPath).href}?t=${Date.now()}`;
    return (await import(moduleUrl)).installOrientationGate;
  } finally {
    await fs.unlink(tempPath).catch(() => {});
  }
}

test('desktop fullscreen hides the fullscreen button once already fullscreen', () => {
  assert.equal(
    shouldShowFullscreenButton({ supported: true, active: true, coarsePointer: false }),
    false,
  );
});

test('mobile keeps the fullscreen button visible even after entering fullscreen', () => {
  assert.equal(
    shouldShowFullscreenButton({ supported: true, active: true, coarsePointer: true }),
    true,
  );
});

test('mobile reserves more top-right HUD space for the fullscreen button', () => {
  assert.ok(getHudRightInset(true) > getHudRightInset(false));
});

test('viewport sizing uses the full layout viewport, not the URL-bar-shrunk visual viewport', () => {
  // The full layout viewport keeps the canvas full-bleed (no bottom grey bar / side margins).
  assert.deepEqual(
    measureViewport({
      innerWidth: 932,
      innerHeight: 430,
      visualViewport: { width: 915.4, height: 411.6, scale: 1 },
    }),
    { width: 932, height: 430 },
  );
});

test('zoomed viewport fits the visible area without rounding beyond its edges', () => {
  assert.deepEqual(measureViewport({
    innerWidth: 812, innerHeight: 375,
    visualViewport: { width: 406, height: 187.5, scale: 2 },
  }), { width: 406, height: 187 });
  assert.deepEqual(measureViewport({ innerWidth: 812, innerHeight: 375 }),
    { width: 812, height: 375 });
});

test('rotate gate is driven by coarse-pointer portrait viewport dimensions', () => {
  assert.equal(
    shouldShowRotateGate({ width: 430, height: 932, coarsePointer: true }),
    true,
  );
  assert.equal(
    shouldShowRotateGate({ width: 932, height: 430, coarsePointer: true }),
    false,
  );
  assert.equal(
    shouldShowRotateGate({ width: 430, height: 932, coarsePointer: false }),
    false,
  );
});

test('rotate prompt keeps its aspect ratio and centers inside the safe area', () => {
  const base = { worldWidth: 1920, worldHeight: 1080, contentWidth: 860, contentHeight: 640 };
  const cases = [
    { viewportWidth: 390, viewportHeight: 844, safe: { top: 47, right: 0, bottom: 34, left: 0 } },
    { viewportWidth: 360, viewportHeight: 640, safe: { top: 0, right: 0, bottom: 0, left: 0 } },
    { viewportWidth: 820, viewportHeight: 1180, safe: { top: 24, right: 0, bottom: 20, left: 0 } },
  ];
  for (const c of cases) {
    const { x, y, scaleX, scaleY } = getRotatePromptLayout({ ...base, ...c });
    // World -> CSS stretch applied by the canvas shell.
    const sx = c.viewportWidth / 1920;
    const sy = c.viewportHeight / 1080;
    const onScreenX = scaleX * sx;
    const onScreenY = scaleY * sy;
    assert.ok(Math.abs(onScreenX - onScreenY) < 1e-9, 'no stretch: uniform on-screen scale');

    const safeW = c.viewportWidth - c.safe.left - c.safe.right;
    const safeH = c.viewportHeight - c.safe.top - c.safe.bottom;
    assert.ok(860 * onScreenX <= safeW + 1e-9 && 640 * onScreenY <= safeH + 1e-9, 'fits safe area');
    assert.ok(Math.abs(860 * onScreenX - safeW) < 1e-6 || Math.abs(640 * onScreenY - safeH) < 1e-6, 'fills one axis');
    assert.ok(Math.abs(x * sx - (c.safe.left + safeW / 2)) < 1e-9, 'horizontally centered');
    assert.ok(Math.abs(y * sy - (c.safe.top + safeH / 2)) < 1e-9, 'vertically centered');
  }
});

test('orientation management can recover a paused GameScene', () => {
  assert.equal(
    hasManagedGameScene({
      isActive: () => false,
      isPaused: () => true,
    }),
    true,
  );
});

test('orientation gate resumes audio after rotating back from portrait on non-game scenes', async (t) => {
  const previousWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const previousDocumentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const windowTarget = createListenerTarget();
  const visualViewport = Object.assign(createListenerTarget(), { width: 932, height: 430 });
  const coarsePointerQuery = Object.assign(createListenerTarget(), { matches: true });
  const documentTarget = createListenerTarget();

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: Object.assign(windowTarget, {
      innerWidth: 932,
      innerHeight: 430,
      clearTimeout: globalThis.clearTimeout,
      setTimeout: globalThis.setTimeout,
      matchMedia: () => coarsePointerQuery,
      visualViewport,
      screen: { orientation: createListenerTarget() },
    }),
  });

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    writable: true,
    value: Object.assign(documentTarget, {
      documentElement: {
        dataset: {},
        style: { setProperty() {} },
      },
      querySelectorAll: () => [],
    }),
  });

  t.after(() => {
    if (previousWindowDescriptor) Object.defineProperty(globalThis, 'window', previousWindowDescriptor);
    else delete globalThis.window;

    if (previousDocumentDescriptor) Object.defineProperty(globalThis, 'document', previousDocumentDescriptor);
    else delete globalThis.document;
  });

  let pauseCalls = 0;
  let resumeCalls = 0;

  const installOrientationGate = await loadOrientationGate();

  installOrientationGate({
    events: new EventEmitter(),
    sound: {
      locked: false,
      pauseAll: () => {
        pauseCalls += 1;
      },
      resumeAll: () => {
        resumeCalls += 1;
      },
    },
    scene: {
      isActive: () => false,
      isPaused: () => false,
      getScene: () => {
        throw new Error('menu rotation should not try to fetch GameScene');
      },
    },
    scale: {
      updateBounds: () => {},
      refresh: () => {},
    },
  });

  globalThis.window.innerWidth = 430;
  globalThis.window.innerHeight = 932;
  visualViewport.width = 430;
  visualViewport.height = 932;
  windowTarget.emit('resize');
  await new Promise((resolve) => globalThis.setTimeout(resolve, 60));

  globalThis.window.innerWidth = 932;
  globalThis.window.innerHeight = 430;
  visualViewport.width = 932;
  visualViewport.height = 430;
  windowTarget.emit('resize');
  await new Promise((resolve) => globalThis.setTimeout(resolve, 60));

  assert.equal(pauseCalls, 1);
  assert.equal(resumeCalls, 1);
});

test('orientation gate tracks viewport resize even if orientation media-query never changes', async (t) => {
  const previousWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const previousDocumentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const windowTarget = createListenerTarget();
  const visualViewport = Object.assign(createListenerTarget(), { width: 932, height: 430 });
  const coarsePointerQuery = Object.assign(createListenerTarget(), { matches: true });
  const staleOrientationQuery = Object.assign(createListenerTarget(), { matches: false });
  const rootStyle = new Map();
  const animatedNodes = [
    { style: {}, get offsetWidth() { return 220; } },
    { style: {}, get offsetWidth() { return 220; } },
  ];
  const documentElement = {
    dataset: {},
    style: {
      setProperty(name, value) {
        rootStyle.set(name, value);
      },
    },
  };

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    writable: true,
    value: Object.assign(createListenerTarget(), {
      documentElement,
      querySelectorAll(selector) {
        if (selector === '#rotate-gate .phone') return animatedNodes;
        return [];
      },
    }),
  });

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: Object.assign(windowTarget, {
      innerWidth: 932,
      innerHeight: 430,
      clearTimeout: globalThis.clearTimeout,
      setTimeout: globalThis.setTimeout,
      matchMedia: (query) => (query === '(pointer: coarse)' ? coarsePointerQuery : staleOrientationQuery),
      visualViewport,
      screen: { orientation: createListenerTarget() },
    }),
  });

  t.after(() => {
    if (previousWindowDescriptor) Object.defineProperty(globalThis, 'window', previousWindowDescriptor);
    else delete globalThis.window;

    if (previousDocumentDescriptor) Object.defineProperty(globalThis, 'document', previousDocumentDescriptor);
    else delete globalThis.document;
  });

  let pauseCalls = 0;
  let resumeCalls = 0;

  const installOrientationGate = await loadOrientationGate();
  installOrientationGate({
    events: new EventEmitter(),
    sound: {
      locked: false,
      pauseAll: () => {
        pauseCalls += 1;
      },
      resumeAll: () => {
        resumeCalls += 1;
      },
    },
    scene: {
      isActive: () => false,
      isPaused: () => false,
      getScene: () => {
        throw new Error('viewport-only rotation should not fetch GameScene');
      },
    },
    scale: {
      updateBounds: () => {},
      refresh: () => {},
    },
  });

  assert.equal(rootStyle.get('--app-width'), '932px');
  assert.equal(rootStyle.get('--app-height'), '430px');

  globalThis.window.innerWidth = 430;
  globalThis.window.innerHeight = 932;
  visualViewport.width = 430;
  visualViewport.height = 932;
  windowTarget.emit('resize');
  await new Promise((resolve) => globalThis.setTimeout(resolve, 60));

  assert.equal(pauseCalls, 1);
  assert.equal(documentElement.dataset.rotateGate, 'active');
  assert.equal(rootStyle.get('--app-width'), '430px');
  assert.equal(rootStyle.get('--app-height'), '932px');

  globalThis.window.innerWidth = 932;
  globalThis.window.innerHeight = 430;
  visualViewport.width = 932;
  visualViewport.height = 430;
  windowTarget.emit('resize');
  await new Promise((resolve) => globalThis.setTimeout(resolve, 60));

  assert.equal(resumeCalls, 1);
  assert.equal(documentElement.dataset.rotateGate, 'inactive');

  Object.assign(visualViewport, { width: 466, height: 215, scale: 2, offsetLeft: 18, offsetTop: 24 });
  visualViewport.emit('resize');
  await new Promise((resolve) => globalThis.setTimeout(resolve, 60));
  assert.equal(rootStyle.get('--app-width'), '466px');
  assert.equal(rootStyle.get('--app-height'), '215px');
  visualViewport.offsetLeft = 32;
  visualViewport.emit('scroll');
  await new Promise((resolve) => globalThis.setTimeout(resolve, 60));
  assert.equal(rootStyle.get('--app-left'), '32px');
  assert.equal(rootStyle.get('--app-top'), '24px');
  assert.equal(pauseCalls, 1);
  assert.equal(resumeCalls, 1);
});

test('portrait gate follows gameplay activation and audio unlock without a resize', async (t) => {
  const installOrientationGate = await loadOrientationGate();
  const cases = [
    { name: 'portrait start before scenes boot', booted: false },
    { name: 'portrait restart after scenes boot', booted: true },
    { name: 'gameplay resumes in portrait', event: 'resume' },
    { name: 'gameplay wakes in portrait', event: 'wake' },
    { name: 'manual pause stays owned by the player', userPaused: true },
    { name: 'audio unlocks while portrait is still gated', locked: true },
    { name: 'desktop portrait never gates', coarse: false },
    { name: 'ended game stays untouched', ended: true },
  ];
  for (const scenario of cases) {
    await t.test(scenario.name, (t) => {
      const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
      const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
      let refresh;
      const viewport = Object.assign(createListenerTarget(), {
        innerWidth: 375, innerHeight: 812,
        matchMedia: () => Object.assign(createListenerTarget(), { matches: scenario.coarse !== false }),
        screen: {},
        setTimeout: (callback) => { refresh = callback; return 1; },
        clearTimeout() {},
      });
      Object.defineProperty(globalThis, 'window', { configurable: true, value: viewport });
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: Object.assign(createListenerTarget(), {
          documentElement: { dataset: {}, style: { setProperty() {} } },
        }),
      });
      t.after(() => {
        if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
        else delete globalThis.window;
        if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
        else delete globalThis.document;
      });

      let active = false;
      let paused = false;
      let suspends = 0;
      let resumes = 0;
      let audioPauses = 0;
      let audioResumes = 0;
      const gs = {
        events: new EventEmitter(),
        isGameEnded: scenario.ended ?? false,
        suspendForOrientation() { suspends++; active = false; paused = true; },
        resumeFromOrientation() { resumes++; active = true; paused = false; },
      };
      const game = {
        events: new EventEmitter(),
        scene: {
          isBooted: scenario.booted ?? true,
          isActive: (key) => key === 'GameScene' && active,
          isPaused: () => paused,
          getScene: () => gs,
        },
        sound: Object.assign(new EventEmitter(), {
          locked: scenario.locked ?? false,
          pauseAll() { audioPauses++; },
          resumeAll() { audioResumes++; },
        }),
        scale: { updateBounds() {}, refresh() {} },
      };
      installOrientationGate(game);
      refresh(); // Portrait is detected before GameScene exists.
      game.scene.isBooted = true;
      game.events.emit('ready');
      active = !scenario.userPaused;
      paused = scenario.userPaused ?? false;
      const pausesBeforeCreate = audioPauses;
      gs.events.emit(scenario.event ?? 'create', gs);
      const shouldSuspend = !scenario.userPaused && !scenario.ended && scenario.coarse !== false;
      assert.equal(suspends, shouldSuspend ? 1 : 0);
      assert.equal(paused, shouldSuspend || Boolean(scenario.userPaused));
      if (shouldSuspend && !scenario.locked) assert.ok(audioPauses > pausesBeforeCreate);

      game.sound.locked = false;
      game.sound.emit('unlocked', game.sound);
      assert.equal(suspends, shouldSuspend ? 1 : 0, 'unlock must not take another pause');
      assert.equal(audioPauses > 0, scenario.coarse !== false);

      Object.assign(viewport, { innerWidth: 812, innerHeight: 375 });
      viewport.emit('resize');
      refresh();
      assert.equal(resumes, shouldSuspend ? 1 : 0);
      assert.equal(paused, Boolean(scenario.userPaused));
      assert.equal(audioResumes, scenario.coarse !== false ? 1 : 0);
      gs.events.emit('resume');
      assert.equal(suspends, shouldSuspend ? 1 : 0, 'landscape resume must stay active');
    });
  }
});
