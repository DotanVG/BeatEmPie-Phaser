# Technical Plan

## Why Phaser 3 + TypeScript + Vite

- **Phaser 3** — mature, batteries-included 2D web engine: Arcade Physics, sprites,
  groups, particles, tweens, cameras, input and audio out of the box. WebGL with a
  Canvas fallback, great for pixel-art arcade games.
- **TypeScript** — typed pie/enemy/wave configs and event payloads catch mistakes at
  build time; the whole project type-checks as part of `npm run build`.
- **Vite** — instant dev server with HMR and a tiny, fast static production build.
  `base: './'` makes the output portable to any static host or itch.io.

## Repo structure

```
src/
  game/      main.ts (bootstrap), config.ts (Phaser config), constants.ts, GameEvents.ts
  scenes/    Boot → Preload → MainMenu → Game (+ Pause/GameOver/Victory)
  entities/  Player, Enemy base + subclasses, PieDrop, PieWarningMarker, PiePuddle, Pickup, StatusController
  systems/   InputSystem, PieSystem, CombatSystem, EnemySpawner, WaveManager, CollisionSystem, EffectsSystem, AudioSystem, SaveSystem
  ui/        Hud, HealthBar, BossHealthBar, PieSelector, CooldownMeter, FloatingText, TouchControls, Button
  data/      pieTypes, enemyTypes, waveConfig, balance
  utils/     assetKeys, math, animation, direction, timers, placeholders
  types/     game.ts (shared interfaces)
```

## Scene architecture

`BootScene` (setup) → `PreloadScene` (load real assets + generate placeholders) →
`MainMenuScene` → `GameScene`. `PauseScene` launches as an overlay on top of a paused
`GameScene`. `GameOverScene` / `VictoryScene` are reached via `scene.start` with a
results payload. Scene keys are referenced by string in one place (the config) and
through `scene.start`/`launch`.

## Entity architecture

Entities extend Phaser Arcade sprites/images and are driven by an explicit `tick(delta)`
called from `GameScene.update` (rather than `preUpdate`) so they freeze cleanly when the
scene is paused. `Enemy` is the base class; `FishEnemy`, `AngryFishEnemy`,
`PufferFishEnemy`, `WhaleEnemy`, `BossWhale` override `updateAI`.

## Pie system architecture

`PieSystem` is fully data-driven from [`src/data/pieTypes.ts`](../src/data/pieTypes.ts).
The pipeline:

1. **Select** a pie (number keys / cycle / click).
2. **Resolve target** by `targetMode` (`groundTarget`, `nearestEnemy`, `homing`, `screenWide`, `puddle`, `lineTrail`).
3. **Warning marker** appears, then after `skyDropDelayMs` a **`PieDrop`** falls from the sky with a growing shadow.
4. **Impact** resolves per `effectType`: area damage, knockback, freeze/slow, chain lightning, confusion, DOT puddle, fire trail, or screen-wide ultimate — plus particles, rings, shake and audio.

Cooldowns are per-pie (`Cooldown` counter); limited pies (Pumpkin) track charges.

## Enemy system architecture

`EnemySpawner` is a factory that constructs the right subclass and spawns it from a
screen edge (or an exact point for boss summons). `WaveManager` is a small state machine
(`intermission → spawning → fighting → …`) reading [`waveConfig.ts`](../src/data/waveConfig.ts),
detecting clears by counting active enemies, handling the boss intro and the victory hand-off.

## Status effect system

`StatusController` (one per enemy) holds timed statuses (`frozen`, `slowed`, `burning`,
`confused`, `chocolateDot`, `stunned`, …). It computes the effective speed multiplier,
ticks DOT damage, shows the dominant status tint + emoji indicator, and refreshes-on-reapply
(no infinite stacking). Boss/whale resistance scales status durations via `ccResist`.

## Collision approach

Arcade Physics overlaps wired in `CollisionSystem`: player↔enemies (contact damage +
knockback) and player↔pickups (collect). Pie impacts and puddle ticks use cheap **distance
checks** against `impactRadius`, not physics bodies, so AOE is precise and decoupled from sprite size.

## Animation approach

Shipped art is single-frame, so animation is **procedural**: texture swaps (idle/walk/jump),
squash/stretch, walk-bob, hit-flash and pop-in tweens (see [`utils/animation.ts`](../src/utils/animation.ts)).
The structure supports real spritesheets later without touching gameplay code.

## Asset loading approach

`PreloadScene` loads the real player sprites + music with a progress bar, tolerates load
errors (`loaderror` handler), then generates all placeholder textures. All asset keys live
in [`utils/assetKeys.ts`](../src/utils/assetKeys.ts) — no magic strings.

## UI approach

`Hud` composes `HealthBar`, `BossHealthBar`, `PieSelector`, `CooldownMeter` and text
readouts, reacting to a dedicated gameplay event emitter (`scene.bus`) so systems stay
decoupled from the UI. The bus is destroyed on scene shutdown to avoid leaking listeners
across restarts.

## Deployment approach

`npm run build` → static `dist/` with relative asset paths (`base: './'`). Deployable to
Vercel, Netlify, GitHub Pages and itch.io — see [DEPLOYMENT.md](DEPLOYMENT.md).

## Testing checklist

Manual smoke + build validation lives in [TESTING.md](TESTING.md). Build gate:
`npm run typecheck && npm run build && npm run lint` must all pass.
