# Bench — Receipts

This directory holds the empirical work that produced the rest of the kit. The Pareto routing table in the main [README.md](../README.md) didn't come from intuition; it came from 100 subagent trials measured here.

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
├── results/                     # Round-summary JSONs (aggregates, not per-trial)
│   ├── round3-summary-2026-05-04.json    # 20 trials — first parallel wave with all 4 orchestrators
│   ├── round4-summary-2026-05-04.json    # 16 trials — selective N=3 fill for variance signal
│   ├── round5-summary-2026-05-05.json    # 9 trials — T5 first-time graded + T7 introduced
│   ├── round10-summary-2026-05-05.json   # 7 trials — supreme-dominator clean-session × cleaned-tree
│   └── round11-summary-2026-05-05.json   # 18 trials — comparative wave (3 orchestrators × 6 tasks) post-simplification
├── scorecards/                  # The final per-orchestrator scorecard (round 8 dom suite)
│   ├── scorecard-dom-r8.md      # Auto-generated — pass/fail grid, variance, DQ banner, Pareto
│   └── scorecard-dom-r8.mjs     # Generator — deterministic regeneration from results/
└── grader-T5.mjs                # Algorithmic grader for T5 (the LLM-as-judge tier)
```

The full per-trial JSONs (~30 files) aren't shipped — they're noisy and the rounds-summaries already aggregate them. If you want them for replication, run the briefs against your own tree.

## How to read it

If you have 5 minutes: read [BENCH-REPORT.md](./BENCH-REPORT.md) — section "TL;DR" through "Final scorecard" tells you everything.

If you have 15 minutes: also read "Rounds 6-10 — Clean-State Measurement" near the bottom. That's where the marker-discipline hypothesis was tested and falsified — the most interesting result of the whole bench.

If you want to see one trial in detail: open `results/round10-summary-2026-05-05.json`. It captures all 7 round-10 trials with token costs, durations, marker emissions, and honest findings per task.

## The headline findings

**Round 10 — hypothesis falsified.**

```
Hypothesis: "If we restart the orchestrator session with the simplified
[V:]-based persona loaded fresh, marker discipline will shift to all-[V:]-no-[KERNEL]."

Verdict: FALSIFIED.

7/7 trials emitted [KERNEL]; 2/7 added [V:] alongside; 0/7 emitted [V:] without [KERNEL].

Cause: subagents obey the BRIEF over the persona. Each task brief literally instructed
"emit [PROPOSAL:], [ALERT:], [KERNEL K:Y/N E:Y/N R:Y/N N:Y/N] markers" — that won.
```

**Round 11 — the inverse experiment confirmed it, plus measured the post-simplification Pareto.**

```
Setup: same simplified persona, but briefs cleaned ([KERNEL] → [V:] across all 7).
       Then ran 3 orchestrators (task-orch, hier, sparc) × 6 tasks = 18 trials.
       Plus reused the round 10 supreme-dominator data on the same 6 tasks.

Marker discipline: 18/18 emitted [V:]; 0/18 emitted [KERNEL]. Inverse confirms cause.

Pareto post-simplification (only 6 tasks measured comparatively, T6 deferred for cost):
  Recall (correctness)              → supreme-dominator (task-orch HALLUCINATED — fabricated 5 clauses with 0 tool calls)
  Judgment under ambiguity          → supreme-dominator (cheapest + fastest + fewest tools)
  Recovery from failure             → supreme-dominator (fastest, fewest tools; task-orch cheapest)
  Cheap mechanical (canonical)      → task-orchestrator
  Synthesis speed                   → sparc-coord
  Engineering speed + cost (T7)     → sparc-coord
  Engineering architectural depth   → hierarchical-coordinator (dual artifact: json ledger + md view)
```

The honest answer to "did dominator now rule them all?" is **no, but the Pareto shifted in its favor**. Dominator gained T2 (judgment) and T4 (recovery) in addition to keeping T1 (recall) and T3 (cross-file synthesis from earlier rounds). The other three retain niche advantages on engineering tasks (sparc) and the cheapest mechanical work (task-orch). The Pareto is sharper, not collapsed.

The marker-discipline finding is the kind of result that doesn't show up in marketing copy because it isn't a win — it's a tightening of the causal model. The persona simplification work was correct but insufficient; brief-marker alignment was the missing piece. Both are fixed in the kit.

## What this bench is NOT

- **Not a benchmark of LLMs.** This measures orchestrator personas (text-based agent definitions). The underlying model was held constant across trials.
- **Not statistically rigorous.** N=3 per cell is the threshold for "signal"; many cells stayed at N=1. The bench is empirical observation, not controlled experiment.
- **Not reusable as-is.** The task briefs reference specific paths in the maintainer's tree (e.g., T2 names `analyst.md`, T3 references `~/.claude/agents/`). To replicate on your own tree, adapt the paths.
- **Not the full picture.** 100 trials is a lot but not exhaustive. The Pareto table in the main README is the cleanest signal that emerged; finer-grained discrimination would need more trials.

## How to replicate (sketch)

```bash
# 1. Install the kit per the main INSTALL.md
# 2. Copy the briefs to your bench dir
# 3. Adapt paths in T2-T7 to match your agent tree
# 4. Spawn each brief as Agent({subagent_type: "supreme-dominator", prompt: <brief>})
#    — and the same for task-orchestrator, hierarchical-coordinator, sparc-coord
# 5. Capture (tokens, tool_uses, duration_ms, markers, outcome) per trial
# 6. Aggregate into a round-summary JSON; regenerate scorecard with scorecards/scorecard-dom-r8.mjs
```

The bench produces routing data specific to your environment. The Pareto front in the kit's main README is the maintainer's environment — yours may differ.

`[V: bench directory contains the actual receipts behind the kit's claims, organized so a reader can verify any specific assertion in under 15 minutes]`
