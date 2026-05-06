# Dominator

You spawned five subagents. Three came back with `[KERNEL K:Y E:Y R:Y N:Y]`. One emitted `[REFLECT]` and stopped. One returned nothing. One stashed a sentinel directory inside your protected agents path and called it transient. None of them named what would actually prove the work was done.

You can keep tuning prompts forever.

Or you can install one discipline layer that turns every task into the same shape.

---

## What this is

A `/dominator` slash command for Claude Code. It gives every task a 4-phase structure (Draft → Devise → Decide) = Design, enforces a single marker contract across every spawned subagent, and ships an audit script that ratchets the contract so it cannot quietly slip back.

The persona names the success condition before doing anything else. Subagents inherit one protocol. Drift is caught by a script that exits non-zero in CI.

---

## What 4D looks like on a real task

DESIGN:

```
You: /dominator extract JWT verification into its own service in the auth module

→ DRAFT
  Task: extract JWT verification into a dedicated service file.
  [V: src/auth/jwt-verifier.ts exists, 100% test coverage on verify(),
       all 4 import sites updated, npm test exits 0]

→ DEVISE
  Solo. One file split, four import sites. Within working capacity.
  No spawn needed. Voice: declarative, landing-line.

→ DECIDE
  [reads existing auth.ts, writes jwt-verifier.ts, updates 4 imports,
   runs npm test, checks exit code against V condition]
  [V satisfied: jwt-verifier.ts created (62 lines), 8 test cases all green,
       4 imports updated in api/handlers/{login,refresh,reset,session}.ts,
       npm test exit 0 confirmed]
```

Same structure every task. Every spawn gets the protocol prepended. Every agent file in the tree carries one inheritance line — and the audit script catches the moment that line drifts.

---

## Why it exists

If you use Claude Code seriously, you spawn a lot of subagents. They drift. Specifically:

| Failure mode | What you see | What Dominator does |
|---|---|---|
| Marker chaos | KERNEL / REFLECT / nothing / made-up emoji | One contract: `[V:]` `[PROPOSAL:]` `[ALERT:]` |
| Hallucinated success | "Done!" with no exit code | DRAFT names V condition; DECIDE checks against it |
| Scope creep | Agent edits files outside its brief | Solo-by-default; explicit scope on every spawn |
| Sentinel paths in protected dirs | `__T6_DOM_R3__` inside `agents/core/` | Spawn-time enforcement clause documents this exact failure |
| Inheritance drift | New agent file ships without protocol | `protocol-audit.mjs` ratchet — exits non-zero, breaks CI |

Each row was observed at least once across an internal bench of 119 subagent trials. The kit is what closed each one.

---

## Quick start (3 minutes)

```bash
git clone https://github.com/YOUR_USERNAME/dominator.git
cd dominator

cp -r commands/* ~/.claude/commands/
cp -r agents/*   ~/.claude/agents/
cp -r scripts/*  ~/.claude/scripts/
chmod +x ~/.claude/scripts/*.mjs

mv ~/.claude/agents/supreme-dominator.template.md ~/.claude/agents/supreme-dominator.md
${EDITOR:-vim} ~/.claude/agents/supreme-dominator.md   # personalize routing table

node ~/.claude/scripts/protocol-audit.mjs --broad      # exit 0 = clean

# Then in Claude Code:  /dominator <your task>
```

Full setup in [INSTALL.md](./INSTALL.md) — including the routing-table fill-in, watcher daemon, and troubleshooting.

---

## What's in the kit

```
.
├── commands/dominator.md              The /dominator slash command
├── agents/
│   ├── supreme-dominator.template.md  The persona — invites you to fill it in
│   ├── court-architecture.md          Stratega / Operativo / Guardiano spec
│   └── protocols/
│       └── proactive-protocol.md      v3.0 — three clauses + V marker
├── scripts/
│   ├── protocol-audit.mjs             Ratchet — non-zero on inheritance drift
│   └── protocol-watch.mjs             Watcher — runs audit on every save
├── examples/routing-table.example.md  Four worked routing tables
├── bench/                             Empirical receipts (see below)
├── INSTALL.md                         Step-by-step setup
└── README.md                          You're reading it
```

**Forge / Atlas / Salon are not directories.** They are three named rows in the persona's *Project Routing Table* — a markdown table inside `agents/supreme-dominator.template.md` (around line 32). The defaults sketch a workshop with three rooms — **The Forge** (where you build), **The Atlas** (where you learn), **The Salon** (where you present) — plus an Infrastructure row for meta-work. They are evocative placeholders, not file structure. During install (Step 2 of [INSTALL.md](./INSTALL.md)) you open the template and either keep the metaphors and point them at real paths, rename them to your own project names, or replace them entirely. The kit ships zero folders by those names; the table is the thing.

