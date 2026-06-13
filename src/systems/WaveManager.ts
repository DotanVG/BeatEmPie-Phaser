import type { EnemyKind } from '../types/game';
import type { GameScene } from '../scenes/GameScene';
import { WAVES } from '../data/waveConfig';
import { WAVE } from '../data/balance';
import { GameEvents } from '../game/GameEvents';
import { AUDIO } from '../utils/assetKeys';

type WaveState = 'pregame' | 'intermission' | 'bossIntro' | 'spawning' | 'fighting' | 'done';

/**
 * Drives wave progression: spaced-out spawns, clear detection, inter-wave breaks,
 * the boss intro, and the victory hand-off. Music ramps with the threat level.
 */
export class WaveManager {
  private state: WaveState = 'pregame';
  private waveIndex = -1;
  private spawnQueue: EnemyKind[] = [];
  private spawnTimer = 0;
  private stateTimer = 0;
  private spawnDelayMs = 600;
  private bossWave = false;

  constructor(private scene: GameScene) {}

  begin(): void {
    this.state = 'intermission';
    this.stateTimer = WAVE.firstWaveDelayMs;
  }

  get currentWaveName(): string {
    return this.waveIndex >= 0 && this.waveIndex < WAVES.length ? WAVES[this.waveIndex].name : '';
  }

  update(deltaMs: number): void {
    switch (this.state) {
      case 'intermission':
        this.stateTimer -= deltaMs;
        if (this.stateTimer <= 0) this.startNextWave();
        break;

      case 'bossIntro':
        this.stateTimer -= deltaMs;
        if (this.stateTimer <= 0) this.spawnBoss();
        break;

      case 'spawning':
        this.spawnTimer -= deltaMs;
        if (this.spawnTimer <= 0) {
          const kind = this.spawnQueue.shift();
          if (kind) {
            this.scene.spawner.spawnFromEdge(kind);
            this.spawnTimer = this.spawnDelayMs;
          }
          if (this.spawnQueue.length === 0) this.state = 'fighting';
        }
        break;

      case 'fighting':
        // The boss wave ends via boss death (handled in GameScene), not by count.
        if (!this.bossWave && this.scene.getActiveEnemies().length === 0) {
          this.onWaveCleared();
        }
        break;
    }
  }

  private startNextWave(): void {
    this.waveIndex += 1;
    if (this.waveIndex >= WAVES.length) {
      this.state = 'done';
      return;
    }

    const wave = WAVES[this.waveIndex];
    this.scene.currentWaveNumber = wave.id;
    this.spawnDelayMs = wave.spawnDelayMs;
    this.scene.bus.emit(GameEvents.WAVE_STARTED, { wave: wave.id, name: wave.name });

    if (wave.isBoss) {
      this.bossWave = true;
      this.startBossIntro();
      return;
    }

    // Ramp music as waves get heavier.
    if (wave.id >= 4) this.scene.audio.playMusic(AUDIO.musicIntense);

    this.spawnQueue = [];
    for (const spawn of wave.spawns) {
      for (let i = 0; i < spawn.count; i++) this.spawnQueue.push(spawn.kind);
    }
    this.shuffle(this.spawnQueue);

    this.scene.showBanner(`Wave ${wave.id}`, wave.name, '#ffe08a');
    this.scene.audio.playSfx(AUDIO.waveStart);
    this.spawnTimer = 400;
    this.state = 'spawning';
  }

  private startBossIntro(): void {
    this.state = 'bossIntro';
    this.stateTimer = WAVE.bossIntroMs;
    this.scene.audio.playMusic(AUDIO.musicBoss);
    this.scene.audio.playSfx(AUDIO.bossIntro);
    this.scene.showBanner('⚠ BOSS ⚠', 'Captain Leviathan approaches!', '#ff5470');
    this.scene.effects.shake('medium');
  }

  private spawnBoss(): void {
    const boss = this.scene.spawner.spawnFromEdge('bossWhale');
    this.scene.setBoss(boss);
    this.scene.bus.emit(GameEvents.BOSS_SPAWNED, { max: boss.maxHealthValue });
    this.state = 'fighting';
  }

  private onWaveCleared(): void {
    const wave = WAVES[this.waveIndex];
    this.scene.bus.emit(GameEvents.WAVE_CLEARED, { wave: wave.id });
    this.scene.onWaveCleared(wave.id);
    this.scene.showBanner('Wave Clear!', `+${this.scene.waveClearBonus} bonus`, '#6ee7a8');
    this.scene.audio.playSfx(AUDIO.waveClear);
    this.state = 'intermission';
    this.stateTimer = WAVE.interWaveDelayMs;
  }

  private shuffle(arr: EnemyKind[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}
