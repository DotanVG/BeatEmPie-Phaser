import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { DEPTHS, GAME_WIDTH, GAME_HEIGHT } from '../game/constants';
import { GameEvents } from '../game/GameEvents';
import { HealthBar } from './HealthBar';
import { BossHealthBar } from './BossHealthBar';
import { CooldownMeter } from './CooldownMeter';
import { PieSelector } from './PieSelector';
import { withEmojiPadding } from '../utils/text';
import { getHudRightInset } from '../game/displayPolicy';

const UI_FONT = 'Trebuchet MS, Segoe UI, sans-serif';

/** Assembles and updates the in-game HUD. Reacts to gameplay-bus events. */
export class Hud {
  private healthBar: HealthBar;
  private bossBar: BossHealthBar;
  private pieCooldown: CooldownMeter;
  private dashMeter: CooldownMeter;
  private selector: PieSelector;

  private scoreText: Phaser.GameObjects.Text;
  private highScoreText: Phaser.GameObjects.Text;
  private comboText: Phaser.GameObjects.Text;
  private waveText: Phaser.GameObjects.Text;
  private selectedText: Phaser.GameObjects.Text;
  private bossAlive = false;
  private readonly relayoutTopRight = () => this.applyTopRightLayout();

  constructor(private scene: GameScene) {
    this.healthBar = new HealthBar(scene, 40, 44);
    this.healthBar.set(scene.player.maxHealth, scene.player.maxHealth);

    scene.add
      .text(40, 92, 'DASH', { fontFamily: UI_FONT, fontSize: '20px', color: '#ffe08a', fontStyle: 'bold' })
      .setDepth(DEPTHS.UI_TOP)
      .setScrollFactor(0);
    this.dashMeter = new CooldownMeter(scene, 120, 96, 200, 16);

    this.scoreText = scene.add
      .text(GAME_WIDTH - 40, 34, 'SCORE 0', {
        fontFamily: UI_FONT,
        fontSize: '38px',
        color: '#fff4d6',
        fontStyle: 'bold',
        stroke: '#0b0d2b',
        strokeThickness: 5,
      })
      .setOrigin(1, 0)
      .setDepth(DEPTHS.UI_TOP)
      .setScrollFactor(0);

    this.highScoreText = scene.add
      .text(GAME_WIDTH - 40, 82, `BEST ${scene.combat.highScore}`, {
        fontFamily: UI_FONT,
        fontSize: '24px',
        color: '#9aa0c0',
      })
      .setOrigin(1, 0)
      .setDepth(DEPTHS.UI_TOP)
      .setScrollFactor(0);

    this.comboText = scene.add
      .text(GAME_WIDTH - 40, 118, '', {
        fontFamily: UI_FONT,
        fontSize: '30px',
        color: '#ffe08a',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0)
      .setDepth(DEPTHS.UI_TOP)
      .setScrollFactor(0);

    this.waveText = scene.add
      .text(GAME_WIDTH / 2, 40, '', {
        fontFamily: UI_FONT,
        fontSize: '30px',
        color: '#fff4d6',
        fontStyle: 'bold',
        stroke: '#0b0d2b',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0)
      .setDepth(DEPTHS.UI_TOP)
      .setScrollFactor(0);

    this.selectedText = scene.add
      .text(
        GAME_WIDTH / 2,
        884,
        '',
        withEmojiPadding(
          {
            fontFamily: UI_FONT,
            fontSize: '30px',
            color: '#fff4d6',
            fontStyle: 'bold',
            stroke: '#0b0d2b',
            strokeThickness: 4,
          },
          30,
        ),
      )
      .setOrigin(0.5)
      .setDepth(DEPTHS.UI_TOP)
      .setScrollFactor(0);

    this.pieCooldown = new CooldownMeter(scene, GAME_WIDTH / 2 - 130, 912, 260, 14);
    this.bossBar = new BossHealthBar(scene);
    this.selector = new PieSelector(scene, scene.pies);

    this.bind();
    this.refreshSelected();
    this.applyTopRightLayout();

    document.addEventListener('fullscreenchange', this.relayoutTopRight);
    document.addEventListener('webkitfullscreenchange', this.relayoutTopRight as EventListener);
    window.addEventListener('resize', this.relayoutTopRight);
  }

  private bind(): void {
    const bus = this.scene.bus;
    bus.on(GameEvents.SCORE_CHANGED, (p: { score: number }) => {
      this.scoreText.setText(`SCORE ${p.score}`);
      if (p.score > this.scene.combat.highScore) this.highScoreText.setText(`BEST ${p.score}`);
    });
    bus.on(GameEvents.COMBO_CHANGED, (p: { combo: number; multiplier: number }) => {
      this.comboText.setText(p.combo > 1 ? `COMBO x${p.combo}  (x${p.multiplier.toFixed(1)})` : '');
    });
    bus.on(GameEvents.PLAYER_HEALTH_CHANGED, (p: { health: number; max: number }) => {
      this.healthBar.set(p.health, p.max);
    });
    bus.on(GameEvents.WAVE_STARTED, (p: { wave: number; name: string }) => {
      this.waveText.setText(`WAVE ${p.wave} — ${p.name}`);
    });
    bus.on(GameEvents.PIE_SELECTED, () => this.refreshSelected());
    bus.on(GameEvents.BOSS_SPAWNED, () => {
      this.bossAlive = true;
      this.bossBar.show();
    });
    bus.on(GameEvents.BOSS_HEALTH_CHANGED, (p: { health: number; max: number }) => {
      this.bossBar.set(p.health, p.max);
      if (p.health <= 0) {
        this.bossAlive = false;
        this.bossBar.hide();
      }
    });
  }

  private refreshSelected(): void {
    const pie = this.scene.pies.selectedPie;
    const charges = this.scene.pies.getCharges(pie.id);
    this.selectedText.setText(`${pie.emoji} ${pie.displayName}${charges !== null ? `  (x${charges})` : ''}`);
    this.selectedText.setColor(`#${pie.color.toString(16).padStart(6, '0')}`);
  }

  private applyTopRightLayout(): void {
    const button = document.getElementById('fullscreen-btn') as HTMLButtonElement | null;
    const x = GAME_WIDTH - getHudRightInset(Boolean(button && !button.hidden));

    this.scoreText.setX(x);
    this.highScoreText.setX(x);
    this.comboText.setX(x);
  }

  update(): void {
    this.selector.update();
    this.pieCooldown.set(this.scene.pies.getCooldownProgress(this.scene.pies.selectedPie.id));
    this.dashMeter.set(this.scene.player.dashCooldown.progress);
    if (!this.bossAlive) this.bossBar.hide();
  }

  destroy(): void {
    document.removeEventListener('fullscreenchange', this.relayoutTopRight);
    document.removeEventListener('webkitfullscreenchange', this.relayoutTopRight as EventListener);
    window.removeEventListener('resize', this.relayoutTopRight);
  }
}
