# Recipes

Tested patterns to start from when the user describes a *look* rather than a parameter.
Every recipe is complete markdown — paste it, then adjust colors.

## Contents

- [Choosing a starting point](#choosing-a-starting-point)
- [Single callouts](#single-callouts)
- [Dashboards and grids](#dashboards-and-grids)
- [Lists and trackers](#lists-and-trackers)
- [Color combinations that hold up](#color-combinations-that-hold-up)
- [Adapting a recipe](#adapting-a-recipe)

---

## Choosing a starting point

| The user says | Start from |
|---|---|
| "make it stand out / pop" | [Neon alert](#neon-alert) or [Banner](#full-width-banner) |
| "like a terminal / code" | [Terminal](#terminal) |
| "a card / a box for X" | [Solid card](#solid-card) |
| "cleaner / less noisy" | [Quiet note](#quiet-note) |
| "a dashboard / overview / home page" | [Stat tile row](#stat-tile-row) |
| "side by side / compare" | [Two-column compare](#two-column-compare) |
| "a checklist / tracker" | [Checklist in columns](#checklist-in-columns) |
| "pull in my tasks / notes" | [Dataview dashboard](#dataview-dashboard) |
| "a quote / callout for a passage" | [Quote card](#quote-card) |

Recurring decision: `bg:` is a 15% tint, so anything described as *solid*, *dark*, *card* or
*panel* should use `gradient:` with two close colors instead.

## Single callouts

### Terminal

```markdown
> [!note] (bg:#0f0e17, text:#00ff41, title:#00ff41, font:mono, border:none, no-icon) ~/project
> $ git status
> $ git add .
> $ git commit -m "feat: new feature"
```

`font:mono` plus `border:none` is what sells it. Drop `no-icon` if the icon helps.

### Solid card

```markdown
> [!note] (gradient:#232526-#414345, text:#f5f6fa, title:#00d2d3, radius:10, compact) Card Title
> Full-opacity background that reads the same in light and dark themes.
```

The two gradient colors are deliberately close, so it reads as a flat panel rather than a
gradient. This is the workaround for `bg:` being translucent.

### Neon alert

```markdown
> [!danger] (bg:#1a0000, neon:#ff0044, text:#ff6b6b, title:#ff0044, radius:8) Critical
> Production deploy failed.
```

Neon needs a dark `bg:` to show. Use 6-digit hex — the glow is built by appending an alpha
suffix and silently breaks on `#f00` or on CSS keywords outside the palette.

### Two-tone header

```markdown
> [!abstract] (title:#8892b0, icon-color:#64ffda, border:none, compact) Weekly Review
> The icon carries the accent so the title can stay quiet.
```

Useful when a run of callouts should be scannable by icon colour without a row of loud
headings. Without `icon-color:` the icon takes the title's colour.

### Quiet note

```markdown
> [!note] (border:none, no-icon, compact, text:#8892b0) Aside
> A low-contrast remark that does not compete with the surrounding text.
```

### Sticky note

```markdown
> [!note] (bg:#f1c40f, text:black, font:hand, radius:0, no-icon, compact)
> Don't forget to buy milk!
```

Leaving the title empty still leaves the title row in place. That is normal — there is no
parameter that removes it.

### Quote card

```markdown
> [!quote] (title:center, center, gradient:#2c3e50-#4ca1af, text:#ecf0f1, radius:12, font:serif) On Simplicity
> Perfection is achieved when there is nothing left to take away.
```

`font:serif` starts from an Obsidian theme variable, so on some themes it will look like the
default body font. If the user wants a visibly different face, `mono`, `hand` and `marker`
are the reliable three.

### Full-width banner

```markdown
> [!danger] (center, gradient:#e74c3c-#c0392b, text:white, font-size:4, radius:0, no-icon) MAINTENANCE WINDOW
> Saturday 02:00–06:00 UTC. All services unavailable.
```

`radius:0` and full-bleed color is what makes it read as a banner rather than a note.

### Readability rescue

When text sits on a busy or close-in-luminance background:

```markdown
> [!note] (gradient:#ff9966-#ff5e62, text:(white, dark-border), title:(white, dark-border)) Legible on gradient
> The stroke keeps light text readable over a bright background.
```

## Dashboards and grids

### Stat tile row

```markdown
> [!multi-callout]
> > [!info] (1:3, center, compact, gradient:#2193b0-#6dd5ed, text:white, font-size:4) 1,284
> > Active users
>
> > [!success] (2:3, center, compact, gradient:#11998e-#38ef7d, text:white, font-size:4) $12,345
> > Revenue
>
> > [!warning] (3:3, center, compact, gradient:#f7971e-#ffd200, text:#2d3436, font-size:4) 3
> > Open alerts
```

The big number goes in the *title* and the label in the body — `font-size:4` scales the
title with the callout, so the number leads.

### System monitor row

```markdown
> [!multi-callout]
> > [!note] (1:3, bg:#0f0e17, text:#a7a9be, font:mono, neon:#00f2ff, compact) CPU
> > Usage: 45%
>
> > [!note] (2:3, bg:#0f0e17, text:#a7a9be, font:mono, neon:#ff6bcb, compact) RAM
> > 6.2 GB / 16 GB
>
> > [!note] (3:3, bg:#0f0e17, text:#a7a9be, font:mono, neon:#ffd93d, compact) Disk
> > 128 GB free
```

### Two-column compare

```markdown
> [!multi-callout]
> > [!success] (1:2, compact, bg:#2ecc71, title:#2ecc71) Pros
> > - Fast to set up
> > - No dependencies
> > - Works offline
>
> > [!failure] (2:2, compact, bg:#e74c3c, title:#e74c3c) Cons
> > - Manual updates
> > - Desktop only
> > - No sync
```

### Six-panel dashboard

Six panels all marked `:3` wrap into two rows on their own — there is no row parameter to
set, and writing `(4:3:2)` for the fourth panel changes nothing about where it lands.

```markdown
> [!multi-callout]
> > [!note] (1:3, compact, center) Inbox
> > 12
>
> > [!note] (2:3, compact, center) Today
> > 4
>
> > [!note] (3:3, compact, center) Overdue
> > 1
>
> > [!note] (4:3, compact, center) This week
> > 19
>
> > [!note] (5:3, compact, center) Waiting
> > 3
>
> > [!note] (6:3, compact, center) Done
> > 47
```

For anything that is not equal columns — a wide header over two cells, a sidebar spanning
rows — build a named layout in Settings → Visual Layout Builder and apply it to the wrapper:
`> [!multi-callout] (my_dashboard)`. See [layouts.md](layouts.md#custom-visual-layouts).

## Lists and trackers

### Checklist in columns

```markdown
> [!todo] (col:2, compact, bg:#1a1a2e, text:#a29bfe, title:#00cec9) Launch Checklist
> - [x] Design mockup
> - [x] Set up project
> - [ ] Build frontend
> - [ ] API integration
> - [ ] Testing
> - [ ] Deployment
```

Items fill top-to-bottom then across: with 6 items and `col:2`, the left column holds 1–3
and the right holds 4–6.

### Reference grid

```markdown
> [!abstract] (col:3, compact, no-icon, bg:#2d3436, text:#dfe6e9) Shortcuts
> - `Ctrl+P` — Command palette
> - `Ctrl+O` — Quick switcher
> - `Ctrl+E` — Toggle edit mode
> - `Ctrl+,` — Settings
> - `Ctrl+N` — New note
> - `Ctrl+F` — Search
```

### Dataview dashboard

````markdown
> [!multi-callout]
> > [!todo] (1:2, col:2, compact, bg:#1a1a2e, text:#dfe6e9, title:#00cec9) Open Tasks
> > ```dataview
> > TASK FROM "Projects" WHERE !completed LIMIT 12
> > ```
>
> > [!note] (2:2, col:2, compact, bg:#1a1a2e, text:#dfe6e9, title:#a29bfe) To Read
> > ```dataview
> > LIST FROM #book AND #to-read LIMIT 12
> > ```
````

Always set `LIMIT`. An unbounded query makes one panel much taller and the flex row
stretches its neighbours to match. `TABLE` queries render a table, which `col:` does not
affect — style those with `bg:` and `compact` only.

## Color combinations that hold up

Tested pairs that stay readable in both light and dark themes. Use them as gradient stops
for solid panels, or take the first value as `bg:` for a tint.

| Mood | Background | Text | Accent (title / neon) |
|---|---|---|---|
| Ocean deep | `#0a192f` → `#112240` | `#8892b0` | `#64ffda` |
| Neon night | `#0f0e17` → `#1a1926` | `#a7a9be` | `#ff6bcb` |
| Forest | `#1b2420` → `#243029` | `#d8f3dc` | `#95d5b2` |
| Sunset | `#2d1b3d` → `#432b5e` | `#ffeadb` | `#ffcc70` |
| Slate card | `#232526` → `#414345` | `#f5f6fa` | `#00d2d3` |
| Warm paper | `#fdf2e9` → `#f8e8d8` | `#6c3483` | `#b9770e` |
| Terminal | `#0f0e17` → `#12121c` | `#00ff41` | `#00ff41` |

The first four are also available as one-click presets in Settings → Custom Callouts
(Ocean Deep, Neon Glow, Forest, Sunset), which is worth mentioning when the user wants a
reusable style rather than one-off metadata.

## Adapting a recipe

- **Change the accent, keep the structure.** Most recipes carry their look in the
  background/text/accent triple; swapping those three retargets the whole thing.
- **Reach for a preset once the third copy appears.** When the same metadata line shows up
  repeatedly, move it into Settings → Custom Callouts and use `> [!name]` instead. Inline
  metadata still overrides the preset per property, so per-instance tweaks stay possible.
- **Strip before you add.** If a callout looks wrong, remove parameters until it looks
  plain, then add back one at a time. There are no error messages, so bisecting is the
  fastest diagnosis.
- **Check both themes.** `bg:` is transparent, so every tinted callout looks different in
  light versus dark. Explicit `text:` and `title:` colors are what make output
  theme-independent.
