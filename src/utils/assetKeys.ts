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

  // --- Real player animation sheets (uniform 152x180 frames, authored facing RIGHT) ---
  shushkiAnimIdle: 'shushki-anim-idle',
  shushkiAnimRun: 'shushki-anim-run',
  shushkiAnimJump: 'shushki-anim-jump',
  shushkiAnimAttack: 'shushki-anim-attack',
  shushkiAnimHurt: 'shushki-anim-hurt',
  shushkiAnimDeath: 'shushki-anim-death',

  // --- Real pie art (from /public/assets/sprites/pies) ---
  pieSplat: 'pie-splat',

  // --- Procedural placeholders ---
  cursor: 'tex-cursor',
  shadow: 'tex-shadow',
  bgGradient: 'tex-bg-gradient',
  warning: 'tex-warning',
  particle: 'tex-particle',
  spark: 'tex-spark',
  puddle: 'tex-puddle',
  fireTrail: 'tex-fire-trail',
  ice: 'tex-ice',
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

  // --- SFX keys (mostly no source files yet — AudioSystem degrades gracefully) ---
  /** Placeholder file shipped (see SFX_FILES) — to be replaced with the real SFX pass. */
  hitmarker: 'sfx-hitmarker',
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
  // Frame-based animations built from the animation sheets.
  idle: 'shushki-idle-anim',
  run: 'shushki-run-anim',
  jumpStart: 'shushki-jump-start',
  jumpLoop: 'shushki-jump-loop',
  jumpLand: 'shushki-jump-land',
  attack: 'shushki-attack-anim',
  hurt: 'shushki-hurt-anim',
  death: 'shushki-death-anim',
} as const;

/** Player sprite source paths relative to the Vite base. */
export const PLAYER_IMAGES = {
  [TEX.shushkiIdle]: 'assets/sprites/player/shushki.png',
  [TEX.shushkiWalk]: 'assets/sprites/player/shushki_walk.png',
  [TEX.shushkiJump]: 'assets/sprites/player/shushki_jump.png',
} as const;

/** Uniform frame size shared by every player animation sheet. */
export const PLAYER_FRAME = { width: 152, height: 180 } as const;

/** Player animation spritesheets (strips of PLAYER_FRAME-sized frames, facing right). */
export const PLAYER_SHEETS: Record<string, { path: string; frames: number }> = {
  [TEX.shushkiAnimIdle]: { path: 'assets/sprites/player/shushki_idle.png', frames: 4 },
  [TEX.shushkiAnimRun]: { path: 'assets/sprites/player/shushki_run.png', frames: 7 },
  [TEX.shushkiAnimJump]: { path: 'assets/sprites/player/shushki_jump_anim.png', frames: 6 },
  [TEX.shushkiAnimAttack]: { path: 'assets/sprites/player/shushki_attack.png', frames: 7 },
  [TEX.shushkiAnimHurt]: { path: 'assets/sprites/player/shushki_hurt.png', frames: 2 },
  [TEX.shushkiAnimDeath]: { path: 'assets/sprites/player/shushki_death.png', frames: 8 },
};

/** Real pie textures (64x64). Keys match each pie's `assetKey` so the
 * procedural placeholder is skipped automatically when the file loads. */
export const PIE_IMAGES: Record<string, string> = {
  'pie-apple': 'assets/sprites/pies/pie_apple.png',
  'pie-cherry': 'assets/sprites/pies/pie_cherry.png',
  'pie-blueberry': 'assets/sprites/pies/pie_blueberry.png',
  'pie-lemon': 'assets/sprites/pies/pie_lemon.png',
  'pie-strawberry': 'assets/sprites/pies/pie_strawberry.png',
  'pie-meat': 'assets/sprites/pies/pie_meat.png',
  'pie-mushroom': 'assets/sprites/pies/pie_mushroom.png',
  'pie-chocolate': 'assets/sprites/pies/pie_chocolate.png',
  'pie-chili': 'assets/sprites/pies/pie_chili.png',
  'pie-pumpkin': 'assets/sprites/pies/pie_pumpkin.png',
  [TEX.pieSplat]: 'assets/sprites/pies/pie_splat.png',
};

/** Placeholder SFX files (procedurally generated stand-ins until the audio pass). */
export const SFX_FILES: Record<string, string> = {
  [AUDIO.hitmarker]: 'assets/audio/sfx/hitmarker.wav',
};

/**
 * Real music files (OGG, transcoded from source WAVs — placeholder soundtrack pending
 * Noam's final pass). AudioSystem only plays a track if its key actually loaded; these
 * load lazily in the background from MainMenuScene rather than blocking the boot screen.
 */
export const MUSIC_FILES: Record<string, string> = {
  [AUDIO.musicMenu]: 'assets/audio/music/bgm_mainmenu.ogg',
  [AUDIO.musicCalm]: 'assets/audio/music/bgm_gameplay_calm.ogg',
  [AUDIO.musicIntense]: 'assets/audio/music/bgm_gameplay_intense.ogg',
  [AUDIO.musicBoss]: 'assets/audio/music/bgm_boss.ogg',
  [AUDIO.musicVictory]: 'assets/audio/music/bgm_victory.ogg',
  [AUDIO.musicGameOver]: 'assets/audio/music/bgm_gameover.ogg',
};
