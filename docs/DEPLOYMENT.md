# Deployment

`npm run build` outputs a fully static site to `dist/`. Because Vite `base` is `./`
(relative paths), the same build works from a domain root **or** any subpath — including
itch.io’s randomised paths. No server or backend is required.

```bash
npm run build     # → dist/
npm run preview   # locally preview the production build
```

## Vercel

1. Push the repo to GitHub.
2. In Vercel, **New Project → Import** the repo.
3. Framework preset: **Vite** (or "Other").
4. Build command: `npm run build` · Output directory: `dist`.
5. Deploy. Vercel auto-builds on every push.

(Or `npm i -g vercel && vercel` from the project root, accepting the Vite defaults.)

## Netlify

- **Dashboard:** New site from Git → pick the repo → Build command `npm run build`,
  Publish directory `dist`. Deploy.
- **CLI:** `npm i -g netlify-cli && netlify deploy --prod --dir=dist` (after a build).
- A `netlify.toml` is optional; the build/publish settings above are enough.

## GitHub Pages

1. `npm run build`.
2. Publish `dist/` to Pages — easiest via an action (e.g. `actions/upload-pages-artifact`
   pointing at `dist`, then `actions/deploy-pages`), or push `dist/` to a `gh-pages` branch.
3. Relative `base: './'` means it works under `https://<user>.github.io/<repo>/` with no
   extra config.

> If you prefer absolute paths for a known Pages subpath, set `base: '/<repo>/'` in
> `vite.config.ts`. Relative base avoids needing to.

## itch.io

1. `npm run build`.
2. Zip the **contents** of `dist/` (so `index.html` is at the zip root, not inside a folder).
3. On itch.io: create a project → **Kind: HTML** → upload the zip → tick
   **"This file will be played in the browser"**.
4. Set a viewport (e.g. 1280×720) and enable fullscreen. The game scales responsively
   (Phaser `Scale.FIT`), so it fits whatever frame you choose.

## Notes

- Music files are large `.wav` tracks (~33 MB total) served as static assets. For faster
  loads you may later transcode them to `.ogg`/`.mp3` and update the paths in
  `src/utils/assetKeys.ts`.
- `main` must always be deployable; deploy from `main` (promoted from `staging` after
  validation) — see [BRANCH_STRATEGY.md](BRANCH_STRATEGY.md).
