# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
