/**
 * Single source of truth for asset keys. No magic strings elsewhere.
 *
 * REAL assets (loaded from /public/assets) are marked. Everything else is a
 * placeholder texture generated procedurally at load time (see
 * PreloadScene + utils/placeholders). Missing art/audio never breaks the game.
 */

export const TEX = {
  // --- Real player art (from /public/assets/sprites/player) ---
  shushkiIdle: 'shushki-idle',
  shushkiWalk: 'shushki-walk',
  shushkiJump: 'shushki-jump',

  // --- Procedural placeholders ---
  shadow: 'tex-shadow',
  bgGradient: 'tex-bg-gradient',
  warning: 'tex-warning',
  particle: 'tex-particle',
  spark: 'tex-spark',
  puddle: 'tex-puddle',
  fireTrail: 'tex-fire-trail',
  groundCrack: 'tex-ground-crack',
  lock: 'tex-lock',
  pickup: 'tex-pickup',

  // Enemies (placeholder textures keyed per kind)
  fish: 'tex-fish',
  angryFish: 'tex-angry-fish',
  pufferFish: 'tex-puffer-fish',
  whale: 'tex-whale',
  bossWhale: 'tex-boss-whale',
} as const;

export const AUDIO = {
  // --- Real music (from /public/assets/audio/music) ---
  musicMenu: 'bgm-mainmenu',
  musicCalm: 'bgm-gameplay-calm',
  musicIntense: 'bgm-gameplay-intense',
  musicBoss: 'bgm-boss',
  musicVictory: 'bgm-victory',
  musicGameOver: 'bgm-gameover',

  // --- SFX keys (no source files yet — AudioSystem degrades gracefully) ---
  uiClick: 'sfx-ui-click',
  pieSelect: 'sfx-pie-select',
  pieCall: 'sfx-pie-call',
  pieFall: 'sfx-pie-fall',
  pieImpact: 'sfx-pie-impact',
  explosion: 'sfx-explosion',
  freeze: 'sfx-freeze',
  chain: 'sfx-chain',
  lock: 'sfx-lock',
  heavyImpact: 'sfx-heavy-impact',
  confusion: 'sfx-confusion',
  ultimate: 'sfx-ultimate',
  puddle: 'sfx-puddle',
  fire: 'sfx-fire',
  enemyHurt: 'sfx-enemy-hurt',
  enemyDeath: 'sfx-enemy-death',
  playerHurt: 'sfx-player-hurt',
  waveStart: 'sfx-wave-start',
  waveClear: 'sfx-wave-clear',
  bossIntro: 'sfx-boss-intro',
} as const;

export const ANIM = {
  shushkiIdle: 'anim-shushki-idle',
  shushkiWalk: 'anim-shushki-walk',
} as const;

/** Player sprite source paths relative to the Vite base. */
export const PLAYER_IMAGES = {
  [TEX.shushkiIdle]: 'assets/sprites/player/shushki.png',
  [TEX.shushkiWalk]: 'assets/sprites/player/shushki_walk.png',
  [TEX.shushkiJump]: 'assets/sprites/player/shushki_jump.png',
} as const;

/** Real music files. AudioSystem only plays a track if its key actually loaded. */
export const MUSIC_FILES: Record<string, string> = {
  [AUDIO.musicMenu]: 'assets/audio/music/bgm_mainmenu.wav',
  [AUDIO.musicCalm]: 'assets/audio/music/bgm_gameplay_calm.wav',
  [AUDIO.musicIntense]: 'assets/audio/music/bgm_gameplay_intense.wav',
  [AUDIO.musicBoss]: 'assets/audio/music/bgm_boss.wav',
  [AUDIO.musicVictory]: 'assets/audio/music/bgm_victory.wav',
  [AUDIO.musicGameOver]: 'assets/audio/music/bgm_gameover.wav',
};
