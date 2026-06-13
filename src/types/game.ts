/**
 * Core shared type definitions for BeatEmPie.
 * Everything data-driven (pies, enemies, waves) is described by these interfaces.
 */

export type PieEffectType =
  | 'damage'
  | 'explosive'
  | 'freeze'
  | 'chain'
  | 'homing'
  | 'heavy'
  | 'confusion'
  | 'ultimate'
  | 'dot'
  | 'fireTrail';

export type PieTargetMode =
  | 'groundTarget'
  | 'nearestEnemy'
  | 'homing'
  | 'screenWide'
  | 'lineTrail'
  | 'puddle';

export type StatusKind =
  | 'frozen'
  | 'slowed'
  | 'burning'
  | 'confused'
  | 'chocolateDot'
  | 'fireDot'
  | 'knockedBack'
  | 'stunned';

export interface ParticleMeta {
  /** Palette of tint colours used for impact particles. */
  tints: number[];
  count: number;
  speed: number;
  lifespan: number;
  scale: number;
}

export interface PieType {
  id: string;
  displayName: string;
  emoji: string;
  description: string;
  damage: number;
  cooldownMs: number;
  /** Delay between the warning marker appearing and the pie actually falling. */
  skyDropDelayMs: number;
  warningRadius: number;
  impactRadius: number;
  /** Limited-use pies (e.g. Pumpkin) set this; undefined = unlimited. */
  maxUses?: number;
  effectType: PieEffectType;
  durationMs?: number;
  tickDamage?: number;
  tickRateMs?: number;
  slowMultiplier?: number;
  freezeDurationMs?: number;
  knockbackForce?: number;
  /** Lemon Meringue chain settings. */
  chainCount?: number;
  chainRange?: number;
  targetMode: PieTargetMode;
  /** Primary tint for placeholder art + UI. */
  color: number;
  assetKey: string;
  iconKey: string;
  soundKey: string;
  particle: ParticleMeta;
  /** Wave at which the pie becomes available (0 = from the start). */
  unlockWave: number;
}

export type EnemyKind = 'fish' | 'angryFish' | 'pufferFish' | 'whale' | 'bossWhale';

export interface EnemyType {
  id: EnemyKind;
  displayName: string;
  maxHealth: number;
  /** Base movement speed in px/sec. */
  speed: number;
  contactDamage: number;
  scoreValue: number;
  /** Radius used for pie-impact overlap + body sizing. */
  bodyRadius: number;
  /** 0 = full knockback, 1 = immovable. */
  knockbackResist: number;
  /** Crowd-control resistance, 0 = full effect, 1 = immune. */
  ccResist: number;
  textureKey: string;
  tint: number;
  scale: number;
  /** Pixel push applied to the player on contact. */
  pushForce: number;
}

export interface WaveEnemySpawn {
  kind: EnemyKind;
  count: number;
}

export interface WaveConfig {
  id: number;
  name: string;
  spawns: WaveEnemySpawn[];
  /** Delay between individual enemy spawns within the wave. */
  spawnDelayMs: number;
  isBoss?: boolean;
}

export interface DamageEvent {
  amount: number;
  x: number;
  y: number;
  pieId?: string;
  isCrit?: boolean;
  sourceStatus?: StatusKind;
}

export interface ScoreEvent {
  points: number;
  reason: string;
  x?: number;
  y?: number;
  combo?: number;
}

export interface SaveData {
  highScore: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
}
