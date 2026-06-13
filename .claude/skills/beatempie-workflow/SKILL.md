---
name: beatempie-workflow
description: How to take a BeatEmPie-Phaser ticket end-to-end — sync staging, branch, implement, validate, and open a PR into staging.
---

# BeatEmPie Workflow

Use this for any feature/fix on BeatEmPie-Phaser.

## Steps

1. **Sync** from the active integration branch:
   ```bash
   git fetch origin
   git checkout staging && git merge --ff-only origin/staging
   ```
2. **Branch** off staging: `git checkout -b feature/<ticket>-<slug>`.
   (The `prevent-main-commit.sh` hook will stop you if you’re on `main`.)
3. **Inspect first** — reproduce/understand current behaviour before editing.
4. **Implement** using the data-driven systems (see the `phaser-architecture` and
   `pie-system` skills). Keep `GameScene` thin; put logic in systems.
5. **Validate** — run `.claude/hooks/validate-before-handoff.sh` (typecheck + build + lint
   + test). Fix everything; never hand off a red build.
6. **PR into `staging`** with summary, implementation details, validation commands run,
   visuals if relevant, linked issue, and `Closes #<N>` when applicable.

## Hard rules

- Never commit to / PR into `main`. `main` is promoted from `staging` (fast-forward) after validation.
- Never mention Unity / conversion / port / migration in public-facing files.
- Never leave build/type errors, fake imports, or dead code.
- Keep the 10-pie arsenal and the sky-drop fantasy intact.