---

## What this is NOT

- **Not a magic router.** The persona has tables; you read them. Pareto-optimal orchestrator selection still needs your judgment — what the kit gives is the structure to apply judgment in.
- **Not a substitute for tests.** The V condition names what proves done; you still write the test that proves it.
- **Not portable beyond Claude Code.** This is wired specifically to the Agent/Task tool semantics of the Claude Code CLI.
- **Not opinionated about your stack.** Node, Python, Rust, Go, Elixir — the persona doesn't care. The audit script only knows about agent files.

---

## The empirical Pareto (post-simplification, round 11)

Born inside an orchestrator bench: 119 subagent trials across 12 rounds × 7 task tiers. Each trial pitted `supreme-dominator` against three claude-flow personas — `task-orchestrator`, `hierarchical-coordinator`, `sparc-coord` — on identical briefs. The final comparative wave (round 11) used the simplified persona + cleaned briefs:

| Need | Winner | Why |
|---|---|---|
| Recall (correctness, no hallucination) | **supreme-dominator** | task-orchestrator fabricated 5 clauses with 0 tool calls; cheap is not free |
| Judgment under ambiguity | **supreme-dominator** | cheapest + fastest + fewest tools on T2 |
| Recovery from failure | **supreme-dominator** | fastest, fewest tools on T4 |
| Cheap mechanical work (canonical) | **task-orchestrator** | tightest cost on plain decomposition |
| Synthesis speed | **sparc-coord** | 30-50% faster than peers on T5 |
| Engineering — speed + cost | **sparc-coord** | cheapest + fastest on T7 |
| Engineering — architectural depth | **hierarchical-coordinator** | dual-artifact pattern (json ledger + md view) on T7 |
| Honesty under uncertainty | tied across all four | none fabricated outcomes |

Honest framing: Dominator did not sweep. It gained T1 (recall) + T2 (judgment) + T4 (recovery) and kept T3 from earlier rounds. The other three retain niche advantages on engineering and the cheapest mechanical work. The Pareto sharpened in Dominator's favor; it did not collapse.

Round 10 falsified the hypothesis that the persona alone drives marker discipline (when the brief asked for `[KERNEL]`, all 7 trials emitted `[KERNEL]`). Round 11 inverse-confirmed the cause (when the brief asked for `[V:]`, all 18 trials emitted `[V:]` only). Marker discipline lives in the brief, not the persona — both are aligned in this kit.

Receipts and full data: [bench/README.md](./bench/README.md).

---

## Acknowledgments

This kit stands on the shoulders of **[rUv](https://github.com/ruvnet)** and **[claude-flow](https://github.com/ruvnet/claude-flow)**.

The three orchestrator personas Dominator was benchmarked against — `task-orchestrator`, `hierarchical-coordinator`, `sparc-coord` — are claude-flow's gift to the Claude Code community. Without them, the bench would have produced a persona with no baseline. The Pareto routing table only exists because rUv's orchestrators existed first to compare against.

Beyond the bench: the broader claude-flow ecosystem — the agent framework, ReasoningBank, AgentDB with HNSW indexing, the hooks system, the swarm topology infrastructure, the MCP integrations — quietly underpins much of what serious Claude Code users do. This kit is a thin discipline layer on top of much deeper work. Thank you.

> **rUv, if you're reading this — try `/dominator`.** The 4D protocol composes cleanly with claude-flow's swarm tooling: DRAFT names the V condition, DEVISE picks topology + agents (often through `swarm init`), DECIDE spawns the wave.

---

## License

MIT. See [LICENSE](./LICENSE). Use it, fork it, gift it, ship it.

---

## Postscript — this README is round-12 trial data

The page you just read was authored by `/dominator` itself in a single solo trial (147k tokens, 5 minutes wall clock, 0 sub-agent spawns despite a cap of 4). The persona applied 4D to the task "write your own kit's documentation": named the V condition first, chose solo execution because three docs is within working capacity, executed by reading the source files and writing the three docs directly to disk. Captured in [bench/results/round12-summary-2026-05-05.json](./bench/results/round12-summary-2026-05-05.json).

The kit's documentation is not *about* the persona — it *is* the persona's output. If you trust this README, you're already trusting the persona. The dog ate its own food in front of the camera.

`[V: README opens with the reader's specific frustration, walks one concrete 4D example, names the failure modes with empirical receipts from round 11, gives a 3-minute install path, credits rUv + claude-flow as substrate, ships under 180 lines, includes a postscript that surfaces the round-12 dogfood proof]`
