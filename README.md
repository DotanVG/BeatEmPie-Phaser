# 🥧 BeatEmPie

**BeatEmPie** is a 2D web arcade beat ’em up where **Shushki** fights waves of fish and whales by **dropping magical pies from the sky**. Each pie has a unique power — from explosive cherry blasts to chain-lightning lemon meringue. Master all ten and survive the onslaught, then take down the boss: **Captain Leviathan**.

Built with **Phaser 3 + TypeScript + Vite**. Runs in any modern browser, no install required.

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
| Move | `WASD` / Arrow keys | Left virtual joystick |
| Aim | Mouse cursor | — |
| Drop pie at cursor | Left click | — |
| Drop pie (auto-target) | `Space` | 🥧 button |
| Select pie 1–10 | `1` `2` … `9` `0` | Tap a selector slot |
| Cycle pies | `Q` / `E` | Tap a selector slot |
| Dash | `Shift` | 💨 button |
| Pause | `P` / `Esc` | — |
| Restart (after game over) | `R` | On-screen button |

On phones, play in **landscape** — holding the device in portrait shows a "rotate your
device" prompt and pauses the game until you turn it back.

See [docs/CONTROLS.md](docs/CONTROLS.md) for the full reference.

## 🥧 The Pie Arsenal

| # | Pie | Power |
|---|-----|-------|
| 1 | 🥧 Apple Pie | Standard drop — reliable damage, always available |
| 2 | 🍒 Cherry Pie | Explosive AOE — knocks nearby enemies back |
| 3 | 🫐 Blueberry Pie | Freeze — locks weak foes in ice, slows the strong |
| 4 | 🍋 Lemon Meringue | Chain Lightning — zaps between nearby enemies |
| 5 | 🍓 Strawberry Pie | Homing — locks onto the nearest enemy, cannot miss |
| 6 | 🥩 Meat Pie | Heavy — massive damage, slow charge, cracks the ground |
| 7 | 🍄 Mushroom Pie | Confusion — enemies turn and attack their own allies |
| 8 | 🎃 Pumpkin Pie | Ultimate — screen-wide blast, very limited charges |
| 9 | 🍫 Chocolate Pie | DOT — leaves a puddle that slows and damages over time |
| 10 | 🌶️ Chili Pie | Fire Trail — a burning lane that scorches enemies who cross it |

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
```

## 🌐 Deployment

`npm run build` produces a fully static `dist/` folder. The Vite `base` is set to `./` so the build works from any subpath — drop it on **Vercel**, **Netlify**, **GitHub Pages**, or zip it for **itch.io**. Step-by-step instructions for each host are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

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
  scenes/      Boot, Preload, MainMenu, Game, Pause, GameOver, Victory
  entities/    Player, enemies, pie drops, puddles, pickups, status effects
  systems/     input, pies, combat, spawner, waves, collisions, effects, audio, save
  ui/          HUD, health/boss bars, pie selector, cooldown meter, touch controls
  data/        pie / enemy / wave configs + balance tuning
  utils/       asset keys, math, animation, placeholder generation
  types/       shared TypeScript interfaces
public/assets/ sprites, audio, backgrounds, ui
docs/          design, technical, controls, testing, deployment, workflow docs
```

## 📄 License

MIT — see the team credits above. Have fun, and mind the whales. 🐋🥧
