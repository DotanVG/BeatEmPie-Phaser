# Placeholder assets

Enemy bodies, pie sprites, effects, the background and UI flourishes are **generated at
runtime** as pixel-styled placeholder textures — see
[`src/utils/placeholders.ts`](../../../src/utils/placeholders.ts) and the inventory in
[`docs/ASSET_INVENTORY.md`](../../../docs/ASSET_INVENTORY.md).

This folder is intentionally a marker. To replace a placeholder with real art, drop the image
under `public/assets/...`, load it under the matching key in `PreloadScene`, and the generator
will skip that key (it only generates textures that don't already exist).

Real shipped assets currently in the repo:

- `public/assets/sprites/player/` — Shushki idle / walk / jump
- `public/assets/audio/music/` — six music tracks
