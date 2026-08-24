# Layouts

Everything about arranging things: columns inside one callout, panels side by side, and
designed grids. Three independent systems that combine freely.

## Contents

- [Multi-column lists (`col:N`)](#multi-column-lists)
- [Dashboard grids (`multi-callout`)](#dashboard-grids-multi-callout)
- [Custom visual layouts](#custom-visual-layouts)
- [Dataview integration](#dataview-integration)
- [Combining the three systems](#combining-the-three-systems)

---

## Multi-column lists

`col:N` reflows lists **inside a single callout** into N columns.

```markdown
> [!note] (col:3, bg:#2c3e50, text:#ecf0f1) Tech Stack
> - React
> - Vue
> - Angular
> - Svelte
> - Next.js
> - Nuxt
> - Remix
```

### Distribution

Rows per column is `ceil(itemCount / N)`, and items fill **column by column**, top to
bottom then left to right — newspaper order, not left-right-wrap order.

7 items with `col:3` → 3 rows per column → `1,2,3` · `4,5,6` · `7`.

If the user expects reading order to run across the page, they want a table, not `col:`.

### What gets columnised

Only list elements inside `.callout-content`: `ul`, `ol`, and the list containers Dataview
produces. Direct `li` children are positioned; nested sub-lists move with their parent item
rather than being split.

Paragraphs, tables, headings and code blocks are untouched. A callout whose content is
prose will look identical with and without `col:`.

### Why it sometimes needs a moment

Columns are applied on the next animation frame, then re-applied at 100 ms, 300 ms, 600 ms,
1 s and 2 s, and a mutation observer watches the content for added nodes and text changes
(debounced 50 ms). All of that exists for content that arrives asynchronously — Dataview
queries, the Homepage plugin, embedded blocks.

The practical consequence: if a Dataview query takes longer than 2 s, the list renders
uncolumnised until something triggers the observer. Reopening the note fixes it. This is a
timing limitation, not a syntax error, and there is no metadata that changes it.

### Practical range

Any positive integer parses, but 2–4 is what the layout is built for. Beyond that, columns
get too narrow to read on a standard editor width, and on mobile they do not collapse —
unlike grid panels, columnised lists have no responsive breakpoint.

## Dashboard grids (`multi-callout`)

A `multi-callout` callout is a wrapper: its own background, border, padding and title are
hidden, and its content becomes a horizontal flex row that panels sit inside.

```markdown
> [!multi-callout]
> > [!info] (1:2, compact) Left
> > Content
>
> > [!tip] (2:2, compact) Right
> > Content
```

### Flags belong on the panels, not the wrapper

`compact`, `dense` and `center` on the `multi-callout` line are ignored — it is a layout
container, not a visible callout, and the flags exist to shape what is inside it. Put them
on each panel instead.

Up to v1.0.8 they were not ignored, and the results were confusing rather than merely
useless: `compact` restored padding to a wrapper designed to have none, so the whole row sat
inset from its container, and `center` turned the row into a column and stacked every panel.

### Structure rules

- Panels are **nested** callouts — one extra `>` level.
- A bare `>` line must separate consecutive panels, otherwise markdown merges them into one
  blockquote.
- The wrapper's own title is hidden, so writing one is pointless.
- Empty paragraphs and stray `<br>` elements inside the wrapper are hidden, which is what
  keeps the blank separator lines from adding vertical gaps.

### What `(N:M)` actually does

Each panel's wrapper gets `flex: 0 0 calc((100% - (M-1) × 10px) / M)` — that is, an equal
share of the row minus the 10 px gaps.

**Only `M` matters.** The position `N` and the optional row `R` in `(N:M:R)` are written to
data attributes that no stylesheet reads. Panels appear in document order and wrap onto a
new line when the row is full. Consequences:

- To build a 3×2 dashboard, write six panels all marked `(…:3)` in reading order; they wrap
  into two rows by themselves.
- Mixed widths in one row work by giving panels different `M` values — `(1:3)` then `(2:3)`
  then `(3:3)` is three thirds, while `(1:2)` then `(2:2)` is two halves. Mixing `(1:3)` and
  `(1:2)` in the same row gives a third plus a half and leaves a gap.
- Numbering panels correctly costs nothing and makes the source readable, so keep doing it.
  Just don't rely on it to reorder anything.

### The nested-blockquote detail

Markdown wraps a nested callout in an extra `blockquote` (sometimes a `p`). The plugin walks
up from the callout to the element directly under `.callout-content`, strips that wrapper's
border, margin and padding, and applies the flex width to it. This is what prevents the
stray vertical line that a raw nested blockquote would otherwise draw down the left edge of
every panel.

Nothing is required from the author — but it explains why hand-written CSS targeting
`.callout .callout` often misses: the width lives on the wrapper, not the callout.

### Long words in narrow panels

A panel is sized to an exact share of the row, but the text inside still has a minimum width.
A long unbroken word — a wiki link such as `[[02-kutuphane]]`, a URL, a hyphen-free filename —
used to hold its panel wider than its share and knock the row out of alignment; the panels
would come out visibly unequal. That is fixed, but the underlying tension remains: at seven
or eight columns a panel is only a hundred-odd pixels wide, and long labels will wrap to two
or three lines. Fewer columns, or shorter labels, read better than fighting it.

### Responsive behaviour

Below 600 px viewport width, the wrapper switches to a vertical column and every panel goes
full width. Nothing else in the plugin is responsive.

### Making panels look right

`compact` is close to mandatory. Default callout padding is tuned for full-width prose and
makes a one-third panel look mostly empty. `center` helps for single-number stat tiles.
Keep panel titles short — they do not wrap gracefully at narrow widths.

## Custom visual layouts

For anything the equal-columns model cannot express — a wide header over two narrow cells,
an L-shape, a sidebar spanning two rows — the **Visual Layout Builder** in
Settings → Special Callouts produces a named CSS grid.

### Creating one (user-side steps)

1. Set **Columns** and **Rows** (1–8 each).
2. Drag across cells to select them, then **Merge** to fuse them into one area, or **Split**
   to break a merged area back apart.
3. Type a **Layout Name** and click **Save Layout**.

The name is normalised on save: lowercased, with runs of whitespace replaced by underscores.
"My Dashboard" is stored as `my_dashboard`. Reference it exactly as shown in the saved list.

Saved layouts can be exported and imported as JSON via the buttons in the same section, and
each saved layout can be reopened for editing or deleted from its card.

### Using one

Put the layout name as a bare word in the **wrapper's** metadata:

```markdown
> [!multi-callout] (my_dashboard)
> > [!info] (compact) Panel A
>
> > [!tip] (compact) Panel B
>
> > [!success] (compact) Panel C
```

The wrapper's content becomes `display: grid` with the designed
`grid-template-areas` and `repeat(<cols>, 1fr)` columns, 10 px gap, stretch alignment.

### How children map onto areas

Children are assigned to areas **in document order**: first meaningful child → `area1`,
second → `area2`, and so on. Empty paragraphs, `<br>` and `<hr>` are skipped so blank
separator lines do not consume an area.

Area numbering in the saved layout is normalised in reading order — top-left first, then
left to right, then down. So the first panel you write lands in the top-left area, the
second in the next area to its right (or the next row if the first area spans the full
width), and so on. Designing the grid and then writing panels top-left to bottom-right is
all that is required.

Write exactly as many panels as the layout has areas. Extra panels get area names that do
not exist in the template and are placed implicitly by CSS grid, usually appended in a new
row; too few leaves areas blank.

A mutation observer re-runs the assignment when the wrapper's children change, so panels
that render late — Dataview again — still land in their areas.

### Grid vs. custom layout

Use inline `(N:M)` when every panel in a row is the same width; it needs no setup and travels
with the note. Use a saved layout when widths differ or cells span rows — but remember it
lives in the user's settings, so a note using `(my_dashboard)` renders as a plain stack in
any vault that does not have that layout saved. For notes meant to be shared or published,
prefer inline grid syntax.

## Dataview integration

Dataview output is ordinary lists, so `col:` works on it directly:

````markdown
> [!todo] (col:2, compact, bg:#1a1a2e, text:#a29bfe, title:#00cec9) Active Tasks
> ```dataview
> TASK
> FROM "Projects"
> WHERE !completed
> LIMIT 20
> ```
````

`LIST` and `TASK` queries produce list elements and columnise. `TABLE` queries produce a
table and are unaffected by `col:` — style those with `bg:`, `border:` and `compact` instead.

A dashboard combining both systems, which is the pattern most users are actually after:

````markdown
> [!multi-callout]
> > [!todo] (1:2, col:2, compact, bg:#1a1a2e, text:#dfe6e9) Tasks
> > ```dataview
> > TASK FROM "Projects" WHERE !completed LIMIT 10
> > ```
>
> > [!note] (2:2, col:2, compact, bg:#1a1a2e, text:#dfe6e9) Reading
> > ```dataview
> > LIST FROM #book AND #to-read LIMIT 10
> > ```
````

Always add `LIMIT` to queries inside panels — an unbounded query makes one panel far taller
than its neighbours, and the flex row stretches all of them to match.

## Combining the three systems

They nest cleanly and are worth combining deliberately:

- `col:` inside a panel of a `multi-callout` — columns within a column. Practical up to
  `col:2` at panel width.
- A saved layout on the wrapper, `col:` on individual panels — the densest arrangement the
  plugin supports.
- `compact` on panels plus `center` on stat tiles is what makes a dashboard read as a
  dashboard rather than a stack of notes.

What does *not* combine: `col:` and grid position on the same callout are unrelated features
that happen to share a metadata block — `col:` splits that callout's lists, `(N:M)` sizes
that callout inside its parent. Writing both is normal and correct.
