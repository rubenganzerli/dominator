#!/usr/bin/env node
// bench/ablate.mjs
//
// Measures what each piece of start context (CLAUDE.md, preferences, a skill,
// agents, hooks, an MCP server such as Honcho) is actually worth. Runs every
// task under every arm, N times, in a fresh copy of the repo, via headless
// `claude -p`, then grades each answer and prints pass rate, cost, tokens,
// time and which skills fired — with the delta against the `baseline` arm.
//
// Usage:
//   node bench/ablate.mjs bench/ablation/plan.json            # run
//   node bench/ablate.mjs bench/ablation/plan.json --dry-run  # print commands only
//
// Plan file: { "runs": 3, "repo": ".", "out": "bench/ablation/out",
//              "common_args": [...], "arms": [{ "name", "args", "expect" }],
//              "tasks": [{ "id", "prompt", "checks": [...] }], "warmup": true }
// warmup: one unrecorded run per task×arm first, so cached-prompt pricing doesn't
// favour whichever arm happens to run after another one with the same context.
// Check kinds: { "name", "regex" } · { "name", "not_regex" } · { "name", "max_words" }
//              · { "name", "cmd" }  (shell, run in the run's repo copy; exit 0 = pass)
// `expect` (optional): { "skills": [...], "mcp": [...], "agents": [...] } that the
// init event must list — and { "absent_skills": [...] } that it must not. A run
// whose loaded context doesn't match is marked INVALID and excluded: isolation is
// verified from what Claude Code reports loading, never from the model's word.

import { readFileSync, writeFileSync, mkdirSync, cpSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const [planPath, ...flags] = process.argv.slice(2);
if (!planPath) { console.error('usage: node bench/ablate.mjs <plan.json> [--dry-run]'); process.exit(2); }
const dry = flags.includes('--dry-run');
const plan = JSON.parse(readFileSync(planPath, 'utf8'));
const runs = plan.runs ?? 3;
const repo = resolve(plan.repo ?? '.');
const out = resolve(plan.out ?? 'bench/ablation/out');
const common = plan.common_args ?? ['--no-session-persistence'];

function parseStream(stdout) {
  const r = { loaded: {}, skillsFired: [], result: '', cost: 0, ms: 0, turns: 0, tokens: 0 };
  for (const line of stdout.split('\n')) {
    let e; try { e = JSON.parse(line); } catch { continue; }
    if (e.type === 'system' && e.subtype === 'init') {
      const names = xs => (xs ?? []).map(x => (typeof x === 'string' ? x : x.name));
      r.loaded = { skills: names(e.skills), agents: names(e.agents), mcp: names(e.mcp_servers), plugins: names(e.plugins) };
    }
    if (e.type === 'assistant') {
      for (const c of e.message?.content ?? []) {
        if (c.type === 'tool_use' && c.name === 'Skill') r.skillsFired.push(c.input?.skill ?? '?');
      }
    }
    if (e.type === 'result') {
      const u = e.usage ?? {};
      r.result = e.result ?? '';
      r.cost = e.total_cost_usd ?? 0;
      r.ms = e.duration_ms ?? 0;
      r.turns = e.num_turns ?? 0;
      r.tokens = (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.output_tokens ?? 0);
    }
  }
  return r;
}

function isolationErrors(loaded, expect = {}) {
  const errs = [];
  for (const k of ['skills', 'mcp', 'agents']) {
    for (const want of expect[k] ?? []) if (!(loaded[k] ?? []).some(n => n.includes(want))) errs.push(`${k} missing ${want}`);
  }
  for (const bad of expect.absent_skills ?? []) if ((loaded.skills ?? []).some(n => n.includes(bad))) errs.push(`skill present ${bad}`);
  return errs;
}

function grade(checks, text, cwd) {
  return checks.map(c => {
    let passed;
    if (c.regex) passed = new RegExp(c.regex, 'is').test(text);
    else if (c.not_regex) passed = !new RegExp(c.not_regex, 'is').test(text);
    else if (c.max_words) passed = text.split(/\s+/).filter(Boolean).length <= c.max_words;
    else if (c.cmd) passed = spawnSync('sh', ['-c', c.cmd], { cwd }).status === 0;
    return { name: c.name, passed: !!passed };
  });
}

const rows = [];
for (const task of plan.tasks) {
  for (const arm of plan.arms) {
    for (let n = plan.warmup ? 0 : 1; n <= runs; n++) {
      const args = ['-p', task.prompt, '--output-format', 'stream-json', '--verbose', ...common, ...(arm.args ?? [])];
      if (dry) { console.log(`[${task.id} · ${arm.name} · ${n}] claude ${args.map(a => JSON.stringify(a)).join(' ')}`); continue; }
      const cwd = mkdtempSync(join(tmpdir(), 'ablate-'));
      cpSync(repo, cwd, { recursive: true, filter: s => !s.includes('/.git') && !s.startsWith(out) });
      const p = spawnSync('claude', args, { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: (plan.timeout_s ?? 900) * 1000 });
      if (n === 0) { rmSync(cwd, { recursive: true, force: true }); continue; } // warm-up: primes the prompt cache, not recorded
      const r = parseStream(p.stdout ?? '');
      const iso = isolationErrors(r.loaded, arm.expect);
      const checks = grade(task.checks ?? [], r.result, cwd);
      const dir = join(out, task.id, arm.name, `run-${n}`);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'answer.md'), r.result);
      writeFileSync(join(dir, 'stream.jsonl'), p.stdout ?? '');
      writeFileSync(join(dir, 'run.json'), JSON.stringify({ ...r, result: undefined, isolation_errors: iso, checks, exit: p.status }, null, 2));
      rmSync(cwd, { recursive: true, force: true });
      rows.push({ task: task.id, arm: arm.name, valid: iso.length === 0 && p.status === 0, iso, checks, ...r });
      const pass = checks.filter(c => c.passed).length;
      console.log(`[${task.id} · ${arm.name} · ${n}] ${iso.length ? 'INVALID ' + iso.join('; ') : `${pass}/${checks.length}`}  $${r.cost.toFixed(3)}  ${(r.ms / 1000).toFixed(0)}s  fired=[${r.skillsFired.join(',')}]`);
    }
  }
}
if (dry) process.exit(0);

