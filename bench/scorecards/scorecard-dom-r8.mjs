#!/usr/bin/env node
// scorecard-dom-r8.mjs — Round-8 deterministic bench scorecard.
// Author: supreme-dominator (round 8).
//
// Reads (no writes to inputs):
//   ./runs/T*/results-*.json
//   ./runs/round*-summary*.json
//
// Writes:
//   ./scorecard-dom-r8.md
//
// Modes:
//   node scorecard-dom-r8.mjs            regenerate the .md file
//   node scorecard-dom-r8.mjs --check    regenerate in-memory; exit 1 if disk differs
//   node scorecard-dom-r8.mjs --verify   build twice in-process; assert byte-identical
//   node scorecard-dom-r8.mjs --stdout   print to stdout, do not touch disk
//
// Determinism contract:
//   - Input file list lex-sorted before parsing
//   - Per-cell trials sorted by (round asc, source_path lex)
//   - No timestamps, mtimes, or wall-clock derived values embedded in output
//   - Per-task results-*.json supersede round-summary cells when both name
//     the same (orchestrator, task, round) — per-task carries richer fields
//   - Same inputs → byte-identical output across runs (verifiable via --check
//     against disk OR --verify in-process)
//
// Differentiators vs round 7:
//   - **Discrimination axis** — explicit "PASS/PASS/DQ" verdict-trace string
//     per cell so non-determinism across rounds is the headline, not a buried
//     statistic. The brief's load-bearing finding (T6 dom: PASS/PASS/DQ)
//     becomes a single column you read top-to-bottom.
//   - **ASCII variance sparkline** for token cost across rounds — visualizes
//     the spread without requiring a chart, deterministic by construction.
//   - **Stability classifier** with labeled categories ("stable PASS",
//     "uneven", "high variance", "single trial") satisfying the brief's
//     "one-line interpretation per cell where N≥3" requirement explicitly.
//   - **Per-round cohort table** — for each round, all 4 orchestrators
//     side-by-side per task. Reveals "which round was the bad one" at a
//     glance, complementary to the per-orchestrator slice in r7.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUNS_DIR = join(__dirname, 'runs');
const OUT = join(__dirname, 'scorecard-dom-r8.md');

const ORCHESTRATORS = [
  'task-orchestrator',
  'hierarchical-coordinator',
  'sparc-coord',
  'supreme-dominator',
];

const TASKS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const TASK_LABEL = {
  T1: 'T1-recall',
  T2: 'T2-collision',
  T3: 'T3-canonical',
  T4: 'T4-recovery',
  T5: 'T5-synthesis',
  T6: 'T6-engineering',
  T7: 'T7-scorecard',
};

// Round-5 summary uses sub-keys that don't carry a numeric round on each
// inner record. Map sub-key → round number.
const R5_SUBKEY_ROUND = {
  T6_r4_dom_retry: 4,
  T5_synthesis_round1: 5,
  T7_scorecard_round1: 5,
};

// ----------------------------------------------------------------------- collection

function listJsonFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listJsonFiles(p));
    else if (entry.isFile() && entry.name.endsWith('.json')) out.push(p);
  }
  return out.sort();
}

function shortPath(p) {
  const i = p.lastIndexOf('runs');
  const s = i >= 0 ? p.slice(i) : p;
  return s.replace(/\\/g, '/');
}

function detectTaskFromPath(path) {
  for (const t of TASKS) {
    if (path.includes(`/${t}/`) || path.includes(`\\${t}\\`)) return t;
  }
  return null;
}

function detectTask(path, payload) {
  if (payload && typeof payload.task_id === 'string') {
    const m = payload.task_id.match(/^(T\d+)/);
    if (m) return m[1];
  }
  return detectTaskFromPath(path);
}

function detectRoundFromPath(path) {
  const m = path.match(/round(\d+)/);
  if (m) return Number(m[1]);
  return null;
}

