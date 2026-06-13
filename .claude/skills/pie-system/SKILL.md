---
name: pie-system
description: How the data-driven pie system works in BeatEmPie-Phaser and how to add or tune a pie or its effect.
---

# Pie System

Pies are **sky-drop attacks**: select → warning marker → fall from above → impact + effect.
Everything is data-driven from `src/data/pieTypes.ts` and resolved by `src/systems/PieSystem.ts`.

## The flow

1. `selectIndex` / `cyclePie` / `selectById` choose the active pie (locked pies refuse with feedback).
2. `dropAtPoint(x,y)` (mouse) or `dropAuto()` (Space) → `attemptDrop`.
3. `resolveTarget` picks coordinates by `targetMode`:
   `groundTarget` · `nearestEnemy` · `homing` · `screenWide` · `puddle` · `lineTrail`.
4. A `PieWarningMarker` shows, then after `skyDropDelayMs` a `PieDrop` falls.
5. On landing, `resolveImpact` runs the `effectType` branch (damage / explosive / freeze /
   chain / homing / heavy / confusion / ultimate / dot / fireTrail).

## Add a new pie

1. Append a `PieType` to `PIE_TYPES` in `src/data/pieTypes.ts` (id, emoji, damage, cooldown,
   `skyDropDelayMs`, radii, `effectType`, `targetMode`, `color`, `soundKey`, `particle`,
   `unlockWave`, plus effect fields like `freezeDurationMs`, `tickDamage`, `chainCount`, `maxUses`).
2. A placeholder texture `pie-<id>` is auto-generated; the selector/HUD pick it up automatically.
3. If it needs a **new** `effectType`, add a `case` in `PieSystem.resolveImpact`. Reuse helpers:
   `damageArea`, `enemiesInRadius`, `nearestExcluding`, and `EffectsSystem` for juice.

## Tuning

- Numbers live in `pieTypes.ts` (per-pie) and `src/data/balance.ts` (scoring/FX/global).
- Limited pies use `maxUses` (charges, e.g. Pumpkin); everything else uses `cooldownMs`.
- Status effects are applied via `enemy.applyStatus(...)`; boss/whale resistance scales
  durations through `ccResist`. Freeze auto-downgrades to slow for resistant enemies.

## Invariants

Keep all **10** official pies and the sky-drop fantasy. Don’t turn the main mechanic into
sideways projectiles.
