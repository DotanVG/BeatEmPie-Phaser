# Asset Inventory (internal)

> Internal technical documentation. Tracks which assets were reused from the
> source-reference project (`DotanVG/BeatEmPie`, branch `dev`) and which are
> placeholders generated at runtime.

## Reused assets

| Asset | Source path (branch `dev`) | Type | Usable in Phaser | Copied destination | Notes |
|-------|----------------------------|------|------------------|--------------------|-------|
| Shushki idle | `Assets/Art/Sprites/Player/Shushki.png` | player | ✅ yes | `public/assets/sprites/player/shushki.png` | 128×192 single frame; used as idle pose |
| Shushki walk | `Assets/Art/Sprites/Player/Shushki_Walk2.png` | player | ✅ yes | `public/assets/sprites/player/shushki_walk.png` | 128×192 single frame; swapped in while moving |
| Shushki jump | `Assets/Art/Sprites/Player/Shushki_Jump.png` | player | ✅ yes | `public/assets/sprites/player/shushki_jump.png` | 128×192 single frame; used for dash / call-pie pose |
| Main menu music | `Assets/Audio/Music/bgm_mainmenu.wav` | audio | ✅ yes | `public/assets/audio/music/bgm_mainmenu.wav` | Title screen loop |
| Calm gameplay music | `Assets/Audio/Music/bgm_gameplay_calm.wav` | audio | ✅ yes | `public/assets/audio/music/bgm_gameplay_calm.wav` | Waves 1–3 |
| Intense gameplay music | `Assets/Audio/Music/bgm_gameplay_intense.wav` | audio | ✅ yes | `public/assets/audio/music/bgm_gameplay_intense.wav` | Waves 4–6 |
| Boss music | `Assets/Audio/Music/bgm_boss.wav` | audio | ✅ yes | `public/assets/audio/music/bgm_boss.wav` | Boss wave |
| Victory music | `Assets/Audio/Music/bgm_victory.wav` | audio | ✅ yes | `public/assets/audio/music/bgm_victory.wav` | Victory screen |
| Game over music | `Assets/Audio/Music/bgm_gameover.wav` | audio | ✅ yes | `public/assets/audio/music/bgm_gameover.wav` | Game over screen |

## Source paths inspected

The following source-reference folders were inspected for usable art/audio. Only
the player sprites and music tracks above contained shipped files; the rest were
empty placeholders (`.gitkeep`) in the source project.

- `Assets/Art/Sprites/` — only `Player/` had images (3 PNGs). `Enemies/`, `Pies/`, `UI/` were empty.
- `Assets/Art/Animations/` — empty.
- `Assets/Art/Tilemaps/` — not present.
- `Assets/Audio/SFX/` — empty (no SFX files).
- `Assets/Audio/Music/` — 6 `.wav` tracks (all reused, above).
- `Assets/Prefabs/`, `Assets/VFX/`, `Assets/Scenes/`, `Assets/Settings/` — engine-specific, not portable.

## Placeholder assets (generated at runtime)

Generated procedurally in [`src/utils/placeholders.ts`](../src/utils/placeholders.ts)
via Phaser `Graphics.generateTexture()`. They are pixel-styled, clearly stand-in art,
and keep the game fully playable until bespoke art is dropped in.

| Texture key | Represents | Replacement needed |
|-------------|-----------|--------------------|
| `tex-fish` | Small Fish body | Real fish spritesheet |
| `tex-angry-fish` | Angry Fish (fish + angry brow) | Real spritesheet |
| `tex-puffer-fish` | Puffer Fish (spiky ball) | Real spritesheet |
| `tex-whale` | Whale | Real whale art |
| `tex-boss-whale` | Captain Leviathan (crowned whale) | Real boss art |
| `pie-*` (×10) | Each pie (coloured dome + crust) | ✅ replaced by real art (fallback only) |
| `tex-shadow` | Drop shadow under player / falling pies | — (optional polish) |
| `tex-particle`, `tex-spark` | Impact particles | — |
| `tex-warning` | Target reticle | — |
| `tex-puddle`, `tex-fire-trail` | Chocolate puddle / chili fire | — |
| `tex-ground-crack` | Meat Pie ground crack | — |
| `tex-lock`, `tex-pickup` | Homing lock / pickups | — |
| `tex-bg-gradient` | Arena background gradient | Real background art |

## Missing assets & fallbacks

- **SFX** — no sound-effect files exist yet. `AudioSystem` checks the audio cache
  before every `playSfx()` call, so missing SFX are silent no-ops; music is unaffected.
- **Enemy / pie / background art** — all covered by runtime placeholders, so no
  missing file is ever referenced directly. Replacing a placeholder is as simple as
  loading a real image under the same key in `PreloadScene` (the generator skips keys
  that already exist).

## Frame sizes / slicing notes

- Legacy player PNGs are **single frames (128×192)**; they remain as the fallback
  path when the animation sheets fail to load.
- **Player animation sheets** (sliced from Romy's two source spritesheets, chroma-keyed
  and normalized to face RIGHT on uniform **152×180 bottom-anchored frames**):
  `shushki_idle.png` (4), `shushki_run.png` (7), `shushki_jump_anim.png` (6: start 2 /
  loop 2 / land 2 — registered, awaiting a jump mechanic), `shushki_attack.png` (7),
  `shushki_hurt.png` (2), `shushki_death.png` (8 — mixed from both source sheets,
  ending on the X-X-eyes frame). Registered in `src/utils/playerAnims.ts`.
- **Pie art** (`public/assets/sprites/pies/`): `pie_<id>.png` ×10, 64×64, black bg
  removed, loaded under the same `pie-<id>` keys so placeholders are skipped.
  `pie_splat.png` (92×76, from source sheet 2) is tinted per-pie on impact.
- Source images live in `art_source/` (not shipped; `public/assets` holds the
  processed game-ready files).
