import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  getHudRightInset,
  hasManagedGameScene,
  shouldShowFullscreenButton,
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
  const windowTarget = createListenerTarget();
  const mediaQuery = Object.assign(createListenerTarget(), { matches: false });

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: Object.assign(windowTarget, {
      clearTimeout: globalThis.clearTimeout,
      setTimeout: globalThis.setTimeout,
      matchMedia: () => mediaQuery,
      visualViewport: createListenerTarget(),
      screen: { orientation: createListenerTarget() },
    }),
  });

  t.after(() => {
    if (previousWindowDescriptor) Object.defineProperty(globalThis, 'window', previousWindowDescriptor);
    else delete globalThis.window;
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

  mediaQuery.emit('change', { matches: true });
  mediaQuery.emit('change', { matches: false });

  assert.equal(pauseCalls, 1);
  assert.equal(resumeCalls, 1);
});
