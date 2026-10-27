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
| Main menu music | `Assets/Audio/Music/bgm_mainmenu.wav` | audio | ✅ yes | `public/assets/audio/music/bgm_mainmenu.wav` | ⚠️ AI-generated placeholder — title screen loop |
| Calm gameplay music | `Assets/Audio/Music/bgm_gameplay_calm.wav` | audio | ✅ yes | `public/assets/audio/music/bgm_gameplay_calm.wav` | ⚠️ AI-generated placeholder — waves 1–3 |
| Intense gameplay music | `Assets/Audio/Music/bgm_gameplay_intense.wav` | audio | ✅ yes | `public/assets/audio/music/bgm_gameplay_intense.wav` | ⚠️ AI-generated placeholder — waves 4–6 |
| Boss music | `Assets/Audio/Music/bgm_boss.wav` | audio | ✅ yes | `public/assets/audio/music/bgm_boss.wav` | ⚠️ AI-generated placeholder — boss wave |
| Victory music | `Assets/Audio/Music/bgm_victory.wav` | audio | ✅ yes | `public/assets/audio/music/bgm_victory.wav` | ⚠️ AI-generated placeholder — victory screen |
| Game over music | `Assets/Audio/Music/bgm_gameover.wav` | audio | ✅ yes | `public/assets/audio/music/bgm_gameover.wav` | ⚠️ AI-generated placeholder — game over screen |

> **Music status:** all six tracks are AI-generated placeholders, not final compositions.
> They stay in place — and `AudioSystem` keeps treating them as normal music — until
> Noam creates the real soundtrack.

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

## Site icons (favicon set)

Not game assets — these are the browser/tab/home-screen icons for the deployed page.

All of them are nearest-neighbour blow-ups of a single hand-authored **16×16 pixel-art
grid** (a lattice pie in its tin with a cherry on top) defined in
[`tools/generate-favicon.mjs`](../tools/generate-favicon.mjs). The crust and tin hues are
lifted from `pie_cherry.png` (`#ffb470` / `#c3fdfe`); the plate is the page `theme-color`
`#0b0d2b`, which keeps the icon legible on both light and dark browser chrome.

| File | Size(s) | Used by |
|------|---------|---------|
| `public/favicon.ico` | 16, 32, 48 (32-bit BMP entries) | browser tabs, bookmarks, legacy crawlers |
| `public/favicon.svg` | vector | modern browsers (`type="image/svg+xml"`), crisp at any DPI |
| `public/apple-touch-icon.png` | 180×180 | iOS home screen (iOS applies its own rounding) |
| `public/icon-192.png` | 192×192 | web manifest |
| `public/icon-512.png` | 512×512 | web manifest, install prompts |
| `public/icon-512-maskable.png` | 512×512 | web manifest `purpose: maskable` — art inset to the centre 80% safe zone |

Regenerate the whole set (never hand-edit the outputs — edit `GRID` and re-run):

```bash
node tools/generate-favicon.mjs public
```

Pass a second path to also emit a 16px and a 20× zoom preview for eyeballing changes:

```bash
node tools/generate-favicon.mjs public ./preview-out
```
