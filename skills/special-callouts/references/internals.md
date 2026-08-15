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
src/utils.ts                   debounce/throttle, hex helpers, color resolution, smartSplit
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
5. **Standard style** — if the user has modified this type's `bg`, `text`, `titleColor` or
   `link` away from the built-in default, apply the saved style object.
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
| `insert-custom-callout` | Insert Custom Style… | picker over saved presets, inserts `> [!name]` |
| `wrap-selection-in-callout` | Wrap Selection in Callout… | wraps the selection in a chosen preset |
| `insert-multi-column-layout` | Insert Multi-Column Layout… | scaffolds a `multi-callout` with 2–4 panels |
| `change-current-callout-icon` | Change Icon of Callout at Cursor | icon picker; **writes the pipe form** |
| `advanced-callout-builder` | Advanced Callout Builder… | modal for type/bg/icon/radius/compact/center |
| `insert-<style-name>` | Insert "<name>" Callout | one per saved preset |

Two caveats. The per-preset commands are registered during `onload`, so a newly created
preset does not get its command until Obsidian reloads. And `insert-custom-callout` /
`wrap-selection-in-callout` append **Default Callout Metadata** using the pipe form, so that
setting should stay empty.

The *Advanced Callout Builder* is the one command that emits correct parenthesis syntax.

## Settings UI map

**Settings → Community plugins → Special Callouts**

1. **Core Layout** — the Default Callout Metadata field (see the caveat above).
2. **Visual Layout Builder** — columns/rows 1–8, drag to select, Merge / Split, name, save.
   Saved layouts can be edited, deleted, exported and imported. Names are lowercased with
   whitespace turned into underscores. Area ids are renumbered in reading order after every
   merge or split, which is what makes children map onto areas predictably.
3. **Callouts → Custom Callouts** — the preset editor: quick-start presets (Ocean Deep,
   Neon Glow, Forest, Sunset), a randomiser, live preview, icon picker, colour pickers for
   background/border/title/text/link, neon toggle, font family and size, border style,
   width and radius sliders, compact and hide-icon toggles, plus import/export.
4. **Callouts → Standard Callouts** — override the built-in types' colors, grid or list
   view, reset to default.
5. **Colors** — edit the standard palette's hex values, and define custom named colors
   usable anywhere a color is accepted.

## Known bugs and inconsistencies

Accurate as of v1.0.7. Useful both for explaining odd behaviour and as a to-do list.

1. **The pipe form is emitted but never parsed.** `Default Callout Metadata` and *Change
   Icon of Callout at Cursor* both produce `> [!type|meta]`, which the renderer ignores
   entirely — the metadata never applies, and the callout type itself stops being a clean
   type name. Only the settings *importer* understands the pipe form. This is the highest
   impact issue in the plugin: a user who fills in that setting sees every subsequently
   inserted callout stop working. Fix by emitting `> [!type] (meta)` in all three places.
2. **`dense` is documented as a line-height reduction** but is parsed as an alias of
   `compact`, and no line-height rule exists in `styles.css`.
3. **`data-grid-pos` and `data-grid-row` are dead attributes.** The row component of
   `(N:M:R)` has no effect; rows happen through flex wrapping.
4. **Preset `borderWidth` without a border color** is written to `--callout-border-width`
   verbatim, with no `px` appended — so a preset storing `'4'` produces an invalid
   declaration. Inline `border-width:` appends `px`; preset `borderRadius` does not. The
   three unit conventions disagree.
5. **Editing a preset does not restore `center` / `titleCenter` into the form**, so those
   two flags can be silently dropped when an existing preset is re-saved.
6. **Neon glow needs 6-digit hex.** The glow is built by string-concatenating `40` and `20`
   alpha suffixes; a 3-digit hex or an unresolved CSS keyword yields invalid CSS and the
   glow disappears while the border stays.
7. **Per-preset commands need an Obsidian reload** to appear.
8. **`src/modals/HowToModal.ts` and `src/modals/MetadataModal.ts` are dead code** in the
   1.0.7 tree — nothing imports them, they are absent from the built `main.js`, and both
   reference an undefined `contentEl` in `onClose`.
9. **The usage guide's command table is out of date** — it lists "Insert Custom Callout"
   where the actual command is "Insert Custom Style…", and omits the wrap, multi-column and
   icon commands.
10. **The neon shadow differs between inline metadata and presets** (`0 0 8px 2px` with an
    inset vs `0 0 10px`), so the same color looks slightly different depending on which
    route applied it.

## Build and development

```bash
npm install
npm run dev      # esbuild watch
npm run build    # production bundle
```

esbuild bundles `main.ts` into a single `main.js`. TypeScript 5.8, `obsidian` typings,
`minAppVersion` 0.15.0, `isDesktopOnly: false`.

A release is exactly three files — `main.js`, `manifest.json`, `styles.css` — dropped into
`<vault>/.obsidian/plugins/special-callouts/`.

When changing the processor, keep to the established pattern: set a data attribute plus CSS
custom properties from TypeScript, and put the actual declaration in `styles.css`. Writing
to `element.style` directly fails Obsidian's plugin review, and the v1.0.6 work existed
specifically to remove the last of it.
