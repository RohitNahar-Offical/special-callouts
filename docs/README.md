# Special Callouts — Comprehensive Technical Documentation

Welcome to the comprehensive architecture and operational guide for the **Special Callouts** Obsidian plugin (v1.0.9+). This documentation explains **how the plugin works, why it was engineered this way, and how all its subsystems interact**.

---

## 📚 Documentation Hierarchy

```
docs/
├── README.md                                  # You are here (Master Index & Navigation)
│
├── architecture/                              # Core Architecture & System Design
│   ├── 01-core-architecture.md                # System topology, render pipelines, Reading vs Live Preview
│   ├── 02-dom-and-css-system.md               # CSS Variable binding, styling contracts, theme isolation
│   └── 03-lifecycle-and-observers.md          # MutationObservers, async column retry, SMIL SVG lifecycle
│
├── features/                                  # Feature Deep Dives & Algorithms
│   ├── 01-syntax-and-metadata-parsing.md      # Metadata grammar, parser state machine, LRU cache
│   ├── 02-multi-callout-dashboards.md         # Grid math, matrix generator, flex layout, nested callouts
│   ├── 03-list-multicolumn-reflow.md          # Multi-column lists (`col:N`), height balance, Dataview
│   ├── 04-visual-styling-and-effects.md       # Neon glow algorithm, gradients, borders, font typography
│
├── ui-and-modals/                             # Interactive User Interfaces
│   ├── 01-studio-and-builders.md              # Studio modal, visual grid builder, editor toolbar
│   └── 02-settings-and-management.md          # Consolidated 6-tab settings tab, preset import/export
│
└── internals-and-developer-guide/             # Engineering Handbook & Troubleshooting
    ├── 01-developer-handbook.md               # Build pipeline, test suite (125 tests), O(1) performance
    └── 02-troubleshooting-and-gotchas.md      # Icon lifecycle, DOM mutation pitfalls, CodeMirror 6 Gotchas
```

---

## ⚡ Quick Navigation

### 1. [System Architecture](architecture/01-core-architecture.md)
Learn about the dual-engine rendering pipeline separating Reading View (`MarkdownPostProcessor`) from Live Preview (`CodeMirror 6` widgets), and how memory safety and $O(1)$ lookup guarantees are enforced.

### 2. [DOM & CSS System](architecture/02-dom-and-css-system.md)
Understand why direct inline style assignments (`el.style.*`) are strictly prohibited in favor of dynamic CSS variable bindings (`el.setCssProps`) and why high-specificity CSS rules neutralize theme masking conflicts.

### 3. [Lifecycle & Observers](architecture/03-lifecycle-and-observers.md)
Deep dive into the 3-layer `forceApplyIcon` override, workspace-level `MutationObserver` for dynamically mounted CM6 widgets, and `IntersectionObserver` for SMIL animated SVG scroll recovery.

### 4. [Syntax & Metadata Parsing](features/01-syntax-and-metadata-parsing.md)
Examine the balanced-parentheses lexical scanner, zero-allocation fast paths, LRU token cache, and lossless round-trip serialization.

### 5. [Multi-Callout Dashboards](features/02-multi-callout-dashboards.md)
Learn how visual 2D grids are translated into portable markdown syntax `(Position:Columns:Row)` and rendered cleanly across devices.

### 6. [Multi-Column Lists (`col:N`)](features/03-list-multicolumn-reflow.md)
Discover how bullet lists reflow into CSS Grid columns with height balancing and resilient retry timeouts for Dataview and Homepage embeds.

### 7. [Visual Effects & Color Science](features/04-visual-styling-and-effects.md)
Explore the mathematics of CSS `color-mix` neon glows, multi-stop linear gradients, and 15% transparent background tints.

### 8. [Studio & Interactive Builders](ui-and-modals/01-studio-and-builders.md)
A tour of the Special Callout Studio modal, visual matrix drag/click selection, and Markdown Editor toolbar with real-time autocompletion.

### 9. [Settings & Palette Management](ui-and-modals/02-settings-and-management.md)
How the consolidated 6-tab interface manages custom styles, layout presets, integrated color palettes, and JSON backup migrations.

### 10. [Developer Handbook & Testing](internals-and-developer-guide/01-developer-handbook.md)
Full guide on building with `esbuild`, running the 125-case test suite in Node.js, and maintaining strict type safety.

### 11. [Troubleshooting & Gotchas](internals-and-developer-guide/02-troubleshooting-and-gotchas.md)
Crucial debugging insights into Obsidian's native icon lifecycle, DOM text node replacement vs wiping, and CodeMirror 6 recycling.
