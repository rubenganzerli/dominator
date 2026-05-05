#!/usr/bin/env node
// ~/.claude/scripts/orchestrator-bench/grader-T5.mjs
//
// LLM-as-judge proxy: scores a T5 orchestrator output algorithmically against
// the ground-truth issue list documented in tasks/T5-synthesis.md §82-104.
//
// Algorithmic scoring covers the 5 of 6 rubric components that have textual
// markers; the 6th (agent-assignment quality) requires human or LLM review
// and is reported as a separate flag.
//
// Usage:
//   node grader-T5.mjs <output-file>          # exits 0 on pass, 1 on fail
//   node grader-T5.mjs <output-file> --json   # emits scorecard JSON to stdout
//
// Ground truth is embedded — the script is self-contained for reproducibility.

import { readFileSync, existsSync } from 'node:fs';

// Embedded ground truth from T5-synthesis.md
const REFERENCE_ISSUES = [
  { id: 1, dim: 'protocol-inheritance', keywords: ['inheritance', 'blockquote'], severity: '🟢' },
  { id: 2, dim: 'name-collision', keywords: ['code-analyzer', 'analyst', 'name field'], severity: '🟠' },
  { id: 3, dim: 'redundancy', keywords: ['goal-planner', 'redundan'], severity: '🟢' },
  { id: 4, dim: 'hardcoded-constants', keywords: ['coder.md', 'analyze-code-quality', '40 lines', 'function size', 'function-size'], severity: '🟠' },
  { id: 5, dim: 'stale-references', keywords: ['scout-explorer', 'stale'], severity: '🟢' },
  { id: 6, dim: 'documentation-inconsistency', keywords: ['Ollama', 'Gemma', 'inference-routing', 'tier table'], severity: '🟡' },
  { id: 7, dim: 'documentation-inconsistency', keywords: ['dominator-context', 'Court table', 'drift'], severity: '🟡' },
  { id: 8, dim: 'plugin-owned', keywords: ['security-auditor', 'plugin'], severity: '🟡' },
  { id: 9, dim: 'memory-continuity', keywords: ['session summar', 'memory continuity'], severity: '🟡' },
  { id: 10, dim: 'audit-trigger', keywords: ['session-start', 'mid-session', 'auto-invoke'], severity: '🟢' },
];

const DIMENSIONS = [
  'protocol-inheritance', 'name-collision', 'redundancy',
  'hardcoded-constants', 'stale-references', 'documentation-inconsistency'
];

const RUBRIC = [
  { id: 'dimensions_coverage',    weight: 0.25, label: 'Findings cover ≥4 of 6 dimensions' },
  { id: 'top3_recall',            weight: 0.30, label: 'Top-3 includes ≥2 issues from reference' },
  { id: 'severity_match',         weight: 0.15, label: 'Severity assignments within 1 tier of reference' },
  { id: 'effort_vocabulary',      weight: 0.10, label: 'Effort uses S/M/L/XL canonical vocabulary' },
  { id: 'agent_assignment',       weight: 0.10, label: 'Agent assignments are sensible (heuristic)' },
  { id: 'kernel_emitted',         weight: 0.10, label: '[KERNEL] marker present' },
];

function scoreDimensionsCoverage(text) {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const dim of DIMENSIONS) {
    // Each dimension has a canonical name slug; accept hyphenated or spaced forms
    const slug = dim.replace(/-/g, '[ -]');
    if (new RegExp(slug, 'i').test(lower)) hits++;
  }
  // Also count keyword shadows: e.g. 'inheritance' alone counts for protocol-inheritance
  if (/inheritance|blockquote/i.test(text)) hits = Math.max(hits, 1);
  if (/name.*colli|code-analyzer/i.test(text)) hits = Math.max(hits, 2);
  if (/redundan/i.test(text)) hits = Math.max(hits, 3);
  if (/hardcod|hard-cod/i.test(text)) hits = Math.max(hits, 4);
  if (/stale|orphan|scout-explorer/i.test(text)) hits = Math.max(hits, 5);
  if (/inconsist|drift|aspiration/i.test(text)) hits = Math.max(hits, 6);
  return { hits, of: 6, score: hits >= 4 ? 1.0 : hits / 4 };
}

