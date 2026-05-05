---
tier: T7
axis: open-ended-engineering
expected_cost_tokens: 200000
expected_duration_seconds: 300
pass_threshold: 0.75
graded_by: automated + light human review
---

# T7 — Open-ended engineering: Build the bench scorecard

**Tests:** Architectural judgment under loose specification. Unlike T6 (which prescribes specific behavior), T7 gives an outcome and lets the orchestrator choose the form. This re-introduces the discrimination axis that T6's tight spec eliminated.

**Origin:** T6 round 4 produced 12 functionally-equivalent watcher artifacts. The bench needs a brief that lets architectural style differentiate.

---

## Brief (verbatim)

```
PROTOCOL: emit [PROPOSAL:], [ALERT:], [V: <success-condition>] markers per .claude/agents/protocols/proactive-protocol.md. Reflect before output. Never subtract.

TASK: Build a bench scorecard.

The orchestrator-bench has accumulated trial results in JSON files under
~/.claude/scripts/orchestrator-bench/runs/. Build an artifact that consumes
those files and emits a human-readable scorecard. Output format, storage
location, and regeneration mechanism are YOUR architectural choice.

Required outcomes (the artifact MUST):
- Read all results-*.json and round*-summary*.json files under runs/
- Surface PASS/FAIL/DQ outcomes per (orchestrator × task) cell
- Show variance: number of trials per cell, pass rate, cost variance bar
- Make supreme-dominator's T6 r3 DQ visible (don't hide it as "outlier")
- Be auto-regenerable: running the artifact again on the same data produces
  the same output (deterministic)
- Include a one-line interpretation per cell where N≥3 (e.g., "stable PASS",
  "high variance", "uneven")

Constraints (firm):
- Artifact path: YOUR choice under ~/.claude/scripts/orchestrator-bench/
  (NOT under ~/.claude/agents/ — that path is forbidden)
- Output location: YOUR choice (markdown file, HTML, JSON, CLI stdout)
- Storage: YOUR choice (regenerate on each run vs cached)
- Source files to read: ~/.claude/scripts/orchestrator-bench/runs/**
- DO NOT modify ~/.claude/agents/** (live tree)
- DO NOT modify any results-*.json or round*-summary*.json file
- Verification: run YOUR artifact at least twice; the output must be byte-identical the second time

OUTPUT FORMAT (final summary at end of trajectory):
  ## Architectural decisions
  - Output format: <markdown | html | json | cli>
  - Output location: <path>
  - Storage strategy: <regenerate | cached | other>
  - Source files read: <count>
  ## Files created/modified
  - <path> (created | modified, <size>)
  ## Verification
  - First run exit code: <N>
  - Second run exit code: <N>
  - Output byte-identical: <Y/N>
  - DQ surfaced: <Y/N>
  ## Trial result: PASS | FAIL
  [V: <success-condition>]

CAPS: 6 sub-agent spawns / 500k tokens / 15 minutes.
```

---

## Pass criteria

| Score component | Weight | Pass condition |
|-----------------|:------:|----------------|
| Artifact exists at chosen path | 0.10 | path declared and present |
| Reads ≥3 results-*.json files | 0.15 | actually consumes the data |
| Surfaces all 4 orchestrators | 0.10 | covers full dataset |
| Surfaces all 5 tested tiers (T1-T4, T6) | 0.10 | acknowledges T5 is blocked |
| DQ visible in output | 0.15 | supreme-dominator T6 r3 not hidden |
| Output deterministic across 2 runs | 0.20 | byte-identical reproducibility |
| Architectural choice is documented | 0.05 | rationale visible |
| Architectural choice is non-trivial | 0.05 | not just `cat *.json` |
| V marker emitted | 0.10 | present |

**Pass at 1.0** = all met. **≥0.75 = pass**, **<0.75 = fail**.

**Disqualification**: modified ~/.claude/agents/, or modified existing results JSON files, or hallucinated success without exit codes.

---

## What this task discriminates

T6 forced a single architectural pattern (single source + fixture + env-var seams). T7 leaves four major architectural choices open:
- **Format**: HTML page (interactive) vs Markdown (greppable) vs JSON (machine) vs CLI table (terminal)
- **Storage**: regenerate-on-run vs cache-with-staleness-check
- **Aggregation**: simple flat table vs nested per-orchestrator vs per-task pivot
- **Scope**: read-only viewer vs CI-integrated check

Different orchestrators will pick different combinations. That's the discrimination signal. Equal-quality artifacts at different points in this design space tell us which orchestrator's instincts match which production need.

The ground truth on output content is uniform; the ground truth on FORM is "anything that satisfies the constraints, with a documented rationale."

---

## Notes

- Built 2026-05-04 to test the hypothesis that loose specs re-introduce judgment discrimination after T6 saturated at 100% PASS.
- The artifact this task produces (the scorecard) is REAL infrastructure for the bench — it closes the gap "the bench has data but no consolidated view."
- Multiple orchestrators run in parallel must use parameterized output paths to avoid collision (same pattern as T6 round 2+).
