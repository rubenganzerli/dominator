# Start-context evaluation on Windows

The same method as [START-CONTEXT-EVAL.md](./START-CONTEXT-EVAL.md): measure every piece of start context by **cost**, **trigger** and **effect**, change one thing at a time, and keep only what earns its place. This file is the Windows runbook. Every command is PowerShell 7 (`pwsh`) and was run before it was written down: on PowerShell 7.4.6, Claude Code 2.1.281 and Node 22.

## 0. Prerequisites

| Need | Check | Note |
|---|---|---|
| PowerShell 7 | `$PSVersionTable.PSVersion` → 7.x | Windows PowerShell 5.1 also works for these commands, but 7 is what they were tested on |
| Node 20+ | `node -v` | The runner uses `fs.cpSync` |
| Claude Code | `claude --version` | Native installer (`claude.exe`) works as-is. For an npm install, see step 3 |
| Login | `claude -p ok` answers | `--bare` runs also need `$env:ANTHROPIC_API_KEY`. Otherwise don't use `--bare` |

Paths: `~` is `$HOME`, which is `C:\Users\<you>`. Inside JSON, write paths with forward slashes (`C:/Users/you/.claude/CLAUDE.md`) so you don't have to escape backslashes.

## 1. Inventory: what loads at start

Ask Claude Code, not the model:

```powershell
$init = claude -p ok --output-format stream-json --verbose --no-session-persistence |
  ForEach-Object { $_ | ConvertFrom-Json } | Where-Object { $_.subtype -eq "init" } | Select-Object -First 1
foreach ($k in "skills","agents","mcp_servers","plugins") {
  $names = @($init.$k | ForEach-Object { if ($_ -is [string]) { $_ } else { $_.name } })
  "{0,-12} {1,3}  {2}" -f $k, $names.Count, ($names -join ", ")
}
```

Also list what's always in context on disk: `$HOME\.claude\CLAUDE.md`, each project's `CLAUDE.md`, `$HOME\.claude\settings.json` (hooks, MCP servers), and your personal preferences in claude.ai.

## 2. Cost: tokens each item adds to every turn

```powershell
function Measure-Context([string[]]$Extra) {
  $u = (claude -p ok --output-format json --no-session-persistence @Extra | ConvertFrom-Json).usage
  $u.input_tokens + $u.cache_creation_input_tokens + $u.cache_read_input_tokens
}
$base = Measure-Context @("--setting-sources","project")
$with = Measure-Context @("--setting-sources","project","--append-system-prompt-file","$HOME/.claude/CLAUDE.md")
"CLAUDE.md adds {0} tokens per turn" -f ($with - $base)
```

The counts are exact and repeatable (3 of 3 identical). Measured values:

| Change | Tokens per turn |
|---|---|
| 20 account and user skills listed (`default` vs `--setting-sources project`) | **+3,001** (about 150 per skill) |
| Merged `supreme-dominator` body, if always loaded | **+882** |
| `--disable-slash-commands` | **+2,913**, even though it removes the skill list |

**Don't use `--disable-slash-commands` as a cost baseline.** It hides the skills, but it adds context of its own. Use it only to isolate behavior. For cost, compare the item on against the item off, with everything else fixed.

## 3. Runner setup

```powershell
git clone https://github.com/rubenganzerli/dominator; cd dominator
Copy-Item bench\ablation\plan.example.json bench\ablation\plan.json
notepad bench\ablation\plan.json    # set paths as C:/Users/you/..., add your own tasks
```

If `claude` is the npm install (`claude.cmd`), Node can't launch it without a shell. Point the runner at Node directly:

```powershell
$env:CLAUDE_CMD = '["node","' + ((npm root -g) -replace '\\','/') + '/@anthropic-ai/claude-code/cli.js"]'
```

If that path doesn't exist, your npm package ships a native binary instead. Then set `$env:CLAUDE_CMD = '["C:/full/path/to/claude.exe"]'`. When the runner can't launch Claude, it says so and exits 2.

## 4. Mirror local agents into the repo (INSTALL step 4b)

`rsync` isn't on Windows. This copies only the `.md` files and keeps the folder tree:

```powershell
$src = Join-Path $HOME ".claude/agents"
Get-ChildItem $src -Recurse -Filter *.md | ForEach-Object {
  $dest = Join-Path "agents" $_.FullName.Substring($src.Length + 1)
  New-Item -ItemType Directory -Force (Split-Path $dest) | Out-Null
  Copy-Item $_.FullName $dest -Force
}
node scripts\protocol-audit.mjs --broad --root agents
```

## 5. Run

```powershell
node bench\ablate.mjs bench\ablation\plan.json --dry-run   # check each command
node bench\ablate.mjs bench\ablation\plan.json             # run: tasks × arms × runs, prints the summary table
```

Per-run files are written to `bench\ablation\out\<task>\<arm>\run-N\`, and the totals to `bench\ablation\out\summary.json`.

- Each run works in a fresh copy of the repo under `$env:TEMP` (no `.git`) with editing tools blocked.
- Isolation is checked from the `init` event, and a run that loaded the wrong context is marked INVALID.
- `cmd` checks run in `cmd.exe` on Windows, so write them in cmd syntax (`if exist README.md (exit 0) else (exit 1)`), or call `pwsh -c "..."` from them.

**Arms for this machine** (edit `plan.json`):

| Arm | Adds to baseline | Flag |
|---|---|---|
| `baseline` | nothing | `--disable-slash-commands --setting-sources project --strict-mcp-config --mcp-config {"mcpServers":{}}` |
| `+claude-md` | your global rules | `--append-system-prompt-file C:/Users/you/.claude/CLAUDE.md` |
| `+dominator-forced` | the merged skill, always loaded | `--append-system-prompt-file skills/supreme-dominator/SKILL.md` |
| `+honcho` | memory MCP | `--mcp-config C:/Users/you/.claude/honcho.mcp.json`, with `expect: {mcp:["honcho"]}` |
| `+jev` | JEV, if it's an MCP server or agent | `--mcp-config …` or `--agents C:/…/jev.json` |
| `+ollama` | local tier | only if a skill or tool routes to it. Check that `http://localhost:11434` answers first |
| `full` | your real setup | none |

For a **leave-one-out** run of a skill, move its folder out of `$HOME\.claude\skills\` for that run and move it back afterward. Account-synced skills can only be switched off in claude.ai.

## 6. Decide

Use the table in [START-CONTEXT-EVAL.md §6](./START-CONTEXT-EVAL.md#6-decide). The Windows-specific numbers to weigh against it: each listed skill costs about 150 tokens per turn, a full skill body about 900, and both are paid on every turn of every session.

## Windows pitfalls

- **Antivirus scanning** can slow the per-run repo copy a lot. Add `$env:TEMP\ablate-*` to the exclusions, or keep the repo small.
- **Long paths:** if the copy fails on deep `node_modules`, run `git config --system core.longpaths true` and enable long paths in Windows. Better still, don't evaluate a repo with `node_modules`.
- **Hooks written as `.sh`** won't run on Windows. A `full` arm that relies on them measures a different setup than your Mac does.
- **Quoting:** write JSON in PowerShell with single quotes (`'{"mcpServers":{}}'`). Inside `plan.json` no shell is involved, so no extra quoting is needed.
