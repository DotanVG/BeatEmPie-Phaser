import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, ARENA, DEPTHS, COLORS } from '../game/constants';
import { TEX, AUDIO } from '../utils/assetKeys';
import { GameEvents } from '../game/GameEvents';
import { SCORING } from '../data/balance';
import { distance } from '../utils/math';
import { withEmojiPadding } from '../utils/text';

import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { BossWhale } from '../entities/BossWhale';
import { Pickup } from '../entities/Pickup';
import type { EnemyKind } from '../types/game';

import { AudioSystem } from '../systems/AudioSystem';
import { EffectsSystem } from '../systems/EffectsSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { PieSystem } from '../systems/PieSystem';
import { EnemySpawner } from '../systems/EnemySpawner';
import { WaveManager } from '../systems/WaveManager';
import { CollisionSystem } from '../systems/CollisionSystem';
import { InputSystem } from '../systems/InputSystem';
import { Hud } from '../ui/Hud';
import { TouchControls } from '../ui/TouchControls';

/**
 * The gameplay scene. Owns the player, all systems, the enemy/pickup groups and
 * the per-frame update orchestration. Systems and entities talk to each other and
 * the HUD through `this.bus` (destroyed on shutdown to avoid leaking listeners).
 */
export class GameScene extends Phaser.Scene {
  bus!: Phaser.Events.EventEmitter;
  player!: Player;
  enemies!: Phaser.Physics.Arcade.Group;
  pickups!: Phaser.Physics.Arcade.Group;

  audio!: AudioSystem;
  effects!: EffectsSystem;
  combat!: CombatSystem;
  pies!: PieSystem;
  spawner!: EnemySpawner;
  waves!: WaveManager;
  collisions!: CollisionSystem;
  inputSystem!: InputSystem;
  hud!: Hud;
  touch?: TouchControls;

  currentWaveNumber = 0;
  readonly waveClearBonus = SCORING.waveClearBonus;
  isInputLocked = false;
  boss: BossWhale | null = null;

  private gameEnded = false;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.sound.stopAll();
    this.physics.world.isPaused = false;
    this.gameEnded = false;
    this.isInputLocked = false;
    this.boss = null;
    this.currentWaveNumber = 0;

    this.cameras.main.setBackgroundColor('#14123a');
    this.buildBackground();

    this.bus = new Phaser.Events.EventEmitter();
    this.audio = new AudioSystem(this);
    this.effects = new EffectsSystem(this);

    this.enemies = this.physics.add.group();
    this.pickups = this.physics.add.group();

    this.player = new Player(this, GAME_WIDTH / 2, (ARENA.minY + ARENA.maxY) / 2);

    this.combat = new CombatSystem(this);
    this.pies = new PieSystem(this);
    this.spawner = new EnemySpawner(this);
    this.waves = new WaveManager(this);

    this.collisions = new CollisionSystem(this);
    this.collisions.setup();

    this.inputSystem = new InputSystem(this);
    this.inputSystem.setup();

    if (this.sys.game.device.input.touch) {
      this.input.addPointer(2);
      this.touch = new TouchControls(this);
    }

    this.hud = new Hud(this);

    this.bus.on(GameEvents.PLAYER_DIED, this.onPlayerDied, this);
    this.bus.on(GameEvents.ENEMY_KILLED, this.onEnemyKilled, this);

