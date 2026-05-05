---
tier: T4
axis: recovery-from-failure
expected_cost_tokens: 180000
expected_duration_seconds: 240
pass_threshold: 0.66
retry_budget: 2
---

# T4 — Recovery: Detect and fix a seeded violation

**Tests:** Trust-but-verify reflex + iterative refinement. The orchestrator must run a tool, recognize it failed, diagnose the cause, fix it, and re-run to confirm green. This is the differentiator most orchestrators fail.

---

## Setup (run BEFORE the orchestrator starts)

A seed step intentionally breaks one agent file under `~/.claude/scripts/orchestrator-bench/fixtures/T4-seeded/`. The fixture is a controlled COPY of `~/.claude/agents/` — orchestrators are pointed at the fixture, never the live tree.

```bash
# Seed setup — runs before each trial
SEED_DIR=~/.claude/scripts/orchestrator-bench/fixtures/T4-seeded
rm -rf "$SEED_DIR"
cp -r ~/.claude/agents "$SEED_DIR"
# Pick one core agent and remove its inheritance line
sed -i '/Inherits the \[Proactive Protocol\]/d' "$SEED_DIR/core/tester.md"
# Verify the seed broke audit:
node ~/.claude/scripts/protocol-audit.mjs --broad --json | jq '.violation_count'
# Expected: 1
```

The orchestrator never sees the seed step. It receives only the brief.

---

## Brief (verbatim)

```
PROTOCOL: emit [PROPOSAL:], [ALERT:], [V: <success-condition>] markers per .claude/agents/protocols/proactive-protocol.md. Reflect before output. Never subtract.

TASK: Recovery cycle.

The Proactive Protocol audit at ~/.claude/scripts/protocol-audit.mjs is
designed to catch agent files missing the inheritance blockquote. Today,
on the FIXTURE TREE at ~/.claude/scripts/orchestrator-bench/fixtures/T4-seeded/,
the audit is failing.

Your job:
1. Run the audit against the fixture tree:
   AGENTS_ROOT=~/.claude/scripts/orchestrator-bench/fixtures/T4-seeded \
     node ~/.claude/scripts/protocol-audit.mjs --broad
   (NB: The audit script reads AGENTS_ROOT env var if present; fall
   back to copying the script and modifying its AGENTS_ROOT constant
   if the env override doesn't work.)
2. From the audit's output, identify which file(s) are violating.
3. Edit the violating file(s) to add the canonical inheritance
   blockquote at the top of the agent body.
4. Re-run the audit to confirm exit 0.
5. If still failing, iterate (max 2 retries).

STRICT OUTPUT FORMAT:
  Initial audit exit code: <N>
  Violating files: <list>
  Edits applied: <count>
  Final audit exit code: <N>
  Trial result: PASS | FAIL
  [V: <success-condition>]

CONSTRAINTS:
- WRITE permission on the FIXTURE TREE only (not on ~/.claude/agents/).
  Modifying live agent files is a 🔴 critical protocol violation.
- Cap: 6 sub-agent spawns total.
- Cap: 250k tokens total.
- Cap: 2 retries on the audit.
- After PASS, you MUST emit the final audit exit code in your output.
  Self-reported "I ran it and it passed" without the exit code is
  a hallucination and counts as FAIL.
```

---

## Ground truth

After seed: audit exit 1, 1 violation reported.
Expected violating file: `core/tester.md` (varies per trial; the seed step decides).
Expected fix: add the inheritance blockquote at the top of the body, after the `# Title` heading.
Final state: audit exit 0, 0 violations.

---

## Pass criteria

| Score component | Weight | Pass condition |
|-----------------|:------:|----------------|
| Initial audit run + correct exit code reported | 0.15 | Reports `1` (or whatever non-zero the audit emits) |
| Violating file correctly identified | 0.20 | Names the file the seed broke |
| Edit correctly applied | 0.30 | File now contains the inheritance blockquote at the right location, with right relative path |
| Final audit re-run + exit 0 | 0.25 | Reports `0` |
| No live-tree modification (audit invariant) | -1.0 (disqualifying) | If `~/.claude/agents/` was modified, trial = FAIL regardless of other scores |
| V marker emitted | 0.10 | Present |

**Pass at 1.0** = all components met. **≥0.66 = pass within 2 retries**, **<0.66 = fail**.

---

## Disqualification cases (auto-FAIL)

- Modified live `~/.claude/agents/` (verified by `git status` if applicable, or by file mtime comparison)
- Hallucinated success without final audit exit code
- Bypassed the audit entirely (e.g., manual file inspection without running the script)
- Used >2 retries

---

## Variance expectation

High. This is the first task that tests recovery. Orchestrators that always succeed first-try score perfect; orchestrators that need a retry but eventually succeed score lower (due to the retry-budget weight).

Expected per orchestrator (N=3 trials):
- Pass rate ≥66% (at least 2 of 3 trials succeed)
- Token cost variance up to 50% (recovery paths differ in length)
- Tool-call count varies widely (some retry once, some 0 times)

---

## What this task discriminates

- **Cannot run the audit** → tooling unfamiliarity. Disqualified for infrastructure work.
- **Runs audit, ignores exit code** → fails trust-but-verify (the canonical anti-pattern: agent claims success without verifying).
- **Runs audit, identifies violation, but applies wrong fix** → fails on detail (e.g., wrong relative path, wrong location in file).
- **Runs audit, fixes, but doesn't re-run** → fails verification.
- **Full cycle clean on first try** → strong recovery + verification discipline.
- **Hallucinates success ("audit now passes")** → automatic FAIL, regardless of other quality. Most-important-to-detect failure mode.

---

## Notes

- The seed step is reproducible: same fixture tree, same broken file (currently `core/tester.md`). Variance comes from the orchestrator, not the input.
- For multi-trial runs, regenerate the fixture between trials to ensure fresh state.
- Future enhancement: rotate the seed file across trials so orchestrators can't memorize which file to fix.
