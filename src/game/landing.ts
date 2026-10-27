let startRequested = false;

/** Keep the shell engine-free until any existing entry action is used. */
export function installDeferredStart(load: (audioContext?: AudioContext) => Promise<void>): void {
  const button = document.getElementById('start-game');
  const root = document.getElementById('game-root');
  const status = document.getElementById('landing-status');
  const start = async (): Promise<void> => {
    if (startRequested) return;
    startRequested = true;
    disconnect();
    root?.removeEventListener('click', onStart);
    window.removeEventListener('keydown', onKey);
    button?.setAttribute('aria-busy', 'true');
    if (button) button.textContent = 'Loading…';
    if (status) status.textContent = 'Loading the game… Please wait.';
    const loader = document.getElementById('boot-loader');
    if (loader) loader.textContent = 'Heating the ovens… 🥧';

    let audioContext: AudioContext | undefined;
    try {
      // Resume during the gesture, before the import can outlive browser activation.
      const Context = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Context) {
        audioContext = new Context();
        void audioContext.resume().catch(() => { /* Phaser can unlock on the next input. */ });
      }
    } catch { /* Preserve Phaser's default audio fallback. */ }
    try {
      await load(audioContext);
    } catch {
      void audioContext?.close().catch(() => {});
      showLoadError();
    }
  };
  const onStart = (): void => { void start(); };
  const onKey = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.repeat || !['Enter', ' '].includes(event.key)) return;
    if ((event.target as Element | null)?.closest?.('a, button, input, textarea, select, [contenteditable]')) return;
    event.preventDefault();
    onStart();
  };
  const disconnect = connectLanding(onStart);
  root?.addEventListener('click', onStart);
  window.addEventListener('keydown', onKey);
}

/** Connect the native entry action to the menu's existing start handler. */
export function connectLanding(start: () => void): () => void {
  const button = document.getElementById('start-game') as HTMLButtonElement | null;
  const landing = document.getElementById('landing');
  const status = document.getElementById('landing-status');
  // Let native controls and links handle keys before Phaser's global menu shortcuts.
  const keepNativeKeys = (event: KeyboardEvent): void => event.stopPropagation();
  button?.addEventListener('click', start);
  landing?.addEventListener('keydown', keepNativeKeys);
  if (button) button.disabled = false;
  button?.removeAttribute('aria-busy');
  if (button) button.textContent = 'Start game';
  if (status) status.textContent = 'Ready to serve. Start when you’re ready!';
  if (startRequested) {
    startRequested = false;
    start();
  }
  return () => {
    button?.removeEventListener('click', start);
    landing?.removeEventListener('keydown', keepNativeKeys);
    if (button) button.disabled = true;
  };
}

/** All menu entry paths share the same presentation and focus handoff. */
export function enterGameplay(): void {
  document.documentElement.classList.add('game-active');
  window.scrollTo(0, 0);
  document.getElementById('game-root')?.focus({ preventScroll: true });
}

export function showLoadError(): void {
  startRequested = false;
  const status = document.getElementById('landing-status');
  const error = document.getElementById('load-error');
  if (status) status.hidden = true;
  if (error) error.hidden = false;
  const button = document.getElementById('start-game') as HTMLButtonElement | null;
  if (button) button.disabled = true;
  button?.removeAttribute('aria-busy');
  if (button) button.textContent = 'Start game';
}