function classifyVerdict(outcomeClass, autoFail, hallucinationRate, passAt1) {
  if (autoFail === true) return 'DQ';
  if (typeof hallucinationRate === 'number' && hallucinationRate > 0) return 'DQ';
  if (typeof outcomeClass === 'string') {
    const oc = outcomeClass.toLowerCase();
    if (oc.startsWith('dq') || oc.includes('disqual') || oc.includes('constraint violation')) return 'DQ';
    if (oc === 'pass') return 'PASS';
    if (oc === 'honest_refusal') return 'FAIL_HONEST';
    if (oc === 'hallucination') return 'DQ';
    if (oc.includes('refus')) return 'FAIL_HONEST';
    if (oc === 'fail') return 'FAIL';
  }
  if (passAt1 === true) return 'PASS';
  if (passAt1 === false) return 'FAIL';
  return 'UNKNOWN';
}

function parseSummaryOutcomeString(s) {
  if (typeof s !== 'string') return 'UNKNOWN';
  const oc = s.trim().toLowerCase();
  if (oc.startsWith('dq') || oc.includes('disqual') || oc.includes('hallucination')) return 'DQ';
  if (oc === 'pass') return 'PASS';
  if (oc.includes('honest_refusal') || oc.includes('refus')) return 'FAIL_HONEST';
  if (oc === 'fail') return 'FAIL';
  return 'UNKNOWN';
}

function trialFromPerTask(filePath, payload) {
  const task = detectTask(filePath, payload);
  const round = (typeof payload.round === 'number')
    ? payload.round
    : (detectRoundFromPath(filePath) ?? 1);
  const trials = [];
  if (!Array.isArray(payload.results)) return trials;
  for (const r of payload.results) {
    const orch = r.orchestrator;
    if (!ORCHESTRATORS.includes(orch)) continue;
    const outcome = r.outcome || {};
    const verdict = classifyVerdict(
      outcome.outcome_class,
      outcome.auto_fail_disqualification,
      r.quality && r.quality.hallucination_rate,
      outcome.pass_at_1,
    );
    const cost = r.cost || {};
    const quality = r.quality || {};
    const markerBits = [];
    if (quality.proposal_emitted || quality.proposal === true) markerBits.push('PROPOSAL');
    if (quality.alert_emitted || quality.alert === true) markerBits.push('ALERT');
    if (quality.kernel_emitted || quality.kernel === true) markerBits.push('KERNEL');
    trials.push({
      orch,
      task,
      round,
      verdict,
      tokens: typeof cost.total_tokens === 'number' ? cost.total_tokens : null,
      tools: typeof cost.tool_uses === 'number' ? cost.tool_uses : null,
      duration_ms: typeof cost.duration_ms === 'number' ? cost.duration_ms : null,
      marker: markerBits.length ? markerBits.join('+') : '',
      note: outcome.reason || '',
      source: 'per-task',
      source_path: shortPath(filePath),
    });
  }
  return trials;
}

