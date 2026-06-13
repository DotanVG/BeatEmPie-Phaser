# Testing

## Build validation checklist

Run before every handoff / PR (the `validate-before-handoff` hook automates this):

- [ ] `npm install` completes cleanly
- [ ] `npm run typecheck` passes (no TypeScript errors)
- [ ] `npm run build` succeeds (type-check + Vite production build)
- [ ] `npm run lint` passes
- [ ] `npm run preview` serves the built game without console errors

## Manual smoke checklist

- [ ] Main menu loads
- [ ] Game starts (Play button / Enter / Space)
- [ ] Shushki moves (WASD + arrows)
- [ ] Dash works (Shift) and has a cooldown
- [ ] Mouse targeting works (reticle follows; click drops at cursor)
- [ ] Space drops on the nearest enemy / in front
- [ ] Number keys 1–0 select all 10 pies
- [ ] Q / E cycle pies
- [ ] Apple Pie damages enemies
- [ ] Cherry Pie explodes and knocks enemies back
- [ ] Blueberry Pie freezes weak enemies / slows strong ones
- [ ] Lemon Meringue chains lightning between enemies
- [ ] Strawberry Pie homes onto the nearest enemy
- [ ] Meat Pie has a charge delay, heavy damage and a ground crack
- [ ] Mushroom Pie confuses an enemy so it attacks allies
- [ ] Pumpkin Pie fires a screen-wide ultimate and consumes a charge
- [ ] Chocolate Pie creates a slowing damage puddle
- [ ] Chili Pie creates a burning trail
- [ ] Fish chase the player
- [ ] Whales feel heavy and shove the player
- [ ] Boss Whale appears (with intro warning)
- [ ] Boss phases work (charge / summon / splash / vulnerable)
- [ ] Player can die
- [ ] Game Over screen works
- [ ] Victory screen works (defeat the boss)
- [ ] Restart works (R / button)
- [ ] High score persists across runs (localStorage)
- [ ] Pause / resume works (P / Esc)
- [ ] Build succeeds

## Automated runtime sanity (optional)

The game loop is delta-driven, so it can be stepped headlessly for smoke testing. With the
dev server running and the game exposed on `window.game` (dev builds only), `game.loop.step(t)`
can be pumped with increasing timestamps to fast-forward `GameScene` and assert no exceptions,
that all 10 pies fire, waves advance and the boss spawns. This was used to validate the build.
