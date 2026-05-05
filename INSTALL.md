# Install Guide

## Prerequisites

- Claude Code CLI installed (`claude` available in PATH)
- Node 20+ (for the audit + watch scripts)
- A `~/.claude/` directory (created on first Claude Code run)

## Step 1 — Drop the files

```bash
# Clone or download this repo, then from inside it:
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

Open `~/.claude/agents/supreme-dominator.md` and:

1. **Edit the Project Routing Table** (around line 24-32). Replace the example rows with your real projects. The `Signal` column is keywords that should trigger routing; the `CLAUDE.md` column is the path to that project's constitution file. If you don't have CLAUDE.md files in your projects, point at the project root or a README — anything stable and project-specific.

2. **Edit the Voice section** (around line 100). The defaults are declarative-and-concrete. Adjust to your style.

3. **Delete the "Setup note" line near the top** once you're done.

Example minimal routing table for a solo developer with 2 projects:

```markdown
| Signal | Project | CLAUDE.md |
|--------|---------|-----------|
| api, backend, server, route, endpoint | MyAPI | ~/code/my-api/README.md |
| frontend, react, tsx, ui, component | MyApp | ~/code/my-app/README.md |
| agent, hook, memory, swarm, claude-flow, skill, router, daemon | Infrastructure | ~/.claude/settings.json |
```

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

## Step 5 — Use it

In any Claude Code session:

```
/dominator <your task>
```

The skill will load the persona + context and execute the 4D protocol on your task.

Examples:

```
/dominator Refactor the auth module to extract the JWT verification into its own service
/dominator Audit my agent files for hardcoded numerical limits
/dominator Plan the migration from REST to gRPC for the user service
```

## What the persona will do

For any non-trivial task, the persona:

1. **DRAFTs** — names the task, names a `[V: <success>]` condition. If the V condition isn't nameable, decomposes until it is.
2. **DEVISEs** — picks an agent (or stays solo). For the Court abstraction, routes through Stratega/Operativo/Guardiano labels onto your existing agent infrastructure.
3. **DECIDEs** — executes in one parallel message. Stops. Synthesizes when results return.

Every spawned subagent gets a prepended PROTOCOL line so they emit `[V:]` markers too. The audit ratchet keeps it true permanently.

## Troubleshooting

**"slash command /dominator not found"** — Claude Code reads `~/.claude/commands/` on session start. Restart your Claude Code session.

**"audit script reports violations after I copied an existing agent"** — that agent file is missing the inheritance blockquote. Add it (see Step 3).

**"the persona drifts and I get inconsistent markers"** — check that the brief you're sending asks for `[V:]` markers. Empirically, briefs dominate persona — fix the brief if the marker is wrong.

**"can the watcher run as a background service?"** — yes. Wire it into your shell rc, a systemd unit, or just leave a terminal tab open. It debounces audit calls so it's cheap.

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

`[V: any user with Claude Code installed can drop these files in, fill out the routing table, and have a working /dominator command in under 10 minutes]`
