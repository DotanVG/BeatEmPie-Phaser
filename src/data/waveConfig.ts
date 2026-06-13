import type { WaveConfig } from '../types/game';

/**
 * Wave progression. WaveManager spawns each wave's enemies from screen-edge
 * spawn points, waits until the arena is clear, then advances. The final wave
 * is the boss (with summoned support fish handled by the boss itself).
 */
export const WAVES: WaveConfig[] = [
  {
    id: 1,
    name: 'School Bell',
    spawns: [{ kind: 'fish', count: 6 }],
    spawnDelayMs: 650,
  },
  {
    id: 2,
    name: 'Getting Snappy',
    spawns: [
      { kind: 'fish', count: 6 },
      { kind: 'angryFish', count: 3 },
    ],
    spawnDelayMs: 600,
  },
  {
    id: 3,
    name: 'Puff Puff',
    spawns: [
      { kind: 'fish', count: 5 },
      { kind: 'angryFish', count: 3 },
      { kind: 'pufferFish', count: 2 },
    ],
    spawnDelayMs: 580,
  },
  {
    id: 4,
    name: 'Here Be Whales',
    spawns: [
      { kind: 'fish', count: 6 },
      { kind: 'angryFish', count: 4 },
      { kind: 'whale', count: 1 },
    ],
    spawnDelayMs: 560,
  },
  {
    id: 5,
    name: 'Swarm Special',
    spawns: [
      { kind: 'fish', count: 10 },
      { kind: 'angryFish', count: 5 },
      { kind: 'pufferFish', count: 3 },
    ],
    spawnDelayMs: 430,
  },
  {
    id: 6,
    name: 'Heavy Seas',
    spawns: [
      { kind: 'fish', count: 8 },
      { kind: 'angryFish', count: 6 },
      { kind: 'pufferFish', count: 4 },
      { kind: 'whale', count: 2 },
    ],
    spawnDelayMs: 420,
  },
  {
    id: 7,
    name: 'Captain Leviathan',
    spawns: [{ kind: 'bossWhale', count: 1 }],
    spawnDelayMs: 0,
    isBoss: true,
  },
];
