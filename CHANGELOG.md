# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [1.0.9] - 2026-08-24

A stabilisation release. Nothing here changes how a callout is written; a good deal of it
changes whether what you wrote, or what you set in settings, actually took effect. Most of
these failed silently — no error, no warning, just a result that quietly wasn't what you
asked for.

### Fixed — rendering

- **A parenthesised value could be cut in half.** The bare `N:M` grid token is the one entry
  written without a key, so it is looked for across the whole metadata block before it is
  split into parameters — and digits with separators inside a value look exactly like it.
  `bg:rgba(0,0,0,0.5)` had `0,0` taken out of it and rendered from `rgba(0,,0.5)`. The scan
  now runs over a copy with the contents of every parenthesised group masked out, so it can
  only ever match at the top level.
- **A saved style with an empty colour blanked the callout.** Presets applied background,
  text and link without checking they were set, so an unset field produced
  `color-mix(in srgb,  15%, transparent)`. That is invalid at computed-value time, which
  drops the property to its initial value rather than leaving the theme's alone — a
  border-only preset lost the callout's tint entirely.
- **A preset with a gradient rendered with no background.** The style editor composes a
  gradient into the style's `bg` field rather than giving it a field of its own, so it
  reached the colour path and came out as
  `color-mix(in srgb, linear-gradient(…) 15%, transparent)` — invalid, and the background
  was dropped entirely. A `bg` that is already a CSS gradient function is now recognised and
  applied as one.
- **Presets and inline metadata were two copies of the same apply logic, and they had
  drifted.** The preset path folded the border width into the `--sc-border` shorthand while
  the inline path wrote `1px` and left the width to a later rule; the two only agreed
  because of the order the rules appear in the stylesheet. Both now go through one
  `applyConfig`, so `(border:red, border-width:4)` and the equivalent preset produce the
  same declaration.
- **A saved layout named after a built-in flag disabled that flag everywhere.** A layout is
  applied by writing its name as a bare word, which is the same shape a flag has, and layout
  names were matched first — so a layout called `compact` meant every `(compact)` in the
  vault stopped reducing padding and quietly applied a grid instead. Built-in words now win,
  which also repairs any vault already in that state, and the layout builder refuses to
  create the clash.
- **`style:` could not select a preset whose name contains a colon.** The value was cut at
  the second colon, so `style:Note: Important` looked for a preset called `note` and found
  nothing.
- **Obsidian's own type aliases ignored your palette.** `[!tldr]` renders as `[!abstract]`
  in Obsidian, but the plugin knew only the canonical names, so recolouring `abstract` in
  settings left `tldr` and `summary` untouched. Aliases now resolve to the type they render
  as: `summary` `tldr` → `abstract`, `hint` `important` → `tip`, `check` `done` →
  `success`, `help` `faq` → `question`, `caution` `attention` → `warning`, `fail`
  `missing` → `failure`, `error` → `danger`, `cite` → `quote`. They are resolved rather
  than added as separate entries, so the settings list stays thirteen rows and an alias
  cannot drift away from its type.
- **Density and alignment flags leaked onto a `multi-callout` wrapper.** `compact` (or
  `dense`/`center`) written on the wrapper matched the generic padding rules, which are
  declared after the `multi-callout` ones at equal specificity — so padding came back onto a
  container whose whole job is to have none, insetting the panel row from its edges. And
  `center` on the wrapper flipped the row to `flex-direction: column`, stacking every panel.
  Those flags are now ignored on the wrapper; they still apply to the panels inside, which
  is where they were always meant to go.
- **Panels could end up unequal widths.** The wrapper is a flex item and flex items default
  to `min-width: auto`, which wins over `max-width` — so a long unbroken word (a wiki link
  like `[[02-kutuphane]]`) held its panel wider than its computed share and pushed the row
  out of alignment. `min-width: 0` restores the equal split.

### Fixed — settings

- **Cancel did not cancel.** In the standard-style editor the colour inputs wrote straight
  into the settings object on every keystroke, so by the time you reached the buttons the
  change was already live — Cancel merely closed the window, and the next save from anywhere
  else in the tab committed it to disk. The editor now works on a copy.
