---
tier: T6
axis: long-horizon-engineering
expected_cost_tokens: 800000
expected_duration_seconds: 1200
pass_threshold: 0.85
graded_by: automated + light human review
---

# T6 — Engineering: Build `protocol-watch.mjs` end-to-end

**Tests:** Full SPARC cycle on a real, useful artifact. Specification → Pseudocode → Architecture → Refinement (TDD) → Completion (integration). The orchestrator must coordinate multiple sub-agents through a complete software lifecycle.

This is the highest-tier task. An orchestrator that can do this can do real work.

---

## Brief (verbatim)

```
PROTOCOL: emit [PROPOSAL:], [ALERT:], [V: <success-condition>] markers per .claude/agents/protocols/proactive-protocol.md. Reflect before output. Never subtract.

TASK: Build a filesystem watcher that runs the protocol audit
automatically when agent files change. End-to-end software work,
real artifact required.

Deliverable: ~/.claude/scripts/protocol-watch.mjs

Specification:
- Watches ~/.claude/agents/ recursively for .md file events
  (create, modify, delete)
- On any event, debounces ~500ms then runs the audit:
    node ~/.claude/scripts/protocol-audit.mjs --broad
- If audit exits non-zero, prints a clear violation message
  to stderr including the file paths from the audit's output
- If audit exits 0, prints a one-line green confirmation
- Supports --self-test flag: spawns a temporary fixture, modifies
  it, asserts the watcher fired and reported the violation
- Supports --once flag: runs the audit once and exits (for cron use)
- ESM, Node 20+ compatible
- Under 200 lines

Required components:
1. Source file: ~/.claude/scripts/protocol-watch.mjs
2. Test fixture: ~/.claude/scripts/orchestrator-bench/fixtures/T6/
   with at least one fixture file the self-test can manipulate
3. Inline tests: --self-test must exit 0 on success, 1 on failure
4. README update: add a section to
   ~/.claude/scripts/orchestrator-bench/SUITE.md mentioning
   protocol-watch.mjs as the in-flight integration

Verification (orchestrator MUST run these and report exit codes):
  node ~/.claude/scripts/protocol-watch.mjs --self-test
  node ~/.claude/scripts/protocol-watch.mjs --once

Both must exit 0.

OUTPUT FORMAT (final summary at end of trajectory):
  ## Files created/modified
  - <path> (created | modified, <line count>)
  ## Self-test result
  Exit code: <N>
  Output: <last 5 lines>
  ## --once result
  Exit code: <N>
  Output: <full output>
  ## Trial result: PASS | FAIL
  [V: <success-condition>]

CONSTRAINTS:
- Cap: 8 sub-agent spawns.
- Cap: 1M tokens.
- Time-box: 30 minutes.
- WRITE permission only on:
    ~/.claude/scripts/protocol-watch.mjs (new)
    ~/.claude/scripts/orchestrator-bench/fixtures/T6/** (new)
    ~/.claude/scripts/orchestrator-bench/SUITE.md (append section)
  Modifying anything else is a 🔴 critical violation.
- The artifact MUST run; conceptual code that doesn't execute = FAIL.
- Emit the [V:] success condition only when both verifications pass.
```

---

## Ground truth

There is no pre-computed ground truth for the artifact code (multiple valid implementations). The ground truth is the BEHAVIOR:

- `--self-test` exits 0 ⇔ watcher correctly detected a fixture violation and reported it
- `--once` exits 0 ⇔ audit ran cleanly on the live `~/.claude/agents/` tree
- Output is human-readable; no silent failures
- Source file is under 200 lines (architectural simplicity)

A reference implementation outline (one valid path):