function trialsFromRoundSummary(filePath, payload) {
  const out = [];
  const round = typeof payload.round === 'number'
    ? payload.round
    : (detectRoundFromPath(filePath) ?? 1);

  const sources = [];
  if (payload.results_per_tier && typeof payload.results_per_tier === 'object') {
    sources.push({ container: payload.results_per_tier, useSubkeyRound: false });
  }
  if (payload.results && typeof payload.results === 'object') {
    sources.push({ container: payload.results, useSubkeyRound: true });
  }

  for (const { container, useSubkeyRound } of sources) {
    for (const [tierKey, tierPayload] of Object.entries(container)) {
      if (!tierPayload || typeof tierPayload !== 'object') continue;
      const taskMatch = tierKey.match(/^(T\d+)/);
      if (!taskMatch) continue;
      const task = taskMatch[1];

      let cellRound = round;
      const tierRoundMatch = tierKey.match(/_round(\d+)/);
      if (tierRoundMatch) cellRound = Number(tierRoundMatch[1]);
      else if (useSubkeyRound && R5_SUBKEY_ROUND[tierKey]) cellRound = R5_SUBKEY_ROUND[tierKey];

      for (const [orch, rec] of Object.entries(tierPayload)) {
        if (!ORCHESTRATORS.includes(orch)) continue;
        if (!rec || typeof rec !== 'object') continue;
        const verdict = parseSummaryOutcomeString(rec.outcome);
        out.push({
          orch,
          task,
          round: cellRound,
          verdict,
          tokens: typeof rec.tokens === 'number' ? rec.tokens : null,
          tools: typeof rec.tools === 'number' ? rec.tools : null,
          duration_ms: typeof rec.duration_ms === 'number' ? rec.duration_ms : null,
          marker: typeof rec.markers === 'string'
            ? rec.markers.replace(/\[|\]/g, '').trim()
            : (typeof rec.marker === 'string' ? rec.marker.replace(/\[|\]/g, '').trim() : ''),
          note: typeof rec.dq_reason === 'string'
            ? rec.dq_reason
            : (typeof rec.comment === 'string' ? rec.comment : ''),
          source: 'round-summary',
          source_path: shortPath(filePath),
        });
      }
    }
  }
  return out;
}

function collectAll() {
  const files = listJsonFiles(RUNS_DIR);
  const perTaskTrials = [];
  const summaryTrials = [];
  for (const f of files) {
    const payload = JSON.parse(readFileSync(f, 'utf8'));
    if (Array.isArray(payload.results)) {
      perTaskTrials.push(...trialFromPerTask(f, payload));
    } else if (payload.results || payload.results_per_tier) {
      summaryTrials.push(...trialsFromRoundSummary(f, payload));
    }
  }

  // Dedupe by (orch, task, round). Per-task wins over any round-summary;
  // summary-vs-summary collisions resolve to the lex-first source path.
  const byKey = new Map();
  for (const t of perTaskTrials) {
    byKey.set(`${t.orch}|${t.task}|${t.round}`, t);
  }
  for (const t of summaryTrials) {
    const k = `${t.orch}|${t.task}|${t.round}`;
    const prev = byKey.get(k);
    if (!prev) {
      byKey.set(k, t);
      continue;
    }
    if (prev.source === 'per-task') continue;
    if (t.source_path < prev.source_path) byKey.set(k, t);
  }
  const merged = [...byKey.values()];

  merged.sort((a, b) => {
    if (a.orch !== b.orch) return ORCHESTRATORS.indexOf(a.orch) - ORCHESTRATORS.indexOf(b.orch);
    if (a.task !== b.task) return TASKS.indexOf(a.task) - TASKS.indexOf(b.task);
    if (a.round !== b.round) return a.round - b.round;
    if (a.source_path !== b.source_path) return a.source_path < b.source_path ? -1 : 1;
    return 0;
  });

  return merged;
}

// ----------------------------------------------------------------------- math

function mean(xs) {
  if (!xs.length) return null;
  const s = xs.reduce((a, b) => a + b, 0);
  return s / xs.length;
}

function stdev(xs) {
  if (xs.length < 2) return null;
  const m = mean(xs);
  const v = xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (xs.length - 1);
  return Math.sqrt(v);
}

function cv(xs) {
  if (xs.length < 2) return null;
  const m = mean(xs);
  if (m === 0) return null;
  const sd = stdev(xs);
  return (sd / m) * 100;
}

function fmtTokensK(n) {
  if (n == null) return '—';
  return `${Math.round(n / 1000)}k`;
}

function fmtPct(p, digits = 0) {
  if (p == null || Number.isNaN(p)) return '—';
  return `${p.toFixed(digits)}%`;
}

function fmtCV(c) {
  if (c == null || Number.isNaN(c)) return '—';
  return `${c.toFixed(1)}%`;
}

function shortDuration(ms) {
  if (ms == null) return '—';
  const s = Math.round(ms / 1000);
  return `${s}s`;
}

