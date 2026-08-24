# Pull Request: Multi-Column Matrix Builder, Spanned Grid Layouts, Full Border Styles, Right-Click Menu & Core Optimizations

## 📌 Overview

This plugin is great and I use it daily in my own vault! While working with it, I found myself needing a much easier and more visual way to insert, customize, and compose callouts and multi-column dashboards directly from the editor without memorizing complex syntax. I originally built these features and fixes for my own workflow, but I believe sharing them back upstream will benefit the entire community and contribute to the long-term maintainability and capability of the plugin.

This pull request introduces an interactive visual multi-column matrix builder, full CSS grid spanning support in notes, an all-in-one customizable inserter modal, right-click context menu access, expanded border styling, and comprehensive memory and performance optimizations over **v1.0.8**.

> [!NOTE]
> **Modular Adoption / Cherry-Picking**:
> Since these features are structured modularly, feel free to pick and choose specific components that best fit the plugin's roadmap (e.g., adopting just the **Right-Click Context Menu & Inserter Modal**, the **Memory & Performance Optimizations**, or the **Multi-Column Matrix Builder**) if you prefer gradual integration rather than merging all features at once.

---

## 🚀 Key Highlights & What I Changed

### 1. 🖱️ Right-Click Context Menu & All-in-One Inserter Modal
* **Right-Click Context Menu**: Added an `Insert Special Callout...` item to the editor's right-click context menu. You can now configure and insert callouts instantly from the cursor position without needing to open the Command Palette.
* **Unified Single Callout Inserter (`InsertCalloutModal.ts`)**:
  * Clean, tabbed modal with a sticky real-time preview that updates immediately as you tweak colors, borders, or typography.
  * Added all 8 standard CSS border styles (`solid`, `dashed`, `dotted`, `double`, `groove`, `ridge`, `inset`, `outset`, `none`).
  * Added `List Columns` dropdown to divide bullet points and numbered lists into multi-column layouts (`col:2`, `col:3`, `col:4`).
  

---

### 2. 🔲 Interactive Multi-Column Matrix Dashboard Builder (`MultiColumnBuilderModal.ts`)
* **Visual Matrix Canvas (2×2 up to 6×6)**: An interactive grid canvas supporting custom grid sizes (such as 2×6 dashboards or 4×4 master grids).

* **1-Click Layout Preset Gallery**:
  * ⚡ **Hero + 2 Cards** (Full-width top hero banner + 2 column cards below)
  * 📊 **Workspace** (Top Header + Left Sidebar + Spanned Main Workspace)
  * 📰 **3 Columns** (3 equal vertical columns)
  * 🔲 **2×2 Quad** (4 equal cards)
* **Per-Box Deep Customization Tabs**:
  * **Colors & Glow**: Custom Background (with 15% tint), Border, Title, and Icon colors with color pickers, plus Cyber Neon Glow.
  * **Typography & Icons**: Lucide Icon Picker, custom Font Families (`mono`, `serif`, `sans`, `hand`, `marker`), and Font Sizes (1 to 5).
  * **Borders & Shape**: Border Width (1px, 2px, 4px), Corner Radius (0–30px), and all 8 CSS Border Styles.
  * **List Columns**: Divide lists inside specific callout boxes into multi-column layouts.
  * **Compact & No-Icon Modes**: Per-box toggles for dense information.
* **Two-Way Roundtrip Re-Editing**: Placing the cursor inside (or selecting) an existing `> [!multi-callout]` block in the note and opening the builder automatically parses and loads all existing boxes, coordinates, merged dimensions, text, colors, and icons into the visual matrix. Clicking **Update Dashboard Callout** updates the note in-place!
* **Instant Live Preview**: Inputs, sliders, pickers, and type dropdowns update the sticky dashboard preview and canvas titles instantly without requiring selection toggling.

---

### 3. 📐 True Spanned CSS Grid Rendering in Obsidian (`src/parser.ts`, `src/processor.ts`, `styles.css`)
* **Ranged Token Format**:
  * Syntax: `>> [!type] (colStart-colEnd:totalCols:rowStart-rowEnd) Title`
  * Example: `>> [!info] (1-2:3:1-1, bg:#7c4dff) Hero Banner` (spans columns 1 to 2 in a 3-column grid).
