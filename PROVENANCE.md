# Provenance (internal engineering record)

## Origin and evidence

- This repository's first scaffold is `4653f639600e61f8c7b13de4eb6125c90367c654`
  (2026-06-13), titled "Initial commit: BeatEmPie — Phaser 3 + TypeScript + Vite arcade game".
  The framework has subsequently evolved; this is historical attribution, not the current version.
- Count-Dawn was seeded from BeatEmPie-Phaser on 2026-07-24, per the phase-0
  research supplied by Dotan. Count-Dawn's first commit is
  `6d995a6d7801ab7376e6facc1b16acab06393b1a`, "feat: scaffold playable Count Dawn prototype".
  Its history starts independently and does not identify the exact source revision.
  The latest BeatEmPie commit before that timestamp is
  `b0a88977f6610ff628ad19a0868e00e151c86799`; it is a historical comparison point,
  **not a verified copy-source SHA**. The games have since diverged substantially.
- Audit baseline: `staging` at `c4a1970fbd0b1a5802f3fe83b6d29d0d31ca4cac`.
  Evidence can be reproduced with `git log --reverse` and `git show <sha>` in each repo.

## Shared/copied configuration inventory

These are related copies or independently adapted variants, not a single canonical policy.
Exact original copy commits are unknown unless identified below.

| Local file | Sibling equivalents | Intentional differences / drift to review |
| --- | --- | --- |
| `vercel.json` | Count-Dawn and Orbital-Breach: `vercel.json` | CSP enforcement vs report-only, allowed origins, cache matchers and per-repo deployment commands differ. Never replace the whole file to synchronize headers. |
| `eslint.config.js` | Count-Dawn: `eslint.config.js` | Shared flat-config structure; ignores, Node tooling globals and rule severities differ. Orbital has no equivalent ESLint config. |
| `public/analytics.js` | Count-Dawn: `public/analytics.js`; Orbital-Breach: `client/public/analytics.js` | Same GA bootstrap pattern; hostname and measurement ID are per-game parameters. |

GA bootstrap first appears here in `6b5e1df1ac1a8f8e1e449206480e5832261d03c3`
(2026-10-22), in Count-Dawn in `e7dd6ee0dbddcfab8c338e6f54892a746a7b9a01`,
and in Orbital-Breach in `9fd17710b822d11e5155c9ff3db4c6ec03da0353` that day.
These commits establish introduction dates, not the direction of copying.
The `@vercel/analytics` / `@vercel/speed-insights` package setup and game-specific
instrumentation are related concepts; they are not part of this file comparison.

## Comparison and synchronization rule

```sh
node tools/drift-check.mjs ../Count-Dawn
node tools/drift-check.mjs https://github.com/DotanVG/Count-Dawn
node tools/drift-check.mjs https://raw.githubusercontent.com/DotanVG/Count-Dawn/<commit>/ --strict
```

The argument is a sibling checkout or a repository-root HTTP(S) URL. GitHub repo
URLs resolve to `staging`; raw URLs can pin a commit. For another root URL use
`--repo Count-Dawn` (or another listed sibling name). Renamed local checkouts are
identified from `package.json`. Only the three inventory categories are read.
CRLF is normalized to LF; other whitespace and per-game parameters remain visible.
Output contains SHA256 values and a bounded positional line preview, not a patch.
Missing/unreadable files and usage/network errors are reported. Exit is always 0
unless `--strict` is present; strict exits 1 for differences or errors. An absent
Orbital ESLint equivalent is an explicit skip. This is never a build/deploy gate.

Run the comparison before changing a shared variant. Review each difference;
do not mechanically copy CSP, origins, analytics IDs, game code or deploy settings.
Record the source repo/path/full SHA, date, reason and intentional differences in
this file and the PR body for any approved synchronization. Use separate PRs to
each affected repo's current `staging`, with its own checks and relevant runtime QA.
Prefer an existing shared package; propose extraction only for two real consumers.
There is no shared package or automatic synchronization introduced by phase 0.

`tools/drift-check.mjs` itself is an explicitly authorized phase-0 bootstrap copy
introduced together in BeatEmPie-Phaser, Count-Dawn and Orbital-Breach on 2026-10-30.
The corresponding `shraga/reuse-phase0` PRs record its initial commit SHAs; no
pre-existing source commit exists. Keep these three tool copies equivalent via
reviewed sibling PRs and check their hashes when updating them.
