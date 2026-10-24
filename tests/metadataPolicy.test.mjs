import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

test('VideoGame JSON-LD agrees with page metadata and published game facts', () => {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(blocks.length, 1);
  const game = JSON.parse(blocks[0][1]);
  assert.equal(game['@context'], 'https://schema.org');
  assert.equal(game['@type'], 'VideoGame');
  assert.equal(game.name, 'BeatEmPie');
  assert.equal(game.description, html.match(/name="description"\s+content="([^"]+)"/)[1]);
  assert.equal(game.url, html.match(/rel="canonical" href="([^"]+)"/)[1]);
  assert.equal(game.image, html.match(/property="og:image" content="([^"]+)"/)[1]);
  assert.deepEqual(game.author, {
    '@type': 'Person', name: 'Dotan Veretzky', url: 'https://dotanv.vercel.app',
  });
  assert.equal(game.gamePlatform, 'Web browser');
  assert.deepEqual(game.genre, ['Arcade', "Beat 'em up"]);
  assert.deepEqual(game.offers, { '@type': 'Offer', price: 0 });
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  assert.equal(game.sameAs, 'https://dotanv.itch.io/beatempie');
  assert.ok(readme.includes(game.sameAs));
});

test('hosting policy denies unused powerful APIs without restricting game features', () => {
  const headers = config.headers.find(rule => rule.source === '/(.*)').headers;
  const policy = headers.find(header => header.key === 'Permissions-Policy').value;
  const directives = Object.fromEntries(policy.split(',').map(directive =>
    directive.trim().split('='),
  ));
  for (const feature of ['camera', 'microphone', 'geolocation', 'payment', 'usb', 'serial', 'hid', 'midi', 'display-capture', 'xr-spatial-tracking']) {
    assert.equal(directives[feature], '()', feature);
  }
  for (const feature of ['fullscreen', 'gamepad', 'autoplay']) {
    assert.ok(!(feature in directives), feature);
  }
  for (const header of headers) {
    assert.ok(!['X-Frame-Options', 'Cross-Origin-Opener-Policy', 'Cross-Origin-Embedder-Policy', 'Cross-Origin-Resource-Policy'].includes(header.key));
  }
  assert.ok(!html.includes('http-equiv="Permissions-Policy"'));
});
