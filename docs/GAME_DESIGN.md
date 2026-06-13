# Game Design

## Pitch

**BeatEmPie** is a 2D web arcade beat ’em up where Shushki defends against waves of fish
and whales by **dropping magical pies from the sky**. Each of the ten pies has a distinct
power — freezing blueberry, chain-lightning lemon meringue, confusing mushroom, a
screen-clearing pumpkin ultimate — and the fun is in reading the swarm and picking the
right pie for the moment, all the way up to the boss, Captain Leviathan.

## Controls

See [CONTROLS.md](CONTROLS.md). In short: WASD/arrows to move, mouse or Space to drop the
selected pie, number keys / Q-E to choose pies, Shift to dash, P/Esc to pause.

## Player mechanics

- Free 2D movement within the arena band; faces its movement / target direction.
- **Dash** (Shift) — a short invulnerable burst on a cooldown, for repositioning.
- **Invulnerability frames** after taking a hit, with a blink.
- **Knockback** when struck; heavier enemies shove harder.
- Health bar; reaching 0 is the defeat state.

## Enemy types

| Enemy | Health | Behaviour |
|-------|--------|-----------|
| Small Fish | Low | Fast straight-line chaser, spawns in groups |
| Angry Fish | Medium | Faster, weaves in a zig-zag, hits harder |
| Puffer Fish | Medium-high | Slow approach, telegraphs then **bursts** a radial shockwave |
| Whale | High | Big, slow, heavy contact damage, shoves the player, resists crowd control |
| **Boss Whale** (Captain Leviathan) | Very high | Phases: **charge**, **summon fish**, **splash shockwave**, **vulnerable recover**; reduced freeze/confusion |

## The pie arsenal

| Pie | Effect type | Behaviour |
|-----|-------------|-----------|
| 🥧 Apple | damage | Low-cooldown reliable single drop |
| 🍒 Cherry | explosive | Big AOE + strong knockback + screen shake |
| 🫐 Blueberry | freeze | Freezes weak foes, slows the resistant |
| 🍋 Lemon Meringue | chain | Lightning chains between nearby enemies |
| 🍓 Strawberry | homing | Locks onto nearest enemy, can’t miss; re-targets if it dies |
| 🥩 Meat | heavy | Long wind-up, massive damage, cracks the ground, big shake |
| 🍄 Mushroom | confusion | Enemies turn on their allies (boss/whale resist) |
| 🎃 Pumpkin | ultimate | Screen-wide blast, **limited charges**, damages (not one-shots) the boss |
| 🍫 Chocolate | dot | Leaves a slowing, damaging puddle (area denial) |
| 🌶️ Chili | fire trail | A burning lane; burn lingers briefly after leaving it |

Pies unlock as you progress (Apple/Cherry/Blueberry/Pumpkin from the start; Lemon/Strawberry
early; Meat/Mushroom mid; Chocolate/Chili later).

## Wave structure

Seven waves of rising pressure:

1. Small Fish only
2. Small Fish + Angry Fish
3. Puffer Fish introduced
4. Whale introduced
5. Mixed swarm
6. Heavy mixed wave
7. **Boss Whale** + summoned fish

A short intermission and a "Wave Clear!" banner separate waves; the boss gets a warning intro.

## Scoring

- Points per hit (boss damage scores proportionally).
- Points per kill, multiplied by the current combo multiplier.
- **Wave-clear bonus**.
- **Combo multiplier** rises with consecutive kills and decays after a quiet window;
  taking damage resets it.

### Special scoring bonuses

Cherry multi-hit, Lemon chain hits, Pumpkin multi-kill wipe, Mushroom ally (betrayal) kills,
Chocolate DOT kills, Chili burn kills, plus boss damage and the boss kill.

## Combo system

Each kill bumps the combo count and multiplier (capped). Keep killing to keep the multiplier
high; a quiet period or a hit on Shushki resets it. The HUD shows the live combo.

## Win / loss conditions

- **Win** — defeat Captain Leviathan → Victory screen.
- **Lose** — Shushki’s health reaches 0 → Game Over screen.
- Both offer instant restart; the **high score** persists in `localStorage`.

## Future extension ideas

- Bespoke spritesheets + frame animations for all entities.
- More enemy types, elite variants and additional bosses.
- Pie upgrades / loadouts, endless mode, leaderboards.
- Real SFX layer (hooks already exist in `AudioSystem`).