function verdictGlyph(v) {
  switch (v) {
    case 'PASS': return 'P';
    case 'FAIL_HONEST': return 'H';
    case 'FAIL': return 'F';
    case 'DQ': return 'DQ';
    default: return '?';
  }
}

// Deterministic ASCII sparkline. 8 levels using a fixed glyph ladder so
// output is byte-identical regardless of terminal capabilities.
const SPARK_LADDER = ['_', '.', '-', '=', '+', '*', '#', '@'];

function sparkline(xs) {
  const valid = xs.filter(x => x != null);
  if (valid.length < 2) return '—';
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  if (max === min) return SPARK_LADDER[0].repeat(xs.length);
  return xs.map(x => {
    if (x == null) return '?';
    const norm = (x - min) / (max - min);
    const idx = Math.min(SPARK_LADDER.length - 1, Math.floor(norm * SPARK_LADDER.length));
    return SPARK_LADDER[idx];
  }).join('');
}

// ----------------------------------------------------------------------- rendering

function renderHeader(trials) {
  const totalTrials = trials.length;
  const totalDQ = trials.filter(t => t.verdict === 'DQ').length;
  const totalPass = trials.filter(t => t.verdict === 'PASS').length;
  let md = '# Orchestrator Bench Scorecard (round 8, dom variant)\n\n';
  md += '> Auto-generated by `scorecard-dom-r8.mjs`. Do not edit by hand.\n';
  md += '> Regenerate: `node ~/.claude/scripts/orchestrator-bench/scorecard-dom-r8.mjs`\n';
  md += '> Verify byte-identical (vs disk): `node ~/.claude/scripts/orchestrator-bench/scorecard-dom-r8.mjs --check`\n';
  md += '> Verify byte-identical (in-process): `node ~/.claude/scripts/orchestrator-bench/scorecard-dom-r8.mjs --verify`\n\n';
  md += `Inputs: every \`runs/T*/results-*.json\` and \`runs/round*-summary*.json\` `
    + `present at run time. Per-task files supersede round-summary cells when both `
    + `name the same \`(orchestrator, task, round)\` triple — per-task carries `
    + `richer cost & quality fields.\n\n`;
  md += `Trials: **${totalTrials}** total · **${totalPass}** pass · **${totalDQ}** DQ.\n\n`;
  return md;
}

function renderTopDQBanner(trials) {
  const dqs = trials.filter(t => t.verdict === 'DQ');
  let md = '## DQ Banner — Variance That Cannot Be Averaged Away\n\n';
  if (!dqs.length) {
    md += '_No DQ entries in current data._\n\n';
    return md;
  }
  md += 'The following trials disqualified for scope violation or hallucination. '
    + 'These are NOT folded into pass-rate denominators silently — each one '
    + 'is a binary failure mode and gets its own line both here and in the '
    + 'inline grid below.\n\n';
  md += '| Orchestrator | Task | Round | Source | Reason |\n';
  md += '|---|---|---|---|---|\n';
  const sorted = [...dqs].sort((a, b) => {
    if (a.orch !== b.orch) return ORCHESTRATORS.indexOf(a.orch) - ORCHESTRATORS.indexOf(b.orch);
    if (a.task !== b.task) return TASKS.indexOf(a.task) - TASKS.indexOf(b.task);
    return a.round - b.round;
  });
  for (const d of sorted) {
    const note = (d.note || '').replace(/\n/g, ' ').replace(/\|/g, '\\|').trim();
    md += `| **${d.orch}** | ${TASK_LABEL[d.task]} | r${d.round} | \`${d.source_path}\` | ${note || '—'} |\n`;
  }
  md += '\n';
  return md;
}

