import Phaser from 'phaser';

/** Enforce nearest-neighbour sampling for loaded, generated, and future textures. */
export function installNearestTextureFiltering(game: Phaser.Game): void {
  const install = (): void => {
    const apply = (_key: string, texture: Phaser.Textures.Texture): void => {
      texture.setSmoothPixelArt(false);
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    };

    for (const key of game.textures.getTextureKeys()) {
      apply(key, game.textures.get(key));
    }

    game.textures.on(Phaser.Textures.Events.ADD, apply);
    game.events.once('destroy', () => game.textures.off(Phaser.Textures.Events.ADD, apply));
  };

  if (game.isBooted) install();
  else game.events.once(Phaser.Core.Events.BOOT, install);
}
