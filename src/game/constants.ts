/** Global, build-time constants. Tunable gameplay numbers live in src/data/balance.ts. */

export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;

/** Render order — higher draws on top. Mirrors the design layering spec. */
export const DEPTHS = {
  BACKGROUND: 0,
  ENVIRONMENT: 10,
  SHADOW: 15,
  PUDDLE: 18,
  ENEMY: 20,
  PLAYER: 30,
  WARNING: 40,
  PIE: 50,
  EFFECT: 60,
  FLOATING_TEXT: 70,
  UI: 100,
  UI_TOP: 110,
} as const;

/**
 * The walkable arena band. Shushki and the enemies move within this rectangle;
 * pies fall from `skySpawnY` (above the visible area) down to their target.
 */
export const ARENA = {
  minX: 80,
  maxX: GAME_WIDTH - 80,
  minY: 500,
  maxY: GAME_HEIGHT - 110,
  skySpawnY: -180,
} as const;

export const COLORS = {
  bgTop: 0x14123a,
  bgBottom: 0x3a2b6b,
  floor: 0x2a6f7a,
  floorLine: 0x3f9aa6,
  white: 0xffffff,
  gold: 0xffe08a,
  goldHex: '#ffe08a',
  cream: '#fff4d6',
  danger: 0xff5470,
  dangerHex: '#ff5470',
  good: 0x6ee7a8,
  goodHex: '#6ee7a8',
  warning: 0xffb340,
  shushki: 0xfff1c1,
  panel: 0x0b0d2b,
} as const;

export const REGISTRY_KEYS = {
  score: 'score',
  highScore: 'highScore',
  combo: 'combo',
  wave: 'wave',
} as const;
