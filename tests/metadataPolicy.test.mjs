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
  assert.deepEqual(game['@type'], ['VideoGame', 'WebApplication']);
  assert.equal(game.name, 'BeatEmPie');
  assert.equal(game.description, html.match(/name="description"\s+content="([^"]+)"/)[1]);
  assert.equal(game.url, html.match(/rel="canonical" href="([^"]+)"/)[1]);
  assert.equal(game.image, html.match(/property="og:image" content="([^"]+)"/)[1]);
  assert.deepEqual(game.author, {
    '@type': 'Person', name: 'Dotan Veretzky', url: 'https://dotanv.vercel.app',
  });
  assert.equal(game.gamePlatform, 'Web browser');
  assert.equal(game.applicationCategory, 'GameApplication');
  assert.equal(game.operatingSystem, 'Any');
  assert.equal(game.browserRequirements, 'Requires JavaScript and HTML5 canvas');
  assert.ok(!('aggregateRating' in game) && !('review' in game) && !('rating' in game));
  for (const url of [game.url, game.image, game.author.url, game.sameAs, game.offers.availability]) {
    assert.equal(new URL(url).protocol, 'https:');
  }
  assert.deepEqual(game.genre, ['Arcade', "Beat 'em up"]);
  assert.deepEqual(game.offers, {
    '@type': 'Offer', price: 0, priceCurrency: 'USD', availability: 'https://schema.org/InStock',
  });
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  assert.equal(game.sameAs, 'https://dotanv.itch.io/beatempie');
  assert.ok(readme.includes(game.sameAs));
});

test('CSP preserves existing iframe ancestors and allows itch web and desktop embeds', () => {
  const headers = config.headers.flatMap(rule => rule.headers);
  assert.ok(headers.some(header => header.key.toLowerCase() === 'content-security-policy'));
  const policies = headers.filter(header =>
    ['content-security-policy', 'content-security-policy-report-only'].includes(header.key.toLowerCase()),
  );
  for (const policy of policies) {
    const ancestors = policy.value.split(';').map(directive => directive.trim().split(/\s+/))
      .find(([name]) => name === 'frame-ancestors');
    if (policy.key.toLowerCase() === 'content-security-policy-report-only' && !ancestors) continue;
    assert.ok(ancestors, policy.key);
    for (const source of [
      "'self'", 'https://*.itch.io', 'https://itch.io', 'https://html-classic.itch.zone',
      'https://html.itch.zone', 'https://*.itch.zone', 'https://*.hwcdn.net', 'itch-cave:',
    ]) {
      assert.ok(ancestors.includes(source), `${policy.key}: ${source}`);
    }
  }
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
