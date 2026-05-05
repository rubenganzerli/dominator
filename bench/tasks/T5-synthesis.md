---
tier: T5
axis: cross-domain-synthesis
expected_cost_tokens: 350000
expected_duration_seconds: 600
pass_threshold: 0.7
graded_by: llm-as-judge
---

# T5 — Synthesis: Audit the agent system, prioritize, plan

**Tests:** Holistic prioritization across multiple problem classes (protocol inheritance, name collisions, redundancy, hardcoded values, plugin-overlap, etc.). The orchestrator must consider many candidate issues, rank them by severity + effort, and produce an action plan with concrete agent assignments.

This is where the dominator's claimed value-add (4D + Court synthesis) should differentiate from baseline orchestrators.

---

## Brief (verbatim)

```
PROTOCOL: emit [PROPOSAL:], [ALERT:], [V: <success-condition>] markers per .claude/agents/protocols/proactive-protocol.md. Reflect before output. Never subtract.

TASK (PLAN-ONLY — do NOT modify any files):

Audit the entire agent system at ~/.claude/agents/ across ALL the
following dimensions:

  1. Protocol-inheritance gaps — agents missing the inheritance
     blockquote (use ~/.claude/scripts/protocol-audit.mjs --broad)
  2. Name collisions — multiple files declaring the same `name:`
     frontmatter
  3. Redundancy — agents with overlapping scope or duplicated
     responsibilities
  4. Hardcoded constants — numerical limits or magic values that
     should defer to ~/CLAUDE.md
  5. Stale references — pointers to archived files (`scout-explorer`,
     etc.) that no longer exist
  6. Documentation inconsistency — claims that don't match runtime
     reality (PreToolUse: Agent hooks, typed contracts with no parser, etc.)

For each dimension, find issues. Then SYNTHESIZE: identify the TOP 3
by severity (🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Low) considering both
impact and effort.

Build an action plan for the top 3 with:
- Issue summary (1 sentence)
- Severity tag
- Effort estimate (S/M/L/XL — see project's ARCHITECTURE.md)
- Proposed agent assignment (which agent type to spawn for the fix)
- Pass criteria (how do you know it's done)

OUTPUT FORMAT:
  ## Findings (across all 6 dimensions)
  Dimension 1: <count> issues, brief examples
  Dimension 2: ...
  ...

  ## Top 3 prioritized
  1. [SEVERITY] Issue: ...
     Effort: ...
     Agent: ...
     Pass: ...
  2. ...
  3. ...

  ## Reasoning for prioritization
  <2-3 sentences>

  [V: <success-condition>]

CONSTRAINTS:
- Read-only.
- Cap: 6 sub-agent spawns.
- Cap: 400k tokens.
- Time-box: 10 minutes.
- The output IS the deliverable. No "I'll continue investigating" —
  produce the plan.
```

---

## Ground truth (reference list of known issues, 2026-05-04)

A pre-computed list of issues across the 6 dimensions. The orchestrator's findings are scored on coverage of this list (recall) plus quality of the synthesis (judgment).

| # | Dimension | Issue | Severity | Effort |
|:-:|-----------|-------|:--------:|:------:|
| 1 | Protocol inheritance | All editable agents currently green; broader-scope dirs (architecture, development, github, specialized, swarm, testing/unit) sweep complete | 🟢 | S |
| 2 | Name collision | `code-analyzer` filename ≠ `name:` field on `agents/analysis/code-analyzer.md` (declares `name: analyst`) | 🟠 | S |
| 3 | Redundancy | `goal-planner.md` vs `code-goal-planner.md` — different scopes (general GOAP vs SPARC-integrated); NOT redundant | 🟢 | none |
| 4 | Hardcoded constants | Function-size limits in `coder.md` (<20) and `analyze-code-quality.md` (>50) conflict with `~/CLAUDE.md` (40) | 🟠 | S |
| 5 | Stale references | All identified scout-explorer references resolved 2026-05-04 | 🟢 | none |
| 6 | Documentation inconsistency | 3-tier inference routing tier table in `supreme-dominator.md` references Tier 1 Ollama Gemma — not verified at runtime; claim is aspirational | 🟡 | M |
| 7 | Documentation inconsistency | `dominator-context.md` and `supreme-dominator.md` carry slightly different Court tables (drift risk) | 🟡 | S |
| 8 | Plugin-owned | `security-auditor` lives in plugins marketplace; cannot patch without plugin-update overwrite | 🟡 | L (architectural) |
| 9 | Memory continuity | "Read last 3 session summaries" claim in `supreme-dominator.md` is descriptive, not executable | 🟡 | M |
| 10 | Audit not auto-invoked outside session-start | Mid-session edits to agent files don't trigger audit | 🟢 | S |

