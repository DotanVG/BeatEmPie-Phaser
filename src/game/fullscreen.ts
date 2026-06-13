import type Phaser from 'phaser';
import { shouldShowFullscreenButton } from './displayPolicy';

type FullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

function getFullscreenDocument(): FullscreenDocument {
  return document as FullscreenDocument;
}

function isCoarsePointerDevice(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}

/** Real Fullscreen API state. F11 / browser-chrome fullscreen does NOT set this. */
function isApiFullscreen(): boolean {
  const doc = getFullscreenDocument();
  return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
}

/**
 * F11 / browser-chrome fullscreen leaves `document.fullscreenElement` null, but it grows the
 * window to fill the entire screen. Detect it by comparing the window to the screen size.
 *
 * Only trusted on fine-pointer (desktop) devices: many mobile browsers report
 * `innerWidth === screen.width` by default, which would be a permanent false positive.
 */
function isF11LikeFullscreen(): boolean {
  if (isCoarsePointerDevice()) return false;
  return window.innerWidth === screen.width && window.innerHeight === screen.height;
}

/** Either real Fullscreen-API fullscreen OR F11-style browser fullscreen. */
function isApparentFullscreen(): boolean {
  return isApiFullscreen() || isF11LikeFullscreen();
}

function canToggleFullscreen(target: FullscreenElement): boolean {
  const doc = getFullscreenDocument();
  const enabled = doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled ?? true;
  return Boolean(enabled && (target.requestFullscreen || target.webkitRequestFullscreen));
}

async function enterFullscreen(target: FullscreenElement): Promise<void> {
  await Promise.resolve(target.requestFullscreen?.() ?? target.webkitRequestFullscreen?.());
}

async function exitFullscreen(): Promise<void> {
  const doc = getFullscreenDocument();
  await Promise.resolve(doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
}

// Guard against the listeners being wired up more than once if this ever runs again.
let installed = false;

/** Install the global top-right fullscreen button shared by every scene. */
export function installFullscreenButton(game: Phaser.Game): void {
  if (installed) return;

  const button = document.getElementById('fullscreen-btn') as HTMLButtonElement | null;
  if (!button) return;
  installed = true;

  const target = (document.getElementById('game-root') ?? document.documentElement) as FullscreenElement;

  const sync = (): void => {
    const apparent = isApparentFullscreen();
    const coarse = isCoarsePointerDevice();
    const supported = canToggleFullscreen(target) || isApiFullscreen();

    // Desktop hides the button in any fullscreen (API or F11); touch keeps it as an exit hatch.
    const visible = shouldShowFullscreenButton({ supported, active: apparent, coarsePointer: coarse });

    button.hidden = !visible;
    button.dataset.active = apparent ? 'true' : 'false';
    button.setAttribute('aria-pressed', apparent ? 'true' : 'false');
    const label = apparent && coarse ? 'Exit fullscreen' : 'Enter fullscreen';
    button.setAttribute('aria-label', label);
    button.title = label;

    game.scale.updateBounds();
    game.scale.refresh();
  };

  button.addEventListener('click', async () => {
    try {
      // F11 fullscreen cannot be exited through the Fullscreen API, so we never call
      // exitFullscreen() for it - the button is hidden in that state on desktop anyway, and
      // the player leaves F11 with the F11 key. We only ever exit *real* API fullscreen
      // (e.g. the mobile exit hatch).
      if (isApiFullscreen()) {
        await exitFullscreen();
      } else if (!isApparentFullscreen() && canToggleFullscreen(target)) {
        await enterFullscreen(target);
      }
    } finally {
      sync();
    }
  });

  // F11 fires `resize` but NOT `fullscreenchange`, so we listen to both. `resize` also keeps the
  // canvas scale fresh as the mobile URL bar shows/hides.
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync as EventListener);
  window.addEventListener('resize', sync);
  window.visualViewport?.addEventListener('resize', sync);

  sync();
}
