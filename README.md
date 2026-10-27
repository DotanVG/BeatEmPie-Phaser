# 🥧 BeatEmPie

**BeatEmPie** is a 2D web arcade beat ’em up where **Shushki** fights waves of fish and whales by **dropping magical pies from the sky**. Each pie has a unique power — from explosive cherry blasts to chain-lightning lemon meringue. Master all ten and survive the onslaught, then take down the boss: **Captain Leviathan**.

Built with **Phaser 4 + TypeScript + Vite**. Runs in any modern browser, no install required.

> _“Shushki fights waves of fish and whales by dropping magical pies from the sky. Each pie has a unique power, from explosive cherry blasts to chain lightning lemon meringue.”_

---

## 🎮 Gameplay

Pies are **sky-drop attacks**, not thrown projectiles. Pick a pie, aim at the ground (or auto-target the nearest foe), and a warning marker appears where it will land. A moment later the pie plummets from above and **slams down**, applying damage and its special effect. Read the battlefield, combo your pies, and keep Shushki alive across seven escalating waves.

- Survive waves of **Small Fish, Angry Fish, Puffer Fish and Whales**.
- Chain kills for a rising **combo multiplier**.
- Beat the final boss, **Captain Leviathan**, to win.
- Your **high score** is saved locally between runs.

## 🕹️ Controls

| Action | Keyboard / Mouse | Touch |
|--------|------------------|-------|
| Move | `WASD` / Arrow keys | Bottom-left virtual joystick (always on) |
| Aim | Mouse cursor | — |
| Drop pie at cursor | Left click | Tap anywhere on screen |
| Drop pie (auto-target) | `Space` | 🥧 button |
| Select pie 1–10 | `1` `2` … `9` `0` | Tap a selector slot |
| Cycle pies | `Q` / `E` | ↶ / ↷ prev/next buttons |
| Dash | `Shift` | 💨 button |
| Pause | `P` / `Esc` | — |
| Restart (after game over) | `R` | On-screen button |

On phones, play in **landscape** — holding the device in portrait shows a "rotate your
device" prompt and pauses the game until you turn it back.

See [docs/CONTROLS.md](docs/CONTROLS.md) for the full reference.

## 🥧 The Pie Arsenal

| # | Pie | Power |
|---|-----|-------|
| 1 | 🍎 Apple Pie | Standard drop — reliable damage, always available |
| 2 | 🍒 Cherry Pie | Explosive AOE — knocks nearby enemies back |
| 3 | 🫐 Blueberry Pie | Freeze — locks weak foes in ice, slows the strong |
| 4 | 🍋 Lemon Meringue | Chain Lightning — zaps between nearby enemies |
| 5 | 🍓 Strawberry Pie | Homing Assassin — hunts the strongest foe, one-shots regulars, hits stronger enemies hard |
| 6 | 🥩 Meat Pie | Heavy AOE — massive area-of-effect damage, slow charge, cracks the ground |
| 7 | 🍄 Mushroom Pie | Zombie Confusion — turned enemies attack their own allies |
| 8 | 🍫 Chocolate Pie | Damage Over Time (DOT) — leaves a puddle that slows and damages over time |
| 9 | 🌶️ Chili Pie | Fire Trail — a burning lane that scorches enemies who cross it |
| 0 | 🎃 Pumpkin Pie | Ultimate — screen-wide blast, very limited charges (key `0`) |

## 🚀 Setup

```bash
npm install      # install dependencies
npm run dev      # start the dev server (http://localhost:5173)
```

## 🛠️ Development

```bash
npm run dev        # hot-reloading dev server
npm run build      # type-check + production build to dist/
npm run preview    # preview the production build locally
npm run typecheck  # TypeScript type-check only
npm run lint       # ESLint
npm test           # unit tests (node --test, tests/*.test.mjs)
```

### Optional local knowledge graph

[Graphify](https://github.com/Graphify-Labs/graphify) builds a source-focused
knowledge graph for architectural, debugging, and cross-cutting development
questions. It is optional local tooling and is not a game dependency. The
verified distribution is `graphifyy` while its command and Python module are
named `graphify`:

```bash
uv tool install "graphifyy==0.9.30"
npm run graph:build
npm run graph:status
```

`graph:build` performs a full rebuild. Code relationships use local,
deterministic AST extraction; allowed documentation uses a logged-in Claude CLI
when available and otherwise falls back to code-only extraction. After material
structural changes, use `npm run graph:update`. After a major refactor or a
documentation/scope change, rebuild. `npm run graph:check` reports whether the
graph is stale.

Agents prefer an existing graph for unfamiliar, architectural, debugging,
cross-cutting, or likely multi-file tasks, then verify the source files before
editing. They skip it for isolated edits. Session startup only reports graph
availability; it never builds or updates the graph. Codex runs the optional
project hook only after the checkout's hooks are reviewed/trusted; `AGENTS.md`
still supplies the policy when lifecycle hooks are unavailable.

Intentional queries remain available:

```bash
npm run graph:query -- "How does input reach PieSystem and create a pie drop?"
npm run graph:query -- "How do WaveManager and EnemySpawner cooperate?" --dfs
npm run graph:path -- "InputSystem" "PieSystem"
npm run graph:explain -- "StatusController"
```

All outputs (`graph.json`, `graph.html`, `GRAPH_REPORT.md`, the manifest, and
local metadata) stay under ignored `graphify-out/`. They are machine-local,
potentially stale, and never committed; current source remains authoritative.
Use `pipx install "graphifyy==0.9.30"` or an isolated virtual environment if
`uv` is unavailable.

## 🌐 Play it live

- **Web:** https://beat-em-pie.vercel.app/
- **itch.io:** https://dotanv.itch.io/beatempie

`npm run build` produces a fully static `dist/` folder deployable to any static host. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for setup instructions.

## 🌿 Branch Strategy

- **`main`** — stable, always-deployable production branch.
- **`staging`** — the active integration branch; all feature work merges here first.
- **feature branches** — branch off `staging`, open PRs back into `staging`.

`main` is promoted from `staging` (fast-forward whenever possible) only after validation. Direct commits and feature PRs to `main` are not allowed. Full details in [docs/BRANCH_STRATEGY.md](docs/BRANCH_STRATEGY.md).

## 👥 Credits

- **Dotan** — Developer (programming, design, project management)
- **Romi** — Artist (character art, animations, environment)
- **Noam** — Composer (SFX, soundtrack)

## 📁 Project Structure

```
src/
  game/        bootstrap, Phaser config, constants, event names
  scenes/      Boot, Preload, MainMenu, Game, Pause, GameOver, Victory, Rotate
  entities/    Player, enemies, pie drops, puddles, pickups, status effects
  systems/     input, pies, combat, spawner, waves, collisions, effects, audio, save
  ui/          HUD, health/boss bars, pie selector, cooldown meter, touch controls
  data/        pie / enemy / wave configs + balance tuning
  utils/       asset keys, math, animation, placeholder generation
  types/       shared TypeScript interfaces
public/assets/ sprites, audio, backgrounds, ui
tests/         node --test unit tests
docs/          design, technical, controls, testing, deployment, workflow docs
```

## 📄 License

MIT — see the team credits above. Have fun, and mind the whales. 🐋🥧
