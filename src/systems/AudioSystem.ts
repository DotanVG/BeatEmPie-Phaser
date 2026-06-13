import Phaser from 'phaser';
import { SaveSystem } from './SaveSystem';

/**
 * Wraps Phaser's sound manager. Every call checks the audio cache first, so any
 * missing file (all SFX are currently unshipped) simply becomes a no-op instead
 * of throwing. Music tracks that DID load cross-fade cleanly.
 */
export class AudioSystem {
  private current?: Phaser.Sound.BaseSound;
  private currentKey = '';
  private musicVolume: number;
  private sfxVolume: number;
  private muted: boolean;

  constructor(private scene: Phaser.Scene) {
    const save = SaveSystem.load();
    this.musicVolume = save.musicVolume;
    this.sfxVolume = save.sfxVolume;
    this.muted = save.muted;
  }

  private has(key: string): boolean {
    return this.scene.cache.audio.exists(key);
  }

  playMusic(key: string, loop = true): void {
    if (this.currentKey === key && this.current?.isPlaying) return;
    this.stopMusic();
    this.currentKey = key;
    if (!this.has(key) || this.muted) return;
    try {
      const music = this.scene.sound.add(key, { loop, volume: 0 });
      music.play();
      this.current = music;
      // Fade in
      this.scene.tweens.add({
        targets: music,
        volume: this.musicVolume,
        duration: 600,
      });
    } catch {
      /* ignore audio errors */
    }
  }

  stopMusic(): void {
    if (this.current) {
      const old = this.current;
      this.scene.tweens.add({
        targets: old,
        volume: 0,
        duration: 350,
        onComplete: () => {
          old.stop();
          old.destroy();
        },
      });
      this.current = undefined;
      this.currentKey = '';
    }
  }

  playSfx(key: string, volumeScale = 1): void {
    if (this.muted || !this.has(key)) return;
    try {
      this.scene.sound.play(key, { volume: this.sfxVolume * volumeScale });
    } catch {
      /* ignore */
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.scene.sound.mute = muted;
    SaveSystem.patch({ muted });
    if (muted) this.stopMusic();
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMusicVolume(v: number): void {
    this.musicVolume = Phaser.Math.Clamp(v, 0, 1);
    if (this.current) (this.current as Phaser.Sound.WebAudioSound).setVolume?.(this.musicVolume);
    SaveSystem.patch({ musicVolume: this.musicVolume });
  }
}
