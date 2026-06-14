---
tracker:
  kind: linear
  project_slug: beatempie-5d28da9f14f8
  active_states:
    - Todo
    - "In Progress"
  terminal_states:
    - Done
    - Cancelled
polling:
  interval_ms: 30000
workspace:
  root: ~/code/beatempie-phaser-workspaces
hooks:
  after_create: |
    git clone --depth 1 --branch staging https://github.com/DotanVG/BeatEmPie-Phaser.git .
    npm install
  before_run: |
    git fetch origin
    git merge --ff-only origin/staging
agent:
  max_concurrent_agents: 3
  max_turns: 20
codex:
  command: codex app-server
  approval_policy: never
  thread_sandbox: danger-full-access
---

# BeatEmPie-Phaser — Orchestration Workflow

## Execution contract

- You are working on Linear ticket `{{ issue.identifier }}` for the BeatEmPie-Phaser project.
- This is an **unattended orchestration session**.
- **Never ask a human to perform follow-up actions.**
- Stop early **only** for true blockers:
  - missing auth
  - missing permissions
  - missing required secrets
  - destructive ambiguity
  - unavailable required repository
- Work only inside the provided repository copy.
- Always **sync with `origin/staging`** before active work.
- Always create or update a persistent **`## Codex Workpad`** comment on the ticket.
- Move **Todo → In Progress** before active work.
- Move **In Progress → In Review** after a PR is opened and validation passes.
- **Done** and **Cancelled** are terminal states — do nothing.
- If rework is needed:
  - re-read the full issue,
  - re-read PR comments,
  - create a fresh branch from `origin/staging`,
  - execute end-to-end again.

## Status map

| State | Meaning / action |
|-------|------------------|
| **Todo** | Move to **In Progress** immediately before active work. |
| **In Progress** | Implementation actively underway. |
| **In Review** | PR attached and validated; waiting on human approval. |
| **Done** | Terminal — do nothing. |
| **Cancelled** | Terminal — do nothing. |

## Kickoff

1. Fetch the issue by ticket ID.
2. Read the current state.
3. Route based on state (skip terminal states).
4. Find or create a persistent workpad comment named **`## Codex Workpad`**.
5. Reconcile the workpad against current reality.
6. Sync with `origin/staging` (`git fetch origin && git merge --ff-only origin/staging`).
7. Reproduce or inspect current behavior **before** changing code.
8. Write a hierarchical plan with acceptance criteria and validation steps into the workpad.

## Execution

1. Implement against the workpad TODOs.
2. Run the required validation.
3. Fix all build / type / test errors.
4. Push the branch.
5. Open a PR **into `staging`**.
6. The PR body must include:
   - summary
   - implementation details
   - validation commands run
   - screenshots or visual notes if relevant
   - linked issue
   - `Closes #<N>` when there is a matching GitHub issue number
7. Attach the PR URL to the issue.
8. Move the issue to **In Review**.

## Validation commands

```bash
npm install
npm run dev          # sanity boot
npm run build        # type-check + production build
npm run preview
npm run typecheck    # if configured (it is)
npm run lint         # if configured (it is)
npm test             # if configured
```

## Branching rules (summary)

- Branch from `staging`; PRs target `staging`; never commit to or PR into `main`.
- Promote `staging → main` (fast-forward preferred) only after validation.
- See [docs/BRANCH_STRATEGY.md](docs/BRANCH_STRATEGY.md) for full details.