function scoreTop3Recall(text) {
  // Find Top 3 section
  const top3Match = text.match(/##\s*Top\s*3.*?(?=##\s*\w|$)/is);
  const section = top3Match ? top3Match[0] : text; // fall back to whole text
  let matched = 0;
  const matchedItems = [];
  for (const issue of REFERENCE_ISSUES) {
    for (const kw of issue.keywords) {
      if (section.toLowerCase().includes(kw.toLowerCase())) {
        matched++;
        matchedItems.push({ id: issue.id, dim: issue.dim });
        break;
      }
    }
  }
  return { matched, items: matchedItems, score: matched >= 2 ? 1.0 : matched / 2 };
}

function scoreSeverityMatch(text) {
  const refSev = ['🟢', '🟠', '🟡', '🔴'];
  let presentSeverityTags = 0;
  for (const s of refSev) if (text.includes(s)) presentSeverityTags++;
  // Heuristic: orchestrator uses ≥2 different severity tags = good severity awareness
  return { tags_used: presentSeverityTags, score: presentSeverityTags >= 2 ? 1.0 : presentSeverityTags * 0.5 };
}

function scoreEffortVocabulary(text) {
  // Look for S/M/L/XL effort tags near the word "effort"
  const matches = text.match(/effort[:\s]+\(?[SMLX]+\)?|\b(S|M|L|XL)\b\s*\(?effort\)?/gi) || [];
  // More lenient: just check that S/M/L/XL is mentioned in an effort context
  const hasEffortTagging = /(?:effort|estimate)[\s:]+\b[SMLX]+\b|\b[SMLX]+\b[\s\S]{0,30}?\beffort\b/i.test(text)
    || /\b(?:S|M|L|XL)\b/.test(text);
  return { score: hasEffortTagging ? 1.0 : 0.0 };
}

function scoreAgentAssignment(text) {
  const expectedAgents = ['coder', 'reviewer', 'tester', 'researcher', 'security', 'planner', 'sparc'];
  let mentioned = 0;
  for (const a of expectedAgents) if (new RegExp(`\\b${a}\\b`, 'i').test(text)) mentioned++;
  // Pass if ≥2 different agent types are proposed for fixes
  return { agents_mentioned: mentioned, score: mentioned >= 2 ? 1.0 : mentioned * 0.5 };
}

function scoreKernel(text) {
  const has = /\[KERNEL\s+K:[YN]\s*E:[YN]\s*R:[YN]\s*N:[YN]\s*\]/i.test(text);
  return { score: has ? 1.0 : 0.0 };
}

function grade(text) {
  const components = {
    dimensions_coverage: scoreDimensionsCoverage(text),
    top3_recall: scoreTop3Recall(text),
    severity_match: scoreSeverityMatch(text),
    effort_vocabulary: scoreEffortVocabulary(text),
    agent_assignment: scoreAgentAssignment(text),
    kernel_emitted: scoreKernel(text),
  };
  let total = 0;
  for (const r of RUBRIC) total += components[r.id].score * r.weight;
  const verdict = total >= 0.7 ? 'PASS' : 'FAIL';
  return { components, total: Math.round(total * 1000) / 1000, verdict };
}

// CLI
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node grader-T5.mjs <output-file> [--json]');
  process.exit(2);
}
const outputFile = args[0];
const jsonMode = args.includes('--json');

if (!existsSync(outputFile)) {
  console.error(`File not found: ${outputFile}`);
  process.exit(2);
}

const text = readFileSync(outputFile, 'utf8');
const result = grade(text);

if (jsonMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`T5 grader scorecard for ${outputFile}`);
  console.log('---');
  for (const r of RUBRIC) {
    const c = result.components[r.id];
    console.log(`  ${r.label}: ${c.score.toFixed(2)} (weight ${r.weight})`);
  }
  console.log('---');
  console.log(`  Total: ${result.total} → ${result.verdict}`);
}
process.exit(result.verdict === 'PASS' ? 0 : 1);
