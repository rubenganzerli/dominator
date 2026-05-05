---
tier: T3
axis: multi-agent-decomposition
expected_cost_tokens: 130000
expected_duration_seconds: 120
pass_threshold: 0.8
---

# T3 — Multi-agent decomposition: Function-size canonical harmonization

**Tests:** Search across many files + judgment on canonical source + multi-instance edit planning. The orchestrator must recognize this is a multi-step task and decompose appropriately.

**Status:** Run once on 2026-05-04 across 4 orchestrators (N=1). Results in this conversation's transcript; raw data not yet exported to `runs/`.

---

## Brief (verbatim)

```
PROTOCOL: emit [PROPOSAL:], [ALERT:], [V: <success-condition>] markers per .claude/agents/protocols/proactive-protocol.md. Reflect before output. Never subtract.

TASK (PLAN-ONLY — do NOT modify any files):

The project constitution at `~/CLAUDE.md` mandates "Files
under 500 lines; functions under 40 lines". One or more agent definition
files in `~/.claude/agents/` contain conflicting hardcoded
numerical limits about function/method/class size.

Your job:
1. Find every numerical hardcode about function/method/class size in
   agent files under `~/.claude/agents/`. Use whatever
   search pattern you think is right (the obvious `<NN lines` is one
   form; `(>NN lines)` is another; consider word variations:
   function/method/class).
2. Identify the canonical source. Candidates: `~/CLAUDE.md`, the
   project's worktree CLAUDE.md, or some other authority. Justify your
   choice in 1 sentence.
3. For each conflict: propose a specific edit (file path + line number +
   old text + new text). The edit should preserve the spirit of the rule
   but redirect to the canonical source.

STRICT OUTPUT FORMAT (for benchmark scoring):
  Files identified: <count>
  Files: <list with file:line pairs>
  Canonical: <chosen source>
  Rationale: <one sentence>
  Proposed edits:
    1. <file>:<line>
       before: <text>
       after: <text>
    2. ...
  [V: <success-condition>]

CONSTRAINTS:
- Plan-only mode: do NOT use Edit, Write, or MultiEdit. Read-only.
- Cap: 4 sub-agent spawns max.
- Cap: 200k tokens total.
- Be decisive. Pick a canonical, propose edits, end. No "it depends".
```

---

## Ground truth

Computed via broad grep on 2026-05-04:

```
agents/core/coder.md:181                    - Keep functions small (<20 lines)
agents/analysis/code-review/analyze-code-quality.md:148    - Long methods (>50 lines)
agents/analysis/code-review/analyze-code-quality.md:149    - Large classes (>500 lines)
agents/core/reviewer.md:268                 (<400 lines per review)  ← OUT OF SCOPE: PR review size, not function size
```

**Canonical:** `~/CLAUDE.md` line 34: `- Files under 500 lines; functions under 40 lines`. Worktree CLAUDE.md line 99 mirrors but does not own the constant.

**Numerical conflicts vs canonical 40 lines for functions:**
- `coder.md:181` — `<20` is stricter than `<40` (CONFLICT)
- `analyze-code-quality.md:148` — `>50` is looser than `>40` (CONFLICT)
- `analyze-code-quality.md:149` — `>500` for classes; numerically aligned with file rule, but applies to "classes" (mismatched scope, not numerical conflict)
- `reviewer.md:268` — `<400 lines per review` is PR diff size, different domain entirely (OUT OF SCOPE)

**Cross-file insight (bonus credit):** The two violators contradict EACH OTHER — coder is stricter, analyze is looser. Same codebase, same purpose, opposite directions. Only `supreme-dominator` caught this in the 2026-05-04 trial.

---

## Pass criteria

| Score component | Weight | Pass condition |
|-----------------|:------:|----------------|
| Found 3 in-scope hardcodes | 0.3 | All three (coder.md:181, analyze:148, analyze:149) named |
| Found reviewer.md:268 OR explicitly excluded it | 0.1 | Mentions or correctly out-of-scopes |
| Canonical source = `~/CLAUDE.md` | 0.2 | With sound rationale (Layer-3 / global authority / etc.) |
| Proposed edits redirect to canonical | 0.2 | Each edit references `~/CLAUDE.md` rather than restating numbers |
| V marker emitted | 0.1 | Present |
| Cross-file contradiction noticed (BONUS) | +0.1 | Awards over-1.0 score for finding the strict-vs-loose contradiction |

**Pass at 1.0** = all components met. **≥0.8 = pass**, **<0.8 = fail**.

---

## Variance expectation

Medium-high. Orchestrators may differ on:
- Whether `analyze:149` (>500 classes) is in scope (numerically aligned but mis-scoped — three valid views)
- Whether `reviewer:268` is in scope (different domain)
- How many edits to propose (2, 3, or 4)

Variance >0.4 across trials suggests inconsistency. The 2026-05-04 N=1 run showed sparc-coord proposing 4 edits, hierarchical-coordinator proposing 2, task-orchestrator and supreme-dominator each proposing 3. All four chose `~/CLAUDE.md` as canonical.

---

## What this task discriminates

- **Cannot find all 3 in-scope hardcodes** → search insufficient, missed a file. Failure on multi-file recon.
- **Found all but couldn't decide** ("it depends") → fails the decisiveness constraint.
- **Found all + cross-file contradiction noticed** → high synthesis quality (the dominator persona's claimed value-add).
- **Used 5+ tool calls** → inefficient; 2-3 reads should suffice for a known-set-of-4-files task.

---

## Reference results (N=1, 2026-05-04)

| Orchestrator | Tokens | Tools | Files found | Edits | Cross-file ALERT? | Score |
|--------------|:------:|:-----:|:-----------:|:-----:|:-----------------:|:-----:|
| task-orchestrator | 120,054 | 5 | 3/4 | 3 | No | 0.85 |
| hierarchical-coordinator | 127,232 | 5 | 4/4 | 2 | No | 0.90 |
| sparc-coord | 124,198 | 5 | 4/4 | 4 | No | 0.85 |
| **supreme-dominator** | 121,078 | **2** ⭐ | 4/4 | 3 | **Yes** ⭐ | **1.0** |

Supreme-dominator wins on tool efficiency (60% fewer) and cross-file synthesis (sole orchestrator to catch the contradiction).

---

## Notes

- This is a real outstanding issue in `~/.claude/agents/` (the bonus finding from the dominator validation work on 2026-05-04). Solving it closes a `[REDUNDANCY]` violation under Layer-3 of the project's correctness framework.
- For future trials, run AFTER a clean reset of the agents tree to avoid contamination from previous trial fixes.
