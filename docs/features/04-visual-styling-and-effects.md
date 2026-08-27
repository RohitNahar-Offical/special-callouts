# Visual Styling, Neon Glow & Color Science

## 1. The Neon Glow Effect (`neon:color`)

The `neon:` effect wraps the callout with a glowing ambient border and shadow.

### CSS `color-mix` Algorithm
Earlier versions concatenated hex strings (e.g. `hex + '40'`), which failed on CSS color keywords (`cyan`, `lime`) or short hexes (`#f00`).

In [src/utils.ts](file:///r:/Obsidian/Testsub1/.obsidian/plugins/special-callouts/src/utils.ts) (`neonStyles`), glows are composed using modern CSS `color-mix`:

```ts
export function neonStyles(color: string): { border: string; shadow: string } {
    return {
        border: `1px solid color-mix(in srgb, ${color} 80%, transparent)`,
        shadow: `0 0 10px color-mix(in srgb, ${color} 25%, transparent), 0 0 20px color-mix(in srgb, ${color} 10%, transparent)`
    };
}
```

This guarantees 100% compatibility across standard color keywords, HSL, RGB, and 3/6-digit hex values.

---

## 2. Gradients & Gradient Borders (`gradient:`)

Special Callouts supports full linear gradients and multi-color blends:

1. **Inline 2-Stop Shorthand**:
   - Format: `gradient:color1-color2` (e.g. `gradient:purple-blue`, `gradient:#ff007f-#7928ca`).
   - Parsed into: `linear-gradient(135deg, color1 0%, color2 100%)`.
2. **Full CSS Linear Gradients**:
   - Format: `gradient:linear-gradient(90deg, #f12711, #f5af19)`.
   - Passed directly into `--sc-gradient`.
3. **Gradient + Custom Border Support**:
   - Callouts with gradients can simultaneously declare custom borders, glows, and corner radii via `--sc-border`, `--sc-radius`, and `--sc-neon-border`.

---

## 3. Center Alignment Grouping & Fold Arrow Anchoring

When `title:center` or `center` is active:
- **Unified Center Unit**: The header icon and title text center together as an atomic group (`[ Icon  Title ]`) in both Reading View and Live Preview.
- **Right-Anchored Collapse Toggle**: The fold arrow is anchored to the right edge (`order: 100; margin-left: auto;`) so fold state toggles remain easily reachable without shifting the centered title block.

---

## 4. Background Tints vs Solid Fills (`bg:`)

In Obsidian callouts, background colors are traditionally rendered as **15% transparent tints** over the note background so dark/light theme contrast is preserved:

```ts
export function createTransparentBg(hex: string): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${BG_TINT_OPACITY / 100})`;
}
```

If a user desires a solid, fully opaque background, `gradient:color-color` can be used instead.

---

## 5. Typography & Fonts (`font:` & `fontSize:`)

### Font Families
The `font:` parameter maps friendly names to Obsidian's theme-aware CSS font variables and web stacks:

| Name | Resolved Font Family |
| :--- | :--- |
| `mono` | `var(--font-monospace)` |
| `serif` | `var(--font-interface-theme), ui-serif, serif` |
| `sans` | `var(--font-interface), ui-sans-serif, sans-serif` |
| `hand` | `"Comic Sans MS", "Chalkboard SE", "Comic Neue", cursive` |
| `marker` | `"Permanent Marker", "Segoe Print", "Chalkboard", cursive` |

### Font Sizes (`fontSize:1` to `5`)
- `fontSize:1`: `0.85em` (Compact notes)
- `fontSize:2`: `0.92em`
- `fontSize:3`: `1em` (Default)
- `fontSize:4`: `1.2em`
- `fontSize:5`: `1.5em` (Hero banners)