// r8 NEW — Discrimination axis: shows the verdict trace across rounds for
// every (orch, task) cell with N≥2. The headline finding (T6 dom: P/P/DQ)
// becomes a single readable string, not a buried statistic.
function renderDiscriminationAxis(trials) {
  let md = '## Discrimination Axis — Verdict Trace Across Rounds\n\n';
  md += 'Each row is one `(orchestrator, task)` cell with at least 2 trials. '
    + 'The **Trace** column lists verdicts in round order — a cell that shows '
    + '`P P DQ` is a SAME-PERSONA non-determinism event and is the strongest '
    + 'evidence the bench produces that N=1 results cannot conclude. '
    + '**Token sparkline** uses an 8-level ASCII ladder (`_.-=+*#@`) where '
    + '`_` is the lowest cost in that cell\'s round series and `@` is the '
    + 'highest, so the variance shape is visible without numbers.\n\n';
  md += '| Orchestrator | Task | N | Trace | Token sparkline | Verdict mix |\n';
  md += '|---|---|---|---|---|---|\n';

  const rows = [];
  for (const orch of ORCHESTRATORS) {
    for (const task of TASKS) {
      const own = trials
        .filter(t => t.orch === orch && t.task === task)
        .sort((a, b) => a.round - b.round || (a.source_path < b.source_path ? -1 : 1));
      if (own.length < 2) continue;
      const trace = own.map(t => verdictGlyph(t.verdict)).join(' ');
      const tokens = own.map(t => t.tokens);
      const spark = sparkline(tokens);
      const counts = own.reduce((acc, t) => {
        acc[t.verdict] = (acc[t.verdict] || 0) + 1;
        return acc;
      }, {});
      const mixParts = Object.entries(counts)
        .sort(([a], [b]) => a < b ? -1 : 1)
        .map(([v, c]) => v === 'DQ' ? `**${c} DQ**` : `${c} ${v.toLowerCase()}`);
      rows.push({
        orch, task, N: own.length,
        trace,
        spark,
        mix: mixParts.join(', '),
        hasDQ: own.some(t => t.verdict === 'DQ'),
        rounds: own.map(t => t.round),
      });
    }
  }

  // Sort: DQ-bearing rows first (highest signal), then by orchestrator, then task.
  rows.sort((a, b) => {
    if (a.hasDQ !== b.hasDQ) return a.hasDQ ? -1 : 1;
    if (a.orch !== b.orch) return ORCHESTRATORS.indexOf(a.orch) - ORCHESTRATORS.indexOf(b.orch);
    return TASKS.indexOf(a.task) - TASKS.indexOf(b.task);
  });

  for (const r of rows) {
    const traceCell = r.hasDQ ? `**${r.trace}**` : r.trace;
    const rounds = `r${r.rounds.join(',r')}`;
    md += `| ${r.orch} | ${TASK_LABEL[r.task]} | ${r.N} (${rounds}) | ${traceCell} | \`${r.spark}\` | ${r.mix} |\n`;
  }
  md += '\n';
  return md;
}

function renderAggregate(trials) {
  const rows = [];
  for (const orch of ORCHESTRATORS) {
    const own = trials.filter(t => t.orch === orch);
    const N = own.length;
    const pass = own.filter(t => t.verdict === 'PASS').length;
    const dq = own.filter(t => t.verdict === 'DQ').length;
    const fail = own.filter(t => t.verdict === 'FAIL_HONEST' || t.verdict === 'FAIL').length;
    const passRate = N ? (pass / N) * 100 : null;
    const dqRate = N ? (dq / N) * 100 : null;
    const tokens = own.map(t => t.tokens).filter(x => x != null);
    const tokenMean = tokens.length ? mean(tokens) : null;
    const tokenCV = tokens.length >= 2 ? cv(tokens) : null;
    rows.push({ orch, N, pass, dq, fail, passRate, dqRate, tokenMean, tokenCV });
  }
  let md = '## Aggregate Summary\n\n';
  md += 'One row per orchestrator across ALL tasks and rounds. `Pass rate` '
    + 'includes DQ in the denominator (a DQ is a failure, not "no data"). '
    + '`Token CV` is the coefficient of variation of trial token cost — '
    + 'lower means more predictable spend.\n\n';
  md += '| Orchestrator | Trials | Pass | DQ | Fail | Pass rate | DQ rate | Mean tokens | Token CV |\n';
  md += '|---|---|---|---|---|---|---|---|---|\n';
  for (const r of rows) {
    md += `| ${r.orch} | ${r.N} | ${r.pass} | ${r.dq} | ${r.fail} | ${fmtPct(r.passRate)} | ${fmtPct(r.dqRate)} | ${fmtTokensK(r.tokenMean)} | ${fmtCV(r.tokenCV)} |\n`;
  }
  md += '\n';
  return md;
}

