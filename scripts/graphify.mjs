#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SUPPORTED_VERSION = '0.9.30';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = join(root, 'graphify-out');
const graphPath = join(outputDir, 'graph.json');
const manifestPath = join(outputDir, 'manifest.json');
const analysisPath = join(outputDir, '.graphify_analysis.json');
const metadataPath = join(outputDir, 'project-metadata.json');
const needsUpdatePaths = [
  join(outputDir, 'needs_update'),
  join(outputDir, '.needs_update'),
];
const command = process.argv[2] ?? 'help';
const commandArgs = process.argv.slice(3);

process.chdir(root);

function capture(executable, args, options = {}) {
  return spawnSync(executable, args, {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 20 * 1024 * 1024,
    timeout: options.timeout ?? 5000,
    windowsHide: true,
  });
}

function findExecutable(name) {
  const lookup = process.platform === 'win32'
    ? capture('where.exe', [name], { timeout: 1500 })
    : capture('which', [name], { timeout: 1500 });
  if (lookup.status !== 0) return null;
  return lookup.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) ?? null;
}

function pythonInEnvironment(environmentDir) {
  if (!environmentDir) return null;
  const candidates = process.platform === 'win32'
    ? [join(environmentDir, 'Scripts', 'python.exe')]
    : [join(environmentDir, 'bin', 'python3'), join(environmentDir, 'bin', 'python')];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function uvToolPython() {
  if (!findExecutable('uv')) return null;
  const result = capture('uv', ['tool', 'dir'], { timeout: 2000 });
  if (result.status !== 0) return null;
  return pythonInEnvironment(join(result.stdout.trim(), 'graphifyy'));
}

function pipxToolPython() {
  if (!findExecutable('pipx')) return null;
  const result = capture(
    'pipx',
    ['environment', '--value', 'PIPX_LOCAL_VENVS'],
    { timeout: 2000 },
  );
  if (result.status !== 0) return null;
  return pythonInEnvironment(join(result.stdout.trim(), 'graphifyy'));
}

function installedCandidates() {
  const candidates = [];
  const seen = new Set();
  const add = (candidate) => {
    const key = `${candidate.executable}\0${candidate.prefix.join('\0')}`;
    if (!seen.has(key)) {
      candidates.push(candidate);
      seen.add(key);
    }
  };

  const activePython = pythonInEnvironment(
    process.env.VIRTUAL_ENV || process.env.CONDA_PREFIX,
  );
  if (activePython) {
    add({
      executable: activePython,
      prefix: ['-m', 'graphify'],
      mechanism: 'active virtual environment',
      interpreter: activePython,
    });
  }

  const uvPython = uvToolPython();
  if (uvPython) {
    add({
      executable: uvPython,
      prefix: ['-m', 'graphify'],
      mechanism: 'uv tool',
      interpreter: uvPython,
    });
  }

  const pipxPython = pipxToolPython();
  if (pipxPython) {
    add({
      executable: pipxPython,
      prefix: ['-m', 'graphify'],
      mechanism: 'pipx',
      interpreter: pipxPython,
    });
  }

  for (const python of ['python', 'python3']) {
    const executable = findExecutable(python);
    if (executable) {
      add({
        executable,
        prefix: ['-m', 'graphify'],
        mechanism: 'pip-installed Python module',
        interpreter: executable,
      });
    }
  }

  const pyLauncher = findExecutable('py');
  if (pyLauncher) {
    add({
      executable: pyLauncher,
      prefix: ['-3', '-m', 'graphify'],
      mechanism: 'Python launcher module',
      interpreter: null,
    });
  }

  const direct = findExecutable('graphify');
  if (direct) {
    add({
      executable: direct,
      prefix: [],
      mechanism: 'PATH executable',
      interpreter: null,
    });
  }

  return candidates;
}

function ephemeralCandidates() {
  const candidates = [];
  const uv = findExecutable('uv');
  if (uv) {
    candidates.push({
      executable: uv,
      prefix: [
        'tool',
        'run',
        '--from',
        `graphifyy==${SUPPORTED_VERSION}`,
        'graphify',
      ],
      mechanism: 'uv tool run',
      interpreter: null,
    });
  }
  const uvx = findExecutable('uvx');
  if (uvx) {
    candidates.push({
      executable: uvx,
      prefix: ['--from', `graphifyy==${SUPPORTED_VERSION}`, 'graphify'],
      mechanism: 'uvx',
      interpreter: null,
    });
  }
  const pipx = findExecutable('pipx');
  if (pipx) {
    candidates.push({
      executable: pipx,
      prefix: ['run', '--spec', `graphifyy==${SUPPORTED_VERSION}`, 'graphify'],
      mechanism: 'pipx run',
      interpreter: null,
    });
  }
  return candidates;
}

function probeCandidate(candidate, timeout = 5000) {
  const result = capture(
    candidate.executable,
    [...candidate.prefix, '--version'],
    { timeout },
  );
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const match = output.match(/\bgraphify\s+(\d+\.\d+\.\d+(?:[-+.\w]*)?)/i);
  if (result.status !== 0 || !match) return null;
  return { ...candidate, version: match[1] };
}

function resolveGraphify(allowEphemeral = false) {
  for (const candidate of installedCandidates()) {
    const resolvedCandidate = probeCandidate(candidate);
    if (resolvedCandidate) return resolvedCandidate;
  }
  if (allowEphemeral) {
    for (const candidate of ephemeralCandidates()) {
      const resolvedCandidate = probeCandidate(candidate, 120000);
      if (resolvedCandidate) return resolvedCandidate;
    }
  }
  return null;
}

function graphifyInstallation(candidate) {
  if (!candidate) {
    return {
      version: null,
      mechanism: 'not found',
      executable: null,
      python_interpreter: null,
      python_version: null,
    };
  }

  let interpreter = candidate.interpreter;
  if (!interpreter && candidate.mechanism === 'Python launcher module') {
    const result = capture(candidate.executable, ['-3', '-c', 'import sys; print(sys.executable)']);
    if (result.status === 0) interpreter = result.stdout.trim();
  }
  let pythonVersion = null;
  if (interpreter) {
    const result = capture(interpreter, ['--version']);
    if (result.status === 0) {
      pythonVersion = `${result.stdout}${result.stderr}`.trim();
    }
  }

  return {
    version: candidate.version,
    mechanism: candidate.mechanism,
    executable: candidate.executable,
    python_interpreter: interpreter,
    python_version: pythonVersion,
  };
}

function warnVersion(candidate) {
  if (candidate.version !== SUPPORTED_VERSION) {
    const allowed = /^(1|true|yes)$/i.test(
      process.env.GRAPHIFY_ALLOW_UNVERIFIED_VERSION ?? '',
    );
    if (!allowed) {
      console.error(
        `Graphify ${candidate.version} is installed, but this workflow is verified `
          + `with ${SUPPORTED_VERSION}. Install the pinned tool with `
          + `uv tool install --reinstall "graphifyy==${SUPPORTED_VERSION}", or set `
          + `GRAPHIFY_ALLOW_UNVERIFIED_VERSION=1 only for an intentional compatibility test.`,
      );
      process.exit(1);
    }
    console.warn(
      `Warning: intentionally using unverified Graphify ${candidate.version}; `
        + `expected ${SUPPORTED_VERSION}.`,
    );
  }
}

function requireGraphify() {
  const candidate = resolveGraphify(true);
  if (!candidate) {
    console.error(
      `Graphify is unavailable. Install the development tool with:\n`
        + `  uv tool install "graphifyy==${SUPPORTED_VERSION}"`,
    );
    process.exit(1);
  }
  warnVersion(candidate);
  return candidate;
}

function runGraphify(candidate, args) {
  const result = spawnSync(
    candidate.executable,
    [...candidate.prefix, ...args],
    {
      cwd: root,
      env: {
        ...process.env,
        GRAPHIFY_OUT: 'graphify-out',
        GRAPHIFY_NO_TIPS: '1',
      },
      stdio: 'inherit',
      windowsHide: true,
    },
  );
  if (result.error) {
    console.error(`Unable to run Graphify: ${result.error.message}`);
    return 1;
  }
  return result.status ?? 1;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function git(args) {
  const result = capture('git', args, { timeout: 5000 });
  return result.status === 0 ? result.stdout : '';
}

function normalizeRepositoryPath(path) {
  if (typeof path !== 'string' || !path) return null;
  let normalized = path;
  if (isAbsolute(path)) {
    const relativePath = relative(root, path);
    if (relativePath.startsWith(`..${sep}`) || relativePath === '..') return null;
    normalized = relativePath;
  }
  return normalized.replaceAll('\\', '/').replace(/^\.\//, '');
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

function workingTreeChanges() {
  const paths = new Set();
  for (const args of [
    ['diff', '--name-only', '--relative', 'HEAD'],
    ['diff', '--cached', '--name-only', '--relative', 'HEAD'],
    ['ls-files', '--others', '--exclude-standard'],
  ]) {
    for (const line of git(args).split(/\r?\n/)) {
      const path = line.trim();
      if (path) paths.add(path.replaceAll('\\', '/'));
    }
  }
  return [...paths].sort();
}

function graphStatistics(graph) {
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph?.links)
    ? graph.links
    : Array.isArray(graph?.edges)
      ? graph.edges
      : [];
  const communities = new Set(
    nodes
      .map((node) => node?.community)
      .filter((community) => community !== null && community !== undefined),
  );
  return {
    nodes: nodes.length,
    edges: edges.length,
    communities: communities.size,
  };
}

function includedFiles(graph, manifest) {
  const files = new Set();
  if (manifest && typeof manifest === 'object' && !Array.isArray(manifest)) {
    for (const path of Object.keys(manifest)) {
      const normalized = normalizeRepositoryPath(path);
      if (normalized) files.add(normalized);
    }
  }
  for (const node of Array.isArray(graph?.nodes) ? graph.nodes : []) {
    const sources = Array.isArray(node?.source_files)
      ? node.source_files
      : [node?.source_file];
    for (const source of sources) {
      const normalized = normalizeRepositoryPath(source);
      if (normalized) files.add(normalized);
    }
  }
  return [...files].sort();
}

function tokenUsage(override) {
  if (override) return override;
  const analysis = readJson(analysisPath);
  if (analysis?.tokens && typeof analysis.tokens === 'object') {
    return {
      input: Number(analysis.tokens.input ?? 0),
      output: Number(analysis.tokens.output ?? 0),
      measured: true,
    };
  }
  return { input: 0, output: 0, measured: false };
}

function reportTokenUsage() {
  try {
    const report = readFileSync(join(outputDir, 'GRAPH_REPORT.md'), 'utf8');
    const match = report.match(
      /Token cost:\s*([\d,]+)\s*input\s*[·|]\s*([\d,]+)\s*output/i,
    );
    if (!match) return { input: 0, output: 0, measured: false };
    return {
      input: Number(match[1].replaceAll(',', '')),
      output: Number(match[2].replaceAll(',', '')),
      measured: true,
    };
  } catch {
    return { input: 0, output: 0, measured: false };
  }
}

function combinedTokenUsage(extraction, communityLabeling) {
  const extract = extraction ?? { input: 0, output: 0, measured: false };
  const labels = communityLabeling ?? { input: 0, output: 0, measured: false };
  return {
    extraction: extract,
    community_labeling: labels,
    total: {
      input: extract.input + labels.input,
      output: extract.output + labels.output,
      measured: extract.measured || labels.measured,
    },
  };
}

function graphState() {
  const graph = readJson(graphPath);
  const head = git(['rev-parse', 'HEAD']).trim() || null;
  const changes = workingTreeChanges();
  const sourceChanges = changes.filter(relevantGraphSource);
  const needsUpdate = needsUpdatePaths.some(existsSync);
  const builtAtCommit = graph?.built_at_commit ?? null;
  const reasons = [];

  if (!graph) reasons.push('graph.json is missing or invalid');
  if (graph && !builtAtCommit) reasons.push('the graph does not record a source commit');
  if (graph && builtAtCommit && head && builtAtCommit !== head) {
    reasons.push('the graph commit differs from HEAD');
  }
  if (sourceChanges.length) reasons.push('the working tree has source or documentation changes');
  if (needsUpdate) reasons.push('Graphify marked semantic content for re-extraction');

  return {
    graph,
    head,
    builtAtCommit,
    sourceChanges,
    workingTreeChanges: changes,
    needsUpdate,
    current: Boolean(graph && builtAtCommit && head && builtAtCommit === head)
      && sourceChanges.length === 0
      && !needsUpdate,
    reasons,
  };
}

function recordMetadata({
  candidate,
  durationMs,
  extractionMode,
  backend,
  tokens,
  operation,
  completed = true,
}) {
  if (!existsSync(graphPath)) return;

  const graph = readJson(graphPath);
  if (!graph) return;
  const manifest = readJson(manifestPath);
  const state = graphState();
  const included = includedFiles(graph, manifest);
  const tracked = git(['ls-files', '-z'])
    .split('\0')
    .filter(Boolean)
    .map((path) => path.replaceAll('\\', '/'))
    .sort();
  const includedSet = new Set(included);
  const skipped = tracked.filter((path) => !includedSet.has(path));
  const stats = graphStatistics(graph);
  const cost = readJson(join(outputDir, 'cost.json'));
  const previous = readJson(metadataPath);
  const ignored = capture(
    'git',
    ['check-ignore', '--quiet', 'graphify-out/.ignore-check'],
    { timeout: 2000 },
  ).status === 0;

  const generatedAt = new Date().toISOString();
  const operationRecord = {
    operation,
    generated_at: generatedAt,
    generation_duration_ms: durationMs,
    extraction_mode: extractionMode,
    semantic_backend: backend,
    token_usage: tokenUsage(tokens),
    completed,
    git_commit: state.head,
    working_tree_dirty: state.workingTreeChanges.length > 0,
  };
  const fullBuild = operation === 'build'
    ? operationRecord
    : previous?.full_build ?? null;

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(
    metadataPath,
    `${JSON.stringify({
      schema_version: 1,
      generated_at: generatedAt,
      generation_duration_ms: fullBuild?.generation_duration_ms ?? durationMs,
      extraction_mode: fullBuild?.extraction_mode ?? extractionMode,
      semantic_backend: fullBuild?.semantic_backend ?? backend,
      completed,
      full_build: fullBuild,
      last_operation: operationRecord,
      graphify: graphifyInstallation(candidate),
      graph: {
        output: 'graphify-out/graph.json',
        built_at_commit: state.builtAtCommit,
        head_commit: state.head,
        current: state.current,
        stale_reasons: state.reasons,
        node_count: stats.nodes,
        edge_count: stats.edges,
        community_count: stats.communities,
      },
      files: {
        included_count: included.length,
        included,
        skipped_tracked_count: skipped.length,
        skipped_tracked: skipped,
      },
      working_tree: {
        dirty: state.workingTreeChanges.length > 0,
        uncommitted_source_changes: state.sourceChanges,
      },
      token_usage: fullBuild?.token_usage ?? tokenUsage(tokens),
      cumulative_cost: cost,
      outputs: {
        graph_json: existsSync(graphPath),
        graph_html: existsSync(join(outputDir, 'graph.html')),
        graph_report: existsSync(join(outputDir, 'GRAPH_REPORT.md')),
        manifest: existsSync(manifestPath),
      },
      output_gitignored: ignored,
    }, null, 2)}\n`,
    'utf8',
  );
}

function hasOption(args, name) {
  return args.some((arg) => arg === name || arg.startsWith(`${name}=`));
}

function optionValue(args, name) {
  const equals = args.find((arg) => arg.startsWith(`${name}=`));
  if (equals) return equals.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function rejectUnsafeBuildOptions(args) {
  const forbidden = [
    '--out',
    '--output',
    '--graph',
    '--global',
    '--no-gitignore',
    '--postgres',
    '--allow-partial',
    '--google-workspace',
  ];
  for (const option of forbidden) {
    if (hasOption(args, option)) {
      console.error(
        `${option} is disabled by the repository wrapper so output and scope stay local and safe.`,
      );
      process.exit(2);
    }
  }
}

function claudeCliAvailable() {
  if (process.platform === 'win32' && findExecutable('claude.cmd')) return true;
  return Boolean(findExecutable('claude'));
}

function build() {
  rejectUnsafeBuildOptions(commandArgs);
  const candidate = requireGraphify();
  const startedAt = Date.now();
  const args = ['extract', '.', '--force', ...commandArgs];
  const explicitCodeOnly = hasOption(commandArgs, '--code-only')
    || /^(1|true|yes)$/i.test(process.env.GRAPHIFY_CODE_ONLY ?? '');
  const explicitBackend = optionValue(commandArgs, '--backend')
    || process.env.GRAPHIFY_BACKEND
    || null;
  if (hasOption(commandArgs, '--code-only') && explicitBackend) {
    console.error('Choose either --code-only or --backend, not both.');
    process.exit(2);
  }
  let backend = explicitBackend;
  let extractionMode;

  if (explicitCodeOnly) {
    if (!hasOption(args, '--code-only')) args.push('--code-only');
    backend = null;
    extractionMode = 'deterministic AST (code-only)';
  } else if (backend) {
    if (!hasOption(args, '--backend')) args.push(`--backend=${backend}`);
    extractionMode = `deterministic AST + semantic documents (${backend})`;
  } else if (claudeCliAvailable()) {
    backend = 'claude-cli';
    args.push('--backend=claude-cli');
    extractionMode = 'deterministic AST + semantic documents (claude-cli)';
  } else {
    args.push('--code-only');
    extractionMode = 'deterministic AST (code-only fallback; Claude CLI unavailable)';
  }

  let extractStatus = runGraphify(candidate, args);
  if (extractStatus !== 0 && !explicitBackend && backend === 'claude-cli') {
    console.warn(
      '[graphify wrapper] Claude CLI extraction failed; retrying a deterministic code-only full build.',
    );
    backend = null;
    extractionMode = 'deterministic AST (code-only fallback)';
    extractStatus = runGraphify(candidate, [
      'extract',
      '.',
      '--force',
      '--code-only',
      ...commandArgs,
    ]);
  }
  const extractedTokens = readJson(analysisPath)?.tokens
    ? {
        input: Number(readJson(analysisPath).tokens.input ?? 0),
        output: Number(readJson(analysisPath).tokens.output ?? 0),
        measured: true,
      }
    : null;
  if (extractStatus !== 0) process.exit(extractStatus);

  const clusterArgs = ['cluster-only', '.'];
  if (backend) clusterArgs.push(`--backend=${backend}`);
  else clusterArgs.push('--no-label');
  let clusterStatus = runGraphify(candidate, clusterArgs);
  if (clusterStatus !== 0 && backend) {
    console.warn(
      '[graphify wrapper] Semantic community labeling failed; retrying local clustering without labels.',
    );
    clusterStatus = runGraphify(candidate, ['cluster-only', '.', '--no-label']);
  }
  recordMetadata({
    candidate,
    durationMs: Date.now() - startedAt,
    extractionMode,
    backend,
    tokens: combinedTokenUsage(extractedTokens, reportTokenUsage()),
    operation: 'build',
    completed: clusterStatus === 0,
  });
  process.exit(clusterStatus);
}

function update() {
  rejectUnsafeBuildOptions(commandArgs);
  requireGraphFile();
  if (hasOption(commandArgs, '--force') || hasOption(commandArgs, '--code-only')) {
    console.error(
      'Incremental updates preserve semantic documentation; use a full build '
        + 'for an intentional forced or code-only rebuild.',
    );
    process.exit(2);
  }
  const candidate = requireGraphify();
  const startedAt = Date.now();
  const explicitBackend = optionValue(commandArgs, '--backend')
    || process.env.GRAPHIFY_BACKEND
    || null;
  const autoBackend = !explicitBackend;
  const backend = explicitBackend || (claudeCliAvailable() ? 'claude-cli' : null);
  const args = ['extract', '.', ...commandArgs];
  if (!explicitBackend && backend) args.push('--backend=claude-cli', '--max-concurrency=1');
  const graphMtimeBefore = statSync(graphPath).mtimeMs;

  let status = runGraphify(candidate, args);
  if (status !== 0 && autoBackend) {
    console.warn(
      '[graphify wrapper] Manifest-gated extraction was unavailable; '
        + 'falling back to Graphify\'s safe full-code AST update.',
    );
    status = runGraphify(candidate, ['update', '.']);
    if (status === 0) {
      recordMetadata({
        candidate,
        durationMs: Date.now() - startedAt,
        extractionMode: 'native full-code AST update fallback',
        backend: null,
        tokens: { input: 0, output: 0, measured: true },
        operation: 'update',
      });
    }
    process.exit(status);
  }
  if (status !== 0) process.exit(status);

  const extracted = readJson(analysisPath)?.tokens
    ? {
        input: Number(readJson(analysisPath).tokens.input ?? 0),
        output: Number(readJson(analysisPath).tokens.output ?? 0),
        measured: true,
      }
    : null;
  const graphChanged = statSync(graphPath).mtimeMs > graphMtimeBefore;
  if (graphChanged) {
    const clusterArgs = ['cluster-only', '.'];
    if (backend) clusterArgs.push(`--backend=${backend}`);
    else clusterArgs.push('--no-label');
    let clusterStatus = runGraphify(candidate, clusterArgs);
    if (clusterStatus !== 0 && autoBackend && backend) {
      console.warn(
        '[graphify wrapper] Semantic community labeling failed; '
          + 'retrying local clustering without labels.',
      );
      clusterStatus = runGraphify(candidate, ['cluster-only', '.', '--no-label']);
    }
    if (clusterStatus !== 0) process.exit(clusterStatus);
  } else {
    console.log(
      '[graphify wrapper] Manifest found no changed inputs; '
        + 'report and HTML were left untouched.',
    );
  }
  if (status === 0) {
    recordMetadata({
      candidate,
      durationMs: Date.now() - startedAt,
      extractionMode: 'manifest-gated incremental AST + semantic documentation',
      backend,
      tokens: combinedTokenUsage(
        extracted,
        graphChanged ? reportTokenUsage() : null,
      ),
      operation: 'update',
    });
  }
  process.exit(status);
}

function cluster() {
  rejectUnsafeBuildOptions(commandArgs);
  const candidate = requireGraphify();
  const startedAt = Date.now();
  const args = ['cluster-only', '.', ...commandArgs];
  let backend = optionValue(commandArgs, '--backend') || null;
  if (!backend && !hasOption(commandArgs, '--no-label')) {
    if (claudeCliAvailable()) {
      backend = 'claude-cli';
      args.push('--backend=claude-cli');
    } else {
      args.push('--no-label');
    }
  }
  const status = runGraphify(candidate, args);
  if (status === 0) {
    recordMetadata({
      candidate,
      durationMs: Date.now() - startedAt,
      extractionMode: 'cluster-only',
      backend,
      tokens: combinedTokenUsage(null, reportTokenUsage()),
      operation: 'cluster',
    });
  }
  process.exit(status);
}

function requireGraphFile() {
  if (!existsSync(graphPath)) {
    console.error('No local graph exists. Run `npm run graph:build` first.');
    process.exit(1);
  }
}

function query() {
  requireGraphFile();
  if (!commandArgs.length) {
    console.error('Usage: npm run graph:query -- "<question>" [--dfs] [--budget N]');
    process.exit(2);
  }
  const candidate = requireGraphify();
  const requestedBudget = optionValue(commandArgs, '--budget');
  if (requestedBudget !== null) {
    const budget = Number(requestedBudget);
    if (!Number.isInteger(budget) || budget < 1 || budget > 4000) {
      console.error('Query budget must be an integer from 1 to 4000 tokens.');
      process.exit(2);
    }
  }
  const args = ['query', ...commandArgs];
  if (!hasOption(commandArgs, '--budget')) args.push('--budget', '1600');
  args.push('--graph', graphPath);
  process.exit(runGraphify(candidate, args));
}

function pathQuery() {
  requireGraphFile();
  if (commandArgs.length < 2) {
    console.error('Usage: npm run graph:path -- "<node A>" "<node B>"');
    process.exit(2);
  }
  const candidate = requireGraphify();
  process.exit(
    runGraphify(candidate, ['path', ...commandArgs, '--graph', graphPath]),
  );
}

function explain() {
  requireGraphFile();
  if (!commandArgs.length) {
    console.error('Usage: npm run graph:explain -- "<symbol or concept>"');
    process.exit(2);
  }
  const candidate = requireGraphify();
  process.exit(
    runGraphify(candidate, ['explain', ...commandArgs, '--graph', graphPath]),
  );
}

function printStatus({ strict = false } = {}) {
  const candidate = resolveGraphify(false);
  const installation = graphifyInstallation(candidate);
  const state = graphState();
  const metadata = readJson(metadataPath);
  const stats = state.graph ? graphStatistics(state.graph) : null;

  console.log(`Graphify package: ${installation.version ?? 'not installed'}`);
  console.log(`Installation mechanism: ${installation.mechanism}`);
  if (installation.python_interpreter) {
    console.log(`Python interpreter: ${installation.python_interpreter}`);
  }
  console.log(`Graph output: ${graphPath}`);
  console.log(`graph.json: ${existsSync(graphPath) ? 'present' : 'missing'}`);
  console.log(`graph.html: ${existsSync(join(outputDir, 'graph.html')) ? 'present' : 'missing'}`);
  console.log(
    `GRAPH_REPORT.md: ${existsSync(join(outputDir, 'GRAPH_REPORT.md')) ? 'present' : 'missing'}`,
  );
  console.log(`manifest.json: ${existsSync(manifestPath) ? 'present' : 'missing'}`);
  if (stats) {
    console.log(
      `Graph size: ${stats.nodes} nodes, ${stats.edges} edges, ${stats.communities} communities`,
    );
    console.log(`Built at commit: ${state.builtAtCommit ?? 'not recorded'}`);
    console.log(`Current HEAD: ${state.head ?? 'unavailable'}`);
  }
  if (metadata?.generated_at) {
    console.log(`Last wrapper generation: ${metadata.generated_at}`);
    console.log(`Extraction mode: ${metadata.extraction_mode}`);
    console.log(`Duration: ${metadata.generation_duration_ms} ms`);
  } else if (existsSync(graphPath)) {
    console.log(
      `Graph file modified: ${statSync(graphPath).mtime.toISOString()} (wrapper metadata unavailable)`,
    );
  }
  console.log(`State: ${state.current ? 'current' : 'missing, stale, or not provably current'}`);
  for (const reason of state.reasons) console.log(`- ${reason}`);

  if (strict && !state.current) process.exitCode = 1;
  return state;
}

function check() {
  const candidate = resolveGraphify(false);
  if (candidate && existsSync(graphPath)) {
    runGraphify(candidate, ['check-update', '.']);
  }
  printStatus({ strict: true });
}

function watch() {
  const candidate = requireGraphify();
  process.exit(runGraphify(candidate, ['watch', '.', ...commandArgs]));
}

function help() {
  console.log(`BeatEmPie-Phaser Graphify ${SUPPORTED_VERSION} development wrapper

Usage: node scripts/graphify.mjs <command> [arguments]

Commands:
  build                 full source-focused rebuild (extract --force + cluster)
  update                manifest-gated incremental update
  cluster               rerun cluster-only and refresh report/HTML
  query "<question>"    bounded BFS query (add --dfs for depth-first traversal)
  path "<A>" "<B>"      shortest path between two graph nodes
  explain "<concept>"   explain a node and its neighbors
  status                report installation, outputs, statistics, and staleness
  check                 run native check-update and fail if not provably current
  watch                 opt-in Graphify watch mode

Set GRAPHIFY_CODE_ONLY=1 to skip semantic documents. Set GRAPHIFY_BACKEND to
an explicitly configured backend. Generated files always remain under graphify-out/.`);
}

switch (command) {
  case 'build':
    build();
    break;
  case 'update':
    update();
    break;
  case 'cluster':
    cluster();
    break;
  case 'query':
    query();
    break;
  case 'path':
    pathQuery();
    break;
  case 'explain':
    explain();
    break;
  case 'status':
    printStatus();
    break;
  case 'check':
    check();
    break;
  case 'watch':
    watch();
    break;
  case 'help':
  case '--help':
  case '-h':
    help();
    break;
  default:
    console.error(`Unknown graph command: ${command}`);
    help();
    process.exitCode = 2;
}
