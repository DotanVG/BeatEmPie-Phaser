/** Central gameplay tuning. Adjust here rather than scattering numbers through systems. */

export const PLAYER = {
  maxHealth: 100,
  speed: 430,
  dashSpeed: 1150,
  dashDurationMs: 170,
  dashCooldownMs: 950,
  invulnMs: 850,
  knockbackForce: 340,
  /** Radius within which "auto-target nearest enemy" looks. 0 = whole arena. */
  autoTargetRange: 0,
} as const;

export const SCORING = {
  hitPoints: 5,
  killBase: 100,
  waveClearBonus: 500,
  bossDamageDivisor: 10, // points = bossDamage / divisor
  bossKill: 5000,
  comboWindowMs: 2600,
  comboStep: 0.12, // multiplier added per combo tick
  maxComboMultiplier: 5,
  // Special bonuses
  cherryMultiHit: 40,
  lemonChainHit: 30,
  pumpkinMultiKill: 75,
  mushroomAllyKill: 120,
  chocolateDotKill: 60,
  chiliBurnKill: 60,
} as const;

export const WAVE = {
  interWaveDelayMs: 2800,
  bossIntroMs: 3000,
  firstWaveDelayMs: 1200,
} as const;

export const FX = {
  shakeSmall: { duration: 120, intensity: 0.004 },
  shakeMedium: { duration: 220, intensity: 0.008 },
  shakeBig: { duration: 380, intensity: 0.016 },
  hitPauseMs: 45,
} as const;

/** Dash presentation only. Pixels, milliseconds, pixels/second; never used by physics. */
export const DASH_FX = {
  rngSeed: 141,
  ghost: { intervalMs: 25, lifeMs: 280, tint: 0xffe08a, alpha: 0.26, perPlayer: 12, limit: 32 },
  lines: { count: 9, lifeMs: 300, tint: 0xfff4d6, alpha: 0.65, length: [24, 62], width: 2,
    rear: [20, 75], spread: 66, speed: [180, 320] },
  dust: { count: 5, lifeMs: 380, tint: 0xd9ba83, alpha: 0.5, size: [9, 17],
    speed: [90, 220], lift: [25, 90], gravity: 180, growth: 1.8 },
  pebbles: { count: 4, lifeMs: 320, tint: 0x9b7147, alpha: 0.85, size: [3, 5],
    speed: [110, 250], lift: [90, 180], gravity: 800, growth: 1 },
  stretch: { width: 1.7, height: 0.85, squash: 0.8, recoverMs: 240, decay: 10, oscillations: 3 },
  smear: { lifeMs: 100, length: 135, height: 0.68, taper: 0.12, bandLengthStep: 0.12,
    alpha: 0.8, colors: [0xffe08a, 0xfff4d6, 0xeaa24c, 0x9b7147] },
  skid: { angle: 22, lifeMs: 240, count: 12, tint: 0xffcf68, alpha: 0.85, size: [3, 6],
    speed: [130, 300], lift: [45, 150], gravity: 650, growth: 0.35 },
  particles: { limit: 192, rear: 12, spread: 12 },
} as const;