* **Parser Enhancement**: Updated `GRID_REGEX` and `parseGridLayout()` to extract `colSpan` and `rowSpan` ranges alongside standard single-cell coordinates.
* **CSS Grid Processor & Styles**:
  * Set container `.callout[data-callout="multi-callout"] > .callout-content` to native `display: grid` with `grid-template-columns: repeat(var(--sc-multi-cols), 1fr)`.
  * Sub-items set `--sc-grid-col-start`, `--sc-grid-col-span`, `--sc-grid-row-start`, `--sc-grid-row-span` using `setCssProps` (fully compliant with Obsidian DOM styling guidelines).
  * Cards render properly spanned in both Obsidian **Live Preview** and **Reading Mode**.

---

### 4. 🧹 Performance, Memory & Code Quality Cleanups
* **Eliminated ~75 Lines of Redundant Code**: Refactored `applyStyleObject()` in `src/processor.ts` to map style objects to `CalloutConfig` and delegate directly to `applyConfig()`, unifying the DOM manipulation pipeline.
* **Observer & Timeout Lifecycle Cleanup**:
  * Proactively disconnects and prunes `MutationObserver` instances and active timeout IDs from `WeakMap` / `Set` when callout elements are unmounted (`!calloutEl.isConnected`).
  * Prevents memory leaks and retained DOM references during note navigation.
* **Selector Hoisting**: Hoisted complex DOM query strings (`LIST_SELECTOR` and `MUTATION_TARGET_SELECTOR`) to module-level constants for faster execution inside animation frames.
* **Cleaned Command Palette**: Removed dynamic per-preset command spam from `Ctrl + P` to keep the palette uncluttered.
* **Repository Sanitation**: Added `.gitignore` to prevent committing build caches, OS files, and editor configs. Removed deprecated `AdvancedBuilderModal.ts`.

---

## 🔍 File-by-File Breakdown

| File | Change Type | Description |
| :--- | :--- | :--- |
| `src/modals/MultiColumnBuilderModal.ts` | **NEW** | Interactive visual matrix canvas, drag-to-merge, preset gallery, per-box styles, and ranged token generator. |
| `src/modals/InsertCalloutModal.ts` | **NEW** | Unified all-in-one single callout customizer modal with live preview, border styles, and list column options. |
| `src/parser.ts` | **MODIFIED** | Updated `GRID_REGEX` and `parseGridLayout()` to support ranged tokens (`1-2:3:1-2`) and extract `colSpan` / `rowSpan`. |
| `src/processor.ts` | **MODIFIED** | Added CSS grid variable bindings for spanned cards; refactored `applyStyleObject`; hoisted selectors; improved observer lifecycle. |
| `src/types.ts` | **MODIFIED** | Added `colSpan?: number; rowSpan?: number;` to `GridConfig` interface. |
| `styles.css` | **MODIFIED** | Added `.callout[data-callout="multi-callout"]` grid styles, spanned `.sc-grid-item-wrapper`, tab bar overflow fixes, and border style rules. |
| `src/settings/SettingsTab.ts` | **MODIFIED** | Added all 8 border styles to custom style editor and preset management. |
| `main.ts` | **MODIFIED** | Added right-click editor menu item, streamlined command palette, removed dead imports (`AdvancedBuilderModal`), and linked new modal dialogs. |
| `tests/parser.test.mjs` | **MODIFIED** | Added unit tests for ranged grid tokens (`1-2:3:1-2`). |
| `.gitignore` | **NEW** | Standardized ignore list for dependencies, logs, and build caches. |

---

## ✅ Verification & Testing

* **Unit Tests**: Ran `npm test` — **70/70 passing tests** across parser, colours, strokes, flags, borders, typography, and grid calculations.
* **TypeScript Compilation**: Ran `tsc --noEmit` and `npm run build` — **0 errors**.
* **Obsidian Live Testing**:
  * Validated right-click context menu insertion in active editor panes.
  * Verified multi-column matrix rendering with spanned hero cards and sidebar layouts.
  * Verified live preview responsiveness when adjusting colors, border widths, and styles.
  * Verified list-columns splitting inside callout boxes.