// Summary per arm, delta vs baseline. Invalid runs are excluded, and counted.
const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const sd = xs => { const m = mean(xs); return xs.length > 1 ? Math.sqrt(mean(xs.map(x => (x - m) ** 2))) : 0; };
const summary = plan.arms.map(arm => {
  const all = rows.filter(r => r.arm === arm.name), ok = all.filter(r => r.valid);
  const pr = ok.map(r => (r.checks.length ? r.checks.filter(c => c.passed).length / r.checks.length : 1));
  return { arm: arm.name, valid: ok.length, invalid: all.length - ok.length,
    pass: mean(pr), pass_sd: sd(pr), cost: mean(ok.map(r => r.cost)), tokens: mean(ok.map(r => r.tokens)),
    secs: mean(ok.map(r => r.ms / 1000)), fired: [...new Set(ok.flatMap(r => r.skillsFired))] };
});
const base = summary.find(s => s.arm === 'baseline');
const pct = (a, b) => (b ? `${a >= b ? '+' : ''}${(((a - b) / b) * 100).toFixed(0)}%` : '');
console.log('\n| arm | valid | pass rate | Δ pass | cost | Δ cost | tokens | secs | skills fired |');
console.log('|---|---|---|---|---|---|---|---|---|');
for (const s of summary) {
  const dp = base ? `${s.pass - base.pass >= 0 ? '+' : ''}${((s.pass - base.pass) * 100).toFixed(0)} pts` : '';
  console.log(`| ${s.arm} | ${s.valid}${s.invalid ? ` (+${s.invalid} invalid)` : ''} | ${(s.pass * 100).toFixed(0)}% ± ${(s.pass_sd * 100).toFixed(0)} | ${dp} | $${s.cost.toFixed(3)} | ${base ? pct(s.cost, base.cost) : ''} | ${Math.round(s.tokens)} | ${s.secs.toFixed(0)} | ${s.fired.join(', ')} |`);
}
writeFileSync(join(out, 'summary.json'), JSON.stringify({ runs, summary, rows: rows.map(r => ({ ...r, result: undefined })) }, null, 2));
