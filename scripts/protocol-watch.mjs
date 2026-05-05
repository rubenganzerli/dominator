#!/usr/bin/env node
// ~/.claude/scripts/protocol-watch.mjs
//
// Filesystem watcher that runs the proactive-protocol audit whenever an
// agent .md file is created, modified, or deleted under ~/.claude/agents/.
// Companion to protocol-audit.mjs.
//
// Usage:
//   node ~/.claude/scripts/protocol-watch.mjs              # daemon (Ctrl-C to stop)
//   node ~/.claude/scripts/protocol-watch.mjs --once       # one audit run, exit (cron use)
//   node ~/.claude/scripts/protocol-watch.mjs --self-test  # integration test, exits 0/1
//
// Env-var seams (used by --self-test):
//   PROTOCOL_WATCH_ROOT  — override the watched directory
//   PROTOCOL_AUDIT_CMD   — override the audit command (JSON array of argv parts)

import { watch, mkdirSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_ROOT = process.env.PROTOCOL_WATCH_ROOT
  || join(homedir(), '.claude', 'agents');
const DEFAULT_AUDIT = process.env.PROTOCOL_AUDIT_CMD
  ? JSON.parse(process.env.PROTOCOL_AUDIT_CMD)
  : ['node', join(homedir(), '.claude', 'scripts', 'protocol-audit.mjs'), '--broad'];
const DEBOUNCE_MS = 500;

const VALID_FLAGS = new Set(['--once', '--self-test']);
const args = process.argv.slice(2);
const unknown = args.filter(a => !VALID_FLAGS.has(a));
if (unknown.length > 0) {
  console.error(`ERROR: unknown flag(s): ${unknown.join(', ')}`);
  console.error(`Valid flags: ${[...VALID_FLAGS].join(', ')}`);
  process.exit(2);
}
const flags = new Set(args);

function runAudit() {
  return new Promise((resolve) => {
    const [cmd, ...cmdArgs] = DEFAULT_AUDIT;
    const child = spawn(cmd, cmdArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('error', e => resolve({ code: 2, stdout, stderr: stderr + `\nspawn error: ${e.message}` }));
    child.on('close', code => resolve({ code: code ?? 2, stdout, stderr }));
  });
}

function reportAuditResult({ code, stdout, stderr }) {
  if (code === 0) {
    const ts = new Date().toISOString();
    console.log(`[protocol-watch ${ts}] OK — audit clean`);
  } else {
    const ts = new Date().toISOString();
    console.error(`[protocol-watch ${ts}] FAIL — audit exit ${code}`);
    if (stdout) {
      const lines = stdout.split('\n');
      const offenders = lines.filter(l => /^\s*-\s+|Missing files:|MISSING/.test(l));
      if (offenders.length > 0) {
        console.error('Offending paths:');
        for (const o of offenders) console.error(`  ${o.trim()}`);
      } else {
        for (const l of lines.slice(-10)) if (l.trim()) console.error(`  ${l}`);
      }
    }
    if (stderr) console.error(stderr.trim());
  }
}

async function once() {
  const result = await runAudit();
  reportAuditResult(result);
  process.exit(result.code);
}

function startWatcher(root) {
  if (!existsSync(root)) {
    console.error(`[protocol-watch] watch root does not exist: ${root}`);
    process.exit(2);
  }
  console.log(`[protocol-watch] watching ${root} (debounce ${DEBOUNCE_MS}ms)`);
  let timer = null;
  let pendingEvents = [];
  const watcher = watch(root, { recursive: true }, (event, filename) => {
    if (!filename || !filename.endsWith('.md')) return;
    pendingEvents.push({ event, filename });
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      const events = pendingEvents.splice(0);
      const summary = events.map(e => `${e.event}:${e.filename}`).slice(0, 3).join(', ');
      console.log(`[protocol-watch] event(s): ${summary}${events.length > 3 ? ` (+${events.length - 3} more)` : ''}`);
      const result = await runAudit();
      reportAuditResult(result);
    }, DEBOUNCE_MS);
  });
  watcher.on('error', e => {
    console.error(`[protocol-watch] watch error: ${e.message}`);
    process.exit(2);
  });
  return watcher;
}

async function selfTest() {
  const fixtureDir = join(__dirname, 'orchestrator-bench', 'fixtures', 'T6');
  const stubAudit = join(fixtureDir, 'audit-stub.mjs');
  const violationFile = join(fixtureDir, 'agent-violation.md');
  if (!existsSync(stubAudit)) {
    console.error(`self-test: missing audit stub at ${stubAudit}`);
    process.exit(1);
  }
  // Clean any leftover from previous runs
  if (existsSync(violationFile)) unlinkSync(violationFile);

  const waitFor = (check, ms) => new Promise(resolve => {
    const t = setTimeout(() => resolve(false), ms);
    const iv = setInterval(() => { if (check()) { clearInterval(iv); clearTimeout(t); resolve(true); } }, 50);
  });

  const baseline = spawnSync('node', [stubAudit, fixtureDir], { encoding: 'utf8' });
  if (baseline.status !== 0) {
    console.error(`self-test: baseline should be 0, got ${baseline.status}\n${baseline.stdout}\n${baseline.stderr}`);
    process.exit(1);
  }
  console.log('self-test: baseline clean');

  const child = spawn('node', [__filename], {
    env: { ...process.env, PROTOCOL_WATCH_ROOT: fixtureDir, PROTOCOL_AUDIT_CMD: JSON.stringify(['node', stubAudit, fixtureDir]) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '', stderr = '';
  child.stdout.on('data', d => { stdout += d.toString(); });
  child.stderr.on('data', d => { stderr += d.toString(); });
  const fail = (msg, code = 1) => { console.error(`self-test: ${msg}\nstdout:\n${stdout}\nstderr:\n${stderr}`); if (existsSync(violationFile)) unlinkSync(violationFile); child.kill(); process.exit(code); };

  if (!(await waitFor(() => stdout.includes('watching'), 5000))) fail('watcher did not start within 5s');
  writeFileSync(violationFile, '# Fixture Agent — Violation\n\nNo inheritance line on purpose.\n');
  if (!(await waitFor(() => stderr.includes('FAIL') && stderr.includes('audit exit'), 5000))) fail('watcher did not report violation within 5s');
  console.log('self-test: violation detected');

  unlinkSync(violationFile);
  const ok = await waitFor(() => /OK — audit clean/.test(stdout), 5000);
  child.kill();
  if (!ok) fail('recovery OK not observed');
  console.log('self-test: recovery observed\nself-test: PASS');
  process.exit(0);
}

if (flags.has('--self-test')) {
  selfTest();
} else if (flags.has('--once')) {
  once();
} else {
  const watcher = startWatcher(DEFAULT_ROOT);
  process.on('SIGINT', () => { console.log('\n[protocol-watch] stopping'); watcher.close(); process.exit(0); });
  process.on('SIGTERM', () => { watcher.close(); process.exit(0); });
}
