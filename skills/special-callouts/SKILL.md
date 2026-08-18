---
name: special-callouts
description: Write and debug Obsidian callouts styled with the Special Callouts plugin (v1.0.8) — inline metadata in parentheses controlling background, text, title and link colors, gradients, neon glow, borders, radius, fonts, font size, Lucide icons, centering, compact mode, multi-column lists, and multi-callout dashboard grids. Use this skill whenever the user is working in Obsidian and mentions callouts, admonitions, `> [!note]` / `> [!tip]` blocks, colored or styled note boxes, dashboards or grid layouts inside a note, splitting a list into columns, putting Dataview output inside a styled box, or asks why a callout is not rendering the way they expected — even if they never say "Special Callouts" by name. Also use it when asked to design a note template, a habit tracker, a home page, or a "pretty" Obsidian layout.
---

# Special Callouts (Obsidian plugin, v1.0.8)

Special Callouts extends Obsidian's native callouts with a metadata block written
directly in the callout title line. It is a **markdown-authoring** plugin: everything
you produce is plain markdown that lives in the user's note, so the whole job is
emitting the right syntax and knowing what the renderer will actually do with it.

Plugin id `special-callouts` · author `ahseyg` · MIT · desktop and mobile.

## The one syntax rule

```markdown
> [!type] (param:value, param:value) Optional Title
> Content...
```

The metadata block is a parenthesised list placed **immediately after `]`, before the
title text**. That position is not stylistic — the parser reads the title's text content,
skips leading whitespace, and gives up unless the very next character is `(`. Everything
after the closing `)` becomes the visible title; the metadata itself is stripped from the
rendered output.

These all fail silently and render as an ordinary callout:

```markdown
> [!note] My Title (bg:red)        ← metadata after the title: ignored
> [!note|bg:red] My Title          ← pipe form: never parsed (see trap 8)
> [!note] (bg:red                  ← unbalanced parens: ignored
```

Parameters are comma-separated, keys are case-insensitive, and parentheses nest correctly,
which is what makes the grouped form `text:(white, dark-border)` work.

`type` can be any Obsidian callout type (`note` `tip` `warning` `danger` `success`
`question` `example` `quote` `todo` `info` `abstract` `failure` `bug`), a saved custom
preset name, or the special wrapper `multi-callout`.

## Parameters at a glance

| Group | Parameters |
|---|---|
| Colors | `bg:` `text:` `title:` `link:` `gradient:` `neon:` |
| Borders | `border:` `border-width:` `border-style:` `radius:` |
| Type | `font:` `font-size:` `icon:` `icon-color:` `no-icon` |
| Layout | `col:` `center` `compact` / `dense` `title:center` `N:M` grid |
| Presets | `style:preset-name` · a saved layout name as a bare word |

Colors accept a hex code (`#e74c3c`), one of the built-in names (`red` `blue` `green`
`yellow` `orange` `purple` `pink` `teal` `grey`/`gray`), or any custom color name the user
defined in settings. Unknown names pass straight through to CSS, so `rebeccapurple` works
by accident and typos fail quietly.

For exact accepted values, defaults, aliases and per-parameter edge cases, read
`references/parameters.md`.

## Traps — read this before writing any callout

These are the things that make output look wrong even when the syntax is valid. They come
from the implementation, not from the plugin's own documentation.

**1. `bg:` is deliberately translucent.** The background is applied as
`color-mix(in srgb, <color> 15%, transparent)`. `bg:#000000` is a faint 15% black wash over
the theme background, not a black box. When the user asks for a solid, saturated panel,
`bg:` alone will disappoint them — reach for `gradient:` instead, which is applied at full
opacity. This one fact explains most "the color barely shows up" complaints.

**2. `gradient:` removes the border.** Setting a gradient also sets the no-border flag, by
design, to avoid seams. If a border is wanted alongside a gradient, add an explicit
`border:<color>` *after* the gradient parameter.

**3. `gradient:` splits on `-`, so it takes exactly two colors.** `gradient:blue-purple`
and `gradient:#667eea-#764ba2` both work. A custom color name containing a hyphen
(`brand-blue`) breaks the split and the gradient is dropped — use hex there.

**4. In a grid, the position number does nothing.** In `(2:3)` only the `3` matters: it
sets each panel's width to one third. Placement comes from document order, and the optional
row component in `(2:3:2)` is recorded as an attribute with no styling attached to it. So
panels must be written in the order they should appear, and a "row 2" panel only lands on
row 2 because the flex row wrapped. Numbering them `1:3, 2:3, 3:3` is still worth doing —
it keeps the source readable and matches every example the user has seen.