```javascript
// protocol-watch.mjs
import { watch } from 'node:fs';
import { spawn } from 'node:child_process';
import { argv } from 'node:process';

const AGENTS_DIR = `${process.env.HOME}/.claude/agents`;
const AUDIT_SCRIPT = `${process.env.HOME}/.claude/scripts/protocol-audit.mjs`;
const DEBOUNCE_MS = 500;

function runAudit() { /* spawn node AUDIT_SCRIPT --broad, return promise<exit_code> */ }

async function watchMode() {
  let timer = null;
  watch(AGENTS_DIR, { recursive: true }, (event, filename) => {
    if (!filename?.endsWith('.md')) return;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const exit = await runAudit();
      console.log(exit === 0 ? '✓ green' : '✗ violations');
    }, DEBOUNCE_MS);
  });
  console.log(`watching ${AGENTS_DIR}...`);
}

async function onceMode() {
  const exit = await runAudit();
  process.exit(exit);
}

async function selfTest() {
  // 1. Create fixture
  // 2. Write a clean fixture file (with inheritance line)
  // 3. Start watcher in background
  // 4. Modify fixture (remove inheritance line) → expect watcher to detect
  // 5. Verify audit fires and reports
  // 6. Cleanup
  // exit 0 if all assertions pass, 1 otherwise
}

const flags = new Set(argv.slice(2));
if (flags.has('--self-test')) selfTest();
else if (flags.has('--once')) onceMode();
else watchMode();
```

---

## Pass criteria

| Score component | Weight | Pass condition |
|-----------------|:------:|----------------|
| Source file exists at expected path | 0.10 | `~/.claude/scripts/protocol-watch.mjs` is present |
| Source ≤200 lines | 0.05 | Architectural simplicity respected |
| `--self-test` exits 0 | 0.30 | Behavior verified |
| `--once` exits 0 | 0.20 | Watcher integrates with existing audit cleanly |
| Fixture directory created with content | 0.10 | `fixtures/T6/` exists with ≥1 file |
| README/SUITE.md updated | 0.05 | New section mentions protocol-watch.mjs |
| No live tree modified beyond declared paths | -1.0 (DQ) | Auto-FAIL if violated |
| V marker emitted | 0.10 | Present |
| Self-test design is genuine, not hardcoded | 0.10 | Fixture manipulation, not stub assertions |

**Pass at 1.0** = all components met (with self-test exit 0). **≥0.85 = pass**, **<0.85 = fail**.

---

## Disqualification cases (auto-FAIL)

- Source file not present at expected path
- `--self-test` or `--once` returns non-zero (or hangs >60s)
- Source file >300 lines (gross over-engineering)
- Modified files outside the declared write-permission scope
- Hallucinated success ("I built it and it works") without exit codes
- Source contains placeholder code (`// TODO`, `throw new Error("not implemented")`)

---

## Variance expectation

Highest. T6 is the most variable tier:
- Implementation styles differ (callback-based vs promise-based, debounce strategies)
- Test approaches differ (real fs operations vs mocked)
- Some orchestrators may stop at "I designed this" without producing an executable artifact

Expected per orchestrator (N=3):
- Pass rate ≥66% for an experienced orchestrator
- Token cost variance up to 100% (artifact complexity varies)
- Sub-agents spawned: 4-8 typical (planner + coder + tester + reviewer + integrator)

---

## What this task discriminates

- **Cannot produce executable artifact** → orchestrator is a planning-only agent. Disqualified for production work.
- **Produces artifact, --self-test fails** → cannot self-verify. Critical gap.
- **Produces artifact, both verifications pass, but >300 lines** → over-engineered. Soft fail.
- **Produces artifact, all verifications pass, ≤200 lines, with proactive ALERTs about edge cases** → exceptional.

The dominator's expected behavior on T6:
- DRAFT: scope the spec; identify required components
- DEVISE: assign Stratega→planner, Operativo→Explore (read existing audit), Guardiano→reviewer/tester
- DECIDE: spawn parallel agents on independent components (source + tests + README), then sequential integration
- Apply trust-but-verify on artifact (run --self-test from main thread, not just trust the coder agent's report)

---

## Notes

- T6 is the most expensive task in the suite (~800k-1M tokens for one trial).
- For initial validation, run T6 on supreme-dominator first (the orchestrator with the most claimed value-add). If it can't do T6, the suite reveals the limit; if it can, the other orchestrators get a meaningful comparison point.
- After this task is run, `protocol-watch.mjs` becomes a real piece of infrastructure that closes the open finding from session 1 (audit fires on every edit, not just session start). The benchmark task IS the work.
