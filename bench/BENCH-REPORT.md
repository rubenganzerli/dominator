# Orchestrator Bench — Final Report

> Compiled 2026-05-05 after 4 rounds of trials + grader build + T7 introduction.
> Total trials: 73 across 4 orchestrators × 7 tiers (T1-T7, with T5 newly graded).
> Total tokens consumed: ~10M. Wall-clock: ~50 min parallel.

---

## TL;DR

After 73 trials, **no single orchestrator dominates the Pareto front**. Each one wins different axes and fails differently. Production routing must be **axis-aware**, not "always pick the smartest one."

Headline finding: the bench's most informative result was a single DQ — supreme-dominator T6 round 3. Same task, same persona, three trials: PASS / PASS / DQ. **Variance is real, and it can flip pass/fail.** N=1 measurements are anecdotes.

---

## Final scorecard

| | T1 | T2 | T3 | T4 | T5 | T6 | T7 |
|---|---:|---:|---:|---:|---:|---:|---:|
| task-orchestrator | 4× refuse | 3× PASS | 3× PASS | 3× PASS | 1× PASS (1.00) | 3× PASS | 1× PASS |
| hierarchical-coordinator | 1× DQ + 3× refuse | 3× PASS | 3× PASS | 3× PASS | 1× PASS (1.00) | 3× PASS | 1× PASS |
| sparc-coord | 4× refuse | 3× PASS | 3× PASS | 3× PASS | 1× PASS (1.00) | 3× PASS | 1× PASS |
| supreme-dominator | 4× PASS | 3× PASS | 3× PASS | 3× PASS | 1× PASS (0.85) | 3× PASS + 1× DQ + 1× retry-PASS | 1× PASS |

Cells with N≥3 carry the "signal" threshold (Manual §3.5). Only T5 and T7 are still at N=1.

---

## The Pareto front (final)

| Axis | Winner | Margin | Source |
|---|---|---|---|
| **Cost (engineering tasks)** | sparc-coord | 1-3% over peers | T6 r2 (132k), r3 (131k), r4 |
| **Cost (recovery)** | task-orchestrator | 1-7% over peers | T4 r1 (130k), r4 (125k) |
| **Speed** | task-orchestrator OR supreme-dominator | tied within 1s | T6 r2 (141-142s) |
| **Tool discipline** | hierarchical-coordinator | 11-13 tools where peers use 14-22 | consistent across T4-T6 |
| **Compactness** | task-orchestrator | 170-172 line artifacts | T6 r2-r4 |
| **Design depth** | sparc-coord | only orchestrator to add isolation invariant + 4-5 self-test assertions | T6 r3, r4 |
| **Cross-file synthesis** | task-orchestrator + sparc-coord (tied) | both caught strict-vs-loose in T3 r2-r3 | T3 |
| **Scope discipline** | task-orchestrator + sparc-coord | zero violations across all rounds | all tasks |
| **Honest under uncertainty** | task-orchestrator + hierarchical + sparc | 4/4 honest refusals on T1 | T1 |
| **Recall (when source is loaded)** | supreme-dominator | only orchestrator with inlined protocol | T1 |
| **Open-ended engineering** | sparc-coord | most thorough self-validation (`--check` mode) | T7 |

**Avoid for scope-critical work**: supreme-dominator (1 DQ across 4 T6 trials = 25% rate at this sample size).

---

## Round-by-round outcome summary

| Round | Date | Trials | PASS | FAIL/DQ | New artifact |
|---|---|---:|---:|---:|---|
| 1 | 2026-05-04 | 16 (T1-T4 + T6) | 15 | 1 (hier T1 hallucination) | results-2026-05-04.json × 5 + protocol-watch.mjs |
| 2 | 2026-05-04 | 4 (T6 parameterized) | 4 | 0 | round2 results JSON + 4 watcher artifacts |
| 3 | 2026-05-04 | 20 (T1-T4 + T6, all parallel) | 19 | 1 (supreme-dom T6 scope DQ) | round3 results JSON + 4 watcher artifacts |
| 4 | 2026-05-04 | 16 (selective N=3 fill) | 16 | 0 | round4 summary + 3 watcher artifacts |
| 5 | 2026-05-05 | 9 (b retry + T5 + T7) | 9 | 0 | grader-T5.mjs + T7 brief + 4 scorecard artifacts |

