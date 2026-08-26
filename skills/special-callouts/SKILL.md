---
name: special-callouts
description: Deterministic markdown generation, styling, and debugging guide for AI coding and authoring agents using the Special Callouts plugin in Obsidian. Covers inline metadata syntax, parameter matrices, multi-column list reflow (`col:N`), and nested dashboard grid scaffolding (`multi-callout`). Activate whenever generating Obsidian notes, callouts, admonitions, dashboard layouts, stat boxes, Dataview containers, or debugging callout rendering failures.
---

# Special Callouts — AI Agent Operational Guide

This skill instructs AI agents on emitting, transforming, and debugging Obsidian callouts styled with the Special Callouts plugin (v1.0.9+). All styling is driven by plain markdown metadata embedded directly in note files.

---

## 1. Core Syntax & Grammar

### Canonical Form
```markdown
> [!type] (param:value, param:value, flag) Title Text
> Content lines...
```

### Grammar Rules for Generation
1. **Metadata Position**: The parenthesized block `(...)` MUST appear **immediately after `]`** and **before the title text**.
   - `> [!note] (bg:red) Title`  (VALID)
   - `> [!note] Title (bg:red)`  (INVALID — silently treated as plain title text)
   - `> [!note|bg:red] Title`   (INVALID — pipe syntax is never rendered)
2. **Key-Value Separation**: Comma-separated (`param:value, flag`). Keys are case-insensitive.
3. **Grouped Parameters**: Nested parentheses are parsed as grouped values: `text:(white, dark-border)`.
4. **Callout Type**:
   - Standard: `note`, `tip`, `warning`, `danger`, `success`, `question`, `example`, `quote`, `todo`, `info`, `abstract`, `failure`, `bug`.
   - Aliases: `summary`/`tldr` (`abstract`), `hint`/`important` (`tip`), `check`/`done` (`success`), `help`/`faq` (`question`), `caution`/`attention` (`warning`), `fail`/`missing` (`failure`), `error` (`danger`), `cite` (`quote`).
   - Container: `multi-callout` (wrapper for grid dashboards).
   - Saved Presets: Custom names defined in vault settings (e.g. `style:my-preset` or `[!my-preset]`).

---

## 2. Parameter Matrix

| Parameter | Valid Values & Types | Example | Agent Generation Rules |
|---|---|---|---|
| `bg:` | Hex code, named color, or CSS color | `bg:#1a1a2e`, `bg:teal` | Applied as `color-mix(..., 15%, transparent)`. For solid color, use `gradient:`. |
| `border:` | Hex code, named color, or `none` | `border:#7c4dff`, `border:none` | Sets border color. `none` removes border. |
| `text:` | Hex code or named color | `text:#dfe6e9` | Colors body text only. |
| `title:` | Hex code or named color | `title:#00cec9` | Colors title AND icon. |
| `icon-color:` | Hex code or named color | `icon-color:#ffab00` | Overrides icon color independently from `title:`. |
| `link:` | Hex code or named color | `link:#448aff` | Colors `<a>` and `[[internal links]]`. |
| `gradient:` | Two colors hyphen-joined (`c1-c2`) | `gradient:purple-blue`, `gradient:#667eea-#764ba2` | Applied at 100% opacity. Automatically sets `border:none` unless explicit `border:` follows. |
| `neon:` | Hex code or named color | `neon:cyan`, `neon:#00ffcc` | Generates border glow and drop-shadow. |
| `font:` | `mono`, `serif`, `sans`, `code`, `heading` | `font:mono` | Changes typography family. |
| `font-size:` | Integer `1` to `5` | `font-size:4` | `1`=Smallest, `3`=Default, `5`=Largest. |
| `icon:` | Lucide icon identifier | `icon:sparkles`, `icon:cpu` | Lowercase Lucide icon name. |
| `bw:` / `border-width:` | Number or `Npx` | `bw:2`, `border-width:3px` | Border thickness. |
| `bs:` / `border-style:` | `solid`, `dashed`, `dotted`, `double` | `bs:dashed` | CSS border style. |
| `radius:` | CSS unit length | `radius:12px`, `radius:8` | Corner curvature. |
| `col:` | Positive integer `1` to `6` | `col:3` | Reflows lists (`ul`/`ol`) inside the callout into N columns. |
| `compact` | Flag | `compact` | Removes vertical/horizontal padding. Essential for dashboard tiles. |
| `dense` | Flag | `dense` | Superset of `compact` with tighter line-height. Ideal for long lists. |
| `center` | Flag | `center` | Centrally aligns title and body content. |
| `title:center` | Flag | `title:center` | Centrally aligns title only. |
| `no-icon` | Flag | `no-icon` | Hides the callout icon completely. |
| `style:` | Preset name | `style:ocean-deep` | Inherits properties from a saved custom preset. |

---

## 3. Agent Decision Tree: Layout Selection

