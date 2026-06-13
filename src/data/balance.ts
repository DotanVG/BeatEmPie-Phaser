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