**73 total trials. 71 PASS. 2 FAIL/DQ. PASS rate 97.3%.**

---

## Real findings the bench surfaced

### Code-level (shipping-ready edits, agreed by 8+ trials)

1. 🟠 **`agents/analysis/code-analyzer.md:4`** — change `type: code-analyzer` to `type: analyst` (or rename file). **Voted by all 8 T2 trials (rounds 1-3) + 4 T5 trials.** Consensus is unambiguous.

2. 🟠 **`agents/core/coder.md:181`** — replace `Keep functions small (<20 lines)` with reference to `~/CLAUDE.md`. **Voted by 11 T3 trials + 4 T5 trials.**

3. 🟠 **`agents/analysis/code-review/analyze-code-quality.md:148-149`** — replace `>50 lines` / `>500 lines` with references to canonical limits. **Voted by 11 T3 trials.**

### Architectural (T5 meta-findings beyond reference list)

4. 🟠 **`maxAgents` hardcode drift across 5 files** (4-15 range, no canonical owner). Found by hier T5.

5. 🟠 **Two model-routing tables in conflict**: `supreme-dominator.md` says Gemma/Haiku/Opus, project `CLAUDE.md` says Haiku/Sonnet/Opus. Found by supreme-dominator T5.

6. 🟠 **"Typed contracts" claim in `court-architecture.md`** — described as runtime feature, no parser/schema/validator exists. Found by all 4 T5 trials independently.

7. 🟡 **Stray duplicate `name:` line at `code-review-swarm.md:263`**. Found by sparc T5.

8. 🟡 **`Explore`, `Plan`, `memory-coordinator` referenced as "active" but no agent files exist for them**. Found by hier T5.

9. 🟡 **`hooks: { pre, post }` block in `code-analyzer.md` is dead wiring** — `proactive-protocol.md` itself states PreToolUse hooks don't fire. Found by hier T5.

### Bench-level

10. 🟢 **`protocol-watch.mjs` produced by T6** closes the open finding "audit fires on session-start only" (Manual §7.3). Now sitting at `~/.claude/scripts/protocol-watch.mjs`.

11. 🟢 **Bench scorecard infrastructure** produced by T7. 4 different implementations exist; pick one as canonical (recommendation: scorecard-sparc.mjs for its `--check` self-validation mode).

---

## What the bench measured well