- **Editing a preset discarded its icon colour.** The edit button carried its own
  hand-written copy of the form loader, and that copy had fallen behind the real one: it
  never restored `iconColor`, so opening a preset that had its own icon colour and saving it
  again silently dropped it. This is the same shape of bug that cost `center` and
  `titleCenter` in 1.0.8, so the button now calls the one loader, and a test fails the build
  if the two halves of the round-trip ever disagree again.
- **Editing a preset invented a title colour.** Loading a style into the form fell back to
  the background colour when no title colour was set, and saving then wrote that background
  in as an explicit title colour — locking the title to a colour you never chose. Same slip
  on the import path.
- **Renaming a preset onto another's name produced two styles answering to it**, of which
  only the first was ever reachable. The uniqueness check ran only when creating, and
  compared names case-sensitively while every lookup — `style:`, callout type, command id —
  is case-insensitive.
- **Importing a callout with a grouped value imported half of it.** The importer found the
  metadata with a pattern that stops at the first closing parenthesis, so pasting
  `> [!note] (text:(white, dark-border)) Title` read `text:(white` and dropped the rest. It
  now uses the same balanced scan as the renderer.
- **Importing layouts accepted anything that parsed as JSON.** A stray array replaced every
  saved layout with entries the settings tab then tried to read a name and a grid off, and
  valid JSON that was not an array closed nothing and said nothing at all. Entries are now
  checked for shape, and the result reports how many were taken.
- **Adding a custom colour failed silently.** An empty name or a malformed hex simply did
  nothing, with no message, which reads as a broken button. It now says which of the two is
  wrong, refuses a duplicate name, and refuses a name that matches the standard palette —
  those could never resolve, because standard names are checked first, so the colour would
  have sat in the list looking usable.
- **Four generated classes were applied but never defined**, so the elements using them
  rendered unstyled with nothing to indicate why: the labels in the standard-style editor,
  the name on each saved-layout card, the "Editing:" banner text, and the labels on the
  layout toggles.
- **The multi-column command spoke Turkish.** Its options and the text it inserted into the
  note were `2 Sütun` / `Sütun 1 içeriği`, in a plugin that is otherwise entirely English.
  The inserted panels also now carry a title, so the result is readable before you edit it.

### Added

- **Grouped values work on every parameter.** `key:(a, b)` was only ever shorthand for
  writing the key once per value, so it is now expanded into repeated pairs before parsing
  instead of being handled by a branch that knew about `text:`, `title:` and `link:` alone.
  `bg:(red)` used to set the background to the literal string `(red)`; where repeating a key
  makes no sense the last value simply wins.
- **`bw:` and `bs:`** as shorthands for `border-width:` and `border-style:`.
- **42 more tests**, 111 in total. Beyond the parser cases, three of them are structural
  guards over the things that keep breaking: that the style form's save and load halves
  agree, that every generated CSS class the code applies actually exists in the stylesheet,
  and that no styling is assigned from JavaScript.

### Changed

- **One definition each of the things that were duplicated.** The balanced-parenthesis scan
  lived in three places, each slightly different and two of them wrong; the alias table in
  two; the 15% background tint in three. Each is now written once and imported. This is not
  tidiness for its own sake — every bug in the settings section of this release was a copy
  that had drifted from its original.
- **`no-icon` no longer adds an unused `no-icon` class** to the callout element. Nothing in
  the stylesheet has ever read it; icons are hidden through `sc-hidden` as before.
- **Removed `throttle` and `applyCssText`**, neither of which was called from anywhere.
  `applyCssText` in particular was a helper for applying a block of CSS text from
  JavaScript — the exact pattern v1.0.6 was spent removing.

### Credit

