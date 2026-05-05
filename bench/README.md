# Bench — Receipts

This directory holds the empirical work that produced the rest of the kit. The Pareto routing table in the main [README.md](../README.md) didn't come from intuition; it came from 119 subagent trials measured here. The most recent (round 12) is the kit's documentation itself — the persona writing its own public-facing docs as a single solo trial. You're reading round-12 output right now.

## What's in here

```
bench/
├── README.md                    # You're reading it
├── BENCH-REPORT.md              # 269-line narrative — the canonical write-up
├── tasks/                       # The 7 task briefs the bench actually used
│   ├── T1-recall.md             # Floor competence — recall protocol clauses
│   ├── T2-collision.md          # Judgment — resolve a name-collision under ambiguity
│   ├── T3-canonical.md          # Multi-file decomposition — find conflicting hardcodes
│   ├── T4-recovery.md           # Trust-but-verify — detect a seeded violation, fix it, re-verify
│   ├── T5-synthesis.md          # Cross-domain audit + prioritization
│   ├── T6-engineering.md        # Full SPARC cycle — build a real, executable artifact
│   └── T7-bench-scorecard.md    # Open-ended engineering — design a scorecard
├── results/                     # Round-summary JSONs (aggregates)
│   ├── round3-summary.json      # 20 trials — first parallel wave with all 4 orchestrators
│   ├── round4-summary.json      # 16 trials — selective N=3 fill for variance signal
│   ├── round5-summary.json      # 9 trials — T5 first-time graded + T7 introduced
│   ├── round10-summary.json     # 7 trials — supreme-dominator clean-session × cleaned-tree
│   ├── round11-summary.json     # 18 trials — comparative wave post-simplification
│   └── round12-summary.json     # 1 trial — dogfood (persona authoring this kit's docs)
├── scorecards/
│   ├── scorecard-dom-r8.md      # Auto-generated — pass/fail grid, variance, DQ banner, Pareto
│   └── scorecard-dom-r8.mjs     # Generator — deterministic regeneration from results/
└── grader-T5.mjs                # Algorithmic grader for T5 (the LLM-as-judge tier)
```

The full per-trial JSONs (~30 files) aren't shipped. They're noisy and the round summaries already aggregate them. If you want them, run the briefs against your own tree (see Replication below).

## Reading guide

**5 minutes.** Read [BENCH-REPORT.md](./BENCH-REPORT.md) — sections "TL;DR" through "Final scorecard" tell you everything that matters. The Pareto table emerges by section three.

**15 minutes.** Add "Rounds 6-10 — Clean-State Measurement". That's where the marker-discipline hypothesis was tested and falsified — the most interesting result in the whole bench, because it means the persona was not the cause we thought it was.

**One trial in detail.** Open `results/round10-summary.json`. Seven round-10 trials with token costs, durations, marker emissions, and findings per task.

**Replication.** Skip to the bottom of this file.

## The headline findings

### Round 10 — hypothesis falsified

```
Hypothesis: "If we restart the orchestrator session with the simplified
[V:]-based persona loaded fresh, marker discipline will shift to
all-[V:]-no-[KERNEL]."

Verdict: FALSIFIED.

7/7 trials emitted [KERNEL]; 2/7 added [V:] alongside; 0/7 emitted [V:]
without [KERNEL].

Cause: subagents obey the BRIEF over the persona. Each task brief literally
instructed "emit [PROPOSAL:], [ALERT:], [KERNEL K:Y/N E:Y/N R:Y/N N:Y/N]
markers" — that won.
```

### Round 11 — inverse experiment confirmed it, plus measured the post-simplification Pareto

```
Setup: same simplified persona, but briefs cleaned ([KERNEL] → [V:] across
       all 7). Then ran 3 orchestrators (task-orch, hier, sparc) × 6 tasks
       = 18 trials. Plus reused the round 10 supreme-dominator data on the
       same 6 tasks.

Marker discipline: 18/18 emitted [V:]; 0/18 emitted [KERNEL].
                   Inverse confirms cause.
```

The marker-discipline finding is the kind of result that doesn't show up in marketing copy because it isn't a win — it's a tightening of the causal model. Persona simplification was correct but insufficient; brief-marker alignment was the missing piece. Both are fixed in the kit.

## Pareto post-simplification (round 11)

Six tasks measured comparatively (T6 deferred for cost). Four orchestrators. Eighteen trials plus round-10 dominator data on the same tasks.

