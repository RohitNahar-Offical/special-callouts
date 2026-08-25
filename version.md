# Release 1.1.0: Multi-Column Matrix Dashboard Builder, Spanned Grid Layouts & Core Optimizations

## 🚀 Key Highlights & New Features

### 1. 🖱️ Right-Click Context Menu & All-in-One Inserter Modal
* **Editor Right-Click Menu**: Added `Insert Special Callout...` directly in the context menu for rapid insertion at the cursor.
* **Unified Inserter Modal**: Tabbed modal with a sticky real-time live preview, Lucide icon picker, custom background/border/title/icon color pickers, and typography controls.
* **Full Border Styles**: Support for all 8 standard CSS border styles (`solid`, `dashed`, `dotted`, `double`, `groove`, `ridge`, `inset`, `outset`, `none`).
* **List Columns**: Split lists inside callout boxes into multi-column layouts (`col:2`, `col:3`, `col:4`).

### 2. 🔲 Interactive Multi-Column Matrix Dashboard Builder
* **Visual Matrix Canvas**: Interactive 2×2 up to 6×6 matrix canvas with drag-to-merge cell spanning.
* **1-Click Preset Gallery**: Instant layout templates (Hero + 2 Cards, Workspace Sidebar, 3 Columns, 2×2 Quad).
* **Deep Box Customization**: Per-box background tints, glow effects, border widths, corner radius, typography styles, and compact mode.
* **Two-Way Roundtrip Editing**: Open existing `> [!multi-callout]` blocks in the visual builder to modify layouts and styles in-place.

### 3. 📐 True Spanned CSS Grid Rendering
* **Ranged Token Format**: Syntax support for ranged multi-column spans (`>> [!type] (1-2:3:1-1) Title`).
* **Clean DOM Engine**: High-performance CSS custom property bindings (`--sc-grid-col-start`, `--sc-grid-col-span`, `--sc-grid-row-start`, `--sc-grid-row-span`) fully compliant with Obsidian guidelines.
* Seamless live rendering in both Live Preview and Reading Mode.

### 4. 🧹 Performance & Stability Improvements
* **Lifecycle Cleanup**: Proactive disconnection of `MutationObserver` instances and active timeout IDs on DOM unmount to eliminate memory leaks during note navigation.
* **Selector Hoisting**: Optimized animation frame queries and refactored style parsing pipelines.
* **Full Unit Test Suite**: 70/70 passing automated tests covering all parsing, colours, strokes, flags, borders, typography, and grid calculations.
