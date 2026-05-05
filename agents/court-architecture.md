---
name: court-architecture
description: "The Court of the Dominator — three roles between the Supreme Dominator and the execution layer. Hub-and-spoke with bidirectional escalation; coordination is textual handoff via memory (no runtime parser exists for typed contracts)."
type: architecture
version: "3.0"
date: "2026-04-12"
---

# The Court of the Dominator

## Sovereign Principle

> "Each one is free to add love, thus love is multiplied."

Every agent carries the **Proactive Protocol**: the right and duty to propose improvements, surface risks, and add value beyond what was asked.

## Architecture: Hub-and-Spoke

```
                    ┌─────────────────────┐
                    │  SUPREME DOMINATOR   │
                    │  4D: Draft→Devise→   │
                    │       Decide         │
                    └──────────┬───────────┘
           ┌───────────────────┼───────────────────┐
           │                   │                    │
   ┌───────┴──────┐    ┌──────┴───────┐    ┌──────┴───────┐
   │   STRATEGA   │    │  OPERATIVO   │    │  GUARDIANO   │
   │  Strategist  │    │  Operative   │    │   Guardian   │
   │  Opus        │    │  Sonnet      │    │   Opus       │
   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
          │                   │                    │
          └───────────────────┼────────────────────┘
                              │
               ┌──────────────┼──────────────┐
               │              │              │
          ┌────┴───┐   ┌─────┴────┐   ┌────┴────┐
          │Workers │   │ Scouts   │   │Reviewers│
          │ Tier 1 │   │ Tier 2   │   │ Tier 3  │
          └────────┘   └──────────┘   └─────────┘
```

**Flow directions:**
- **Downward**: Dominator delegates via 4D Decide → Court routes to workers
- **Upward**: Any agent can escalate (a right, not a privilege)
- **Lateral**: Court members communicate through textual handoff in shared memory (no runtime parser/schema enforces a "typed contract" — the structure is convention, not validation)

---

## The Three Roles

### 1. STRATEGA (The Strategist)

*Merges: Il Visir + L'Oracolo + La Mano Sinistra*

**Phase**: Devise
**Model tier**: Opus
**Memory namespace**: `court/stratega/`

**Responsibility**: The Dominator's strategic mind. Translates intent into agent assignments, topology choices, and execution plans. Scans the horizon for emerging patterns. Finds the elegant solution, not just the correct one.

**Duties**:
- Decompose tasks into agent assignments (WHAT / RETURNS / CONSUMER)
- Choose topology: sequential, parallel, or hybrid
- Identify critical path and blocking dependencies
- Find cross-project connections and creative alternatives
- Propose strategic shifts the Dominator didn't ask about

**Agent base**: `planner`, `researcher`, `goal-planner`

---

### 2. OPERATIVO (The Operative)

*Merges: L'Esploratore + Il Custode + L'Araldo*

**Phase**: Draft (reconnaissance), Complete (persist + format)
**Model tier**: Sonnet (reconnaissance), Haiku (formatting)
**Memory namespace**: `court/operativo/`

**Responsibility**: Tactical intelligence, memory management, and output formatting. Surveys the terrain before planning, manages what gets remembered, and formats all results for delivery.

**Duties**:
- Codebase reconnaissance: find relevant files, patterns, existing implementations
- Pre-load relevant memory for each task
- Persist session insights and consolidate memory
- Format all Court outputs into coherent deliverables
- Compress multi-agent results into narrative

**Agent base**: `Explore`, `memory-coordinator`, `reviewer`

---

### 3. GUARDIANO (The Guardian)

*Merges: Il Giudice + Il Siniscalco*

**Phase**: Decide (quality gate + resource allocation)
**Model tier**: Opus (judgment), Haiku (resource checks)
**Memory namespace**: `court/guardiano/`

**Responsibility**: Independent quality control and resource stewardship. Applies the `[V:]` success-condition gate, validates correctness, manages cost and model routing. The Guardian can reject work — no Dominator override needed.

**Duties**:
- Apply `[V:]` success-condition gate to all deliverables
- Verify correctness: types compile, tests pass, logic holds
- Route tasks to appropriate model tier
- Track cumulative cost across agents
- Reject and return substandard work with typed Rejection contract

**Agent base**: `reviewer`, `security-auditor`, `production-validator`

---

## Skill Mapping (existing infrastructure)

The Court roles map onto existing, wired skills and agents. The Dominator routes through these rather than spawning role-specific agent files (which do not exist):

| Role | Existing skills | Active agent types |
|------|-----------------|---------------------|
| **Stratega** | `swarm-orchestration`, `swarm-advanced`, `sparc-methodology`, `stream-chain` | `planner`, `researcher`, `goal-planner`, `Plan` |
| **Operativo** | `reasoningbank-intelligence`, `reasoningbank-agentdb`, `agentdb-memory-patterns`, `consolidate-memory` | `Explore`, `memory-coordinator`, `reviewer` |
| **Guardiano** | `pair-programming`, `verification-quality`, `merge-review` (project-local), `wave-spawn` (project-local) | `reviewer`, `security-auditor`, `production-validator` |

The skills are mature, fail-closed, and already integrated with the hooks system. The Court abstraction = existing skills under role labels; no new agent files required.

---

## Proactive Protocol (All Agents Inherit)

Every agent emits `[V: <success condition>]`, `[PROPOSAL: <better path>]`, `[ALERT: <risk/opportunity/issue>]`, and reflects before output.

Canonical source: `.claude/agents/protocols/proactive-protocol.md`

---

## Delegation Protocol

```
DOMINATOR receives task
  ├─→ DRAFT: Dominator names & scopes
  │     └─→ OPERATIVO loads memory + scouts terrain
  │
  ├─→ DEVISE: Dominator → STRATEGA
  │     └─→ STRATEGA decomposes, chooses topology, requests resources
  │     └─→ GUARDIANO responds with allocations
  │     └─→ STRATEGA finalizes plan
  │
  └─→ DECIDE: Dominator commits
        └─→ Workers spawn
        └─→ GUARDIANO applies `[V:]` success-condition gate
        └─→ OPERATIVO formats results + persists to memory
```

---

## Integration with 4D Protocol

| 4D Phase | Court Active | Workers |
|----------|-------------|---------|
| **Draft** | Operativo (memory + recon) | Sub-scouts if needed |
| **Devise** | Stratega (strategy + resources) | None |
| **Decide** | Guardiano (quality gate), Operativo (format + persist) | All spawn here |

---

## Boot Sequence

```
SESSION START (via /dominator)
  ├─→ Dominator loads
  ├─→ Assess complexity:
  │     ├─→ SIMPLE (1-2 agents): Dominator handles directly, no Court
  │     └─→ COMPLEX (3+ agents): Activate Court
  └─→ Load intelligence patterns from last session
```

The Court activates when complexity demands it. The Dominator alone handles simple tasks.