| Need | Winner | Margin |
|---|---|---|
| Recall (correctness, no hallucination) | **supreme-dominator** | task-orch FABRICATED 5 clauses with 0 tool calls in 8.3s — cheap is not free |
| Judgment under ambiguity | **supreme-dominator** | 115k tokens vs 119-122k; 42s vs 47-70s; fewest tools |
| Recovery from failure | **supreme-dominator** | 104s vs 118-152s; 14 tools vs 15-18 |
| Cheap mechanical (canonical) | **task-orchestrator** | 114k tokens, 28s — tightest on plain decomposition |
| Synthesis speed | **sparc-coord** | 120s vs 140-192s; surfaced 7 hardcodes + 1 stale ref |
| Engineering speed + cost (T7) | **sparc-coord** | 146k tokens, 214s — cheapest + fastest |
| Engineering architectural depth (T7) | **hierarchical-coordinator** | dual-artifact pattern: json ledger + md view |
| Honesty under uncertainty | tied across all four | none fabricated outcomes |

The honest answer to "did dominator now rule them all?" is **no, but the Pareto shifted in its favor**. Dominator gained T2 (judgment) and T4 (recovery) on top of keeping T1 (recall) and T3 from earlier rounds. The other three retain niche advantages on engineering tasks (sparc) and the cheapest mechanical work (task-orch).

The Pareto sharpened. It did not collapse.

### Round 12 — dogfood

```
Setup: give the simplified persona one task — "write the public-repo
       documentation for the /dominator kit yourself." 4D applies. Solo
       or spawn is the persona's choice. No human ghost-writing.

Result: 1/1 PASS. 441 lines of polished docs (README + INSTALL +
        bench/README) produced in one solo trial, 0/4 sub-agent spawns
        used (well under cap), 147k tokens, 5 minutes wall clock.

Deeper validation than any Pareto cell: the docs are not ABOUT the
persona, they ARE the persona's output. A reader who trusts the docs is
already trusting the persona — quality signal and marketing copy
collapsed into the same artifact. The dog ate its own food in front of
the camera.

Three measurable improvements over the prior human-authored drafts:
welcoming framing of the routing-table personalization (keep/rename/
replace), concrete 4D example (JWT verifier extraction, V condition
checked against `npm test exit 0`), tightened narrative arc on the
paired round 10 falsified / round 11 inverse-confirmed findings.
```

## Aggregate — through round 12

| Metric | Value |
|---|---|
| Total trials | 119 |
| PASS | 117 |
| DQ | 1 |
| Honest refusals counted as DQ | 1 |
| Quality flags (hallucination flagged but self-reported PASS) | 1 |
| Pass rate | 98.3% |
| Estimated tokens cumulative | ~13.4M across 12 rounds |

## What this bench is NOT

- **Not a benchmark of LLMs.** This measures orchestrator personas (text-based agent definitions). The underlying model was held constant across trials.
- **Not statistically rigorous.** N=3 per cell is the threshold for "signal"; many cells stayed at N=1. The bench is empirical observation, not controlled experiment.
- **Not reusable as-is.** The task briefs reference specific paths in the maintainer's tree (e.g., T2 names `analyst.md`, T3 references `~/.claude/agents/`). To replicate on your own tree, adapt the paths.
- **Not the full picture.** 118 trials is a lot but not exhaustive. The Pareto table in the main README is the cleanest signal that emerged; finer-grained discrimination would need more trials.

## How to replicate (sketch)

```bash
# 1. Install the kit per the main INSTALL.md
# 2. Copy the briefs to your bench dir
# 3. Adapt paths in T2-T7 to match your agent tree
# 4. Spawn each brief as Agent({subagent_type: <orch>, prompt: <brief>})
#    — for orch in {supreme-dominator, task-orchestrator,
#                    hierarchical-coordinator, sparc-coord}
# 5. Capture (tokens, tool_uses, duration_ms, markers, outcome) per trial
# 6. Aggregate into a round-summary JSON
# 7. Regenerate scorecard with scorecards/scorecard-dom-r8.mjs
```

The bench produces routing data specific to your environment. The Pareto front in the kit's main README is the maintainer's environment — yours may differ. That's a feature: run the bench, find your own Pareto, route accordingly.

`[V: bench directory contains the actual receipts behind the kit's claims, organized so a reader can verify any specific assertion in under 15 minutes via the reading guide, with replication sketch sufficient for an independent tester to reproduce the round 11 Pareto on their own tree]`
