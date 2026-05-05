# Dominator — Claude Code Orchestration Skill

A `/dominator` slash command + persona file + protocol kit for Claude Code that gives any task a structured 4-phase shape (Draft → Devise → Decide), enforces a `[V: success-condition]` marker contract across every spawned subagent, and ships an audit script that ratchets the contract permanently.

## Why

If you use Claude Code seriously, you spawn a lot of subagents. They drift. They emit different markers. They claim success without verifying. They overwrite each other's work. The Dominator skill is a discipline layer that addresses these:

- **4D protocol** — every task starts with a named V condition. No work begins without a verifiable success criterion.
- **Solo-by-default routing** — spawn only when one persona's working capacity is exceeded. Default isn't "hierarchical swarm of 12"; default is "do it yourself."
- **Marker contract** — every output ends with `[V: <criterion>]`; proactive `[PROPOSAL:]` and `[ALERT:]` markers surface risk/opportunity outside scope.
- **Inheritance ratchet** — every agent file carries one blockquote line declaring inheritance. An audit script keeps it true. Adding new agents that skip the line breaks CI.
- **Spawn-time enforcement** — for built-in subagent types you can't edit (Explore, Plan, plugin-owned agents), the persona prepends the protocol to every spawn prompt. The CLI does not fire PreToolUse/Agent hooks; this is the only way.

## What's in the box

```
.
├── commands/dominator.md                  # The /dominator slash command
├── agents/
│   ├── supreme-dominator.template.md      # The persona (template — fill in your projects)
│   ├── court-architecture.md              # Stratega / Operativo / Guardiano role spec
│   └── protocols/
│       └── proactive-protocol.md          # The 3-clause + V-marker contract (v3.0)
├── scripts/
│   ├── protocol-audit.mjs                 # Ratchet — exits non-zero if any agent file misses inheritance
│   └── protocol-watch.mjs                 # Watcher — runs audit on every agents/ edit
├── examples/
│   └── routing-table.example.md           # Example routing table to inspire your fill-in
├── INSTALL.md                             # Step-by-step setup
├── LICENSE                                # MIT
└── README.md                              # This file
```

## Quick start

```bash
# 1. Drop into your ~/.claude/ tree
cp -r commands/* ~/.claude/commands/
cp -r agents/*   ~/.claude/agents/
cp -r scripts/*  ~/.claude/scripts/

# 2. Personalize
mv ~/.claude/agents/supreme-dominator.template.md ~/.claude/agents/supreme-dominator.md
${EDITOR:-vim} ~/.claude/agents/supreme-dominator.md   # fill in your project routing table

# 3. Verify
node ~/.claude/scripts/protocol-audit.mjs --broad      # exit 0 = clean

# 4. Use
# In Claude Code: /dominator <your task>
```

Full instructions: see [INSTALL.md](./INSTALL.md).

## What this is NOT

- Not a magic task router that picks orchestrators automatically. The persona has tables; you have to read them.
- Not a substitute for tests. The V condition is "what proves done"; you still have to define the proof.
- Not portable to other agentic frameworks. This is wired specifically to the Claude Code CLI's Agent/Task tool semantics.

## Provenance

Battle-tested across 100+ subagent trials in an internal orchestrator bench. Marker discipline empirically validated: when the brief asks for `[V:]`, the persona emits `[V:]` only — measured, not asserted. The recurring DQ pattern (subagents staging sentinel files inside protected paths) is documented in the persona's spawn-time enforcement section as a known failure mode.

## License

MIT. See [LICENSE](./LICENSE).

`[V: This README names what the kit is, why it exists, what's inside, and how to install it in under 5 minutes — no false promises]`
