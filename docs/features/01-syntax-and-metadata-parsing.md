# Syntax, Grammar & Metadata Parsing

## 1. Metadata Grammar & Lexical Specification

Special Callouts parses inline metadata enclosed in parentheses following the callout type identifier:

```markdown
> [!type] (param1:val, param2:val, flag1, ...) Title
```

### Supported Parameters & Shorthands

| Canonical Key | Shorthands / Aliases | Accepted Values | Example |
| :--- | :--- | :--- | :--- |
| `bg:` | — | Hex (`#ff0000`), Palette name (`red`, `purple`) | `bg:#7c4dff` |
| `text:` | — | Hex, Palette name, Stroke shorthand | `text:white`, `text:(white, dark-border)` |
| `titleColor:` | `title-color:` | Hex, Palette name, Stroke shorthand | `titleColor:cyan` |
| `iconColor:` | `icon-color:`, `iconcolor:` | Hex, Palette name | `iconColor:#00e5ff` |
| `icon:` | — | Lucide icon name | `icon:sparkles`, `icon:flame` |
| `border:` | — | `none`, Hex, Palette name | `border:none`, `border:#00e676` |
| `borderWidth:` | `border-width:`, `bw:` | Number or Px | `bw:2`, `borderWidth:3px` |
| `borderStyle:` | `border-style:`, `bs:` | `solid`, `dashed`, `dotted`, `double` | `bs:dashed` |
| `radius:` | — | Number or Px | `radius:12` |
| `gradient:` | — | 2-stop shorthand (`c1-c2`), Full CSS gradient | `gradient:red-blue` |
| `neon:` | — | Palette name or Hex | `neon:cyan` |
| `font:` | — | Font name (`Cinzel`, `Fira Code`, `Playfair`) | `font:Cinzel` |
| `fontSize:` | `font-size:` | `1` to `5` | `fontSize:3` |
| `col:` | `cols:`, `columns:` | Integer $\ge 1$ | `col:3` |
| `style:` | — | Custom Style Name | `style:MyCustomStyle` |
| `grid:` | Bare token `N:M` or `N:M:R` | Grid configuration | `1:2`, `1-2:3:1` |

### Standalone Flags
- `compact` (or `padding:0`): Minimizes inner padding.
- `dense`: Compact padding plus tighter line-height (`1.3`).
- `center`: Centers title and body text.
- `title:center`: Centers only the title line.
- `no-icon` (or `noicon`): Hides the callout header icon.

---

## 2. Grouped Values Syntax

Parentheses inside metadata values allow grouping properties together:
```markdown
> [!note] (text:(white, dark-border), titleColor:(cyan, light-border)) Styled Box
```
The lexical scanner tracks nesting depth and ensures commas inside nested parentheses do not split top-level parameters.

---

## 3. High-Performance Lexical Scanner & LRU Cache

In [src/parser.ts](file:///r:/Obsidian/Testsub1/.obsidian/plugins/special-callouts/src/parser.ts):

1. **Pre-flight Fast Paths**:
   - `if (!title.includes('(')) return null;`
   - Unadorned standard callout titles return in 0.001ms without allocating regexes or strings.
2. **LRU Bounded Cache (`extractCache`)**:
   - Maintains a bounded 256-entry LRU cache mapping raw title strings to parsed `{ title, content }` objects.
   - Eliminates redundant parsing across re-render passes.
3. **Lossless Roundtrip Guarantee**:
   - `serializeMetadata()` guarantees algebraic idempotency:
     $$\text{parse}(\text{serialize}(\text{parse}(x))) \equiv \text{parse}(x)$$
