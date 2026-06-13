export interface FullscreenButtonState {
  supported: boolean;
  active: boolean;
  coarsePointer: boolean;
}

export interface ViewportMeasurementSource {
  innerWidth: number;
  innerHeight: number;
  visualViewport?: {
    width: number;
    height: number;
  } | null;
}

export interface RotateGateState {
  width: number;
  height: number;
  coarsePointer: boolean;
}

interface OrientationSceneState {
  isActive(key: string): boolean;
  isPaused(key: string): boolean;
}

/** The desktop button disappears once fullscreen is active; touch keeps a visible escape hatch. */
export function shouldShowFullscreenButton(state: FullscreenButtonState): boolean {
  return state.supported && (state.coarsePointer || !state.active);
}

/** Reserve space for the floating fullscreen button when it is visible over the canvas. */
export function getHudRightInset(buttonVisible: boolean): number {
  return buttonVisible ? 176 : 40;
}

/** Orientation-managed gameplay must be recoverable while paused, not just while active. */
export function hasManagedGameScene(sceneState: OrientationSceneState): boolean {
  return sceneState.isActive('GameScene') || sceneState.isPaused('GameScene');
}

/**
 * Measure the full layout viewport (innerWidth/innerHeight) so the canvas fills the whole window.
 *
 * The visual viewport excludes the mobile URL-bar strip; sizing the shell to it left an uncovered
 * "grey bar" at the bottom and side margins in landscape. With `user-scalable=no` there is no
 * pinch-zoom, so the layout viewport is the correct full-bleed size on both mobile and desktop.
 */
export function measureViewport(source: ViewportMeasurementSource): { width: number; height: number } {
  return {
    width: Math.round(source.innerWidth),
    height: Math.round(source.innerHeight),
  };
}

/** Show the rotate gate only on touch devices that are currently taller than they are wide. */
export function shouldShowRotateGate(state: RotateGateState): boolean {
  return state.coarsePointer && state.height > state.width;
}
