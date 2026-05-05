#!/usr/bin/env node
// ~/.claude/scripts/protocol-audit.mjs
//
// Audits whether agent definition files in ~/.claude/agents/ carry the
// Proactive Protocol inheritance blockquote.
//
// Why this exists: the Claude Code CLI does not fire PreToolUse/PostToolUse
// hooks on Agent/Task dispatches (validated 2026-04-22). The only way to
// propagate the protocol to spawned agents is to embed it in the agent file
// or prepend it via persona-discipline at spawn time. This audit catches
// regressions in the file-embedded path.
//
// Usage:
//   node ~/.claude/scripts/protocol-audit.mjs           # tight scope, exits 0 on clean
//   node ~/.claude/scripts/protocol-audit.mjs --broad   # wide scope, surfaces all gaps
//   node ~/.claude/scripts/protocol-audit.mjs --json    # machine-readable output

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { homedir } from 'node:os';

const AGENTS_ROOT = join(homedir(), '.claude', 'agents');
const PROTOCOL_MARKER = 'Inherits the [Proactive Protocol]';

// Tight scope — directories where I have explicitly patched all agents.
// New agents added to these directories MUST carry the line.
const TIGHT_SCOPE = ['core', 'goal', 'analysis', join('testing', 'validation')];

// Broad scope — everywhere except documentation and protocol files themselves.
const BROAD_SCOPE = ['core', 'goal', 'analysis', 'architecture', 'development', 'github', 'specialized', 'swarm', 'testing'];

const ALWAYS_EXCLUDED = new Set([
  'court-architecture.md',  // architecture doc, not an agent
  'supreme-dominator.md',   // the dominator itself; protocol inlined verbatim
]);

const VALID_FLAGS = new Set(['--broad', '--json']);
const rawArgs = process.argv.slice(2);
const unknownFlags = rawArgs.filter(a => !VALID_FLAGS.has(a));
if (unknownFlags.length > 0) {
  console.error(`ERROR: unknown flag(s): ${unknownFlags.join(', ')}`);
  console.error(`Valid flags: ${[...VALID_FLAGS].join(', ')}`);
  process.exit(2);
}
const args = new Set(rawArgs);
const broad = args.has('--broad');
const json = args.has('--json');
const scope = broad ? BROAD_SCOPE : TIGHT_SCOPE;

// Loud failure surface — never silently swallow filesystem errors. The whole
// point of the audit is to fail when something unexpected is true; "directory
// missing" is exactly that.
const ioErrors = [];

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch (e) {
    ioErrors.push({ path: dir, op: 'readdir', code: e.code, message: e.message });
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch (e) {
      ioErrors.push({ path: full, op: 'stat', code: e.code, message: e.message });
      continue;
    }
    if (st.isDirectory()) {
      out.push(...walk(full));
    } else if (entry.endsWith('.md') && !ALWAYS_EXCLUDED.has(entry)) {
      out.push(full);
    }
  }
  return out;
}

const violations = [];
const greens = [];
const missingScopeDirs = [];

for (const subdir of scope) {
  const root = join(AGENTS_ROOT, subdir);
  let dirExists = true;
  try {
    if (!statSync(root).isDirectory()) dirExists = false;
  } catch {
    dirExists = false;
  }
  if (!dirExists) {
    missingScopeDirs.push(relative(AGENTS_ROOT, root).replace(/\\/g, '/'));
    continue;
  }
  const files = walk(root);
  for (const file of files) {
    let content;
    try {
      content = readFileSync(file, 'utf8');
    } catch (e) {
      ioErrors.push({ path: file, op: 'readFile', code: e.code, message: e.message });
      continue;
    }
    const rel = relative(AGENTS_ROOT, file).replace(/\\/g, '/');
    if (content.includes(PROTOCOL_MARKER)) {
      greens.push(rel);
    } else {
      violations.push(rel);
    }
  }
}

// Exit codes:
//   0 — all green, no violations, no IO errors
//   1 — protocol violations (files missing the inheritance line)
//   2 — invalid flag, missing scope directory, or IO error (regression in the audit infrastructure itself)
const hasInfraError = missingScopeDirs.length > 0 || ioErrors.length > 0;
const exitCode = hasInfraError ? 2 : (violations.length > 0 ? 1 : 0);

if (json) {
  console.log(JSON.stringify({
    scope: broad ? 'broad' : 'tight',
    agents_root: AGENTS_ROOT,
    exit_code: exitCode,
    green_count: greens.length,
    violation_count: violations.length,
    missing_scope_dirs: missingScopeDirs,
    io_errors: ioErrors,
    greens,
    violations,
  }, null, 2));
} else {
  const scopeLabel = broad ? 'BROAD' : 'TIGHT';
  console.log(`Proactive Protocol Audit — ${scopeLabel} scope`);
  console.log(`Root: ${AGENTS_ROOT}`);
  console.log(`Scope dirs: ${scope.join(', ')}`);
  console.log('');
  console.log(`  PASS  ${greens.length} agent files carry the inheritance line`);
  console.log(`  FAIL  ${violations.length} agent files MISSING the inheritance line`);
  if (missingScopeDirs.length > 0) {
    console.log(`  INFRA ${missingScopeDirs.length} scope directories MISSING (audit cannot verify):`);
    for (const d of missingScopeDirs) console.log(`        - agents/${d}`);
  }
  if (ioErrors.length > 0) {
    console.log(`  INFRA ${ioErrors.length} filesystem errors during walk:`);
    for (const e of ioErrors) console.log(`        - ${e.op} ${e.path}: ${e.code || e.message}`);
  }
  if (violations.length > 0) {
    console.log('\nMissing files:');
    for (const v of violations) console.log(`  - agents/${v}`);
    console.log('\nFix: add this line at the top of each agent body (after the # Title heading):');
    console.log('  > **Inherits the [Proactive Protocol](<relative-path>/protocols/proactive-protocol.md):**');
    console.log('  > emit `[V:]`, `[PROPOSAL:]`, `[ALERT:]` markers;');
    console.log('  > reflect before output.');
  }
  if (greens.length > 0 && !broad) {
    console.log(`\nFor a wider audit (architecture/, development/, github/, specialized/, swarm/, full testing/):`);
    console.log(`  node ${process.argv[1]} --broad`);
  }
  console.log(`\nExit code: ${exitCode} (0=clean, 1=protocol violations, 2=audit infrastructure error)`);
}

process.exit(exitCode);
