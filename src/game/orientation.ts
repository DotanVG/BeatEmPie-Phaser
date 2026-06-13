import type Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { hasManagedGameScene } from './displayPolicy';

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
  const mql = window.matchMedia('(orientation: portrait) and (pointer: coarse)');

  // True only while *this module* holds the GameScene paused. Lets us avoid resuming a
  // pause the player opened themselves (PauseScene).
  let autoPaused = false;
  let autoPausedAudio = false;

  /** The gameplay scene while running OR paused by this gate. */
  const managedGameScene = (): GameScene | null => {
    if (!hasManagedGameScene(game.scene)) return null;
    return game.scene.getScene('GameScene') as GameScene;
  };

  const syncScale = (): void => {
    game.scale.updateBounds();
    game.scale.refresh();
  };

  const onEnterPortrait = (): void => {
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
    syncScale();
  };

  const onEnterLandscape = (): void => {
    if (autoPausedAudio && !game.sound.locked) {
      game.sound.resumeAll();
      autoPausedAudio = false;
    }

    if (autoPaused) {
      const gs = managedGameScene();
      gs?.resumeFromOrientation();
      autoPaused = false;
    }
    syncScale();
  };

  mql.addEventListener('change', (e) => {
    if (e.matches) onEnterPortrait();
    else onEnterLandscape();
  });

  // Keep the stretched canvas shell synced while the mobile URL bar shows/hides or the
  // device rotates. A short timeout coalesces the resize/orientation event bursts.
  let refreshTimer: number | null = null;
  const queueRefresh = (): void => {
    if (refreshTimer !== null) window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      refreshTimer = null;
      syncScale();
    }, 40);
  };
  window.visualViewport?.addEventListener('resize', queueRefresh);
  window.addEventListener('resize', queueRefresh);
  window.addEventListener('orientationchange', queueRefresh);
  window.screen.orientation?.addEventListener('change', queueRefresh);

  // Sync once at boot: if we load straight into portrait, suspend audio immediately.
  if (mql.matches) onEnterPortrait();
  else syncScale();
}
