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
    scale?: number;
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
 * Keep the full-bleed layout size at normal zoom, but fit the visible area when zoomed in.
 * Always using the visual viewport leaves URL-bar gaps on unzoomed mobile browsers.
 */
export function measureViewport(source: ViewportMeasurementSource): { width: number; height: number } {
  const visual = source.visualViewport;
  if (visual && (visual.scale ?? 1) > 1) {
    return { width: Math.floor(visual.width), height: Math.floor(visual.height) };
  }
  return {
    width: Math.round(source.innerWidth),
    height: Math.round(source.innerHeight),
  };
}

/** Show the rotate gate only on touch devices that are currently taller than they are wide. */
export function shouldShowRotateGate(state: RotateGateState): boolean {
  return state.coarsePointer && state.height > state.width;
}

export interface SafeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface RotatePromptLayoutInput {
  /** Internal (world) canvas size. */
  worldWidth: number;
  worldHeight: number;
  /** On-screen (CSS px) size the canvas is stretched to. */
  viewportWidth: number;
  viewportHeight: number;
  safe: SafeInsets;
  /** Unscaled size of the prompt artwork, in world px. */
  contentWidth: number;
  contentHeight: number;
}

/**
 * The canvas keeps a 1920x1080 world but CSS stretches it to the viewport, so a portrait
 * phone squashes everything horizontally. Return a world-space position and a non-uniform
 * counter-scale that cancels that stretch: the prompt renders at one uniform on-screen
 * scale, fitted and centered inside the safe area.
 */
export function getRotatePromptLayout(input: RotatePromptLayoutInput): { x: number; y: number; scaleX: number; scaleY: number } {
  const { worldWidth, worldHeight, viewportWidth, viewportHeight, safe } = input;
  const vw = Math.max(1, viewportWidth);
  const vh = Math.max(1, viewportHeight);
  const safeW = Math.max(1, vw - safe.left - safe.right);
  const safeH = Math.max(1, vh - safe.top - safe.bottom);
  const stretchX = vw / worldWidth;
  const stretchY = vh / worldHeight;
  const screenScale = Math.min(safeW / input.contentWidth, safeH / input.contentHeight);

  return {
    x: (safe.left + safeW / 2) / stretchX,
    y: (safe.top + safeH / 2) / stretchY,
    scaleX: screenScale / stretchX,
    scaleY: screenScale / stretchY,
  };
}
