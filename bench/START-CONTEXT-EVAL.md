# Start-context evaluation: what each piece is actually worth

Everything loaded at session start costs tokens and attention on every turn. This guide measures each piece by results, on your own machine, and keeps only what earns its place.

**Rule:** a piece of context stays only if it measurably improves results or lowers cost on your real work. Otherwise delete it or move it somewhere cheaper.

---

## 1. Inventory: what loads at start

Don't list it from memory. Claude Code reports exactly what it loaded in the stream's `system/init` event:

```bash
claude -p ok --output-format stream-json --verbose --no-session-persistence \
  | head -5 | grep '"subtype":"init"' | python3 -c "
import json,sys; d=json.loads(sys.stdin.read())
n=lambda xs:[x if isinstance(x,str) else x.get('name') for x in xs or []]
for k in ['skills','agents','mcp_servers','plugins']: print(k, len(d.get(k) or []), n(d.get(k))[:50])"
```

Write down every item, grouped by how it loads:

| Kind | Examples on this setup | Loads | Always-on cost |
|---|---|---|---|
| Always in context | `~/.claude/CLAUDE.md`, project `CLAUDE.md`, personal preferences, output style | Every turn, in full | Full text |
| Listed, loaded on demand | Skills (`supreme-dominator`, `court-architecture`, …) | Name and description every turn, body only when invoked | About 1 line each |
| Invoked by you | Slash commands (`/dominator`) | Only when typed | None |
| Tools | MCP servers (Honcho, JEV if it's a server), agents | Tool schemas every turn | Schema size |
| Side effects | Hooks, auto-memory | On events | Latency, not tokens |

## 2. Three questions per item

1. **Cost:** what does it add to every turn? Compare the `usage` totals of a trivial prompt with and without it, both runs warmed.
2. **Trigger** (skills and tools only): does it fire when it should, and stay quiet otherwise? Count `Skill` or `tool_use` events in the stream. An item that never fires is pure cost. It's the first to delete.
3. **Effect:** when it's used, are results better? Answer this with an A/B on tasks where it *should* matter, using checks that can fail.

Keep trigger and effect apart. To test a skill's effect, force-load it (`--append-system-prompt-file SKILL.md`), so a failure to trigger doesn't hide what it does. To test triggering, use the normal setup and count how often it fires.

## 3. Method: ablation

Build one clean baseline, then change one thing at a time:

- **Add one:** baseline + one item. This shows the item's own effect.
- **Leave one out:** full setup − one item. This shows whether anything else already covers it (overlap). For a skill, move its folder out of `~/.claude/skills/` for that run.
- **Full:** your normal setup, as a sanity reference.

Isolation flags, checked against the `init` event on Claude Code 2.1.281:

| Flag | Effect (verified) |
|---|---|
| `--disable-slash-commands` | Skills: 40 → 0 |
| `--setting-sources project` | Drops user and account skills: 40 → 20 |
| `--strict-mcp-config --mcp-config '{"mcpServers":{}}'` | No MCP servers except those given |
| `--append-system-prompt-file <f>` | Adds one file of context (`CLAUDE.md`, a skill body) |
| `--mcp-config <honcho.json>` | Adds exactly one MCP server |
| `--bare` | Strips hooks, `CLAUDE.md`, plugins and auto-memory. Needs `ANTHROPIC_API_KEY` (no OAuth) |

**Never trust the model to say what it loaded.** In testing, a run with skills disabled still answered "18 skills". The runner checks the `init` event and marks mismatched runs INVALID.

## 4. Tasks: where most evals go wrong

Our first round passed every setup on every check, so it measured nothing. To avoid that:

- **Use your real work.** Take 5–8 tasks from recent sessions: one per project in the routing table, plus one where the item *should* help, one where it should do nothing, and one simple question where it could *hurt* (ceremony, extra length).
- **Write checks that can fail,** from facts in the repo: a known bug the answer must find, a file:line that must be real, a word limit, "no protocol headings on a one-line question".
- **Check for discrimination.** Any check that every setup passes is decoration. Replace it.
- **Grade blind.** For quality you can't script, hand two answers with their labels removed to a judge (a person or a separate agent) and ask which is better and why.

## 5. Run it

```bash
cp bench/ablation/plan.example.json bench/ablation/plan.json   # set your paths, arms and tasks
node bench/ablate.mjs bench/ablation/plan.json --dry-run       # check the commands
node bench/ablate.mjs bench/ablation/plan.json                 # run it
```

Each run gets a fresh copy of the repo (no `.git`), no editing tools, and saves `answer.md`, `stream.jsonl` and `run.json` under `out/<task>/<arm>/run-N/`. The summary table gives, per arm: pass rate ± spread, Δ against `baseline`, cost, tokens, time, and which skills actually fired.

- **Runs:** at least 3 per cell. With N=1, a single lucky answer is a 33-point swing.
- **Warm-up** (`"warmup": true`): one unrecorded run per cell first. Without it, prompt caching makes whichever arm runs second look cheaper. In the smoke test, `full` came out 53% cheaper for that reason alone.
- **Model:** keep it fixed across arms, and record it.

## 6. Decide

| Result | Verdict | Where it lives |
|---|---|---|
| Better quality, any cost | **Keep** | Where it already is |
| Same quality, clearly cheaper (≥10% over 3+ runs) | **Keep** | Where it already is |
| Same quality and cost, always wanted (values, voice) | **Move** | Personal preferences or `CLAUDE.md`, a few lines |
| Same quality and cost, wanted only sometimes | **Move** | A slash command, loaded on purpose |
| Never fires | **Delete**, or rewrite its description and re-test triggering | |
| Worse on any task | **Delete**, or fix the part that hurts and re-test | |
| Leave-one-out shows no loss | **Delete**: something else already covers it | |

Re-run after each model upgrade. Context that helped one model can become overhead for the next.

## 7. Evidence so far (cloud, 2026-09-24)

- **Merged `supreme-dominator` vs the old pair vs no skill** (3 tasks, N=1): same checks passed; the merged skill used about 16% fewer tokens and about 27% fewer words. Its checks didn't separate the arms. See `skills/supreme-dominator/evals/`.
- **Earlier T5 test, old skills** (N=2): no quality gain, and the old pair cost more than no skill.
- **Neither synced skill ever triggered on its own** during a full session of orchestration work.
- **Not testable in the cloud:** Honcho (host blocked by the network policy), JEV and Ollama (local only). Their arms in `plan.example.json` are for your Mac.