function renderGrid(trials) {
  let md = '## Pass/Fail Grid\n\n';
  md += 'Cells show trial outcomes in chronological round order. Verdict legend: '
    + '`P` = pass, `H` = honest refusal, `F` = fail, `DQ` = disqualification '
    + '(scope violation or hallucination). DQ entries render inline as **DQ** '
    + 'and are NEVER collapsed into a glyph alongside passes — the T6 r3 '
    + 'supreme-dominator violation must be visible at a glance.\n\n';
  md += '| Orchestrator | ' + TASKS.map(t => TASK_LABEL[t]).join(' | ') + ' |\n';
  md += '|---' + TASKS.map(() => '|---').join('') + '|\n';
  for (const orch of ORCHESTRATORS) {
    const cells = TASKS.map(task => {
      const own = trials
        .filter(t => t.orch === orch && t.task === task)
        .sort((a, b) => a.round - b.round || (a.source_path < b.source_path ? -1 : 1));
      if (!own.length) return '—';
      return own.map(t => {
        const g = verdictGlyph(t.verdict);
        return g === 'DQ' ? '**DQ**' : g;
      }).join(' ');
    });
    md += `| ${orch} | ${cells.join(' | ')} |\n`;
  }
  md += '\n';
  return md;
}

// r8 NEW — Per-round cohort: for each round, all 4 orchestrators side-by-side
// per task. Reveals "which round was the bad one" complementary to the
// per-orchestrator slice.
function renderPerRoundCohort(trials) {
  const rounds = [...new Set(trials.map(t => t.round))].sort((a, b) => a - b);
  let md = '## Per-Round Cohort\n\n';
  md += 'For each round, all 4 orchestrators side-by-side per task they '
    + 'attempted. Reveals which round produced the most DQs / the highest '
    + 'pass rate / the cheapest spend, which a per-orchestrator view would '
    + 'flatten. Cells: `verdict(tokens-tools-duration)`.\n\n';

  for (const round of rounds) {
    const roundTrials = trials.filter(t => t.round === round);
    if (!roundTrials.length) continue;
    const tasksInRound = [...new Set(roundTrials.map(t => t.task))]
      .sort((a, b) => TASKS.indexOf(a) - TASKS.indexOf(b));
    const N = roundTrials.length;
    const pass = roundTrials.filter(t => t.verdict === 'PASS').length;
    const dq = roundTrials.filter(t => t.verdict === 'DQ').length;

    md += `### Round ${round} — ${N} trials, ${pass} pass, ${dq} DQ\n\n`;
    md += '| Task | ' + ORCHESTRATORS.join(' | ') + ' |\n';
    md += '|---' + ORCHESTRATORS.map(() => '|---').join('') + '|\n';
    for (const task of tasksInRound) {
      const cells = ORCHESTRATORS.map(orch => {
        const t = roundTrials.find(x => x.orch === orch && x.task === task);
        if (!t) return '—';
        const g = verdictGlyph(t.verdict);
        const gMd = g === 'DQ' ? '**DQ**' : g;
        const cost = `${fmtTokensK(t.tokens)}/${t.tools ?? '—'}t/${shortDuration(t.duration_ms)}`;
        return `${gMd} (${cost})`;
      });
      md += `| ${TASK_LABEL[task]} | ${cells.join(' | ')} |\n`;
    }
    md += '\n';
  }
  return md;
}

