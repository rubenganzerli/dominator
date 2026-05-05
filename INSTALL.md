# Install Guide

Three minutes from clone to first `/dominator` invocation. Five if you read the routing table carefully — and you should.

## Prerequisites

- Claude Code CLI installed (`claude` available in PATH)
- Node 20+ (for the audit + watch scripts)
- A `~/.claude/` directory (created on first Claude Code run)

## Step 1 — Drop the files

```bash
# From inside the cloned repo:
cp -r commands/* ~/.claude/commands/
cp -r agents/*   ~/.claude/agents/
cp -r scripts/*  ~/.claude/scripts/
chmod +x ~/.claude/scripts/protocol-audit.mjs ~/.claude/scripts/protocol-watch.mjs
```

If `~/.claude/agents/` already has agent files (most users do — Claude Code ships some), this won't overwrite them. The new files (`supreme-dominator.template.md`, `court-architecture.md`, `protocols/proactive-protocol.md`) sit alongside.

## Step 2 — Personalize the persona

```bash
mv ~/.claude/agents/supreme-dominator.template.md ~/.claude/agents/supreme-dominator.md
```

Open `~/.claude/agents/supreme-dominator.md`. Three things to edit:

### 2a. The Project Routing Table (around lines 30-35)

The defaults are an invitation, not a placeholder. They sketch a workshop with three rooms:

- **The Forge** — where you build (your main codebase)
- **The Atlas** — where you learn (your knowledge base, notes, research)
- **The Salon** — where you present (your public-facing project, blog, portfolio)

Plus a fourth row for **Infrastructure** that routes meta-work to `~/.claude` itself.

You have three good options:

1. **Keep the metaphors, point them at real paths.** Works beautifully if the metaphor fits. The Forge stays The Forge; you just tell it where The Forge actually lives.
2. **Rename to your real project names.** The Forge becomes `MyAPI`, The Atlas becomes `obsidian-vault`, The Salon becomes `personal-site`.
3. **Replace the rows entirely.** Different number of projects, different domains. The table only requires that each row has a Signal (keywords), a Project (name), and a CLAUDE.md (constitution path).

Each row needs:

- **Signal** — keywords you'd actually type when you want this project active
- **Project** — the name (your real one, or the default metaphor)
- **CLAUDE.md** — path to the project's constitution file (CLAUDE.md, README.md, INDEX.md — anything stable works)

Worked example for a developer with two real projects + Infrastructure:

```markdown
| Signal | Project | CLAUDE.md |
|--------|---------|-----------|
| api, backend, server, route, endpoint | MyAPI | ~/code/my-api/README.md |
| frontend, react, tsx, ui, component | MyApp | ~/code/my-app/README.md |
| agent, hook, memory, swarm, claude-flow, skill, router, daemon | Infrastructure | ~/.claude/settings.json |
```

More worked examples in [examples/routing-table.example.md](./examples/routing-table.example.md).

### 2b. The Voice section (around line 109)

The defaults are declarative-and-concrete. Adjust to your style. If you write in a different language, swap the locale-aware line. If you prefer hedging, remove the "declare, don't hedge" line — the kit will still work; it just won't sound like the maintainer.

### 2c. Delete the "Setup note" line near the top

Once you're done. It's only there to greet you.

## Step 3 — Verify the audit ratchet

```bash
node ~/.claude/scripts/protocol-audit.mjs --broad
```

Expected: `PASS N / FAIL 0`, exit 0 — where N is the count of agent files in your tree that carry the inheritance blockquote.

If you see `FAIL > 0`, the audit lists which files are missing the blockquote. Add this line to the top of each (after the `# Title` heading):

```markdown
> **Inherits the [Proactive Protocol](../protocols/proactive-protocol.md):** emit `[V:]`, `[PROPOSAL:]`, `[ALERT:]` markers; reflect before output.
```

Adjust the relative path so it correctly points at `protocols/proactive-protocol.md` from that file's location.

## Step 4 — (Optional) Run the watcher

```bash
node ~/.claude/scripts/protocol-watch.mjs
```

This runs the audit automatically every time you save an agent file. Useful while editing. `Ctrl+C` to stop. Or run once for a fresh tree:

```bash
node ~/.claude/scripts/protocol-watch.mjs --once
```

To run as a background service: wire it into your shell rc, a systemd unit, or just leave a terminal tab open. It debounces audit calls so it stays cheap.

## Step 5 — Use it

In any Claude Code session:

```
/dominator <your task>
```

The skill loads the persona + context and executes the 4D protocol on your task.

Examples:

```
/dominator Refactor the auth module to extract JWT verification into its own service
/dominator Audit my agent files for hardcoded numerical limits
/dominator Plan the migration from REST to gRPC for the user service
```

## What the persona will do

For any non-trivial task, the persona:

1. **DRAFTs** — names the task, names a `[V: <success>]` condition. If the V condition isn't nameable, decomposes until it is.
2. **DEVISEs** — picks an agent (or stays solo). For larger tasks, routes through Stratega/Operativo/Guardiano labels onto your existing agent infrastructure.
3. **DECIDEs** — executes in one parallel message. Stops. Synthesizes when results return.

Every spawned subagent gets a prepended PROTOCOL line so they emit `[V:]` markers too. The audit ratchet keeps the inheritance true permanently.

## Troubleshooting

**"slash command /dominator not found"** — Claude Code reads `~/.claude/commands/` on session start. Restart your Claude Code session.

**"audit script reports violations after I copied an existing agent"** — that agent file is missing the inheritance blockquote. Add it (see Step 3).

**"the persona drifts and I get inconsistent markers"** — check that the brief you're sending asks for `[V:]` markers. Empirically (round 10), briefs dominate persona — fix the brief if the marker is wrong.

**"the watcher keeps re-running on save loops"** — debounce is 500ms by default. If your editor saves multiple files atomically, that's expected.

## Uninstall

```bash
rm ~/.claude/commands/dominator.md
rm ~/.claude/agents/supreme-dominator.md
rm ~/.claude/agents/court-architecture.md
rm -rf ~/.claude/agents/protocols/
rm ~/.claude/scripts/protocol-audit.mjs
rm ~/.claude/scripts/protocol-watch.mjs
```

(The `protocols/` directory may contain other things you've added; `rm -rf` only if you know it's just `proactive-protocol.md` from this kit.)

`[V: any user with Claude Code installed can drop these files in, fill out the routing table from one of three welcomed paths (keep / rename / replace), pass the audit, and have a working /dominator command in under 10 minutes]`
