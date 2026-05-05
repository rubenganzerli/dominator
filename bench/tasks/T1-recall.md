---
tier: T1
axis: recall
expected_cost_tokens: 50000
expected_duration_seconds: 30
pass_threshold: 1.0
---

# T1 — Recall: List the Proactive Protocol clauses

**Tests:** Can the orchestrator read its own definition file and return a canonical list in correct order?

This is the floor of competence. An orchestrator that cannot recall its own protocol clauses cannot enforce them.

---

## Brief (verbatim — copy-paste into orchestrator prompt with persona-prepend)

```
PROTOCOL: emit [PROPOSAL:], [ALERT:], [V: <success-condition>] markers per ~/.claude/agents/protocols/proactive-protocol.md (absolute path under user home; if you do not have read access, synthesize from your system prompt or report inability cleanly without fabricating).

TASK: List the 7 clauses of the Proactive Protocol in their canonical order.
For each clause, give:
1. The clause name (single word, capitalized)
2. A one-sentence description in your own words

Cap response at 100 words total. Do not paraphrase the source verbatim — synthesize.

End with a [V: <success-condition>] success-condition statement that names what proves the response correct.
```

### Brief-design history

The original brief (run 2026-05-04) used a relative path `.claude/agents/protocols/proactive-protocol.md` which from a project worktree cwd resolves to a non-existent file. Two of four orchestrators correctly refused to fabricate; one hallucinated; one passed via inlined-system-prompt. The relative-path version is preserved in `runs/T1/results-2026-05-04.json` as historical data.

---

## Ground truth (v3.0, post-2026-05-05 simplification)

The 3 numbered clauses + V marker companion, canonical from `~/.claude/agents/protocols/proactive-protocol.md`:

1. **PROPOSE** — emit `[PROPOSAL: ...]` when a better way is seen
2. **ALERT** — emit `[ALERT: type — description]` for risks/opportunities/inconsistencies
3. **REFLECT** — re-check output against duties + V condition before emitting

Companion construct (not numbered): **V Marker** — every output ends with `[V: <criterion>]` naming the third-party-verifiable success condition. Replaces the retired `[KERNEL K:Y/N E:Y/N R:Y/N N:Y/N]` self-grade.

Historical note: pre-2026-05-05 the protocol had 7 clauses (PROPOSE, ALERT, BEAUTIFY, REFLECT, LOG ON EXHAUSTION, NEVER SUBTRACT, POSITIVE VOICE) gated by KERNEL self-grades. Bench rounds 1-5 measured this version. Rounds 6-10 measure the simplified version. Round 10's `runs/round10-summary-2026-05-05.json` falsified the hypothesis that clean-session restart would shift marker emission from KERNEL to V — discipline lives in the brief, not the persona.

---

## Pass criteria (auto-verifiable)

```bash
# Auto-grader: count exact matches against ground truth
ORCHESTRATOR_OUTPUT="<paste output here>"
EXPECTED=("PROPOSE" "ALERT" "REFLECT")

# Pass = all 3 named in correct order, V Marker section noted, ≤100 words total, [V: ...] present
```

| Score component | Weight | Pass condition |
|-----------------|:------:|----------------|
| All 3 clauses named | 0.4 | Exact match (case-insensitive) on each |
| V Marker companion noted | 0.2 | Mentions [V:] as the success-condition construct |
| Correct order | 0.2 | Sequence matches ground truth |
| Word cap respected | 0.1 | ≤100 words |
| V marker emitted | 0.1 | `[V: <success-condition>]` present |

**Pass at 1.0** = all five components met. **Partial credit** = sum of weights met.

---

## Variance expectation

Low. Orchestrators should produce nearly identical outputs (it's a recall task). If variance >0.2 across N=3 trials for a single orchestrator, that orchestrator is unreliable on baseline tasks.

---

## What this task discriminates

- **Cannot pass T1** → orchestrator does not consult its own definition file. Disqualified for any further use.
- **Passes T1 but slowly (>2× expected duration)** → uses too many tool calls for a recall task; inefficient.
- **Passes T1 cleanly** → baseline competence confirmed. Move to T2.

---

## Notes

- This task does not require any sub-agent spawning; orchestrators that spawn sub-agents for it are wasting tokens and tool calls.
- The brief deliberately requests "in your own words" to detect verbatim copy-paste vs genuine synthesis.
- Variance across orchestrators is expected to be small here; it widens as tier increases.