Several of the parser fixes here were found by [Rohit
Nahar](https://github.com/RohitNahar-Offical) in
[#9](https://github.com/ahseyg/special-callouts/pull/9) and adapted rather than merged —
see that thread for what was taken and why.

---

## [1.0.8] - 2026-08-18

### Added
- **Tests**: 69 cases covering `parser.ts` and `utils.ts`, run with `npm test`. No new dependencies — they build the real source with the esbuild already used for bundling, so they cannot drift from it.
- **Typecheck in the build**: `npm run build` now runs `tsc --noEmit` first. esbuild does not typecheck, which is how the four type errors fixed below shipped in a working build.
- **CI workflow**: typecheck, test, build, and a check that the committed `main.js` still matches source, on every push and pull request.
- **`version-bump.mjs`**: the `npm version` script referenced this file but it did not exist, so the command failed. It now updates `manifest.json` and `versions.json` together and warns when `CHANGELOG.md` has no section for the new version.
- **`CONTRIBUTING.md`**.
- **`icon-color:` parameter** (alias `iconcolor:`), and a matching `iconColor` field on saved styles, for when the icon should not take the title's colour. Reported in [#8](https://github.com/ahseyg/special-callouts/issues/8).
- **Icon colour picker** in the custom style editor, next to the title picker. It follows the title colour until you set it, and the reset beside it hands the icon back to the title. Also requested in [#8](https://github.com/ahseyg/special-callouts/issues/8).

### Removed
- **`OLD_createFormSection`** (148 lines): a superseded copy of the custom style form, unreferenced since the current editor replaced it. It carried its own colour-picker wiring, so it was a standing trap for anyone editing the form.

### Changed
- **Obsidian plugin review**: removed the two `console.log` calls in `onload`/`onunload` (the guidelines discourage unnecessary console output). `console.error` in catch blocks is kept — it only fires on a real failure.
- **Saved styles list**: the grid/list view switch assigned `element.style.cssText` directly, the one place that pattern survived the v1.0.6 cleanup. It now uses classes defined in `styles.css`. It had never actually run, since the `TypeError` above aborted the function before reaching it.
- **CSS**: dropped the multicolumn properties (`column-gap`, `column-fill`, `column-count`, `break-inside`, `page-break-inside`) from the column-layout rules. Distribution has been done with CSS Grid since 1.0.2, so these never applied to anything; Obsidian's CSS lint flags multicolumn as only partially supported.
- **`dense`**: now reduces line-height and list spacing in addition to padding, as the usage guide always described. It still implies `compact`, so existing notes only render tighter.

### Fixed
- **Icon colour ignored the title colour** ([#8](https://github.com/ahseyg/special-callouts/issues/8)): only the icon's container was coloured, but Obsidian styles the icon's SVG directly, so the SVG never inherited it and the icon stayed on the theme accent. The rule now targets the SVG and sets `--icon-color` as well.
- **Saved custom styles did not appear in the saved list** ([#8](https://github.com/ahseyg/special-callouts/issues/8)): the list renderer threw a `TypeError` five lines before the loop that draws the cards, so nothing was ever drawn. Styles were saved correctly all along, which is why exporting produced valid JSON and re-importing changed nothing. Same root cause as the settings-tab `TypeError` below.
- **Reset button on standard callouts**: threw a `ReferenceError` before resetting anything — its click handler referenced an `e` that was never in scope.
- **Settings tab rendering**: the "Saved Styles" heading called `addClass` on a `Setting` instance instead of its element, throwing a `TypeError` partway through the tab.
- **Layout import modal**: the placeholder never appeared; it assigned a property `TextAreaComponent` does not have.
- **Units in `border-width` and `radius`**: `border-width:4px` produced `4pxpx` and was dropped, while a preset's `borderWidth` was written to Obsidian's `--callout-border-width` with no unit at all. Unitless and unit-carrying values are now equivalent everywhere.
- **Neon glow**: was built by concatenating hex alpha suffixes, so a 3-digit hex or a bare CSS keyword kept its border but silently lost its glow. Now uses `color-mix`, and inline metadata and presets share one implementation so the same colour renders identically either way.
- **Editing a custom style**: `center` and `titleCenter` were not restored into the form, so re-saving an existing preset silently cleared them.
- **Metadata syntax in commands**: "Insert Custom Style", "Wrap Selection in Callout" and "Change Icon of Callout at Cursor" emitted `> [!type|metadata]`, a form the renderer never parsed. Filling in the **Default Callout Metadata** setting therefore made every inserted callout silently lose its styling. All three now emit `> [!type] (metadata)`.
- **Change Icon of Callout at Cursor**: now merges into an existing metadata block instead of replacing it, using the same balanced-parenthesis scan as the parser — so grouped values such as `text:(white, dark-border)` are no longer corrupted. Also recognises nested callouts (`>> [!tip]`) inside `multi-callout` grids.

---

## [1.0.7] - 2026-07-06

### Fixed
- **Icons**: Fixed an issue where custom callout icons were sometimes overridden by Obsidian's default `pencil` icon.
- **Settings Form**: Fixed an issue where editing an existing custom callout in Settings would fail to load several advanced parameters (borderWidth, borderStyle, borderRadius, neon, noIcon, compact, center, titleCenter).
- **Multi-callout Grid**: Fixed an alignment issue in `multi-callout` grids where the first column appeared slightly lower than the rest.
- **Parser**: Added missing standalone `compact` and `dense` flag parsing support.

---

## [1.0.6] - 2026-06-21

### Fixed
- **no-static-styles-assignment (processor.ts)**: Replaced all `setImportantStyle()` calls (which used `el.style.setProperty` with `!important`) with CSS custom property injection via `setCssProps()` + data-attribute pairs. All `!important` overrides now live exclusively in `styles.css` under scoped data-attribute selectors.
- **no-static-styles-assignment (utils.ts)**: Removed `setImportantStyle()` and `applyCssText()` functions that used forbidden `el.style` direct access. `applyTextBorder()` now uses `data-sc-text-border` attribute + `--sc-text-border-color` CSS variable. `applyCssText()` now parses CSS string and delegates to `setCssStyles()`.
- **no-unsupported-api (SettingsTab.ts)**: Replaced deprecated `addColorPicker()` Setting API with a native `<input type="color">` element appended via `createEl()`.

### Added
- **styles.css**: ~180 lines of new CSS rules using data-attribute selectors (`[data-sc-bg]`, `[data-sc-border]`, `[data-compact]`, `[data-center]`, `[data-sc-neon]`, `[data-sc-gradient]`, etc.) backed by CSS custom properties. This is the sole location for `!important` overrides replacing all former JS inline style mutations.
- **CSS utility classes**: `.sc-hidden`, `.sc-wrapper-bq`, `.sc-wrapper-p`, `.sc-multi-col-list`, `.sc-multi-col-item`, `.sc-grid-item-wrapper`, `.sc-area-child`, `.sc-area-inner` — all used by processor to avoid inline styles.

---

## [1.0.5] - 2026-06-20

### Fixed
- **Codebase Linting**: Extensive refactoring to resolve all linting warnings (no-static-styles-assignment, strict typescript typings, popout compatibility, builtin-modules deprecation).
- **Settings UI Headings**: Migrated all custom heading creation to Obsidian's native `Setting(el).setHeading()` API.

---

## [1.0.4] - 2026-06-20

### Changed
- **HowToModal**: Migrated from raw `document.createElement` / `innerHTML` to Obsidian's safe `Modal` API.
- **MetadataModal**: Same migration — all content now built with `createEl` / `createDiv`.
- **IconPickerModal**: Replaced `element.style.x = y` with `setCssProps()` throughout.
- **SuggesterModal**: Replaced `style.cssText` with `setCssProps()`. Removed circular dependency on `main.ts`.
- **openStandardStyleEditor** (SettingsTab): Replaced raw DOM overlay modal with Obsidian `Modal` class. Eliminated `innerHTML` and `document.createElement`.

### Fixed
- **Popout window compatibility**: `clearTimeout`, `setTimeout`, `requestAnimationFrame` now use `window.*` prefix in `utils.ts` and `processor.ts`.
- **Unused import**: Removed `extractMetadata` import from `SettingsTab.ts`.
- **Parser lint**: Removed unnecessary `\/` escape chars in regex. Wrapped `case` blocks with lexical declarations in `{}`.
- **Promise warnings**: `async` callbacks in `onclick` handlers wrapped with `void (async () => { ... })()`.
- **Beta suffix removed**: Version is now stable `1.0.4`.

---

## [1.0.3-beta.1] - 2026-05-21


### Added

- **Layout Persistence & Management**: The Visual Layout Builder now persists its state across settings tab refreshes. Added **Export All** and **Import** functionality for custom layouts (JSON based).
- **Improved MCL & Live Preview Support**: Safely re-introduced extended CSS selectors for column layouts (`.cm-embed-block`, `.markdown-rendered`).
- **Default Callout Metadata**: New setting "Default Callout Metadata" in General Settings.
- **Command Palette Scenarios**: Completely redesigned command palette workflow with 5 key usage scenarios.
- **Icon Metadata Support**: Added `icon:lucide-name` parameter to callout metadata.
- **RELEASE_NOTES.md**: New user-facing release notes file maintained in Turkish.

### Fixed

- **Layout Builder Reset Bug**: Fixed an issue where the Visual Layout Builder would reset to default dimensions (3x2) after saving or editing a layout.
- **Column Stability & Performance**: Optimized `MutationObserver` to specifically target list-related changes in the editor.
- **Text Contrast — Plugin UI Buttons**: All hardcoded `color: white` values in UI replaced with `var(--text-on-accent)`.
- **Icon Rendering Robustness**: Re-implemented icon injection to handle theme-specific icon omission.

---

## [1.0.2] - 2026-05-15

### Changed

- **Code Simplification**: Removed undocumented inline grid parameters (`grid-cols:X`, `w:X`, `h:X`) and flex modifiers (`flex:X`, `vertical`).

---

## [1.0.1] - 2026-05-15

### Added

- **Center Alignment**: New `center` parameter to align title and content to center.
- **Title Center**: New `title:center` metadata to align only the title.
- **Compact Mode**: New `(compact)` parameter for reduced padding.
- **Typography System**: Full font family support (`mono`, `serif`, `sans`, `hand`, `marker`).
- **Font Size Scale**: `font-size:1` to `font-size:5`.
- **Neon Effects**: Color-based neon glow with `neon:#color`.
- **Text Borders**: `text:dark-border`, `text:light-border`.
- **Title Borders**: `title:dark-border`, `title:light-border`.
- **Border Styles**: `border-style:dashed`, `border-style:dotted`, `border-style:double`.
- **Random Generator**: 'Random' button in settings to generate unique styles instantly.
- **Settings UI**: Added center, title-center, and compact toggles to custom callout settings.
- **Grouped Syntax**: `text:(white, dark-border)`.

### Changed

- **Column Layout Engine**: Replaced CSS Columns with CSS Grid for reliable list distribution.

### Fixed

- **Multi-callout Overlap in Reading Mode**: Consecutive multi-callouts no longer stack with no spacing.
- **Compact Mode Styling**: Properly reduces padding on callout, title, AND content elements.
- **Balanced Padding**: Fixed asymmetric padding in callouts without visible title text.
- **Border Overflow**: Fixed background bleeding out of rounded corners.
- **Dataview/Homepage Initial Load**: Added retry mechanism (100ms → 2s) for delayed async content.
- **Column Distribution**: Fixed last item placement with odd counts.

---

## [1.0.0] - 2026-01-10

### Added

- Initial release of Special Callouts plugin
- Inline metadata syntax for callout customization
- Custom callout style presets (create and save)
- Standard callout modification in settings
- Color customization: `bg`, `text`, `title`, `link`
- Visual effects: `gradient`, `neon`, `border`
- Typography: `font`, `font-size`
- Layout features: `col:X` multi-column lists, `compact`, `no-icon`
- Grid layout system with `multi-callout` wrapper
- Grid positioning: `1:2`, `2:3:2` format
- Text border for readability: `dark-border`, `light-border`
- Icon picker with fuzzy search
- Export/Import custom styles as JSON
- Quick start presets: Ocean Deep, Neon Glow, Forest, Sunset
- Metadata Reference modal
- How to Use modal
- Mobile responsive grid layout