// r8 — explicit stability classifier per cell, satisfying the brief's
// "one-line interpretation per cell where N≥3" requirement explicitly.
function classifyStability(N, pass, dq, fail, tokens) {
  if (N < 3) return null;
  const passRate = pass / N;
  const c = cv(tokens.filter(x => x != null));
  let label;
  if (dq > 0 && pass > 0) label = 'uneven (mixed PASS+DQ from same persona)';
  else if (dq > 0) label = 'broken (all DQ)';
  else if (passRate === 1 && (c == null || c < 5)) label = 'stable PASS';
  else if (passRate === 1 && c < 15) label = 'stable PASS, moderate cost variance';
  else if (passRate === 1) label = 'stable PASS, high cost variance';
  else if (passRate >= 0.5) label = 'uneven (majority pass)';
  else label = 'unreliable';
  const cvNote = (c == null) ? 'CV n/a' : `CV ${c.toFixed(1)}%`;
  const dqNote = dq > 0 ? `; ${dq}/${N} DQ` : '';
  const failNote = fail > 0 ? `; ${fail}/${N} fail` : '';
  return `${label} — ${pass}/${N} pass${dqNote}${failNote}; token ${cvNote}`;
}

function costPerPass(tokenMean, pass, N) {
  if (!N || !pass || tokenMean == null) return null;
  return (tokenMean * N) / pass;
}

function renderPerCell(trials) {
  let md = '## Per-Cell Detail\n\n';
  md += 'For each (orchestrator, task) cell: trial count, verdict counts, '
    + 'token cost mean & coefficient of variation, cost-per-pass (mean × N / pass), '
    + 'and a stability classification when N≥3. Trial entries are '
    + '`rN:V(tokens/tool_uses/duration)` ordered by round; **DQ** entries '
    + 'are bolded so the T6 r3 violation is impossible to skim past.\n\n';

  for (const orch of ORCHESTRATORS) {
    md += `### ${orch}\n\n`;
    md += '| Task | N | Pass | DQ | Fail | Pass rate | Tokens (mean) | Token CV | Cost / pass | Trials |\n';
    md += '|---|---|---|---|---|---|---|---|---|---|\n';

    const interpretations = [];
    for (const task of TASKS) {
      const cellTrials = trials
        .filter(t => t.orch === orch && t.task === task)
        .sort((a, b) => a.round - b.round || (a.source_path < b.source_path ? -1 : 1));
      const N = cellTrials.length;
      const pass = cellTrials.filter(t => t.verdict === 'PASS').length;
      const dq = cellTrials.filter(t => t.verdict === 'DQ').length;
      const fail = cellTrials.filter(t => t.verdict === 'FAIL_HONEST' || t.verdict === 'FAIL').length;
      const passRate = N ? (pass / N) * 100 : null;
      const tokens = cellTrials.map(t => t.tokens).filter(x => x != null);
      const tokenMean = tokens.length ? mean(tokens) : null;
      const tokenCV = tokens.length >= 2 ? cv(tokens) : null;
      const cpp = costPerPass(tokenMean, pass, N);

      const trialEntries = cellTrials.map(t => {
        const g = verdictGlyph(t.verdict);
        const gMd = g === 'DQ' ? '**DQ**' : g;
        return `r${t.round}:${gMd}(${fmtTokensK(t.tokens)}/${t.tools ?? '—'}t/${shortDuration(t.duration_ms)})`;
      });

      md += `| ${task} | ${N} | ${pass} | ${dq} | ${fail} | ${fmtPct(passRate)} | ${fmtTokensK(tokenMean)} | ${fmtCV(tokenCV)} | ${fmtTokensK(cpp)} | ${trialEntries.join(', ') || '—'} |\n`;

      const interp = classifyStability(N, pass, dq, fail, tokens);
      if (interp) interpretations.push(`- **${task}** (N=${N}): ${interp}`);
    }
    if (interpretations.length) {
      md += '\nStability classification (cells with N≥3):\n\n';
      md += interpretations.join('\n') + '\n';
    }
    md += '\n';
  }
  return md;
}

