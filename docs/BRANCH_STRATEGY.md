# Branch Strategy

## Branches

- **`main`** — stable production branch. Always deployable. Never receives direct commits
  or feature PRs.
- **`staging`** — the active integration branch. All feature work merges here first.
  `staging` must always build.
- **feature branches** — short-lived, branched from the latest `origin/staging`, named
  e.g. `feature/<ticket>-<slug>`. They open PRs **into `staging`**.

`main` and `staging` are kept intentionally aligned: `main` is promoted from `staging`,
fast-forward whenever possible.

## PR flow

1. Sync first — always start from the latest `staging`:
   ```bash
   git fetch origin
   git checkout staging
   git merge --ff-only origin/staging
   ```
2. Branch off `staging`:
   ```bash
   git checkout -b feature/<ticket>-<slug>
   ```
3. Implement, committing as you go.
4. Validate (see below) — fix all build/type/lint errors.
5. Push and open a PR **targeting `staging`** with summary, implementation details,
   validation commands run, visuals if relevant, and `Closes #<N>` when there’s a matching issue.
6. Review and merge into `staging`.

## Validation flow

Before opening a PR (and before promotion), all of these must pass:

```bash
npm install
npm run typecheck
npm run build
npm run lint
```

Plus the manual smoke checklist in [TESTING.md](TESTING.md) where relevant.

## Promoting staging → main

Only after `staging` is validated:

```bash
git fetch origin
git checkout main
git merge --ff-only origin/staging   # preferred: fast-forward promotion
git push origin main
```

If `main` **cannot** fast-forward to `staging`, **stop** and document the blocker — do not
force or create divergent history. Reconcile by getting the missing `main` commits onto
`staging` first, then retry the fast-forward.

## Recovering from branch drift

- If `staging` drifted from `main`: bring `main`’s unique commits into `staging`
  (`git merge origin/main` on a sync branch), validate, then resume fast-forward promotion.
- If a stray commit landed on `main`: cherry-pick it onto `staging`, validate, then realign
  `main` to `staging`.
- Never let `dev` and `staging` both act as active integration branches. In **this** repo,
  `staging` is the single active integration branch. (`dev` exists only in the separate
  source-reference project and is not used here.)

## Why direct `main` commits are forbidden

`main` is the deploy source and must always build and play. Funnelling everything through
`staging` + PRs guarantees every change is integrated and validated before it can reach
production, and keeps the `main`↔`staging` fast-forward relationship intact.
