---
name: phaser-architecture
description: Conventions for BeatEmPie-Phaser's Phaser 3 + TypeScript architecture — scenes, systems, entities, the event bus and the tick pattern.
---

# Phaser Architecture

## Where things live

- `src/scenes/` — Boot → Preload → MainMenu → Game (+ Pause/GameOver/Victory). `GameScene`
  is orchestration only.
- `src/systems/` — gameplay logic: `InputSystem`, `PieSystem`, `CombatSystem`,
  `EnemySpawner`, `WaveManager`, `CollisionSystem`, `EffectsSystem`, `AudioSystem`, `SaveSystem`.
- `src/entities/` — `Player`, `Enemy` (+ subclasses), `PieDrop`, `PieWarningMarker`,
  `PiePuddle`, `Pickup`, `StatusController`.
- `src/ui/` — HUD and widgets. `src/data/` — pie/enemy/wave/balance configs. `src/utils/` —
  asset keys, math, animation, placeholders.

## Conventions

- **Event bus:** emit/listen on `scene.bus` (a dedicated `EventEmitter`), never `scene.events`.
  It is destroyed on `SHUTDOWN`, so restarts don’t leak listeners. Event names live in
  `src/game/GameEvents.ts`.
- **Tick pattern:** entities expose `tick(delta)` called from `GameScene.update` (not
  `preUpdate`), so they freeze when the scene pauses.
- **Asset keys:** only via `src/utils/assetKeys.ts`. New art? Add a key, load it in
  `PreloadScene` (or generate a placeholder in `utils/placeholders.ts`).
- **No reserved-name shadowing:** don’t name fields `input`, `state`, etc. on Scenes/GameObjects
  (the GameScene input system field is `inputSystem`).
- **Depth:** use the `DEPTHS` map in `src/game/constants.ts`; UI uses `setScrollFactor(0)`.
- **Feedback:** route particles/rings/shake/flash/floating-text/hit-pause through `EffectsSystem`.

## Adding a system

Construct it in `GameScene.create`, store it as a field, call its `update(delta)` from
`GameScene.update`, and have it talk to others via `scene.bus` + the public `GameScene` helpers
(`getActiveEnemies`, `getNearestEnemy`, `spawnEnemyAt`, …).
