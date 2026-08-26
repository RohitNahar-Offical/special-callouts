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

## 2. Gradients (`gradient:`)

Special Callouts supports two gradient modes:

1. **Inline 2-Stop Shorthand**:
   - Format: `gradient:color1-color2` (e.g. `gradient:purple-blue`, `gradient:#ff007f-#7928ca`).
   - Parsed into: `linear-gradient(135deg, color1 0%, color2 100%)`.
2. **Full CSS Linear Gradients**:
   - Format: `gradient:linear-gradient(90deg, #f12711, #f5af19)`.
   - Passed directly into `--sc-gradient`.

---

## 3. Background Tints vs Solid Fills (`bg:`)

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

## 4. Typography & Fonts (`font:` & `fontSize:`)

### Font Families
The `font:` parameter maps friendly names to system/web font stacks:

| Name | Resolved Font Stack |
| :--- | :--- |
| `cinzel` | `'Cinzel', serif` |
| `fira` / `firacode` | `'Fira Code', monospace` |
| `playfair` | `'Playfair Display', serif` |
| `outfit` | `'Outfit', sans-serif` |
| `inter` | `'Inter', sans-serif` |
| `jet` / `jetbrains` | `'JetBrains Mono', monospace` |

### Font Sizes (`fontSize:1` to `5`)
- `fontSize:1`: `0.85em` (Compact notes)
- `fontSize:2`: `0.92em`
- `fontSize:3`: `1em` (Default)
- `fontSize:4`: `1.15em`
- `fontSize:5`: `1.3em` (Hero headers)
