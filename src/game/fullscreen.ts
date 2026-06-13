import type Phaser from 'phaser';

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

function canToggleFullscreen(target: FullscreenElement): boolean {
  const doc = getFullscreenDocument();
  const enabled = doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled ?? true;
  return Boolean(enabled && (target.requestFullscreen || target.webkitRequestFullscreen));
}

function isFullscreenActive(): boolean {
  const doc = getFullscreenDocument();
  return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
}

async function enterFullscreen(target: FullscreenElement): Promise<void> {
  await Promise.resolve(target.requestFullscreen?.() ?? target.webkitRequestFullscreen?.());
}

async function exitFullscreen(): Promise<void> {
  const doc = getFullscreenDocument();
  await Promise.resolve(doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
}

/** Install the global top-right fullscreen button shared by every scene. */
export function installFullscreenButton(game: Phaser.Game): void {
  const button = document.getElementById('fullscreen-btn') as HTMLButtonElement | null;
  if (!button) return;

  const target = document.documentElement as FullscreenElement;

  const sync = (): void => {
    const supported = canToggleFullscreen(target) || isFullscreenActive();
    const active = isFullscreenActive();

    button.hidden = !supported;
    button.dataset.active = active ? 'true' : 'false';
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    button.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
    button.title = active ? 'Exit fullscreen' : 'Enter fullscreen';

    game.scale.refresh();
  };

  button.addEventListener('click', async () => {
    try {
      if (isFullscreenActive()) await exitFullscreen();
      else if (canToggleFullscreen(target)) await enterFullscreen(target);
    } finally {
      sync();
    }
  });

  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync as EventListener);
  window.addEventListener('resize', sync);
  window.visualViewport?.addEventListener('resize', sync);

  sync();
}