    this.audio.playMusic(AUDIO.musicCalm);
    this.pies.selectIndex(0);
    this.waves.begin();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
  }

  private buildBackground(): void {
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, TEX.bgGradient).setDepth(DEPTHS.BACKGROUND);

    const floor = this.add.graphics().setDepth(DEPTHS.ENVIRONMENT);
    floor.fillStyle(COLORS.floor, 0.35);
    floor.fillRect(0, ARENA.minY - 60, GAME_WIDTH, GAME_HEIGHT - (ARENA.minY - 60));
    floor.lineStyle(4, COLORS.floorLine, 0.5);
    floor.lineBetween(0, ARENA.minY - 60, GAME_WIDTH, ARENA.minY - 60);
    // A few faux waterline streaks for depth.
    floor.lineStyle(2, COLORS.floorLine, 0.18);
    for (let i = 1; i <= 4; i++) {
      const y = ARENA.minY - 60 + ((GAME_HEIGHT - (ARENA.minY - 60)) / 5) * i;
      floor.lineBetween(0, y, GAME_WIDTH, y);
    }
  }

  // --- Public helpers used by systems / entities ----------------------------
  getActiveEnemies(): Enemy[] {
    return (this.enemies.getChildren() as unknown as Enemy[]).filter((e) => e && e.isAlive);
  }

  getNearestEnemy(x: number, y: number, exclude?: Enemy): Enemy | null {
    let best: Enemy | null = null;
    let bestD = Infinity;
    for (const e of this.getActiveEnemies()) {
      if (e === exclude) continue;
      const d = distance(x, y, e.x, e.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  registerEnemy(enemy: Enemy): void {
    this.enemies.add(enemy);
  }

  spawnEnemyAt(kind: EnemyKind, x: number, y: number): Enemy {
    return this.spawner.spawnAt(kind, x, y);
  }

  setBoss(enemy: Enemy): void {
    if (enemy instanceof BossWhale) this.boss = enemy;
  }

  onWaveCleared(waveId: number): void {
    this.combat.addScore(this.waveClearBonus);
    // Occasional rewards.
    if (waveId === 3) this.spawnPickup('pumpkin');
    if (waveId === 5) this.spawnPickup('health');
  }

  private spawnPickup(kind: 'pumpkin' | 'health'): void {
    const x = Phaser.Math.Between(ARENA.minX + 200, ARENA.maxX - 200);
    const y = Phaser.Math.Between(ARENA.minY + 60, ARENA.maxY - 60);
    const pickup = new Pickup(this, x, y, kind);
    this.pickups.add(pickup);
  }

  collectPickup(pickup: Pickup): void {
    const kind = pickup.collect();
    this.audio.playSfx(AUDIO.pieSelect, 0.8);
    if (kind === 'pumpkin') {
      this.pies.refillPumpkin(1);
      this.effects.floatingText(this.player.x, this.player.y - 120, '🎃 +1 Charge!', { color: '#ff8a33', fontSize: 30 });
    } else {
      this.player.health = Math.min(this.player.maxHealth, this.player.health + 30);
      this.bus.emit(GameEvents.PLAYER_HEALTH_CHANGED, { health: this.player.health, max: this.player.maxHealth });
      this.effects.floatingText(this.player.x, this.player.y - 120, '❤️ +30 HP', { color: '#6ee7a8', fontSize: 30 });
    }
  }

  showBanner(title: string, subtitle = '', color = '#ffe08a'): void {
    const cx = GAME_WIDTH / 2;
    const cy = 360;
    const titleText = this.add
      .text(
        cx,
        cy,
        title,
        withEmojiPadding(
          {
            fontFamily: 'Trebuchet MS, sans-serif',
            fontSize: '96px',
            color,
            fontStyle: 'bold',
            stroke: '#0b0d2b',
            strokeThickness: 10,
          },
          96,
        ),
      )
      .setOrigin(0.5)
      .setDepth(DEPTHS.UI_TOP);

    const objs: Phaser.GameObjects.GameObject[] = [titleText];
    if (subtitle) {
      objs.push(
        this.add
          .text(cx, cy + 80, subtitle, {
            fontFamily: 'Trebuchet MS, sans-serif',
            fontSize: '40px',
            color: '#fff4d6',
            fontStyle: 'bold',
            stroke: '#0b0d2b',
            strokeThickness: 5,
          })
          .setOrigin(0.5)
          .setDepth(DEPTHS.UI_TOP),
      );
    }

    this.tweens.add({
      targets: objs,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.7, to: 1 },
      duration: 280,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: 900,
      onComplete: () => objs.forEach((o) => o.destroy()),
    });
  }

  /** True once the run has ended (death or boss defeat); the end-scene transition is queued. */
  get isGameEnded(): boolean {
    return this.gameEnded;
  }

  togglePause(): void {
    if (this.gameEnded) return;
    this.isInputLocked = true;
    this.touch?.setEnabled(false);
    this.scene.launch('PauseScene', { gameScene: this });
    this.scene.pause();
  }

  resumeFromPause(): void {
    this.isInputLocked = false;
    this.touch?.setEnabled(true);
  }

  /** Pause driven by the landscape gate (phone rotated to portrait). */
  suspendForOrientation(): void {
    this.isInputLocked = true;
    this.touch?.setEnabled(false);
    this.scene.pause();
  }

  /** Resume when the phone returns to landscape. */
  resumeFromOrientation(): void {
    this.scene.resume();
    this.isInputLocked = false;
    this.touch?.setEnabled(true);
  }

  // --- Flow -----------------------------------------------------------------
  private onPlayerDied(): void {
    this.endGame(false);
  }

  private onEnemyKilled(p: { isBoss?: boolean }): void {
    if (p.isBoss) {
      this.boss = null;
      this.bus.emit(GameEvents.BOSS_DEFEATED, {});
      this.endGame(true);
    }
  }

  private endGame(victory: boolean): void {
    if (this.gameEnded) return;
    this.gameEnded = true;
    this.isInputLocked = true;
    const record = this.combat.finalize();

    this.time.delayedCall(victory ? 1400 : 1100, () => {
      this.sound.stopAll();
      const data = {
        score: this.combat.score,
        wave: this.currentWaveNumber,
        record,
        highScore: this.combat.highScore,
      };
      this.scene.start(victory ? 'VictoryScene' : 'GameOverScene', data);
    });
  }

  // --- Main loop ------------------------------------------------------------
  update(_time: number, delta: number): void {
    if (this.gameEnded) return;

    this.inputSystem.update();
    this.player.tick(delta);

    for (const enemy of this.enemies.getChildren() as unknown as Enemy[]) {
      enemy.tick(delta);
    }

    this.pies.update(delta);
    this.combat.update(delta);
    this.waves.update(delta);
    this.hud.update();
  }

  private onShutdown(): void {
    this.hud?.destroy();
    this.inputSystem?.dispose();
    this.bus?.destroy();
    this.boss = null;
  }
}
