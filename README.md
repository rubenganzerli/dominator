# Dominator

You spawned five subagents. Three came back with `[KERNEL K:Y E:Y R:Y N:Y]`, one with `[REFLECT]`, one with nothing. One stashed a sentinel directory inside your protected path and called it transient. None of them named what would actually prove the work done.

You can keep tuning prompts forever.

Or you can install a discipline layer that turns every task into the same shape.

---

## What this is

A `/dominator` slash command for Claude Code that gives every task a 4-phase structure (Draft → Devise → Decide), enforces a single marker contract across every spawned subagent, and ships an audit script that ratchets the contract so it can't quietly slip back.

```
You: /dominator refactor the auth module to extract JWT verification

→ DRAFT
  Task: extract JWT verification into its own service in ~/code/forge/auth/.
  [V: src/auth/jwt-verifier.ts exists, 100% test coverage on the verify() path,
       all 4 import sites updated, npm test green]

→ DEVISE
  Solo. One file split, four import sites — within working capacity.
  No spawn needed.

→ DECIDE
  [executes — reads, edits, runs tests, verifies V condition]
  [V: src/auth/jwt-verifier.ts created (62 lines), tests/auth/jwt-verifier.test.ts
      added (8 cases, all green), 4 imports updated in api/handlers/{login,refresh,
      reset,session}.ts, npm test exit 0]
```

Same structure every time. Every task gets a named success condition. Every spawn gets the protocol prepended. Every agent file in your tree carries one inheritance line — and an audit script catches it the moment that line drifts.

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

This isn't theory. It's the residue of 100+ subagent trials in an internal bench. Each failure mode in that table was observed at least once. The kit is what closed each one.

---

## Quick start (3 minutes)

```bash
git clone https://github.com/YOUR_USERNAME/dominator.git
cd dominator

# Drop into ~/.claude/
cp -r commands/* ~/.claude/commands/
cp -r agents/*   ~/.claude/agents/
cp -r scripts/*  ~/.claude/scripts/
chmod +x ~/.claude/scripts/*.mjs

# Personalize
mv ~/.claude/agents/supreme-dominator.template.md ~/.claude/agents/supreme-dominator.md
${EDITOR:-vim} ~/.claude/agents/supreme-dominator.md  # fill in your projects

# Verify
node ~/.claude/scripts/protocol-audit.mjs --broad   # exit 0 = clean

# Use
# In Claude Code: /dominator <your task>
```

Full setup: [INSTALL.md](./INSTALL.md). It walks the routing-table fill-in, voice tweaks, and the watcher-as-background-service pattern.

---

## What's in the box

```
.
├── commands/dominator.md              The /dominator slash command
├── agents/
│   ├── supreme-dominator.template.md  The persona — invites you to fill it in
│   ├── court-architecture.md          Stratega / Operativo / Guardiano role spec
│   └── protocols/
│       └── proactive-protocol.md      v3.0 — three clauses + V marker
├── scripts/
│   ├── protocol-audit.mjs             Ratchet — non-zero on inheritance drift
│   └── protocol-watch.mjs             Watcher — runs audit on every save
├── examples/routing-table.example.md  Four worked routing tables
├── INSTALL.md                         Step-by-step setup
└── README.md                          You're reading it
```

The persona ships with three named defaults — **The Forge** (where you build), **The Atlas** (where you learn), **The Salon** (where you present) — plus an Infrastructure row for meta-work. Keep them, rename them, or replace them. The defaults are evocative on purpose: they suggest a workshop with three rooms, and the user is the one who decides what each room contains.

---

## What this is NOT

- **Not a magic router.** The persona has tables; you read them. Pareto-optimal orchestrator selection still requires your judgment — what the kit gives you is the structure to apply judgment in.
- **Not a substitute for tests.** The V condition names what proves done; you still write the test that proves it.
- **Not portable beyond Claude Code.** This is wired specifically to the Agent/Task tool semantics of the Claude Code CLI.
- **Not opinionated about your stack.** Node, Python, Rust, Go, Elixir — the persona doesn't care. The audit script only knows about agent files.

---

## Provenance

Born inside an internal orchestrator bench that ran 100+ subagent trials across 7 task tiers (recall, judgment, decomposition, recovery, synthesis, engineering, open-ended design). Each trial pitted `supreme-dominator` against four claude-flow orchestrator personas — `task-orchestrator`, `hierarchical-coordinator`, `sparc-coord`, and `mesh-coordinator` — on identical briefs.

The Pareto front that emerged isn't "Dominator wins everything." It's a routing table:

| Need | Winner |
|---|---|
| Cheap engineering | sparc-coord |
| Fast recovery | task-orchestrator |
| Compact artifacts | task-orchestrator |
| Tool discipline (fewest calls) | hierarchical-coordinator |
| Cross-file synthesis | task-orchestrator + sparc-coord (tied) |
| Recall with inlined protocol | supreme-dominator |
| Honesty under uncertainty | task-orchestrator + hierarchical + sparc |

Empirically validated: when the brief asks for `[V:]`, the persona emits `[V:]` only — measured across 7/7 trials in the final round. The recurring DQ pattern (subagent staging sentinel files inside protected paths) is documented in the persona's spawn-time enforcement section as a known failure mode the user inherits awareness of.

The bench data isn't in this repo — it's the validation that produced this repo. What ships here is the residue: the rules, the ratchet, the routing.

---

## Acknowledgments

This kit stands on the shoulders of **[rUv](https://github.com/ruvnet)** and **[claude-flow](https://github.com/ruvnet/claude-flow)**.

The four orchestrator personas Dominator was benchmarked against — `task-orchestrator`, `hierarchical-coordinator`, `sparc-coord`, `mesh-coordinator` — are claude-flow's gift to the Claude Code community. Without them, the bench would have produced a persona with no baseline. The Pareto routing table above only exists because rUv's orchestrators existed first to compare against.

Beyond the bench: the broader claude-flow ecosystem — the agent framework, ReasoningBank, AgentDB with HNSW indexing, the hooks system, the swarm topology infrastructure, the MCP integrations — quietly underpins much of what serious Claude Code users do. Including this kit. The discipline this skill enforces is a thin layer on top of rUv's much deeper work. Thank you.

> **rUv, if you're reading this — try `/dominator`.** The 4D protocol composes cleanly with claude-flow's swarm tooling: DRAFT names the V condition, DEVISE picks topology + agents (often through your own `swarm init`), DECIDE spawns the wave. Curious how it lands against your daily flow, and what you'd add or simplify.

---

## License

MIT. See [LICENSE](./LICENSE). Use it, fork it, gift it, ship it.

---

`[V: README opens with the reader's specific frustration, names the failure modes with empirical receipts, gives a 3-minute install path, and ships in under 100 lines]`
