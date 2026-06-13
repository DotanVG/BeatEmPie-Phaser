---
name: testing
description: How to validate BeatEmPie-Phaser — the build gate, the manual smoke checklist, and headless runtime sanity checks.
---

# Testing

## Build gate (must pass before handoff / PR)

```bash
npm install
npm run typecheck
npm run build      # type-check + Vite production build
npm run lint
```

Or run the bundled hook: `.claude/hooks/validate-before-handoff.sh`.

## Manual smoke

Use the checklist in [docs/TESTING.md](../../../docs/TESTING.md): menu → start → move/dash →
all 10 pies behave → enemies/whales/boss → death/victory/restart → high score persists.

## Headless runtime sanity

The game loop is delta-driven, so it can be stepped without a visible tab (hidden tabs throttle
`requestAnimationFrame`). With `npm run dev` running and `window.game` exposed (dev builds only):

```js
const g = window.game;
let t = performance.now();
const step = () => { t += 16; g.loop.step(t); };
g.scene.start('GameScene');
for (let i = 0; i < 10; i++) step();              // boot GameScene.create
const gs = g.scene.getScene('GameScene');
for (let f = 0; f < 6000; f++) {                  // fast-forward gameplay
  if (f % 8 === 0) { gs.pies.selectIndex((f/8)%10); gs.pies.dropAuto(); }
  step();
}
```

Assert: no exceptions thrown, all 10 pies fire, waves advance, the boss spawns, and an end
scene (GameOver/Victory) is reached. This is how the initial build was verified.

## Rules

Never hand off a red build. Fix type/build/lint errors; never silence them with fake imports.