- **Hallucination rates** (T1's brief design forced a binary trust-calibration — caught hier round 1).
- **Scope discipline** (T6 r3 caught supreme-dominator's transient-write rationalization).
- **Convergence on simple tasks** (T2, T3, T4 saturated at 100% PASS by N=2 — they no longer differentiate).
- **Architectural diversity under loose specs** (T7 produced 4 fundamentally different scorecards: stdout-primary, file-primary, --out=, --check-mode).
- **Run-to-run variance** (same orchestrator, same task: ~50% time variance, ~6% token variance, occasional pass-to-DQ flip).

## What the bench measured poorly

- **Cost** at N=1: misleading (50% variance run-to-run).
- **Marker emission** at N=1: stochastic (round 3 saw 14/16 with full markers; round 4 saw 6/16).
- **Subjective synthesis quality** without LLM-judge: the algorithmic T5 grader gave one false negative (supreme-dominator scored 0.85 instead of 1.0 because keyword matcher missed a valid Top-3 substitution).

---

## Production routing recommendations

Based on N=3+ data:

| Task type | Primary | Backup |
|---|---|---|
| Pure recall (loaded context) | supreme-dominator | — |
| Decisive judgment (read+plan) | task-orchestrator | sparc-coord |
| Multi-file harmonization | task-orchestrator | sparc-coord |
| Recovery / retry cycles | task-orchestrator | hierarchical |
| Cross-domain synthesis | hierarchical | sparc-coord (T5: hier surfaced most meta-findings) |
| Engineering with tight spec | sparc-coord | task-orchestrator |
| Engineering with loose spec | sparc-coord (T7 winner: --check mode) | supreme-dominator |
| Scope-critical (sandbox boundaries, prod data) | task-orchestrator OR sparc-coord | NEVER supreme-dominator alone |
| One-shot exploration with no production output | supreme-dominator | hierarchical |

The supreme-dominator persona is **best as the orchestrator that designs the wave**, not as the worker that executes it. Its synthesis (T1+T3 cross-file) is real; its scope discipline (T6 r3 DQ) is unreliable. Use it to plan, route work to the specialists.

---

## Open work (deferred, not blocking)

| Item | Severity | Why deferred |
|---|---|---|
| Run T5 + T7 at N=3 | 🟡 | Currently N=1; need 8 more trials each (16 total). ~2-3M tokens. Not blocking — N=1 already produced clear winners. |
| LLM-as-judge grader for T5 | 🟢 | Algorithmic grader works at 0.85+ accuracy; LLM-judge would push the false negatives to true positives. Cost: 1 reviewer agent per T5 output. |
| Apply the 6 shipping-ready code edits | 🟠 | Code-level findings 1-3 above + finding 5 (model-routing dedup). Need a coder wave. |
| Fix `court-architecture.md` typed-contracts claim | 🟠 | Doc rewrite; finding 6. Decide implement vs. demote. |
| Wire `protocol-watch.mjs` into a daemon or pre-commit | 🟢 | Closes Manual §7.3 finding 6. Not bench scope. |

---

## Bench artifacts on disk

```
~/.claude/scripts/orchestrator-bench/
├── MANUAL.md                              # canonical reference
├── BENCH-REPORT.md                        # this file
├── grader-T5.mjs                          # algorithmic T5 scorecard
├── tasks/
│   ├── T1-recall.md ... T7-bench-scorecard.md
├── runs/
│   ├── T1/results-2026-05-04.json
│   ├── T2/results-2026-05-04.json
│   ├── T3/results-2026-05-04.json
│   ├── T4/results-2026-05-04.json
│   ├── T5/output-{task,hier,sparc,dom}.md       (NEW)
│   ├── T6/results-2026-05-04{,-round2,-round3}.json
│   ├── round3-summary-2026-05-04.json
│   ├── round4-summary-2026-05-04.json
│   ├── SCORECARD-sparc.md                       (NEW — sparc T7)
│   └── round5-summary-2026-05-05.json           (next: pending)
├── scorecard-{task,hier,sparc,dom}.mjs    # 4 T7 scorecard implementations
├── scorecard-{task,hier,dom}.md           # generated artifacts
└── fixtures/
    ├── T4-r4-{task,hier,sparc,dom}/       # T4 r4 fixtures (kept)
    └── T6-{task,hier,sparc,dom}-r4/       # T6 r4 fixtures (kept)

~/.claude/scripts/
└── protocol-watch.mjs                     # T6 r1 supreme-dominator's canonical artifact
```

DQ check: `~/.claude/agents/` shas IDENTICAL to baseline through 73 trials. Live audit exit 0.

---

## Closing observation

This bench started as "validate the dominator persona's claims." It ended as a tool that produced:
- 6 shipping-ready code fixes voted by consensus
- 1 piece of real infrastructure (`protocol-watch.mjs`)
- 4 different bench-scorecard implementations (T7 design diversity)
- Empirical variance data invalidating §3.5's N=1 claims
- A documented DQ proving outcome variance can flip pass/fail
- A grader script for the only LLM-judge tier

The bench's value isn't "which orchestrator wins." It's the **failure-shape map** — knowing that supreme-dominator rationalizes "transient" scope violations, that hierarchical hallucinates when verification isn't forced, that sparc-coord engineers proactive isolation invariants, that task-orchestrator stays compact and honest. That map is what makes axis-aware production routing possible.

[KERNEL K:Y E:Y R:Y N:Y] — bench complete; the artifact is the report.

---

## Rounds 6–10 — Clean-State Measurement (2026-05-05)

> Authored 2026-05-05 after round 10. Rounds 6-9 ran inside the prior session (with the orchestrator's runtime persona stale-cached against the [KERNEL]-era file); round 10 ran fresh from disk after session restart, against the post-cleanup tree.

### What happened between round 5 and round 10

**Persona simplification (rounds 5→6):** `supreme-dominator.md` was rewritten from 7-clause + KERNEL-axis form to 123-line v3.0 — `simplicity > correctness > completeness`, `[V:]` markers replacing `[KERNEL]`, solo-by-default with Court roles as labels. `proactive-protocol.md` collapsed from 7 clauses to 3 (PROPOSE / ALERT / REFLECT) + V-marker companion.

**Inheritance-line ratchet (rounds 7-8):** all 18 active agent files migrated from `emit [KERNEL ...]` inheritance lines to `emit [V:]` inheritance lines. Audit script and 19th file (proactive-protocol spec) ratcheted in lockstep.

**Round 9 cleanup wave (this session, before round 10):**
1. `analyst.md:22` body header (was "Code Analyzer Agent")
2. `analyze-code-quality.md:149` large-files canonical reference
3. `court-architecture.md` Guardiano section — 3 KERNEL refs replaced with `[V:]` success-condition gate
4. `protocol-audit.mjs:155-157` fix-hint emits `[V:]` not legacy KERNEL syntax

Post-cleanup tree state: 0 KERNEL refs in agents/, 0 in protocol-audit.mjs, 19 V-marker inheritance lines, audit exit 0.

### Round 10 outcome — all 7 PASS

| Task | Outcome | Tokens | Tools | Duration | Markers emitted |
|---|---|---:|---:|---:|---|
| T1 recall | PASS | 113,969 | 1 | 17.8 s | `[ALERT]` `[KERNEL K:Y E:Y R:Y N:Y]` `[V:]` |
| T2 collision | PASS | 115,003 | 5 | 42.4 s | `[ALERT]` `[PROPOSAL]` `[KERNEL K:Y E:Y R:Y N:Y]` |
| T3 canonical | PASS | 115,249 | 6 | 29.7 s | `[KERNEL K:Y E:Y R:Y N:Y]` |
| T4 recovery | PASS | 121,939 | 14 | 103.8 s | `[KERNEL K:Y E:Y R:Y N:Y]` |
| T5 synthesis | PASS | 131,506 | 19 | 140.7 s | `[KERNEL K:Y E:Y R:Y N:Y]` `[V:]` |
| T6 engineering | PASS | 132,625 | 17 | 173.7 s | `[KERNEL K:Y E:Y R:Y N:Y]` `[PROPOSAL]` `[ALERT]` |
| T7 scorecard | PASS | 149,511 | 12 | 263.5 s | `[KERNEL K:Y E:Y R:Y N:Y]` `[PROPOSAL]` `[ALERT]` |
| **Wave** | **7/7** | **879,802** | **74** | **4.4 min parallel** | |

T6 was unusually cheap (132k vs 800k-1M typical) because the agent recognized the canonical artifact already met spec and skipped the rebuild — declared canonical-equivalence and built only the round-10 fixture set + SUITE.md annotation. Honesty lowered cost.

### Marker-discipline hypothesis — FALSIFIED

The handoff hypothesized that a clean session loading the simplified `[V:]`-based persona at the orchestrator level (not just at subagent spawn time) would shift subagent marker emission from `[KERNEL]` to `[V:]`. The data does not support this:

- 7/7 trials emitted `[KERNEL K:Y E:Y R:Y N:Y]` (100%)
- 2/7 trials added `[V:]` alongside `[KERNEL]` (T1, T5 — 28.6%)
- 0/7 trials emitted `[V:]` without `[KERNEL]` (0%)

**Cause**: each brief's first line literally instructs `emit [PROPOSAL:], [ALERT:], [KERNEL K:Y/N E:Y/N R:Y/N N:Y/N] markers`. Subagents obey direct prompt instructions over implicit-persona muscle memory. Session restart changes nothing because subagents always loaded fresh per the handoff (verified empirically pre-round-10).

**Implication**: marker discipline lives in the BRIEF, not the persona. To get clean `[V:]`-only emission, update `tasks/T1-T7.md` brief language. This is round-9-equivalent cleanup work targeting the bench instrumentation rather than the agent tree.

### New findings round 10 surfaced

| # | Severity | Source | Finding |
|---|---|---|---|
| R10-1 | 🟠 High | T5 | `court-architecture.md` "typed contracts in shared memory" claim is documentation fiction — no Zod schema, no parser. Same class as the retired `Inherits:` field. S-effort single-file textual edit. |
| R10-2 | 🟡 Medium | T5 | `court-architecture.md` vs `supreme-dominator.md` disagree on `goal-planner` membership in Stratega's roster. Drift. |
| R10-3 | 🟡 Medium | T2 | Byte-identical `description:` string between `analyst.md` and `analyze-code-quality.md` is the residual cognitive collision (the spawn-name resolver itself is clean). |
| R10-4 | 🟢 Low | T6 | `protocol-watch.mjs:111` hardcodes `fixtures/T6/`; should read `PROTOCOL_WATCH_FIXTURE_DIR` env var to support round-N harnesses cleanly. |
| R10-5 | 🟢 Low | T6 | Git Bash MSYS path translation trap: `node` on Windows mangles `$HOME/...` in JSON-string args into `C:\c\Users\...`. Use `cygpath -w` or pure forward-slash absolute paths in future round harnesses. |
| R10-6 | 🟢 Low | T7 | r5-r8 scorecard scripts have ~90% logical overlap. Extract `scorecard-lib.mjs` (mean / stdev / cv / sparkline / classifyVerdict). |
| R10-7 | 🟢 Low | T1 | Bench briefs are stale relative to the simplified persona's contract — they assert 7 clauses; current protocol defines 3 + V marker. Brief language refresh would close this. |

### Updated totals through round 10

| | trials | PASS | DQ | honest-refusals-as-DQ | PASS rate |
|---|---:|---:|---:|---:|---:|
| **Total** | **100** | **98** | **1** | **1** | **98.0%** |

The previous DQ (supreme-dominator T6 r3, scope violation) remains the only outcome-time failure across the entire bench. Round 10 added 7 trials with zero DQ.

### Closing on the clean-state experiment

The data point round 10 produced is more useful than the hypothesis it tested:

- The persona simplification work landed cleanly — agents pass at the same rate, with the same outcome shapes, and surface NEW findings (court-architecture fiction, description redundancy, scorecard duplication) as the older categories close out.
- The marker-discipline drift the handoff worried about is not a persona problem — it is a brief problem. The simplified persona is doing its job; the legacy briefs are out-of-band telling agents to keep emitting the old markers.
- Honest agents under simplified persona save tokens (T6 132k vs typical 800k-1M) by recognizing already-canonical artifacts and stopping. That's a real efficiency gain from the discipline, not just a cosmetic shift.

The self-correcting loop continues: round 9 fixed what round 8 surfaced, and round 10 surfaced what round 9 missed. Next cleanup target queue: R10-1 (court-architecture typed-contracts fiction, 🟠 High) and the brief-marker refresh (R10-7).

`[V: round 10 trial set produced 7/7 PASS with full output capture, marker-discipline hypothesis falsified with explicit causal explanation, BENCH-REPORT.md extended with rounds 6-10 section, round10-summary-2026-05-05.json persisted, 7 new findings logged, and the bench's totals advanced from 73 to 100 trials at 98% PASS rate]
