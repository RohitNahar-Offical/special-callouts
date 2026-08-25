# Special Callouts — Release Notes & Changelog

## 🚀 Version Summary: Integrated Architecture, UI Overhaul & Performance Optimization

This release unifies the modern UI workflow from `backup-pr9` with the core engine features of `main` / upstream `v1.0.9`, coupled with an ADHD-divergent performance and memory optimization refactor.

---

## 📋 Comprehensive List of Changes & Rationale

### 1. 🔲 Interactive Multi-Column Matrix Dashboard Builder (`MultiColumnBuilderModal.ts`)
- **What Changed**: Introduced a full visual matrix canvas (supporting 1×2 up to 6×6 grids) with click-and-drag cell selection, cell merging, automatic orphan area cleanup, split/unmerge functionality, full Card Content & Type editing tab, live interactive dashboard previews, 1-click layout presets (`Hero + 2 Cards`, `Workspace`, `3 Columns`, `2×2 Quad`), and two-way round-trip editing from existing note markdown.
- **Why**: Building CSS Grid multi-column dashboards manually using complex metadata syntax (`>> [!note] (1-2:3:1-2)`) is error-prone and tedious. The visual builder lets users visually layout cards, customize contents, and preview them in real time with clean canonical grid tokens.

### 2. 🖱️ All-in-One Callout Inserter & Customizer (`InsertCalloutModal.ts`)
- **What Changed**: Added a tabbed callout creation modal with a sticky real-time live preview, style preset switcher, custom color inputs, Lucide icon picker, border adjustments, and direct access to the Multi-Column Builder.
- **Why**: Streamlines creating new customized callouts with immediate visual feedback without memorizing metadata tokens.

### 3. ⚙️ Modern Tabbed Settings Panel (`SettingsTab.ts`)
- **What Changed**: Replaced the legacy monolithic settings tab with a 6-tab interface:
  1. **Custom Styles**: Filterable search bar, live mini-card previews, duplicate/edit/delete actions, and quick-start templates.
  2. **Standard Callouts**: Color and icon overrides for all 13 canonical Obsidian callouts (`note`, `tip`, `warning`, etc.).
  3. **Color Palette**: Standard color picker and custom named color manager (e.g., `bg:brand`).
  4. **Visual Layout Builder**: Drag-and-drop grid template area builder for custom named layouts.
  5. **Interactive Guide**: One-click access to cheatsheets and documentation.
  6. **General Settings**: Vault-wide defaults and metadata behavior.
- **Why**: Makes managing large numbers of custom presets and palettes effortless and eliminates scrolling fatigue.

### 4. ⚡ Parser Engine: Zero-Allocation Fast Path & LRU Caching (`parser.ts`)
- **What Changed**:
  - Implemented an $O(1)$ fast-path in `extractMetadata()` for unstyled callout headers (headers without parentheses).
  - Added an in-memory bounded LRU cache (capped at 500 entries) in `parseMetadata()` that returns isolated configuration copies for repeated metadata strings.
  - Added lossless roundtrip metadata serialization via `serializeMetadata()`.
  - Added support for both column spanning tokens (`span:N`) and multi-range tokens (`(colStart-colEnd:totalCols:rowStart-rowEnd)`).
  - Hoisted all regular expressions and set lookups to module scope.
- **Why**: Large Obsidian vaults with hundreds of callouts previously suffered micro-stutters during Live Preview typing. Caching and fast paths eliminate CPU tokenization and garbage collection pressure entirely.

### 5. 🚀 Processor Engine: Batched DOM Updates & Observer Lifecycle (`processor.ts`)
- **What Changed**:
  - Consolidated 10+ individual `setCssProps()` calls into a single batched atomic operation per callout.
  - Linked `MutationObserver` instances to elements using `WeakMap` with automatic disconnect cleanup on DOM unmount.
  - Replaced inline `.style.display = 'none'` mutations with CSS utility classes (`.sc-hidden`), ensuring 100% compliance with Obsidian styling guidelines.
- **Why**: Minimizes style recalculation thrashing, prevents memory leaks when navigating between notes, and adheres to strict community plugin linter rules.

### 6. 🧩 DRY UI Component Architecture (`UIComponents.ts`)
- **What Changed**: Extracted shared UI builder components (`createColorSetting`, `createIconSetting`, `createBorderStyleSetting`, `createFontSetting`, `createFontSizeSetting`, `applyStyleToLivePreview`) into a centralized module, eliminating over 1,700 lines of duplicated code across modals and settings.
- **Why**: Enhances maintainability, guarantees visual consistency across all modals, and keeps the codebase DRY (Don't Repeat Yourself).

### 7. 🧹 Cleaned Up Dead Code & Testing Suite
- **What Changed**:
  - Removed obsolete legacy `AdvancedBuilderModal.ts`.
  - Expanded unit test suite to **116 tests across 34 suites** (`npm test`), verifying parser edge cases, alias resolutions, LRU cache behavior, and stylesheet contracts.
- **Why**: Eliminates bundle bloat and guarantees zero regressions across all core features.
