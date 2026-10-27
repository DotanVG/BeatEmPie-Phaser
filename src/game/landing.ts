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
  if (status) status.textContent = 'Ready to serve. Start when you’re ready!';
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
  const status = document.getElementById('landing-status');
  const error = document.getElementById('load-error');
  if (status) status.hidden = true;
  if (error) error.hidden = false;
}
