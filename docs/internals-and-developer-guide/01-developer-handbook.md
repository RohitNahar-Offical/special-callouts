# Developer Handbook, Build Pipeline & Testing

## 1. Build Pipeline Architecture

The plugin uses `esbuild` for bundling and TypeScript for strict type verification.

### Key Scripts (`package.json`)
```bash
# Production bundle with typecheck
npm run build

# TypeScript validation without emitting files
npm run typecheck

# Fast Node.js native test runner
npm test

# Continuous watch mode during development
npm run dev
```

### Esbuild Configuration
In `esbuild.config.mjs`:
- Formats bundle as CommonJS (`cjs`) targeting Node.js / Electron.
- Inlines CSS and assets when required.
- Externalizes `obsidian`, `@codemirror/*`, and `electron` dependencies.

---

## 2. The Node.js Test Suite (125 Cases)

Special Callouts features a comprehensive unit and regression test suite using Node's built-in `node:test` runner.

### Test Structure
- `tests/parser.test.mjs`: Metadata parsing, flags, grouped values, edge cases, error recovery.
- `tests/utils.test.mjs`: Color math, neon glow `color-mix`, transparency tints, string utilities.
- `tests/styles.test.mjs`: CSS styling contracts, verification that no forbidden `!important` or static inline style mutations exist.
- `tests/modal.test.mjs`: Form initialization and state cloning tests.

### Running Tests
```bash
npm test
```
All 125 tests run in under 300ms.

---

## 3. Performance Guarantees ($O(1)$ Hash Maps)

In [src/processor.ts](file:///r:/Obsidian/Testsub1/.obsidian/plugins/special-callouts/src/processor.ts), standard linear $O(N)$ scans are replaced with precomputed HashMaps initialized on plugin startup and settings save:

```ts
export class CalloutProcessor {
    private modifiedStandardStyles = new Map<string, CalloutStyle>();
    private customStylesMap = new Map<string, CalloutStyle>();
    private customLayoutNames: string[] = [];

    private recomputeIndices(): void {
        this.modifiedStandardStyles.clear();
        this.customStylesMap.clear();

        // Populate O(1) maps...
    }
}
```
This guarantees zero main-thread hitching even when notes contain hundreds of callouts.
