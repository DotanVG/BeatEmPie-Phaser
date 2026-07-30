#!/usr/bin/env node

'use strict';

const { execFileSync } = require('node:child_process');
const {
  existsSync,
  openSync,
  closeSync,
  fstatSync,
  readSync,
  readFileSync,
  statSync,
} = require('node:fs');
const { join, resolve } = require('node:path');

function git(root, args, timeout = 700) {
  try {
    return execFileSync('git', ['-C', root, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout,
      windowsHide: true,
    }).trim();
  } catch {
    return '';
  }
}

function findRoot() {
  const projectDir = process.env.CLAUDE_PROJECT_DIR;
  if (projectDir) return resolve(projectDir);
  return resolve(__dirname, '..');
}

function graphCommit(graphPath) {
  let descriptor;
  try {
    descriptor = openSync(graphPath, 'r');
    const size = fstatSync(descriptor).size;
    const length = Math.min(size, 128 * 1024);
    const buffer = Buffer.alloc(length);
    readSync(descriptor, buffer, 0, length, Math.max(0, size - length));
    return buffer
      .toString('utf8')
      .match(/"built_at_commit"\s*:\s*"([0-9a-f]{7,64})"/i)?.[1] ?? null;
  } catch {
    return null;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function metadataCommit(metadataPath, graphPath) {
  try {
    const metadataStat = statSync(metadataPath);
    if (metadataStat.size > 256 * 1024) return null;
    if (metadataStat.mtimeMs < statSync(graphPath).mtimeMs) return null;
    const raw = readFileSync(metadataPath, 'utf8');
    return JSON.parse(raw)?.graph?.built_at_commit ?? null;
  } catch {
    return null;
  }
}

function relevantGraphSource(path) {
  const normalized = path.replaceAll('\\', '/');
  if (/^(src|tests|docs)\//.test(normalized)) return true;
  return /^(README|CLAUDE|AGENTS|WORKFLOW)\.md$/.test(normalized)
    || /^package\.json$/.test(normalized)
    || /^index\.html$/.test(normalized)
    || /^vercel\.json$/.test(normalized)
    || /^eslint\.config\.[cm]?js$/.test(normalized)
    || /^vite\.config\.[cm]?[jt]s$/.test(normalized)
    || /^tsconfig(?:\.[^/]+)?\.json$/.test(normalized)
    || /^\.graphifyignore$/.test(normalized);
}

function hasSourceChanges(root) {
  const status = git(root, ['status', '--porcelain=v1', '--untracked-files=normal']);
  return status.split(/\r?\n/).some((line) => {
    if (line.length < 4) return false;
    const path = line.slice(3).split(' -> ').at(-1).replace(/^"|"$/g, '');
    return relevantGraphSource(path);
  });
}

function main() {
  try {
    const root = findRoot();
    const output = join(root, 'graphify-out');
    const graph = join(output, 'graph.json');
    if (!existsSync(graph)) return;

    const builtCommit = metadataCommit(
      join(output, 'project-metadata.json'),
      graph,
    )
      || graphCommit(graph);
    const head = git(root, ['rev-parse', 'HEAD']);
    const needsUpdate = existsSync(join(output, 'needs_update'))
      || existsSync(join(output, '.needs_update'));
    const stale = needsUpdate
      || !builtCommit
      || !head
      || builtCommit !== head
      || hasSourceChanges(root);
    const freshness = stale
      ? ' It may be stale; run `npm run graph:status` and never prefer it over current source.'
      : '';

    process.stdout.write(
      'A local Graphify knowledge graph is available. For unfamiliar, architectural, '
        + 'debugging, cross-cutting, or likely multi-file work, query it first with '
        + '`npm run graph:query -- "<question>"`, then open and verify the source files.'
        + freshness
        + '\n',
    );
  } catch {
    // Optional development context must never interrupt a session.
  }
}

main();