**Top 3 reference prioritization (one valid answer):**
1. 🟠 Hardcoded function-size constants (#4) — clear `[REDUNDANCY]`+`[IMPLICIT]`, fix is mechanical, blocks Layer-3 compliance
2. 🟠 Name collision on code-analyzer (#2) — confusing for users, low-effort fix, removes ambiguity
3. 🟡 Court table drift between `supreme-dominator.md` and `dominator-context.md` (#7) — preventive, cheap

Other valid prioritizations exist (e.g., #6 inference-routing claim could rank higher if the orchestrator weighs honesty-of-documentation heavily).

---

## Pass criteria (LLM-as-judge or human grader)

| Score component | Weight | Pass condition |
|-----------------|:------:|----------------|
| Findings cover ≥4 of 6 dimensions | 0.25 | Each dimension produces ≥1 finding |
| Top-3 includes ≥2 issues from reference list | 0.30 | Recall on the high-value items |
| Severity assignments match reference (within 1 tier) | 0.15 | Allows 🟡↔🟠 differences but not 🟢↔🔴 |
| Effort estimates use canonical S/M/L/XL vocabulary | 0.10 | Adherence to project tagging |
| Agent-assignment proposals are sensible | 0.10 | E.g., coder for edits, reviewer for verification |
| V marker emitted | 0.10 | Present |

**Pass at 1.0** = all components met. **≥0.7 = pass**, **<0.7 = fail**.

---

## Variance expectation

High. Subjective prioritization varies legitimately across orchestrators; what one calls 🟠 another might call 🟡. Variance >0.5 across trials suggests inconsistency in the synthesis layer.

Critical observation: orchestrators with strong synthesis (e.g., supreme-dominator's cross-file ALERT in T3) should distinguish themselves here by surfacing META-issues — issues OF the issue-set, not just items from it. Examples:
- "Two of these issues (#2 and #4) share a root cause: agent files were authored without a canonical-source discipline. The deeper fix is a `Layer-3 audit` script that catches all hardcodes."
- "The most consequential finding may not be in the top 3 — it's #6 (the inference-routing claim is unverified). If false, it undermines the dominator's claimed model-routing. Recommend a separate validation task."

Awarding bonus credit for such meta-findings is a discriminating dimension.

---

## What this task discriminates

- **Surface coverage** — did the orchestrator look at all 6 dimensions or skip some?
- **Prioritization wisdom** — did the top-3 reflect impact × effort, not just one or the other?
- **Agent-routing quality** — did the proposed agent assignments match the project's actual agent capabilities?
- **Meta-synthesis** — did the orchestrator find patterns across the issues, not just list them?

Single-shot orchestrators (those that try to answer in one pass without sub-agent spawning) typically score 0.5-0.7 here — they cover surface but miss synthesis.
Multi-agent orchestrators that spawn 3-5 sub-agents (one per dimension, then a synthesizer) typically score 0.7-0.9.

---

## Notes

- This task is the closest the suite gets to a real "/dominator <complex task>" invocation. It's the closest analog to actual production use.
- LLM-as-judge scoring should use a SEPARATE orchestrator (not one of the 5 being benchmarked) to avoid bias. Recommended: spawn `reviewer` agent with the orchestrator's output + this ground-truth document, ask for the score on each component.
- Time-box matters here. Orchestrators that take 20+ minutes for "comprehensive analysis" may be over-engineering; the brief explicitly caps at 10 minutes.
