# DOM Styling Compliance & CSS Architecture

## 1. The Strict Obsidian Styling Contract

Obsidian plugins must follow strict guidelines regarding DOM manipulation and CSS application:

> [!CAUTION]
> **Prohibited:** Writing inline static layout styles (e.g. `el.style.margin = '0px'`, `el.style.setProperty('padding', '10px')`, or mutating `el.style.cssText`).
> Direct inline static style assignments will fail Obsidian community linter rules (`obsidianmd/no-static-styles-assignment`) and cause severe layout breakage across themes.

### The Special Callouts Architecture
1. **Dynamic Values (Custom Colors, Widths, Grids)**:
   - Written exclusively as CSS custom properties using Obsidian's native helper `el.setCssProps({ '--sc-property': value })`.
   - Accompanied by minimal boolean hook attributes (e.g. `data-sc-border`, `data-sc-bg`, `data-sc-neon`).
2. **Static Layout & Appearance**:
   - Written exclusively in [styles.css](file:///r:/Obsidian/Testsub1/.obsidian/plugins/special-callouts/styles.css) using high-specificity selectors that consume the dynamic CSS variables.

---

## 2. CSS Variable Mapping Table

| Metadata Parameter | Injected CSS Variable | Hook Attribute | CSS Rule in `styles.css` |
| :--- | :--- | :--- | :--- |
| `bg:#7c4dff` | `--sc-bg-color: #7c4dff` | `data-sc-bg` | `.callout[data-sc-bg] { background-color: var(--sc-bg-color); }` |
| `text:white` | `--sc-text-color: #ffffff` | `data-sc-text` | `.callout[data-sc-text] > .callout-content { color: var(--sc-text-color); }` |
| `titleColor:red` | `--sc-title-color: #e74c3c` | `data-sc-title-color` | `.callout[data-sc-title-color] > .callout-title { color: var(--sc-title-color); }` |
| `iconColor:cyan` | `--sc-icon-color: #00e5ff` | `data-sc-icon-color` | `.callout[data-sc-icon-color] > .callout-title .callout-icon { color: var(--sc-icon-color); }` |
| `border:#00e676` | `--sc-border: 2px solid #00e676`| `data-sc-border` | `.callout[data-sc-border] { border: var(--sc-border); }` |
| `radius:12` | `--sc-radius: 12px` | `data-sc-radius` | `.callout[data-sc-radius] { border-radius: var(--sc-radius); overflow: hidden; }` |
| `font:Cinzel` | `--sc-font-family: 'Cinzel', serif`| `data-sc-font` | `.callout[data-sc-font] { font-family: var(--sc-font-family); }` |
| `gradient:red-blue`| `--sc-gradient: linear-gradient(...)`| `data-sc-gradient`| `.callout[data-sc-gradient] { background: var(--sc-gradient); }` |
| `neon:cyan` | `--sc-neon-border`, `--sc-neon-shadow` | `data-sc-neon` | `.callout[data-sc-neon] { border: var(--sc-neon-border); box-shadow: var(--sc-neon-shadow); }` |
| `col:3` | `--sc-list-cols: 3` | `data-col="3"` | `.sc-multi-col-list { grid-template-columns: repeat(var(--sc-list-cols), 1fr); }` |

---

## 3. Theme Isolation & Icon Mask Neutralization

In Obsidian, different themes render callout icons in different ways:
- **Standard Themes**: Render an inline `<svg class="svg-icon">` element inside `.callout-icon`.
- **Mask-Based Themes & Live Preview**: Render `.callout-icon` as an empty `<div>` with `mask-image: var(--callout-icon)` and `background-color: var(--callout-color)`.

### Why Invasive Global Mask Removal Was Prohibited
Earlier builds attempted to globally set `mask: none !important; background: none !important;` on all `.callout .callout-icon` elements. This inadvertently **wiped out standard callout icons in Live Preview** because native callouts had no SVGs and relied on CSS masks.

### The Non-Destructive Design
1. **Live Preview Variable Binding**:
   - Custom icons set `cssProps['--callout-icon'] = config.icon`. Obsidian's CodeMirror 6 engine consumes this native variable directly and displays the custom icon mask cleanly.
2. **Reading View SVG Injection**:
   - `this.forceApplyIcon(iconEl, config.icon)` injects a Lucide SVG into `.callout-icon`.
3. **Targeted Modal Preview Isolation**:
   - `.sc-live-callout .callout-icon` defines flex alignment and 16px dimensions specifically for Studio dialog previews without touching native editor stylesheets.
