import type Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { hasManagedGameScene, measureViewport, shouldShowRotateGate } from './displayPolicy';

/**
 * Landscape-only orientation gate.
 *
 * The visible "rotate your device" overlay lives in `index.html` and is toggled purely by
 * a CSS media query (`@media (orientation: portrait) and (pointer: coarse)`), so it works
 * even if this module never runs. This module is the *coordination* layer: when a touch
 * device flips to portrait it pauses the active gameplay scene and suspends audio, and it
 * resumes them when the device returns to landscape — but only if *it* was the one that
 * paused (a user-opened PauseScene is left untouched).
 *
 * `(pointer: coarse)` deliberately excludes mouse users, so a desktop window resized tall
 * never trips the gate. Desktop behaviour is unchanged.
 */
export function installOrientationGate(game: Phaser.Game): void {
  const coarsePointerQuery = window.matchMedia('(pointer: coarse)');
  const root = document.documentElement;

  // True only while *this module* holds the GameScene paused. Lets us avoid resuming a
  // pause the player opened themselves (PauseScene).
  let autoPaused = false;
  let autoPausedAudio = false;
  let rotateGateActive = false;

  /** The gameplay scene while running OR paused by this gate. */
  const managedGameScene = (): GameScene | null => {
    if (!hasManagedGameScene(game.scene)) return null;
    return game.scene.getScene('GameScene') as GameScene;
  };

  const syncViewportShell = (): boolean => {
    const { width, height } = measureViewport(window);
    const active = shouldShowRotateGate({
      width,
      height,
      coarsePointer: coarsePointerQuery.matches,
    });

    root.style.setProperty('--app-width', `${width}px`);
    root.style.setProperty('--app-height', `${height}px`);
    root.dataset.rotateGate = active ? 'active' : 'inactive';

    return active;
  };

  const syncScale = (): void => {
    game.scale.updateBounds();
    game.scale.refresh();
  };

  const onEnterPortrait = (): void => {
    // Launch the Phaser rotate-gate scene (replaces the old DOM #rotate-gate overlay).
    // Optional chains guard against test mocks that omit run/stop on their scene stub.
    if (!game.scene.isActive?.('RotateScene')) {
      // SceneManager has no launch(); use systemScene's ScenePlugin which does.
      // ScenePlugin.launch() queues a 'start' op so Phaser processes it on the
      // next game step — this is the canonical way to start a parallel scene
      // and guarantees update() is called.
      game.scene.systemScene.scene.launch('RotateScene');
    }

    // Suspend audio for whatever scene is up (menu music included). Skip while the audio
    // context is still locked — it has nothing to pause yet and unlocks on first tap.
    if (!game.sound.locked) {
      game.sound.pauseAll();
      autoPausedAudio = true;
    }

    const gs = managedGameScene();
    if (!gs) return; // menu / preload / end screen — overlay alone is enough
    if (game.scene.isPaused('GameScene')) return; // user already paused; don't take ownership
    if (gs.isGameEnded) return; // mid-transition to GameOver/Victory; leave it be

    gs.suspendForOrientation();
    autoPaused = true;
  };

  const onEnterLandscape = (): void => {
    // Stop the Phaser rotate-gate scene when landscape is restored.
    game.scene.stop?.('RotateScene');

    if (autoPausedAudio && !game.sound.locked) {
      game.sound.resumeAll();
      autoPausedAudio = false;
    }

    if (autoPaused) {
      const gs = managedGameScene();
      gs?.resumeFromOrientation();
      autoPaused = false;
    }
  };

  const syncViewportState = (): void => {
    const active = syncViewportShell();

    if (active !== rotateGateActive) {
      if (active) {
        onEnterPortrait();
      } else {
        onEnterLandscape();
      }
      rotateGateActive = active;
    }

    syncScale();
  };

  // Keep the stretched canvas shell synced while the mobile URL bar shows/hides or the
  // device rotates. A short timeout coalesces the resize/orientation event bursts.
  let refreshTimer: number | null = null;
  const queueRefresh = (): void => {
    if (refreshTimer !== null) window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      refreshTimer = null;
      syncViewportState();
    }, 40);
  };
  coarsePointerQuery.addEventListener('change', queueRefresh);
  window.visualViewport?.addEventListener('resize', queueRefresh);
  window.addEventListener('resize', queueRefresh);
  window.addEventListener('orientationchange', queueRefresh);
  window.screen.orientation?.addEventListener('change', queueRefresh);
  document.addEventListener('fullscreenchange', queueRefresh);
  document.addEventListener('webkitfullscreenchange', queueRefresh as EventListener);

  // Sync CSS shell immediately so dimensions are correct before first paint.
  // The scene launch is deferred via queueRefresh (40 ms) so Phaser's SceneManager has
  // time to register scenes before we attempt to launch RotateScene.
  syncViewportShell();
  syncScale();
  queueRefresh();
}