```
When designing an Obsidian layout:
├── Is it a single box with a list of many items?
│   └── EMIT: Single callout with `col:N` (e.g. `col:2` or `col:3`, `compact`)
├── Is it a row or grid of multiple cards / stat tiles / widgets?
│   └── EMIT: `> [!multi-callout]` container with nested `>> [!type] (N:M, ...)` blocks
└── Is it a single highlighted callout / quote / banner?
    └── EMIT: Single callout with `gradient:` or `bg:` + `neon:` + `icon:`
```

---

## 4. Multi-Column Dashboard Grid Generation

### Strict Generation Schema
To scaffold side-by-side tiles, agents MUST emit a `multi-callout` parent block with **nested callouts separated by single `>` lines**:

```markdown
> [!multi-callout]
> > [!info] (1:3, bg:#3498db, compact) Metric A
> > **1,280**
> > +12% this week
>
> > [!success] (2:3, bg:#2ecc71, compact) Metric B
> > **$42,500**
> > On target
>
> > [!warning] (3:3, bg:#f39c12, compact) Metric C
> > **3 Pending**
> > Requires review
```

### Critical Dashboard Generation Rules for Agents
1. **The Separator Line**: You MUST include a single `>` line between nested blocks. Omitting it merges child callouts into a single blockquote.
2. **Width Ratio `(N:M)`**:
   - `M` determines panel width: `flex: 0 0 calc((100% - (M-1) * 10px) / M)`.
   - `(1:2, ...)` and `(2:2, ...)` = 2 equal 50% columns.
   - `(1:3, ...)`, `(2:3, ...)`, `(3:3, ...)` = 3 equal 33% columns.
   - For a 2×2 grid: Emit four `(…:2)` panels in document order (they automatically wrap into 2 rows).
3. **Flags on Children**: Never put `compact` or `center` on the `[!multi-callout]` header line. Always place them on the child callouts.
4. **Saved Layout Names**: If using a custom visual layout saved in vault settings, apply it as a bare word on the container: `> [!multi-callout] (layout_name)`.

---

## 5. Multi-Column Lists (`col:N`) & Dataview Integration

`col:N` targets unordered (`ul`) and ordered (`ol`) lists, including dynamically rendered Dataview lists:

```markdown
> [!todo] (col:2, compact, bg:#1a1a2e, text:#dfe6e9, title:#00cec9) Active Project Tasks
> ```dataview
> TASK
> FROM "Projects"
> WHERE !completed
> LIMIT 12
> ```
```

*Agent Rule*: Always include `LIMIT` in Dataview queries embedded in multi-callout dashboards to prevent irregular panel stretching.

---

## 6. Anti-Hallucination Traps & Error Prevention

| AI Generation Anti-Pattern | Why It Fails | Correct Agent Action |
|---|---|---|
| `> [!note|bg:red] Title` | Pipe syntax is ignored by the parser. | Use `> [!note] (bg:red) Title`. |
| `> [!note] Title (bg:red)` | Metadata placed after title is parsed as plain text. | Place metadata immediately after `]`. |
| `gradient:brand-blue-purple` | Hyphenated custom color names break the 2-color split. | Use hex colors: `gradient:#1a73e8-#764ba2`. |
| Expecting `bg:#000` to be solid black | `bg:` applies a 15% translucent tint. | Use `gradient:#000000-#000000` for 100% opacity. |
| Forgetting `>` between nested callouts | Markdown merges children into one blockquote. | Always insert a blank `>` separator line. |
| Relying on `N` in `(N:M)` for absolute layout | Sizing is flex-based; position is document order. | Emit child blocks in exact top-left to bottom-right order. |

---

## 7. Fast Troubleshooting Protocol for Agents

When inspecting user markdown where callouts render improperly:
1. **Check Character 1 after `]`**: Must be a space followed immediately by `(`.
2. **Check Parentheses Balance**: Ensure no unclosed `(` exists in the metadata block.
3. **Verify Parameter Keys**: Check for misspelled keys (e.g. `background:` → use `bg:`, `colour:` → use `text:` or `title:`).
4. **Check Nested Indentation**: In dashboards, ensure child blocks use `>>` and separators use `>`.

---

## 8. Reference Documentation

- [parameters.md](file:///r:/Obsidian/Testsub1/.obsidian/plugins/special-callouts/skills/special-callouts/references/parameters.md): Complete parameter dictionary, hex resolution rules, and aliases.
- [layouts.md](file:///r:/Obsidian/Testsub1/.obsidian/plugins/special-callouts/skills/special-callouts/references/layouts.md): Deep-dive into flex calculations, matrix layouts, and Dataview pipelines.
- [recipes.md](file:///r:/Obsidian/Testsub1/.obsidian/plugins/special-callouts/skills/special-callouts/references/recipes.md): Production-ready copy-paste templates (Stat Rows, Kanban Boards, Habit Trackers, Terminal Cards).
- [internals.md](file:///r:/Obsidian/Testsub1/.obsidian/plugins/special-callouts/skills/special-callouts/references/internals.md): Plugin architecture, registered command IDs, settings JSON schema, and DOM properties.

