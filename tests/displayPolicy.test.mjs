import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  getHudRightInset,
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

test('viewport sizing prefers visualViewport dimensions when available', () => {
  assert.deepEqual(
    measureViewport({
      innerWidth: 932,
      innerHeight: 430,
      visualViewport: { width: 915.4, height: 411.6 },
    }),
    { width: 915, height: 412 },
  );
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
        if (selector === '#rotate-gate .phone, #rotate-gate .turn-ring') return animatedNodes;
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
});
