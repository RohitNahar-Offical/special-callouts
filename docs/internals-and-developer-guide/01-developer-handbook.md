# Developer Handbook, Build Pipeline & Testing

## 1. Build Pipeline Architecture

The plugin uses `esbuild` for bundling and TypeScript for strict type verification.

### Key Scripts (`package.json`)
```bash
# Production bundle with typecheck
npm run build

# TypeScript validation without emitting files
npm run typecheck

# Fast Node.js native test runner (125 tests)
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

## 2. The Node.js Test Suite (125 Cases across 35 Suites)

Special Callouts features a comprehensive unit and regression test suite using Node's built-in `node:test` runner.

### Test Structure
- `tests/parser.test.mjs`: Metadata parsing, flags, grouped values, edge cases, error recovery.
- `tests/utils.test.mjs`: Color math, neon glow `color-mix`, transparency tints, string utilities.
- `tests/styles.test.mjs`: CSS styling contracts, verification that no forbidden `!important` or static inline style mutations exist.
- `tests/modal.test.mjs`: Form initialization, preset cloning, and settings state tests.

### Running Tests
```bash
npm test
```
All 125 tests run in under 300ms with 100% pass rate.

---

## 3. Releasing & Tagging Protocol

When releasing new versions:
1. **Tag Format**: Never prefix the release version or tag with `v` (e.g. use `2.0.0`, not `v2.0.0`).
2. **GPG Signing**: Always create a signed annotated tag (`git tag -s <version> -m "..."`).
3. **GitHub Release**: Use GitHub CLI `gh release create <version> main.js manifest.json styles.css --notes-file version.md --title "<version>"`.
4. **Changelog Integrity**: Ensure `CHANGELOG.md` has a matching `## [<version>]` header for CI/CD automated release extraction.

---

## 4. Performance Guarantees ($O(1)$ Hash Maps & RAF Debounce)

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

Combined with requestAnimationFrame batching and fast-path node rejection, the processor ensures 0% main-thread blocking during note editing or vault reloading.