function renderFooter() {
  let md = '## Method Notes\n\n';
  md += '- **Verdict precedence.** A trial is DQ if any of: `auto_fail_disqualification: true`, '
    + '`hallucination_rate > 0`, or an outcome string that matches `dq` / `disqual` / '
    + '`constraint violation` / `hallucination`. PASS, FAIL, FAIL_HONEST follow standard '
    + 'mappings. Unknowns surface as `?` in the grid and are excluded from pass-rate math.\n';
  md += '- **Dedupe.** Per-task files (`runs/T*/results-*.json`) supersede round-summary '
    + 'cells when both name the same `(orch, task, round)`. Summary-vs-summary '
    + 'collisions resolve to the lex-first source path. This rule keeps the output '
    + 'stable even if a future round-summary backfills cells that already have '
    + 'per-task data.\n';
  md += '- **Determinism.** No timestamps, mtimes, or `Date.now()` derived values are '
    + 'embedded in the output. Inputs are lex-sorted; trials within a cell are sorted '
    + 'by `(round asc, source_path lex)`. `--check` regenerates and compares against '
    + 'disk. `--verify` regenerates twice in-process and compares.\n';
  md += '- **DQ accounting.** DQs count toward the denominator in pass rate (a DQ is '
    + 'a failure, not missing data). The DQ Banner + Discrimination Axis + bold inline '
    + 'grid + dedicated table row in Per-Cell Detail ensure the T6 r3 supreme-dominator '
    + 'event is surfaced four independent ways.\n';
  md += '- **Stability classifier.** The N≥3 interpretation column uses fixed labels: '
    + '`stable PASS` (100% pass + low CV), `stable PASS, moderate cost variance` '
    + '(100% pass + 5–15% CV), `stable PASS, high cost variance` (100% pass + ≥15% CV), '
    + '`uneven (majority pass)` (≥50% pass), `uneven (mixed PASS+DQ from same persona)` '
    + '(any DQ alongside PASS — the load-bearing case), `broken (all DQ)`, `unreliable` '
    + '(<50% pass, no DQ).\n';
  md += '- **Sparkline ladder.** ASCII levels `_.-=+*#@` are 8 deterministic glyphs; '
    + 'the lowest token cost in a cell\'s round series is `_`, the highest is `@`. '
    + 'Constant-cost cells render as all-`_`. Independent of terminal capabilities.\n';
  return md;
}

// ----------------------------------------------------------------------- main

function build() {
  const trials = collectAll();
  return [
    renderHeader(trials),
    renderTopDQBanner(trials),
    renderDiscriminationAxis(trials),
    renderAggregate(trials),
    renderGrid(trials),
    renderPerRoundCohort(trials),
    renderPerCell(trials),
    renderFooter(),
  ].join('');
}

function run() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');
  const verifyOnly = args.includes('--verify');
  const stdoutOnly = args.includes('--stdout');

  if (verifyOnly) {
    const a = build();
    const b = build();
    if (a !== b) {
      process.stderr.write('scorecard-dom-r8: --verify failed (two in-process builds differ)\n');
      process.exit(1);
    }
    process.stdout.write(`scorecard-dom-r8: --verify ok (byte-identical, ${a.length} bytes)\n`);
    return;
  }

  const generated = build();

  if (checkOnly) {
    if (!existsSync(OUT)) {
      process.stderr.write(`scorecard-dom-r8: --check failed (no file at ${OUT})\n`);
      process.exit(1);
    }
    const onDisk = readFileSync(OUT, 'utf8');
    if (onDisk !== generated) {
      process.stderr.write('scorecard-dom-r8: --check failed (disk differs from regenerated)\n');
      process.exit(1);
    }
    process.stdout.write('scorecard-dom-r8: --check ok (byte-identical)\n');
    return;
  }

  if (stdoutOnly) {
    process.stdout.write(generated);
    return;
  }

  writeFileSync(OUT, generated, 'utf8');
  process.stdout.write(`scorecard-dom-r8: wrote ${OUT}\n`);
}

run();
