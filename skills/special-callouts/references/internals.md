# Internals

How the plugin actually works: the render pipeline, the DOM contract, the settings schema,
and the places where documented behaviour and real behaviour part ways. Read this when
debugging, when writing CSS snippets or a theme against the plugin, or when contributing.

## Contents

- [Source map](#source-map)
- [Processing pipeline](#processing-pipeline)
- [Precedence](#precedence)
- [DOM contract: attributes and CSS variables](#dom-contract-attributes-and-css-variables)
- [Classes the processor adds](#classes-the-processor-adds)
- [Settings schema](#settings-schema)
- [Import and export formats](#import-and-export-formats)
- [Commands](#commands)
- [Settings UI map](#settings-ui-map)
- [Known bugs and inconsistencies](#known-bugs-and-inconsistencies)
- [Build and development](#build-and-development)

---

## Source map

```
main.ts                        plugin class, command registration, post-processor hookup
src/types.ts                   CalloutStyle, CustomLayout, SpecialCalloutsSettings, CalloutConfig
src/constants.ts               palettes, default styles, font tables, quick-start presets
src/parser.ts                  metadata extraction and parameter parsing
src/processor.ts               all DOM mutation, observers, retries
src/utils.ts                   debounce, hex helpers, colour resolution, smartSplit, findMetadataSpan lives in parser.ts
src/settings/SettingsTab.ts    the entire settings UI, incl. the Visual Layout Builder
src/modals/                    SuggesterModal, IconPickerModal, AdvancedBuilderModal
styles.css                     every visual rule; the only place !important lives
```

Roughly 6,500 lines, of which `SettingsTab.ts` is about a third.

## Processing pipeline

The plugin registers a single markdown post-processor. For every rendered element it finds
each `.callout` and runs `processCallout`:

1. Locate `.callout-title`; abort if missing.
2. Take `.callout-title-inner` (falling back to the title element) and read its text.
3. Build a cache key from `data-callout` + that text. A `WeakMap` skips an element already
   processed with the same key, so re-entrant renders are cheap.
4. Read `data-callout` as the callout type.
5. **Standard style** — resolve Obsidian's type aliases to their canonical type
   (`tldr` → `abstract`, `error` → `danger`, and so on), then, if the user has modified that
   type's `bg`, `text`, `titleColor` or `link` away from the built-in default, apply the
   saved style object. Aliases are resolved rather than stored, so `standardStyles` holds
   thirteen entries and an alias always tracks the type it renders as.
6. **Custom style by type** — if a saved preset's name equals the callout type, apply it.
7. **Metadata** — `extractMetadata` requires the title text to begin with `(`, then scans
   with a depth counter for the matching `)`. On success the title text is replaced with
   the remainder and the inner content is parsed.
8. `style:` preset applied, then `applyConfig` writes every parsed parameter.
9. Grid position, then `col:`, then a custom layout — each independently.

All styling is applied by setting CSS custom properties and data attributes via Obsidian's
`setCssProps`. No inline styles are written directly, and every `!important` lives in
`styles.css` under a data-attribute selector — this is a plugin-review requirement that was
worked through in v1.0.6, so keep new code to the same pattern.

Errors inside `processCallout` are caught and logged; a broken callout never breaks the
page.

## Precedence

Later writes win, because each step overwrites the same CSS variable:

```
built-in type defaults
  → modified standard style (settings)
    → custom preset matching the callout type
      → style: preset from metadata
        → inline metadata parameters
```

So inline metadata always wins over a preset, per property. Properties a later step does
not touch survive from the earlier one — this is why `(style:card, bg:red)` keeps the
card's font and border while replacing only the background.

Two flag pairs resolve by branch rather than by order: `no-icon` beats `icon:`, and
`center` beats `title:center`.

## DOM contract: attributes and CSS variables

Everything below is set on the `.callout` element unless noted. This table is the reference
for writing snippets or debugging a theme conflict.

| Feature | Attribute | CSS variables |
|---|---|---|
| Background | `data-sc-bg` | `--sc-bg-color` (a `color-mix(… 15%, transparent)`) |
| Text color | `data-sc-text` | `--sc-text-color` (applied to `> .callout-content`) |
| Title color | `data-sc-title-color` | `--sc-title-color` (title **and** its icon) |
| Icon color | `data-sc-icon-color` | `--sc-icon-color` (declared after the title rule, so it wins) |
| Border | `data-sc-border` | `--sc-border` (shorthand) |
| No border | `data-sc-no-border` | — |
| Border width | `data-sc-bw` | `--sc-border-width` |
| Border style | `data-sc-bs` | `--sc-border-style` |
| Radius | `data-sc-radius` | `--sc-radius` |
| Neon | `data-sc-neon` | `--sc-neon-border`, `--sc-neon-shadow` |
| Gradient | `data-sc-gradient` + `data-sc-no-border` | `--sc-gradient` |
| Font | `data-sc-font` | `--sc-font-family`, and `--font-interface` |
| Font size | `data-sc-fontsize` | `--sc-font-size` |
| Compact | `data-compact="true"` | — |
| Dense | `data-dense="true"` (set alongside compact) | — |
| Center | `data-center="true"` | — |
| Title center | `data-title-center="true"` | — |
| Link color | `data-link-color="<color>"` | `--link-color` |
| Link stroke | `data-link-border="dark-border"` \| `"light-border"` | — |
| Text/title stroke | `data-sc-text-border` on the content or title element | `--sc-text-border-color` |
| Columns | `data-col="N"` | `--smart-list-cols` |
| Grid position | `data-grid-pos`, `data-grid-cols`, `data-grid-row` | **none — no CSS reads these** |
| Custom layout | `data-sc-custom-layout` | `--sc-grid-cols`, `--sc-grid-areas` |

`data-grid-pos` and `data-grid-row` are informational only. Actual grid sizing lives on the
*wrapper* element (see below), which is why CSS targeting `.callout[data-grid-cols]` for
width has no effect.

## Classes the processor adds

| Class | Applied to | Purpose / variables |
|---|---|---|
| `.sc-grid-item-wrapper` | the element directly under `.callout-content` | `flex: 0 0 var(--sc-flex-width)` |
| `.sc-wrapper-bq` / `.sc-wrapper-p` | that same wrapper | strips blockquote/paragraph border, margin, padding |
| `.sc-area-inner` | the callout inside a wrapper | `flex: 1`, full width |
| `.sc-area-child` | children of a custom-layout wrapper | `grid-area: var(--sc-grid-area)` |
| `.sc-multi-col-list` | each `ul`/`ol` under `col:` | grid with `--sc-list-cols` / `--sc-list-rows` |
| `.sc-multi-col-item` | each `li` | `--sc-col` / `--sc-row` placement |
| `.sc-hidden` | hidden icons | `display: none` |
| `.special-callouts-ui` | plugin modals and the settings tab | scopes all UI styling |

`.callout { overflow: hidden }` is set globally by the plugin so radii clip correctly. This
also clips overflowing content — worth knowing when something inside a callout disappears.

## Settings schema

Stored in `.obsidian/plugins/special-callouts/data.json`:

```json
{
  "customColors":   [{ "name": "brand", "hex": "#1a73e8" }],
  "standardColors": { "red": "#e74c3c", "blue": "#3498db", "...": "..." },
  "customStyles":   [ /* CalloutStyle objects */ ],
  "standardStyles": { "note": { /* CalloutStyle */ }, "...": {} },
  "customLayouts":  [{
    "name": "my_dashboard",
    "cols": 3,
    "rows": 2,
    "gridAreas": "\"area1 area1 area2\" \"area3 area4 area2\""
  }],
  "defaultMetadata": ""
}
```

`CalloutStyle`:

| Field | Type | Notes |
|---|---|---|
| `name` | string | lowercase, hyphenated; doubles as the callout type |
| `bg` `border` `text` `link` | string | hex; `bg` may also hold a full `linear-gradient(...)` |
| `icon` | string | Lucide id |
| `iconColor` | string? | overrides the colour inherited from `titleColor` |
| `titleColor` | string? | |
| `boldBorder` | bool? | legacy shorthand for a 4 px border |
| `font` | string? | one of the five font keys |
| `fontSize` | number? | 1–5 |
| `borderWidth` | string? | `'4'` or `'4px'` — `px` is appended if absent |
| `borderStyle` | string? | |
| `borderRadius` | string? | used verbatim, so **include the unit** |
| `neon` | string? | hex |
| `noIcon` `compact` `center` `titleCenter` | bool? | |

`standardStyles` holds one entry per built-in type. A type is only re-styled when its `bg`,
`text`, `titleColor` or `link` differ from the shipped default — changing only, say,
`borderStyle` there will not trigger it.

Defaults for the built-in types (`note` `#448aff`, `tip` `#00bfa5`, `warning` `#ff9100`,
`danger` `#ff1744`, and so on) live in `src/constants.ts` as `DEFAULT_STANDARD_STYLES`.

## Import and export formats

Three separate clipboard-based flows, all in the settings tab:

- **Style export** — the current form as a single `CalloutStyle` JSON object.
- **Layout export ("Export All")** — the whole `customLayouts` array.
- **Style import** — accepts either a `CalloutStyle` JSON object *or* raw callout markdown.

The markdown importer is more capable than it looks: it finds the first `[!type]` line,
resolves aliases (`summary`/`tldr` → `abstract`, `hint`/`important` → `tip`,
`check`/`done` → `success`, `help`/`faq` → `question`, `caution`/`attention` → `warning`,
`fail`/`missing` → `failure`, `error` → `danger`, `cite` → `quote`), inherits from an
existing preset or standard style of that type, then overlays whatever metadata it can
parse. A pasted `> [!note] (bg:#123456, neon:#ff0000) Title` becomes a saved preset.

It reads metadata from parentheses, and — unlike the renderer — also accepts the pipe form.
That asymmetry is the origin of the pipe-syntax confusion described below.

## Commands

Registered in `main.ts`, all available from the command palette and assignable to hotkeys:

| Id | Name | Behaviour |
|---|---|---|
| `insert-special-callout-modal` | Special Callout Studio (Create / Edit Single & Multi)... | Unified studio modal with top switcher for Single and Multi-Column Dashboards |
| `insert-special-callout-single` | Insert Special Callout (Single Mode)... | Directly opens Single Callout inserter with full color, typography, and border controls |
| `multi-column-dashboard-builder` | Insert Multi-Column Dashboard (Multi Mode)... | Directly opens visual drag-and-drop matrix dashboard builder |
| `insert-custom-callout` | Insert Callout from Style Palette... | Searchable quick suggester modal listing all standard and custom callout presets |
| `insert-multi-column-layout` | Insert Column Layout from Presets... | Quick column suggester to divide note areas into 2–6 columns |
| `change-current-callout-icon` | Change Icon of Callout at Cursor... | Searchable Lucide icon picker that replaces the active callout icon in place |
| `insert-<style-name>` | Insert "<name>" Callout | One per saved custom style (toggleable in Command Palette tab) |
| `insert-layout-<layout-name>` | Insert "<name>" Layout | One per saved custom layout (toggleable in Command Palette tab) |

## Settings UI Map

**Settings → Community plugins → Special Callouts**

1. **Custom Styles (`palette`)** — Searchable cards of custom callout presets with live preview, Quick Start presets, and full parameter modals.
2. **Standard Callouts (`bookmark`)** — Customize the appearance of standard Obsidian callout types (`note`, `tip`, `warning`, `danger`, etc.).
3. **Color Palettes (`droplet`)** — Palette manager for standard hex overrides and custom named colors.
4. **Layout Builder (`layout-grid`)** — Interactive 1×1 to 6×6 visual grid matrix builder with cell merging and splitting. Saved custom layouts automatically integrate with the Multi-Column Dashboard Studio.
5. **Command Palette (`terminal`)** — Dedicated command palette management tab. Configure default callout metadata, review all core studio commands, and toggle individual per-style and per-layout command registrations with batch `[ Enable All ]` / `[ Disable All ]` actions.
6. **Guide & Syntax (`book-open`)** — Interactive documentation, cheat sheet, and parameter table.
7. **General & Defaults (`settings`)** — Data management with full JSON export, import, and factory reset.

## Performance & Optimization Architecture

- **Zero-Allocation String Tokenization**: `smartSplit` in `src/utils.ts` operates on char codes and string slices rather than continuous substring allocations.
- **LRU Cache Refreshing**: `parseMetadata` maintains an active 250-entry cache refreshed on every hit for true LRU eviction.
- **Bounded Micro-Caching**: `neonStyles` (100 entries) and `createTransparentBg` (200 entries) eliminate repetitive CSS color computations.
- **DOM & Listener Lifecycle Cleanup**: Modals implement full suggester teardown and DOM disposal on `onClose()`.
- **Parentheses Safety**: Non-metadata parenthesized text in titles (e.g. `(Phase 1)`) is preserved without stripping, while grouped metadata (e.g. `text:(white, dark-border)`) parses cleanly.
  the composed `linear-gradient(90deg, …)` into the style's `bg` field, which then went
  through `applyColor` and `color-mix` — invalid at computed-value time. `applyGradient`
  now accepts either the finished function or the inline `c1-c2` shorthand.
- **Grouped values worked on three parameters only.** `key:(a, b)` is shorthand for writing
  the key twice, so it is now expanded into repeated pairs before parsing and every
  parameter accepts it. Previously `bg:(red)` set the background to the literal `(red)`.
- **A preset name containing a colon could not be selected.** `style:` took only the
  segment between the first and second colon.
- **Obsidian's own type aliases were unknown to the plugin.** `[!tldr]` renders as
  `[!abstract]` in Obsidian, but recolouring abstract in settings left it untouched.
  Aliases now resolve to their canonical type; they are deliberately not separate settings
  entries, so the list stays thirteen rows and an alias cannot drift from its type.
- **Defaults added after a vault's first save never reached it.** `loadSettings` merged
  shallowly, so a saved `standardStyles` or `standardColors` object came back whole. Those
  two records are now merged key by key, defaults first.
- **Observers accumulated for the session.** The map holding them is strong so that unload
  can disconnect everything, but nothing removed entries for callouts the user had
  navigated away from. Registering an observer now sweeps out the detached ones, and the
  deferred column work checks `isConnected` before touching an element.
- **Density and alignment flags leaked onto a `multi-callout` wrapper**, and a long unbroken
  word could hold one panel wider than its share. See
  [layouts.md](layouts.md#flags-belong-on-the-panels-not-the-wrapper).
- **A saved layout named after a built-in flag disabled that flag vault-wide.** Layout
  names were matched before the standalone flags, and both are bare words, so a layout
  called `compact` meant every `(compact)` applied a grid instead of reducing padding.
  Built-in words win now, which repairs vaults already in that state, and the builder
  refuses the name. The reserved set is `RESERVED_FLAG_NAMES` in `constants.ts`.
- **Cancel did not cancel in the standard-style editor.** The colour inputs wrote into
  the live settings object on every keystroke; the editor works on a copy now.
- **The saved-style edit button was a second copy of `loadStyleToForm` that had fallen
  behind**, missing `iconColor`, so editing such a preset dropped it. It delegates to the
  loader now, and `tests/settings-roundtrip.test.mjs` fails the build if the two halves of
  the round-trip diverge again.
- **Loading a preset into the form invented a title colour** by falling back to the
  background, which saving then wrote in as an explicit value.
- **Renaming a preset onto another's name left two entries answering to it.** The
  uniqueness check ran only on create and compared case-sensitively, while every lookup is
  case-insensitive.
- **The style importer read metadata with a pattern that stops at the first `)`**, halving
  grouped values. All three callers now share `findMetadataSpan` in `parser.ts`.
- **Layout import accepted any JSON that parsed** and replaced every saved layout with it,
  and said nothing when the JSON was valid but not an array.
- **Adding a custom colour failed silently** on an empty name or a bad hex, allowed
  duplicates, and allowed names shadowed by the standard palette — which can never
  resolve, since standard names are checked first.
- **Four `sc-style-*` classes were applied but never defined**, so those elements rendered
  unstyled. `tests/styles.test.mjs` now checks every generated class both ways.
- **The multi-column command inserted Turkish text** into an otherwise English plugin.

### Fixed in 1.0.8

Users still on 1.0.7 hit all of these, so they are worth recognising in the wild.

- **The pipe form was emitted but never parsed.** `Default Callout Metadata`, *Wrap Selection
  in Callout* and *Change Icon of Callout at Cursor* produced `> [!type|meta]`, which the
  renderer ignores entirely — so filling in that setting made every inserted callout lose its
  styling. All three now emit `> [!type] (meta)`, and the icon command merges into an existing
  block using the same balanced-parenthesis scan as the parser, so grouped values like
  `text:(white, dark-border)` survive. The settings *importer* still accepts the pipe form, for
  notes written under older versions.
- **Units were handled three different ways.** Inline `border-width:`/`radius:` appended `px`
  blindly (so `4px` became `4pxpx`), preset `borderRadius` used its value verbatim, and preset
  `borderWidth` was written to Obsidian's `--callout-border-width` with no unit at all. All four
  paths now go through `toPx()` and the plugin's own `--sc-border-width`.
- **Neon glow needed a 6-digit hex.** The glow concatenated `40`/`20` alpha suffixes onto the
  color string, so `#f00` or a bare keyword kept its border and silently lost its glow. It uses
  `color-mix` now, and inline metadata and presets share one helper, so a color can no longer
  render two different ways depending on the route.
- **Editing a preset dropped `center` and `titleCenter`** — `loadStyleToForm` never restored
  them, so re-saving an existing preset silently cleared both.
- **The reset button on a modified standard style threw.** Its handler called
  `e.stopPropagation()` with no `e` in scope — a `ReferenceError` before it reset anything.
- **The "Saved Styles" heading threw.** `addClass` was called on a `Setting` instance rather
  than its `settingEl`, a `TypeError` partway through rendering the settings tab.
- **The layout-import textarea had no placeholder** — it assigned `.placeholder` on a
  `TextAreaComponent`, which has no such property.
- **The icon ignored the title colour** (issue #8). Only `.callout-icon` was coloured, but
  Obsidian's `.svg-icon` rule sets a colour on the SVG itself, so the SVG never inherited and
  the icon stayed on the theme accent. The rule now also targets `.svg-icon` and sets
  `--icon-color`. A separate `icon-color:` parameter was added for when the two should differ.
- **The saved-styles list never rendered** (issue #8). `createSavedStylesList` called
  `addClass` on a `Setting` instance five lines before the loop that draws the cards, so the
  `TypeError` aborted the function every time. Styles were written to `data.json` correctly —
  which is why exporting worked and re-importing changed nothing.
- **`dense` did nothing beyond `compact`.** It is now compact plus a tighter line-height, as the
  guide always claimed. It still implies `compact`, so older notes only render tighter.

### Open

1. **`data-grid-pos` and `data-grid-row` are dead attributes.** The row component of `(N:M:R)`
   has no effect; rows happen through flex wrapping. Making it real means moving the
   `multi-callout` container from flex to grid, which would change how every existing dashboard
   lays out — deliberately deferred until it can be verified visually in a vault. The attributes
   are left in place as hooks for user CSS snippets.
2. **A deleted preset keeps its command** until Obsidian is reloaded. Creating one registers
   its command straight away, but Obsidian offers no reliable way to withdraw a registration,
   and a stale entry is a smaller annoyance than a missing one.
3. **Presets have no `dense` toggle** in the settings UI, though the inline parameter exists.
4. **`gradient:` splits on `-`**, so a custom color name containing a hyphen cannot be used as a
   gradient stop. This applies to the inline shorthand only; a preset stores the finished
   CSS function and is passed through untouched.
5. **The settings preview card assumes `bg` is a hex.** It builds its swatch by appending
   an alpha suffix to the value, so a gradient preset previews as an empty card even though
   it now renders correctly in a note.
6. **Fifteen `sc-style-*` rules are defined but never applied.** Dead weight in the
   stylesheet rather than a defect; `tests/styles.test.mjs` checks the dangerous direction
   (applied but undefined) and deliberately does not fail on this one.
7. **`createPanelHeader` suppresses its own separator border.** It adds the no-border class
   when the header is the first child of its panel, and every panel builds its header
   first — so the border never shows except on the one panel that happens to have a spacer
   div in front of it. Cosmetic, and fixing it changes how the settings tab looks, so it
   wants a decision rather than a patch.

## Build and development

```bash
npm install
npm run dev        # esbuild watch
npm run typecheck  # esbuild does not typecheck; this does
npm test           # 111 cases
npm run build      # runs typecheck first, then the production bundle
```

The tests build the real source with esbuild rather than keeping a copy of it, so they
cannot drift from the code. Four of the files are behavioural (`parser`, `utils`,
`constants`); two are structural guards over mistakes this codebase has made more than once:

- `settings-roundtrip.test.mjs` — every field the style form saves must be restored when a
  preset is reopened. Losing one is silent, and has cost two releases.
- `styles.test.mjs` — every generated `sc-style-*` / `sc-var-*` class the code applies must
  exist in `styles.css`, and nothing may assign `element.style`, `innerHTML` or `!important`
  from TypeScript.

esbuild bundles `main.ts` into a single `main.js`. TypeScript 5.8, `obsidian` typings,
`minAppVersion` 0.15.0, `isDesktopOnly: false`.

A release is exactly three files — `main.js`, `manifest.json`, `styles.css` — dropped into
`<vault>/.obsidian/plugins/special-callouts/`.

When changing the processor, keep to the established pattern: set a data attribute plus CSS
custom properties from TypeScript, and put the actual declaration in `styles.css`. Writing
to `element.style` directly fails Obsidian's plugin review, and the v1.0.6 work existed
specifically to remove the last of it.
