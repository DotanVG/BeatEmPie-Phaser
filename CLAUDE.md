# CLAUDE.md — internal project memory

Guidance for Claude / Codex agents working on **BeatEmPie-Phaser**. Read this before
making changes.

## Project summary

A complete, playable 2D web arcade beat ’em up: **Shushki drops magical pies from the sky**
to fight waves of fish and whales, culminating in a boss (Captain Leviathan). Standalone
official web version of BeatEmPie.

## Tech stack

Phaser 3 · TypeScript · Vite · npm · HTML5 Canvas/WebGL. No React, no backend, static build only.

## Game concept

Sky-drop pie combat across 7 waves; 10 unique pies with distinct effects; status effects,
combos, scoring, high-score persistence, and a multi-phase boss.

## Source-reference note (internal only)

Design, team credits, the player sprites and the music were taken from the source-reference
project `DotanVG/BeatEmPie` (branch `dev`). This is for internal continuity only.

## Public-facing no-Unity rule

Public-facing files must **not** mention Unity, conversion, port, migration, the old repo,
or "original project". Public-facing files include: `README.md`, package description, game
UI, title/credits screens, deployment copy, itch.io text and player docs. (Internal docs such
as this file, `WORKFLOW.md`, and `docs/ASSET_INVENTORY.md` may reference the source-reference
repo where technically necessary.)

## Branch strategy & main/staging alignment

- **Do not commit directly to `main`.**
- **Do not target feature PRs to `main`.**
- **Branch from `staging`.**
- **Merge feature branches into `staging`.**
- **Promote `staging` → `main` only after validation.**
- Keep `staging` and `main` aligned via **fast-forward promotion** whenever possible.
- Do **not** allow `dev` and `staging` to become separate active integration branches —
  `staging` is the single active integration branch here.
- Always start from the latest `origin/staging`: `git fetch origin && git merge --ff-only origin/staging`.

## Architecture invariants

- Keep `GameScene` readable — orchestration only; logic lives in systems.
- Pie logic in `PieSystem`; spawning in `EnemySpawner` + `WaveManager`; status effects in
  `StatusController`; UI in `ui/` classes.
- Gameplay events go through `scene.bus` (a dedicated `EventEmitter` destroyed on shutdown),
  not `scene.events`.
- Drive entities via explicit `tick(delta)` from `GameScene.update` (so they pause cleanly).
- Use the shared interfaces in `src/types/game.ts` (`PieType`, `EnemyType`, `WaveConfig`,
  `StatusEffect`/status options, `DamageEvent`, `ScoreEvent`). Keep configs data-driven.
- Don’t shadow reserved Phaser members (`input`, `state`, etc.).

## Asset rules

- All asset keys live in `src/utils/assetKeys.ts` — no magic strings.
- Preserve the pixel-art style. Reuse real assets where they exist.
- Missing art → procedural placeholders (`src/utils/placeholders.ts`); missing audio →
  `AudioSystem` degrades gracefully (cache-checked no-ops).
- **Never reference a missing file directly without a fallback.**

## Pie system rules

- Preserve the official **10-pie arsenal** and the fantasy of **pies dropping from the sky**
  (warning marker → fall from above → impact). The main mechanic is not sideways projectiles.
- Pumpkin is limited by **charges**; other pies use cooldowns.

## Enemy system rules

- Base `Enemy` + subclasses (`FishEnemy`, `AngryFishEnemy`, `PufferFishEnemy`, `WhaleEnemy`,
  `BossWhale`). Boss has phases and reduced freeze/confusion (`ccResist`).

## UI rules

- HUD shows: health, score, high score, combo, wave, selected pie, 10-pie selector with
  cooldowns + charges, dash cooldown, and the boss health bar. Status effects show indicators.

## Testing expectations

- See [docs/TESTING.md](docs/TESTING.md). The build gate is `typecheck && build && lint`.

## PR expectations

- PRs target `staging`, include summary, implementation details, validation commands run,
  visuals if relevant, linked issue, and `Closes #<N>` when applicable.

## Commands

```bash
npm run dev        # dev server
npm run build      # type-check + production build
npm run preview    # preview build
npm run typecheck  # type-check only
npm run lint       # ESLint
```

## Things agents must NOT do

- Do not commit directly to `main`.
- Do not target feature PRs to `main`.
- Do not mention Unity / conversion / port / migration in public-facing files.
- Do not reference missing assets without fallbacks.
- Do not leave TypeScript build errors.
- Do not create fake imports.
- Do not remove documentation without replacing it.
- Do not leave dead code.
- Do not allow `dev` and `staging` to become separate active integration branches.
