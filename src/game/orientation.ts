import type Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { hasManagedGameScene, measureViewport, shouldShowRotateGate } from './displayPolicy';

/**
 * Landscape-only orientation gate.
 *
 * The visible instruction is a viewport-sized DOM layer in `index.html`, so it stays
 * crisp independently of the letterboxed canvas. CSS provides a no-script fallback;
 * this module coordinates the overlay state with gameplay and audio.
 */
export function installOrientationGate(game: Phaser.Game): void {
  const coarsePointerQuery = window.matchMedia('(pointer: coarse)');
  const root = document.documentElement;

  // True only while this module owns the pause, so a user-opened pause is never resumed.
  let autoPaused = false;
  let autoPausedAudio = false;
  let rotateGateActive = false;

  const managedGameScene = (): GameScene | null => {
    if (!hasManagedGameScene(game.scene)) return null;
    return game.scene.getScene('GameScene') as GameScene;
  };

  const measureGateState = (): boolean => {
    const { width, height } = measureViewport(window);
    const active = shouldShowRotateGate({
      width,
      height,
      coarsePointer: coarsePointerQuery.matches,
    });

    root.dataset.rotateGate = active ? 'active' : 'inactive';
    return active;
  };

  const onEnterPortrait = (): void => {
    // Skip while the audio context is still locked; there is nothing to pause yet.
    if (!game.sound.locked) {
      game.sound.pauseAll();
      autoPausedAudio = true;
    }

    const gameScene = managedGameScene();
    if (!gameScene) return;
    if (game.scene.isPaused('GameScene')) return;
    if (gameScene.isGameEnded) return;

    gameScene.suspendForOrientation();
    autoPaused = true;
  };

  const onEnterLandscape = (): void => {
    if (autoPausedAudio && !game.sound.locked) {
      game.sound.resumeAll();
      autoPausedAudio = false;
    }

    if (autoPaused) {
      managedGameScene()?.resumeFromOrientation();
      autoPaused = false;
    }
  };

  const syncViewportState = (): void => {
    const active = measureGateState();
    if (active === rotateGateActive) return;

    if (active) onEnterPortrait();
    else onEnterLandscape();
    rotateGateActive = active;
  };

  // Coalesce the resize/orientation event bursts emitted by mobile browsers.
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

  const cleanup = (): void => {
    if (refreshTimer !== null) window.clearTimeout(refreshTimer);
    coarsePointerQuery.removeEventListener('change', queueRefresh);
    window.visualViewport?.removeEventListener('resize', queueRefresh);
    window.removeEventListener('resize', queueRefresh);
    window.removeEventListener('orientationchange', queueRefresh);
    window.screen.orientation?.removeEventListener('change', queueRefresh);
    document.removeEventListener('fullscreenchange', queueRefresh);
    document.removeEventListener('webkitfullscreenchange', queueRefresh as EventListener);
  };
  game.events?.once('destroy', cleanup);

  measureGateState();
  queueRefresh();
}
