# Routing Table Examples

The Project Routing Table in `supreme-dominator.md` is the single most-personalized part of the kit. These examples show different shapes for different setups.

---

## Example 1 — Solo developer, 2 codebases

```markdown
| Signal | Project | CLAUDE.md |
|--------|---------|-----------|
| api, backend, server, route, endpoint, jwt, auth | MyAPI | ~/code/my-api/README.md |
| react, tsx, component, ui, frontend, vite | MyApp | ~/code/my-app/README.md |
| agent, hook, memory, swarm, claude-flow, skill, router, daemon | Infrastructure | ~/.claude/settings.json |
```

---

## Example 2 — Multi-domain consultant

```markdown
| Signal | Project | CLAUDE.md |
|--------|---------|-----------|
| client-a, fintech, ledger, transaction | Client A | ~/clients/a/CLAUDE.md |
| client-b, healthcare, FHIR, HL7, patient | Client B | ~/clients/b/CLAUDE.md |
| portfolio, blog, personal-site, brand | Personal Site | ~/personal/site/CLAUDE.md |
| writing, draft, article, essay | Writing | ~/personal/writing/INDEX.md |
| agent, hook, memory, swarm, claude-flow, skill | Infrastructure | ~/.claude/settings.json |
```

---

## Example 3 — Domain specialist (industry-specific keywords)

For an Italian building-energy SaaS engineer:

```markdown
| Signal | Project | CLAUDE.md |
|--------|---------|-----------|
| thermal, building, UNI, ISO, kW, trasmittanza, involucro, fabbisogno | ThermoApp | ~/Desktop/thermo-app/CLAUDE.md |
| portfolio, website, brand, glyph | Personal Brand | ~/Desktop/brand/CLAUDE.md |
| agent, hook, memory, swarm, claude-flow, skill | Infrastructure | ~/.claude/settings.json |
```

The signal column should include domain terms in your working language — keywords the user is likely to type when they want this project active.

---

## Example 4 — Monorepo with sub-domains

```markdown
| Signal | Project | CLAUDE.md |
|--------|---------|-----------|
| backend, api, server, db, migration | Backend | ~/code/monorepo/backend/CLAUDE.md |
| web, frontend, react, page, component | Web | ~/code/monorepo/web/CLAUDE.md |
| mobile, ios, android, react-native | Mobile | ~/code/monorepo/mobile/CLAUDE.md |
| infra, terraform, k8s, helm, deploy | Infra | ~/code/monorepo/infra/CLAUDE.md |
| agent, hook, memory, swarm, skill | Infrastructure | ~/.claude/settings.json |
```

In a monorepo, each sub-domain gets its own row pointing at its sub-CLAUDE.md. The persona's routing then loads the right sub-context per task.

---

## Tips

- **Signal column is keywords the user types**, not formal taxonomy. Trust your own vocabulary.
- **CLAUDE.md path can be any stable file** — README.md, INDEX.md, ARCH.md. The persona uses it as the project's constitution; whatever file is most authoritative wins.
- **Keep the Infrastructure row** — it routes meta-tasks (agent edits, hook config, skill management) to your `~/.claude/` setup rather than blending into a project context.
- **One project per row.** If a task spans two projects, the persona explicitly identifies the primary and avoids context-blending; that's by design.

`[V: this file shows 4 different routing-table shapes covering common Claude Code use patterns, each immediately usable by replacing path placeholders]`
