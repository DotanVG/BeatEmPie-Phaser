import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { relative, join } from 'node:path';
import { URL, fileURLToPath } from 'node:url';

test('immutable caching matches Vite hashes and excludes unversioned public files', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const rules = config.headers.filter((rule) =>
    rule.headers.some((header) => header.key.toLowerCase() === 'cache-control'),
  );
  assert.equal(rules.length, 1);
  assert.equal(rules[0].headers[0].value, 'public, max-age=31536000, immutable');
  const source = new RegExp(`^${rules[0].source}$`);

  for (const file of ['/assets/index-Ab1_cd-2.js', '/assets/index-aB123456.css']) {
    assert.ok(source.test(file), file);
  }
  for (const file of ['/', '/index.html', '/assets/index.js', '/assets/index-short.js', '/other/index-aB123456.js']) {
    assert.ok(!source.test(file), file);
  }
  const publicRoot = fileURLToPath(new URL('../public/', import.meta.url));
  for (const file of readdirSync(publicRoot, { recursive: true, withFileTypes: true })) {
    if (!file.isFile()) continue;
    const url = `/${relative(publicRoot, join(file.parentPath, file.name)).replaceAll('\\', '/')}`;
    assert.ok(!source.test(url), `Unversioned public file must not be immutable: ${url}`);
  }
});
