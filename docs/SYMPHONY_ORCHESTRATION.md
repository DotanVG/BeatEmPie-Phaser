# Symphony Orchestration

How the AI-assisted, unattended orchestration workflow drives work on BeatEmPie-Phaser.
The execution contract lives in [`WORKFLOW.md`](../WORKFLOW.md); this document explains the
moving parts.

## How Symphony picks up Linear tickets

Symphony polls the Linear project `beatempie-phaser` (interval ~30s). Tickets in an
**active** state (`Todo`, `In Progress`) are eligible; `Done` / `Cancelled` are terminal and
ignored. When an eligible ticket is found, an orchestration session is started for it.

## How workspaces are created

For each ticket, a fresh workspace is created under `~/code/beatempie-phaser-workspaces`.
The `after_create` hook clones the repo at `--branch staging` (shallow) and runs
`npm install`. The `.worktreeinclude` file ensures `CLAUDE.md`, `WORKFLOW.md` and `.claude/`
are present in every workspace so guardrails and project memory travel with the code.

## How agents sync from origin/staging

Before any active work, the `before_run` hook runs:

```bash
git fetch origin
git merge --ff-only origin/staging
```

All feature branches are then created from the up-to-date `staging`. This keeps every agent
starting from the same integration point and prevents drift.

## How the Codex / Claude workpad is used

Each ticket has a persistent comment named **`## Codex Workpad`**. The agent finds or creates
it, reconciles it against the current state, and maintains a hierarchical plan there:
acceptance criteria, TODOs, validation steps and progress notes. The workpad is the single
source of truth for what’s done and what’s left, surviving across turns and reworks.

## How validation works

The agent runs the project’s validation commands and must fix all failures before handoff:

```bash
npm install
npm run dev        # sanity boot
npm run build      # type-check + production build
npm run preview
npm run typecheck
npm run lint
```

The `.claude/hooks/validate-before-handoff.sh` hook bundles these.

## How PRs are opened

After validation passes, the agent pushes its feature branch and opens a PR **into `staging`**
with: a summary, implementation details, the validation commands run, screenshots/visual notes
if relevant, the linked issue, and `Closes #<N>` when a matching GitHub issue exists. The PR
URL is attached back to the Linear ticket.

## How tickets move to In Review

State transitions:

- `Todo` → **`In Progress`** immediately before active work begins.
- `In Progress` → **`In Review`** once the PR is open **and** validation passed.
- `In Review` waits on human approval.
- `Done` / `Cancelled` are terminal — the agent does nothing.

## How staging is promoted to main

Promotion is human-gated and validation-gated. Once `staging` is approved and green, `main`
is fast-forwarded to `staging` and pushed (see [BRANCH_STRATEGY.md](BRANCH_STRATEGY.md)).
Fast-forward is preferred; if `main` can’t fast-forward, the agent stops and documents the blocker.

## What to do when blocked

Stop early **only** for true blockers and document them on the ticket / workpad:

- missing auth, permissions or required secrets,
- destructive ambiguity,
- an unavailable required repository.

Otherwise the session is unattended: never ask a human to perform follow-up actions — keep
working the plan. For rework, re-read the full issue and PR comments, branch fresh from
`origin/staging`, and execute end-to-end again.
