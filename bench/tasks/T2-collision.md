---
tier: T2
axis: judgment-under-ambiguity
expected_cost_tokens: 80000
expected_duration_seconds: 60
pass_threshold: 0.7
---

# T2 — Judgment: Resolve the `code-analyzer` name collision

**Tests:** Reconnaissance + judgment under unclear data + decisive action plan.

Two files in `~/.claude/agents/` have overlapping intent around the "code-analyzer" name. The orchestrator must investigate, decide which is canonical, and propose a single coherent fix.

---

## Brief (verbatim)

```
PROTOCOL: emit [PROPOSAL:], [ALERT:], [V: <success-condition>] markers per .claude/agents/protocols/proactive-protocol.md.

TASK (PLAN-ONLY — do NOT modify files):

In ~/.claude/agents/, two files have overlapping intent regarding the
"code-analyzer" agent type:

  - ~/.claude/agents/analysis/code-analyzer.md
  - ~/.claude/agents/analysis/code-review/analyze-code-quality.md

Investigate both files. Determine:
1. Which file is the actually-spawnable `code-analyzer` subagent type?
   (Hint: the active subagent type is determined by the `name:` frontmatter
   field, not the filename or `type:` field.)
2. What does the OTHER file actually represent?
3. Is there a naming-collision risk for users running
   Agent({subagent_type: "code-analyzer"})?

Propose ONE single edit (file path + line number + before/after text)
that resolves any ambiguity without breaking the active spawnability of
either agent type.

OUTPUT FORMAT:
- "Active code-analyzer file: <absolute path>"
- "Justification: <which frontmatter fields confirm this>"
- "Other file's actual identity: <name from its frontmatter>"
- "Collision risk: <yes/no, with one-line explanation>"
- "Proposed single edit: <file>:<line>, before: <text>, after: <text>"
- End with [V: <success-condition>]

CONSTRAINTS: Read-only. ≤2 sub-agent spawns. ≤120k tokens.
```

---

## Ground truth

Investigated 2026-05-04:

| File | `name:` field | `type:` field | Active subagent type |
|------|---------------|---------------|---------------------|
| `agents/analysis/code-analyzer.md` | `analyst` | `code-analyzer` | **`analyst`** |
| `agents/analysis/code-review/analyze-code-quality.md` | `code-analyzer` | (frontmatter is YAML-like; declares `name: "code-analyzer"`) | **`code-analyzer`** |

**Resolution:**
- The actually-spawnable `code-analyzer` is `analyze-code-quality.md` (declares `name: "code-analyzer"`).
- The file at `agents/analysis/code-analyzer.md` is the misleadingly-named `analyst` agent.
- Filename suggests `code-analyzer` but the spawn-name is `analyst`. Users who naively `Agent({subagent_type: "code-analyzer"})` get the right thing (the `analyze-code-quality.md` file's content) — but reading `agents/analysis/code-analyzer.md` to understand it is misleading.

**Single-edit fix candidates** (any of these is acceptable):
- Rename the file `agents/analysis/code-analyzer.md` → `agents/analysis/analyst.md` (filename matches frontmatter `name`)
- Add a comment to `code-analyzer.md` line 1: `# (filename misleading — this defines the 'analyst' agent; the active 'code-analyzer' is at code-review/analyze-code-quality.md)`
- Update the `name:` frontmatter of `code-analyzer.md` to match the filename (would require the user to spawn `code-analyzer` and decide which content they want; high risk)

---

## Pass criteria

| Score component | Weight | Pass condition |
|-----------------|:------:|----------------|
| Identified active file correctly | 0.3 | Names `analyze-code-quality.md` (declares `name: "code-analyzer"`) |
| Identified other file's actual identity | 0.2 | Names `analyst` (the `name:` field of `code-analyzer.md`) |
| Correctly assessed collision risk | 0.2 | Recognizes `Agent({subagent_type: "code-analyzer"})` works but is confusing |
| Proposed coherent single edit | 0.2 | One concrete edit, preserves spawnability of both, reduces ambiguity |
| V marker emitted | 0.1 | Present |

**Pass at 1.0** = all components met. **≥0.7 = pass**, **<0.7 = fail**.

---

## Variance expectation

Medium. Orchestrators may differ on which fix to propose (rename file vs. add comment vs. update frontmatter). All three are valid; the variance is in WHICH one they pick. Variance >0.4 across trials suggests inconsistency.

---

## What this task discriminates

- **Cannot identify active file** → orchestrator doesn't understand the YAML frontmatter convention. Disqualified for any agent-system work.
- **Identifies but proposes risky fix** (e.g., updating `name:` in a way that breaks spawn) → poor risk awareness.
- **Identifies + proposes safe fix** → good judgment under ambiguity.
- **Identifies + proposes safe fix + flags filename-misleading-pattern more broadly** → excellent (proactive `[ALERT:]`).

---

## Notes

- This task is real, not synthetic — the collision exists in `~/.claude/agents/` today (verified 2026-05-04). Resolving it is a `−` (eliminates a confirmed `[IMPLICIT]` violation per the project's tagging vocabulary).
- The brief deliberately gives the hint about `name:` field semantics. Without that hint, the task moves to T3 difficulty (decomposition + investigation rather than just judgment).
