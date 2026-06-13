/**
 * Central registry of gameplay event names. Systems and UI communicate through
 * the GameScene's event emitter (`scene.events`) using these keys, so nothing
 * has to hold hard references to everything else.
 */
export const GameEvents = {
  // Combat
  ENEMY_DAMAGED: 'enemy-damaged',
  ENEMY_KILLED: 'enemy-killed',
  PLAYER_DAMAGED: 'player-damaged',
  PLAYER_HEALTH_CHANGED: 'player-health-changed',
  PLAYER_DIED: 'player-died',

  // Pies
  PIE_SELECTED: 'pie-selected',
  PIE_DROPPED: 'pie-dropped',
  PIE_IMPACT: 'pie-impact',
  PIE_COOLDOWN_CHANGED: 'pie-cooldown-changed',
  PIE_CHARGES_CHANGED: 'pie-charges-changed',
  DASH_COOLDOWN_CHANGED: 'dash-cooldown-changed',

  // Scoring
  SCORE_CHANGED: 'score-changed',
  COMBO_CHANGED: 'combo-changed',
  HIGH_SCORE_CHANGED: 'high-score-changed',

  // Waves
  WAVE_STARTED: 'wave-started',
  WAVE_CLEARED: 'wave-cleared',
  ALL_WAVES_CLEARED: 'all-waves-cleared',
  BOSS_SPAWNED: 'boss-spawned',
  BOSS_HEALTH_CHANGED: 'boss-health-changed',
  BOSS_DEFEATED: 'boss-defeated',

  // Feedback
  FLOATING_TEXT: 'floating-text',
  SCREEN_SHAKE: 'screen-shake',

  // Flow
  GAME_OVER: 'game-over',
  VICTORY: 'victory',
} as const;

export type GameEventName = (typeof GameEvents)[keyof typeof GameEvents];
