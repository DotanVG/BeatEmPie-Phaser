import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { URL } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const html = read('index.html');

test('page boots Phaser automatically into its existing loader and menu without an entry gate', () => {
  assert.match(html, /<script type="module" src="\/src\/game\/main.ts"><\/script>/);
  assert.doesNotMatch(html, /id="(?:landing|start-game|landing-status)"|game-active/);
  assert.match(html, /id="boot-loader">Heating the ovens/);
  const calls = [];
  const config = {};
  const game = { scale: { updateBounds() {}, refresh() {} } };
  const source = ts.transpileModule(read('src/game/main.ts'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 },
  }).outputText.replace(/^import .*;\r?\n/gm, '').replace('import.meta.env.DEV', 'false');
  let boot;
  vm.runInNewContext(source, {
    location: { hostname: 'localhost' }, gameConfig: config,
    setTimeout(callback) { boot = callback; },
    Phaser: { Game: class { constructor(value) { assert.equal(value, config); calls.push('game'); return game; } } },
    installOrientationGate(value) { assert.equal(value, game); calls.push('orientation'); },
    installFullscreenButton(value) { assert.equal(value, game); calls.push('fullscreen'); },
  });
  assert.equal(typeof boot, 'function');
  boot();
  assert.deepEqual(calls, ['game', 'orientation', 'fullscreen']);
  assert.match(read('src/scenes/PreloadScene.ts'), /this\.scene\.start\('MainMenuScene'\)/);
  assert.doesNotMatch(read('src/scenes/MainMenuScene.ts'), /connectLanding|enterGameplay/);
});

test('semantic game information is static, clipped, and cannot take pointer or keyboard input', () => {
  const info = html.match(/<section id="game-info" class="visually-hidden"[^>]*>([\s\S]*?)<\/section>/)[1];
  assert.match(info, /<h1[^>]*>BeatEmPie/);
  assert.match(info, /Desktop controls/);
  assert.match(info, /Touch controls/);
  assert.match(info, /https:\/\/dotanv\.itch\.io\/beatempie/);
  for (const link of info.matchAll(/<a\b[^>]*>/g)) assert.match(link[0], /tabindex="-1"/);
  assert.doesNotMatch(info, /<(?:button|input|select|textarea)|contenteditable/);
  const css = html.match(/\.visually-hidden\s*\{([^}]+)\}/)[1];
  for (const rule of ['position: absolute', 'width: 1px', 'height: 1px', 'overflow: hidden',
    'clip: rect(0, 0, 0, 0)', 'clip-path: inset(50%)', 'pointer-events: none']) assert.ok(css.includes(rule), rule);
  assert.doesNotMatch(css, /display:\s*none|visibility:\s*hidden/);
  assert.doesNotMatch(html + read('src/game/main.ts'), /navigator\.userAgent|Googlebot|bingbot/i);
  assert.match(html, /<noscript>[\s\S]*?JavaScript[\s\S]*?WASD[\s\S]*?href="https:\/\/dotanv\.itch\.io\/beatempie"[\s\S]*?<\/noscript>/);
});

test('itch wrapper loads the allowed game URL immediately without a launcher or fullscreen gate', () => {
  const itch = read('itch/index.html');
  assert.match(itch, /<iframe[^>]*src="https:\/\/beat-em-pie\.vercel\.app\/\?embed=1"[^>]*allow="fullscreen; autoplay"[^>]*allowfullscreen/);
  assert.doesNotMatch(itch, /<button|id="welcome"|addEventListener|requestFullscreen|<script/);
  assert.equal(existsSync(new URL('../src/game/landing.ts', import.meta.url)), false);
  assert.equal(existsSync(new URL('../src/game/entry.ts', import.meta.url)), false);
});
