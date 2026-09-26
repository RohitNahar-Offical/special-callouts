# Special Callouts Enhanced 2.0.1 — Release Notes & Changelog

## 🚀 Version 2.0.1 Release

Version 2.0.1 delivers core performance optimizations, DOM allocation reductions, memory leak protections, and improved observer resilience across Reading View and Live Preview.

---

## ⚡ Performance & Engine Improvements

### 1. Direct Set Iteration in Live Preview
- Eliminated intermediate array allocations in `processPendingNodes` during rapid keystrokes, iterating directly over active nodes for lower GC overhead and faster response in Live Preview.

### 2. Zero-Allocation HTMLCollection Processing
- Optimized `applyAreasToChildren` and `applyColumnsToContainer` to index directly into DOM `HTMLCollection` structures with cached collection lengths, cutting down object creation during large document rendering.

### 3. Fast-Path Heuristic Matching
- Optimized `isLikelyMetadata` to avoid allocating temporary `Set` instances for custom layouts on every parenthesized block check.

### 4. Cache Purging on Settings Update
- Added automatic clearing of `transparentBgCache` and `neonCache` upon saving settings to prevent stale CSS string retention across theme and color tweaks.

---

## 🛠️ Fixes & Stability

### 1. SVG Animated String Class Detection
- Fixed class inspection in the workspace `MutationObserver` to properly support `SVGAnimatedString` (`baseVal`) on SVG elements, preventing unnecessary tree queries when structural UI nodes mutate.

### 2. Timer & Observer Lifecycle Tracking
- Ensured all asynchronous icon override timeouts and fallback MutationObservers in `forceApplyIcon` register with internal tracking maps, guaranteeing clean teardown on tab or plugin unload.

---

## 🧪 Quality & Test Coverage
- **125 Automated Unit Tests across 35 Suites** passing with 100% success rate.
- Verified compatibility against latest Obsidian desktop environment.