**5. `dense` is `compact` plus a tighter line-height** — a superset, not a sibling. Writing
`(dense, compact)` is redundant rather than additive, and `dense` alone already reduces
padding. Reach for it when a panel holds a long list; plain `compact` when the padding is
the only problem. (In v1.0.7 and earlier the two were exact aliases and `dense` had no
line-height effect at all, despite what that version's guide claimed.)

**6. `text:` colors the content only; `title:` colors the title *and* its icon.** There is
no single parameter that recolors everything — set both. `icon-color:` peels the icon back
off `title:` when the two should differ.

**7. Flags win in a fixed order.** `no-icon` beats `icon:`, and `center` beats
`title:center`; the loser is skipped entirely rather than merged.

**8. Only parentheses are parsed — the pipe form `[!note|bg:red]` never renders.** In v1.0.7
the **Default Callout Metadata** setting and the *Change Icon of Callout at Cursor* command
both emitted the pipe form, so a user on that version who filled in the setting got callouts
that quietly stopped working. Both emit parentheses now. If you meet a note full of
`[!type|meta]` callouts, this is the cause — rewriting them as `[!type] (meta)` fixes them.

## Composing a styled callout

Work outward from the surface the user cares about:

```markdown
> [!note] (bg:#0f0e17, text:#a7a9be, title:#ff6bcb, font:mono, neon:#ff6bcb, radius:12, compact) Deploy Status
> Build 482 · passing
```

Nothing is required and order doesn't matter — the parser walks the list and applies each
key independently. Two habits keep output readable: group related parameters (colors, then
type, then layout), and leave out anything that only restates a default, since every extra
token is one more thing for the user to maintain.

When the same look is wanted repeatedly, a saved preset beats a long metadata line. Presets
are created in **Settings → Special Callouts → Custom Callouts**, then used either as the
callout type itself, `> [!my-style]`, or applied to a standard type,
`> [!note] (style:my-style)`. Inline metadata is applied after the preset and overrides it
property by property — which is exactly how to write "the usual card, but red this time".
Preset names must be lowercase and hyphenated: Obsidian lowercases the callout type, and a
name containing a space stops being a valid callout type at all.

## Multi-column lists

`col:N` reflows lists inside the callout into N newspaper-style columns:

```markdown
> [!todo] (col:3, compact) Backlog
> - Design mockup
> - Wire up API
> - Write tests
> - Ship it
```

Items fill top-to-bottom then left-to-right with `ceil(items / N)` rows per column, so
7 items in 2 columns give 4 + 3. It targets `ul` and `ol` elements inside the callout
content, including the lists Dataview generates — a retry schedule (100 ms → 2 s) plus a
mutation observer exists specifically so Dataview and Homepage content that arrives late
still gets columnised. Nothing else is affected: paragraphs, tables and headings ignore
`col:`.

## Dashboard grids

Side-by-side panels use a `multi-callout` wrapper whose own frame and title are hidden, with
nested callouts as its children:

```markdown
> [!multi-callout]
> > [!info] (1:3, bg:#3498db, compact) Users
> > 1,234
>
> > [!success] (2:3, bg:#2ecc71, compact) Revenue
> > $12,345
>
> > [!warning] (3:3, bg:#e67e22, compact) Alerts
> > 3 pending
```

The blank `>` line between panels matters — it separates the nested blockquotes. Panels wrap
to a new row when they run out of width, and stack vertically below 600 px. `compact` is
close to mandatory here; default padding makes small panels look empty.

For irregular dashboards — a wide header over two columns, an L-shaped cell — the Visual
Layout Builder in settings produces a named CSS-grid layout, applied to the wrapper, which
fills its children into the designed areas in order:

```markdown
> [!multi-callout] (my_dashboard)
> > [!info] Panel A
>
> > [!tip] Panel B
```

Grid mechanics, the builder's naming rules, and how children map onto areas are covered in
`references/layouts.md`.

## Debugging a callout that renders wrong

Check in this order — the first three explain nearly everything:

1. **Is the metadata immediately after `]`?** Anything before it, including the title,
   disables the whole block.
2. **Is it entirely unstyled, or is one value being ignored?** A single bad parameter is
   skipped silently while its neighbours still apply. A *partly* styled callout points at
   one bad value (a `font:` outside the five names, a `font-size:` outside 1–5); a *fully*
   unstyled one points at metadata position or unbalanced parens.
3. **Is the color simply faint?** See trap 1 — usually `bg:` doing what it was built to do
   rather than a failure.
4. **Is the plugin's CSS being overridden?** The plugin writes CSS custom properties and
   data attributes onto the callout element; opinionated themes and snippets targeting
   `.callout` can win. Ask the user to test with the default theme.
5. **Columns empty on first load?** Dataview rendered after the last retry. Reopening the
   note fixes it; it is a timing issue, not a syntax one.

`references/internals.md` maps every parameter to the attribute and CSS variable it sets —
read it when inspecting the DOM or when a theme conflict is suspected.

## Reference files

- `references/parameters.md` — every parameter, exact accepted values, aliases, colour
  resolution, and the edge cases each one has. Read before writing anything non-trivial.
- `references/layouts.md` — grid, multi-callout, custom visual layouts, multi-column lists
  and Dataview integration in depth.
- `references/recipes.md` — ready-made patterns: terminal, sticky note, quote card, stat
  row, habit tracker, Dataview dashboard. Start here when the user describes a *look*
  rather than a parameter.
- `references/internals.md` — processing pipeline, DOM attributes, CSS variables, settings
  schema, precedence rules, commands, and documented-but-untrue behaviours. Read for
  debugging, for writing snippets against the plugin, or for contributing to it.
