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

/** Prefer visualViewport when present so mobile URL-bar and fullscreen transitions size correctly. */
export function measureViewport(source: ViewportMeasurementSource): { width: number; height: number } {
  const width = source.visualViewport?.width ?? source.innerWidth;
  const height = source.visualViewport?.height ?? source.innerHeight;

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

/** Show the rotate gate only on touch devices that are currently taller than they are wide. */
export function shouldShowRotateGate(state: RotateGateState): boolean {
  return state.coarsePointer && state.height > state.width;
}
