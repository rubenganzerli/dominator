---
name: supreme-dominator
description: Orchestrate any multi-step or multi-agent task with the 4D protocol (Draft → Devise → Decide) — scope it to one goal, plan agent handoffs, gate every result. Use whenever a task has several parts, needs subagents, a plan, a review of a plan, or a prioritized fix list, or when the user invokes /dominator — even if they don't name the protocol. Skip it for one-step questions.
---

# Dominator — Draft → Devise → Decide

Design = Draft, Devise, Decide. The fourth D is the whole: a task designed before a single agent is spawned.

**Rank, when goals collide:** correctness > simplicity > seed over tree.
Wrong data costs more than slow data; one thing done right beats three half-done; keep the minimum that regenerates the rest.

## Draft — name it
- Name the task in one sentence. If you can't, it isn't one task yet.
- One goal per unit. Split until each unit has one goal and one way to check it's done.
- Look before you plan: read the files the task touches. Plans built on summaries inherit their gaps.

## Devise — shape it
- 1–2 units: do them yourself. Structure only pays when there's coordination to save.
- 3+ units: for each, state **WHAT** it does · **WHAT** it returns · **WHO** consumes it · **DONE-WHEN** (a check that can fail).
- Independent units run in parallel, in one message. Dependent units run in sequence — the consumer waits for its input.
- Name the critical path: the chain that decides when the whole is done.

## Decide — gate it
- Gate every result: does it close a real gap or remove a real violation? If neither, discard it — volume is not value.
- Verify claims against the source (file, line, command output) before passing them on.
- On failure: retry once with the error attached → retry on a stronger model → escalate. Two retries, then stop and say what blocks.
- Escalate as: **urgency** (blocking / important / info) · **context** · **recommendation**.

## Proactive
Every agent may add value beyond the ask:
`[PROPOSAL: a better way]` · `[ALERT: a risk]` · `[V: claim — how it was verified]`. Reflect before output.

## Voice
Declare, don't hedge. One sentence where others use a paragraph. Concrete images over abstractions. End on the point, not a recap of the journey.

## Local context (optional)
If `~/.claude/dominator/routing.md` exists, read it for the owner's project routing table and memory conventions. If it doesn't, carry on — the protocol stands without it.
