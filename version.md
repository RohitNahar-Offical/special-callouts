# Special Callouts 2.0.0 — Release Notes & Changelog

## 🚀 Major Version 2.0.0 Release

Version 2.0.0 brings a massive overhaul to Special Callouts, unifying the visual design Studio for single callouts and multi-column grid dashboards, introducing vault-wide universal defaults, enhancing performance and responsiveness, and polishing UI interactions.

---

## 🌟 Highlights & New Features

### 1. 🔲 Special Callout Studio (Single & Multi-Column Unified Workflow)
- **Visual Grid Matrix Canvas**: Design multi-column dashboards visually (1×2 up to 6×6 grids) with click-and-drag cell selection, cell merging, splitting, and instant live previews.
- **Persistent Canvas Editing**: Edit and refine layout structures seamlessly without premature exits, transitioning only upon clicking `✓ Done (Edit Box Content)`.
- **Quick Templates & Layout Presets**: One-click layout templates (`Hero + 2 Cards`, `Workspace`, `3 Columns`, `2×2 Quad`) plus custom saved layouts.
- **💾 Save as Preset**: Save both single callout styles and multi-column dashboard layouts directly as reusable presets from within the Studio.

### 2. ⚙️ Universal Callout Defaults & Live Preview
- **Live Preview in Settings**: Real-time reactive preview box under **General & Defaults** showing instantaneous updates.
- **Configurable Defaults**: Set universal defaults for Border Width & Style, Corner Radius, List Columns, Compact Mode, Centering, and Icon Visibility applied to newly inserted callouts.

### 3. 🎨 Alignment & Styling Decoupling
- **Unified Center Alignment**: Title and icon now center together as a unified group (`[ Icon  Title ]`) when `title:center` or `center` is active.
- **Collapsible Arrow Anchoring**: Fixed fold toggle arrows to anchor cleanly to the right edge during center alignment.
- **Gradient Borders**: Full support for custom borders, glow, and outlines alongside multi-color gradient backgrounds.

### 4. ⌨️ Streamlined Command Palette Management
- **Command Clutter Prevention**: Custom callout styles and layout presets now default to `showInCommandPalette: false`, keeping the Obsidian command palette organized and uncluttered.
- **Single Master Studio Command**: Access all single and multi-column design features through `Special Callout Studio (Create / Edit Single & Multi)...`.
- **Per-Style Toggles**: Easily enable commands for specific favorite callout styles in settings when desired.

### 5. ⚡ Performance Optimization & Zero-Lag Engine
- **RAF-Debounced Mutation Processing**: Optimized DOM processing with requestAnimationFrame batching, eliminating UI stutters on vault startup and note reload.
- **O(1) Node Rejection Fast-Path**: Skips non-editor DOM elements immediately, ensuring 0% main-thread blocking.
- **Zero-Allocation LRU Caching**: Fast-path metadata extraction with in-memory caching for smooth live-preview typing.

---

## 🧪 Quality & Test Coverage
- **125 Automated Unit Tests across 35 Suites** passing with 100% success rate.
- Fully compliant with Obsidian Developer Guidelines and strict styling constraints.
