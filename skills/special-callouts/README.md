# Special Callouts — Agent Skill

[Türkçe](README_TR.md) · [Plugin README](../../README.md)

An [Agent Skill](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)
that teaches an AI assistant the complete syntax and real rendering behaviour of the
[Special Callouts](https://github.com/ahseyg/special-callouts) plugin for Obsidian (v1.0.7).

With this skill loaded, an agent can write correct Special Callouts markdown on the first
try — styled callouts, multi-column lists, dashboard grids, Dataview panels — and diagnose
callouts that render wrong, without the user having to explain the plugin.

## What's inside

| File | Contents |
|---|---|
| `SKILL.md` | Core syntax, the traps that make valid syntax look broken, composition, grids, debugging checklist |
| `references/parameters.md` | Every parameter: accepted values, aliases, colour resolution, per-parameter edge cases |
| `references/layouts.md` | Multi-column lists, `multi-callout` grids, custom visual layouts, Dataview integration |
| `references/recipes.md` | Ready-made patterns — terminal, stat tiles, trackers, dashboards — plus tested colour pairs |
| `references/internals.md` | Render pipeline, DOM/CSS contract, settings schema, commands, known bugs |

The reference files load only when the task needs them, so ordinary requests stay cheap.

Content is derived from the v1.0.7 source — parser, processor and stylesheet — rather than
from the plugin's documentation. Where the two disagree, the skill documents what the code
actually does and flags the discrepancy.

## Installing

**Claude Code** — copy the folder into either location and it is picked up automatically:

```bash
cp -r special-callouts ~/.claude/skills/          # all projects
```

```bash
cp -r special-callouts .claude/skills/            # this project only
```

**Claude.ai / Claude Desktop** — zip the `special-callouts` folder and upload it under
Settings → Capabilities → Skills.

**Any other agent** — `SKILL.md` is plain markdown with YAML frontmatter. Paste it into a
system prompt, or point your framework's skill loader at this directory.

## Using it

Nothing to invoke. The skill triggers on Obsidian-callout-shaped requests, including ones
that never name the plugin:

- "make this note's warning box dark with a red glow"
- "build me a dashboard at the top of my daily note with my open tasks"
- "split this list into three columns"
- "why is my callout background so faint?"

## Compatibility

Written against Special Callouts **v1.0.7**. Parameter syntax has been stable since 1.0.3;
`internals.md` is the part most likely to age, as it documents implementation details and
open bugs.

## License

MIT, same as the plugin.
