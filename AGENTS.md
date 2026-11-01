# AGENTS.md â€” BeatEmPie-Phaser

2D web arcade beat 'em up: Shushki drops magical pies from the sky on waves of fish and whales, ending with the Captain Leviathan boss. Phaser 4 + TypeScript + Vite, static build â€” no React, no backend.

## Knowledge graph policy

When `graphify-out/graph.json` exists:

1. For unfamiliar, architectural, debugging, cross-cutting or likely multi-file tasks,
   query Graphify before performing broad repository exploration.
2. Use the graph to identify likely files, symbols, dependencies and execution paths.
3. Open and verify the authoritative source files before editing.
4. Never trust stale graph data over current source.
5. For a clearly isolated edit, skip Graphify.
6. After material structural changes, perform an incremental graph update when practical.
7. After a major refactor, perform a full rebuild.
8. Never commit `graphify-out/`.
9. Do not block ordinary work only because the optional local graph is absent.

Codex discovers the small adapter at `.agents/skills/graphify/SKILL.md`; the
adapter explicitly loads the canonical skill without claiming cross-platform
skill discovery. Claude Code discovers the project skill at
`.claude/skills/graphify/SKILL.md`. The trusted project `SessionStart` hook only
announces an existing graph and never builds or updates one. Intentional commands
are documented in that skill and in the README.

## Commands

```bash
npm run dev        # dev server
npm run typecheck
npm run lint
npm run build      # typecheck + production build
npm test           # node --test, tests/*.test.mjs
```

Gate before any PR: `typecheck && build && lint` (details: `docs/TESTING.md`). No TypeScript errors, no fake imports, no dead code.

## Branching

- Branch from the latest `origin/staging`; PRs target `staging`, never `main`. Never commit to `main`.
- `staging` â†’ `main` only by fast-forward after validation. `staging` is the only integration branch â€” don't revive `dev`.
- PR body: summary, validation commands run, visuals if relevant, `Closes #<N>` when applicable.

## Public-facing rule

Public files (README, package description, game UI, title/credits, deploy and itch.io copy, player docs) must never mention Unity, conversion, port, migration, the old repo or an "original project". Internal docs (this file, `WORKFLOW.md`, `docs/ASSET_INVENTORY.md`) may reference the source-reference repo `DotanVG/BeatEmPie` (branch `dev`) when technically needed.

## Architecture invariants

- `GameScene` orchestrates only; logic lives in systems (`PieSystem`, `EnemySpawner` + `WaveManager`, `StatusController`, `ui/`).
- Gameplay events go through `scene.bus` (own `EventEmitter`, destroyed on shutdown), not `scene.events`.
- Entities advance via explicit `tick(delta)` from `GameScene.update`, so pause works.
- Use the shared types in `src/types/game.ts`; keep configs data-driven.
- Don't shadow reserved Phaser members (`input`, `state`, ...).
- Keep the 10-pie arsenal and the sky-drop fantasy (warning marker â†’ fall â†’ impact). Pumpkin uses charges; other pies use cooldowns.

## Assets

- All asset keys in `src/utils/assetKeys.ts` â€” no magic strings. Keep the pixel-art style.
- Never reference a missing file without a fallback: missing art â†’ `src/utils/placeholders.ts`; missing audio â†’ `AudioSystem` no-ops.

## Ponytail / Minimal Senior Dev Mode

- Prefer deletion over addition.
- Prefer existing code, stdlib, browser/native APIs, and installed dependencies before adding new code or dependencies.
- Avoid new abstractions unless there are at least two real implementations or a clear current need.
- Keep diffs small.
- Do not add scaffolding "for later".
- Never simplify away security, trust-boundary validation, accessibility basics, or data-loss prevention.
- For deliberate shortcuts, add a comment with the format:
  // ponytail: [shortcut], upgrade when [specific condition]
- For non-trivial logic, add the smallest runnable check or test that would fail if the logic breaks.

## Reuse first

Before implementing a feature or config, search installed dependencies and their
READMEs, this repo's `PROVENANCE.md`, and the relevant personal DotanVG siblings
(BeatEmPie-Phaser, Count-Dawn, Orbital-Breach). Check `DotanVG/game-kit`'s
`packages/INDEX.md` if that project exists; do not assume packages are published.
For an unfamiliar feature, compare existing open-source approaches, license,
maintenance and security first. Record findings and the reuse decision in the PR body.

Prefer an existing shared package or native API. Do not copy source files,
directories, workflows, configs or security logic between repositories, including
from old branches or node_modules. A small game-specific idea can be implemented
locally; shared security policy deserves a shared config/package proposal.
An explicitly approved exception must record source repo/path/full commit SHA,
date, reason, intentional differences and intended shared-package destination in
`PROVENANCE.md` and the PR body. Phase 0's documented drift-tool bootstrap is one
such authorized exception. Asset reuse also requires license/inventory attribution.

Propose a shared component only for two concrete consumers. Put the proposal in
`docs/reuse-proposals/<name>.md` in a PR: existing locations and SHAs, consumers,
API/parameters, engine boundary, risks and checks. Keep Phaser-specific, Three.js-
specific and engine-agnostic code separate. Obtain approval before creating or
publishing a package; use a human-merged version/Changesets PR if adopted. Do not
vendor modified dependencies or commit local `file:` dependencies as a substitute.

Run `node tools/drift-check.mjs <sibling-checkout-or-url>` before changing listed
shared configs. Review intentional differences rather than forcing equality.
Never put secrets, game hostnames, analytics IDs or origins into shared defaults;
take game-specific values as parameters. The drift check remains advisory and
must not be added to deploy/build gates. Use PR bodies for evidence, not comments.
