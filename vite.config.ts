import { defineConfig } from 'vite';

// Relative base so the static build works on Vercel, Netlify, GitHub Pages
// (project subpaths) and itch.io (zip upload served from a random subpath).
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 2000,
    assetsInlineLimit: 0,
  },
  server: {
    host: true,
    port: 5173,
  },
});
