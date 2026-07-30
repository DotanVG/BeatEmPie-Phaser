---
name: graphify
description: Use the optional local Graphify knowledge graph to orient unfamiliar, architectural, debugging, cross-cutting, or likely multi-file BeatEmPie-Phaser work, or when a user intentionally asks for a graph query, path, explanation, build, update, or status check.
---

# Graphify

Treat this file as the canonical repository Graphify skill. Codex has a small
discovery adapter at `.agents/skills/graphify/SKILL.md`; that adapter points here
instead of maintaining a second copy.

## Orient with the graph

1. Run `npm run graph:status`. If the graph is missing, continue with normal
   source inspection unless the user specifically asked to build it.
2. For unfamiliar, architectural, debugging, cross-cutting, or likely multi-file
   work, ask a focused question:

   ```bash
   npm run graph:query -- "How does input reach PieSystem and create a pie drop?"
   ```

3. Use `--dfs` when a deeper execution trace is more useful than breadth-first
   context. The wrapper otherwise limits queries to 1,600 tokens.
4. Use graph results to select likely files, symbols, dependencies, and paths.
   Open those source files before editing. Current source always wins.
5. Never invent a relationship that the graph or source does not support.
   Preserve Graphify's `EXTRACTED`, `INFERRED`, confidence, and audit fields.

For a clearly isolated edit, skip the graph.

## Direct commands

```bash
npm run graph:query -- "Which systems update HUD cooldowns and charges?"
npm run graph:query -- "How do WaveManager and EnemySpawner cooperate?" --dfs
npm run graph:path -- "InputSystem" "PieSystem"
npm run graph:explain -- "StatusController"
npm run graph:status
```

Other useful BeatEmPie questions:

- Which code applies and displays status effects?
- Which files must change when adding a new pie?
- How does damage become score and combo progress?

Queries provide bounded orientation, not authoritative code.

## Maintain the local graph

Install the verified development-only distribution (the distribution is
`graphifyy`; the executable and Python module are `graphify`):

```bash
uv tool install "graphifyy==0.9.30"
```

Use `pipx install "graphifyy==0.9.30"` or an isolated virtual environment only
when `uv` is unavailable.

```bash
npm run graph:build    # full extract --force, then cluster/report/HTML
npm run graph:update   # manifest-gated AST + documentation update
npm run graph:cluster  # cluster-only/report/HTML refresh
npm run graph:check    # native check-update plus repository freshness check
npm run graph:watch    # explicitly opt in to watch mode
```

The build uses deterministic AST extraction for code. If a logged-in Claude CLI
is available, it semantically extracts the allowed documentation; otherwise it
falls back safely to `--code-only`. Set `GRAPHIFY_CODE_ONLY=1` to force that
fallback. Do not semantically process artwork, audio, video, or arbitrary assets.

After material structural code changes, run the incremental update when
practical. After a major refactor, scope change, or meaningful documentation
relationship change, run a full build. Do not build on every session or edit.

All generated files belong under `graphify-out/` and must remain uncommitted.
Graphify is optional local development tooling, never a game runtime dependency.
