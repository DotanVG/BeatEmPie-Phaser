import type Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';

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

  /** The GameScene only when it is actually running (not on menu / preload / end screens). */
  const activeGameScene = (): GameScene | null => {
    if (!game.scene.isActive('GameScene')) return null;
    return game.scene.getScene('GameScene') as GameScene;
  };

  const onEnterPortrait = (): void => {
    // Suspend audio for whatever scene is up (menu music included). Skip while the audio
    // context is still locked — it has nothing to pause yet and unlocks on first tap.
    if (!game.sound.locked) game.sound.pauseAll();

    const gs = activeGameScene();
    if (!gs) return; // menu / preload / end screen — overlay alone is enough
    if (game.scene.isPaused('GameScene')) return; // user already paused; don't take ownership
    if (gs.isGameEnded) return; // mid-transition to GameOver/Victory; leave it be

    gs.suspendForOrientation();
    autoPaused = true;
  };

  const onEnterLandscape = (): void => {
    if (autoPaused) {
      if (!game.sound.locked) game.sound.resumeAll();
      const gs = activeGameScene();
      gs?.resumeFromOrientation();
      autoPaused = false;
    }
    game.scale.refresh();
  };

  mql.addEventListener('change', (e) => {
    if (e.matches) onEnterPortrait();
    else onEnterLandscape();
  });

  // Keep the FIT canvas correctly sized when the mobile URL bar shows/hides or the device
  // rotates. Debounced through rAF so the iOS double-fire collapses to a single refresh.
  let refreshQueued = false;
  const queueRefresh = (): void => {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(() => {
      refreshQueued = false;
      game.scale.refresh();
    });
  };
  window.visualViewport?.addEventListener('resize', queueRefresh);
  window.addEventListener('resize', queueRefresh);
  window.addEventListener('orientationchange', queueRefresh);

  // Sync once at boot: if we load straight into portrait, suspend audio immediately.
  if (mql.matches) onEnterPortrait();
}
