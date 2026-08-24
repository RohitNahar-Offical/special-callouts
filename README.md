<p align="center">
  <a href="https://community.obsidian.md/plugins/special-callouts"><img src="https://img.shields.io/badge/Obsidian-Install-7c3aed?logo=obsidian&logoColor=white" alt="Install from Obsidian"/></a>
  <img src="https://img.shields.io/github/stars/ahseyg/special-callouts?style=flat&color=3498db" alt="Stars"/>
  <img src="https://img.shields.io/github/issues/ahseyg/special-callouts?style=flat&color=e74c3c" alt="Issues"/>
  <img src="https://img.shields.io/github/license/ahseyg/special-callouts?style=flat&color=2ecc71" alt="License"/>
  <img src="https://img.shields.io/github/v/release/ahseyg/special-callouts?style=flat&color=f39c12" alt="Version"/>
  <img src="https://img.shields.io/github/v/release/ahseyg/special-callouts?include_prereleases&label=BRAT%20beta&style=flat&color=ff69b4" alt="BRAT Beta Version"/>
  <img src="https://img.shields.io/github/downloads/ahseyg/special-callouts/total?style=flat&color=blueviolet" alt="Downloads"/>
  <a href="skills/special-callouts/"><img src="https://img.shields.io/badge/AI%20Agent%20Skill-ready-8b5cf6?style=flat" alt="AI Agent Skill"/></a>
</p>

<p align="center">
  <a href="USAGE_GUIDE.md">Usage Guide</a> · <a href="skills/special-callouts/">AI Agent Skill</a> · <a href="README_TR.md">Türkçe</a> · <a href="https://github.com/ahseyg/special-callouts/issues">Report Bug</a></p>

# Special Callouts (Enhanced Fork)

> [!NOTE]
> **Fork Information**:
> This repository is an enhanced fork of the original [ahseyg/special-callouts](https://github.com/ahseyg/special-callouts) plugin by [ahseyg](https://github.com/ahseyg).
> It extends the core plugin with an interactive visual multi-column dashboard builder, true spanned CSS grid layouts, right-click context menu integration, full border styles, and memory/performance optimizations.
> 
> If you encounter any bugs or errors related to the upstream plugin, please open an issue with the original repository owner at **[ahseyg/special-callouts Issues](https://github.com/ahseyg/special-callouts/issues)**.

Transform your Obsidian notes with premium, dynamic, and fully customizable callouts. Turn generic boxes into magazine-quality layouts, code terminals, or neon-glowing alerts. Customize everything directly from your markdown — or create reusable presets in the visual settings panel.

**Open source** · MIT License · [Upstream Repo](https://github.com/ahseyg/special-callouts)

---

## 🌟 What's New & Changed in this Fork

* 🔲 **Interactive Multi-Column Matrix Dashboard Builder**:
  * Visual 2×2 up to 6×6 matrix canvas with drag-to-merge cell spanning.
  * 1-Click preset templates (*Hero + 2 Cards*, *Workspace*, *3 Columns*, *2×2 Quad*).
  * Per-box deep customization (colors, glow, icons, fonts, border styles, list columns).
  * Two-way roundtrip editing directly from existing `> [!multi-callout]` blocks in your notes.
* 📐 **True Spanned CSS Grid Rendering**:
  * Ranged token syntax `>> [!type] (colStart-colEnd:totalCols:rowStart-rowEnd) Title` (e.g. `(1-2:3:1-1)`).
  * High-performance Obsidian CSS variable binding (`--sc-grid-col-start`, `--sc-grid-col-span`, etc.) for seamless Live Preview and Reading Mode rendering.
* 🖱️ **Right-Click Context Menu & All-in-One Inserter Modal**:
  * Right-click editor context menu item (`Insert Special Callout...`) to configure and insert callouts instantly at the cursor.
  * Tabbed customizer modal with a sticky real-time live preview.
* 🎨 **All 8 Standard CSS Border Styles**:
  * Added `solid`, `dashed`, `dotted`, `double`, `groove`, `ridge`, `inset`, `outset`, and `none`.
* ⚡ **Performance & Stability Optimizations**:
  * Proactive `MutationObserver` and timeout cleanup on element unmount to eliminate memory leaks during note switching.
  * Streamlined DOM style pipelines and hoisted selector constants.
  * Comprehensive test suite with 70 passing automated tests.

---

## Features

- **Inline customization** — background, text, border, gradient, neon, icon — directly in markdown
- **Custom style presets** — design once, reuse by name
- **Multi-column lists** — split any list into 2–4 columns
- **Visual matrix builder** — interactive dashboard designer with drag-and-merge grid spanning
- **Right-click inserter** — fast modal inserter with live real-time preview
- **Typography control** — 5 font families, 5 size scales
- **All 8 border styles** — solid, dashed, dotted, double, groove, ridge, inset, outset
- **Neon and gradient effects** — glowing borders, smooth color transitions
- **Dataview integration** — column layouts work with Dataview queries
- **Import/Export** — share styles as JSON between vaults

---

## Screenshots & Layout Capabilities

Explore the endless customization possibilities. 

### Colors, Gradients and Effects

![Colors & Backgrounds](assets/colors_backgrounds.png)
> [Learn how to create custom backgrounds and text colors in the Usage Guide](USAGE_GUIDE.md#colors--backgrounds)

![Gradients](assets/gradients.png)
> [Learn how to create gradient backgrounds in the Usage Guide](USAGE_GUIDE.md#gradient-background--gradient)

![Neon Glow Effects](assets/neon_glow_effects.png)
> [Learn how to create neon glowing effects in the Usage Guide](USAGE_GUIDE.md#visual-effects)

### Visual Layout Builder

Design complex dashboard grids by dragging and merging cells — no code required. Access from **Settings → Special Callouts → Visual Layout Builder**.

![Visual Builder Settings](assets/visual_builder_settings.png)
> [Learn how to use the Visual Layout Builder in the Usage Guide](USAGE_GUIDE.md#1-visual-layout-builder)

### Dashboard Grids

Use the visual builder or inline grid syntax to create multi-panel layouts. Callouts are automatically placed into the merged areas you designed.

![Ultimate Dashboard Grid](assets/ultimate_dashboard.png)
> [Learn how to create Multi-Callout Dashboard Grids in the Usage Guide](USAGE_GUIDE.md#grid-layout-multi-callout)

### Typography and Borders

![Typography & Fonts](assets/typography_fonts.png)
> [Learn how to change fonts and sizes in the Usage Guide](USAGE_GUIDE.md#typography)

![Border Styles](assets/border_styles.png)
> [Learn how to customize borders and radius in the Usage Guide](USAGE_GUIDE.md#borders--shapes)

### Multi-Column Lists

![Standard Columns](assets/standard_columns.png)
> [Learn how to split lists into multiple columns in the Usage Guide](USAGE_GUIDE.md#multi-column-lists)

---

## Metadata Reference

`> [!type] (param:value, param2:value2) Title`

### Colors
| Parameter | Example | Description |
| :--- | :--- | :--- |
| `bg` | `bg:#ff0000` | Background color |
| `text` | `text:white` | Content text color |
| `title` | `title:cyan` | Title and icon color |
| `link` | `link:orange` | Link color |
| `gradient` | `gradient:blue-purple` | Two-color gradient |
| `neon` | `neon:#00f2ff` | Neon border + glow |
| `icon` | `icon:sun` | Lucide icon name |
| `icon-color` | `icon-color:cyan` | Icon color (defaults to the title color) |
| `no-icon` | `(no-icon)` | Hide icon |

### Borders
| Parameter | Example | Description |
| :--- | :--- | :--- |
| `border` | `border:red` | Border color |
| `border-width` | `border-width:4` | Thickness (px) |
| `border-style` | `border-style:dashed` | `solid`, `dashed`, `dotted`, `double`, `groove`, `ridge`, `inset`, `outset` |
| `radius` | `radius:20` | Corner roundness (px) |

### Typography
| Parameter | Example | Description |
| :--- | :--- | :--- |
| `font` | `font:mono` | `mono`, `serif`, `sans`, `hand`, `marker` |
| `font-size` | `font-size:4` | `1` (tiny) → `5` (huge) |

### Layout
| Parameter | Example | Description |
| :--- | :--- | :--- |
| `col` | `(col:3)` | Multi-column lists |
| `center` | `(center)` | Center content |
| `compact` | `(compact)` | Reduce padding |
| `dense` | `(dense)` | Compact plus tighter line-height |
| Grid | `(1:2)` | Position in grid |

Full reference in the [Usage Guide](USAGE_GUIDE.md).

---

## AI Agent Skill

Let Claude write these callouts for you. **[skills/special-callouts/](skills/special-callouts/)** is an
[Agent Skill](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview) covering the
plugin's complete syntax and real rendering behaviour — derived from the v1.0.8 source rather than
from the docs.

Install it by copying the folder into your skills directory:

```bash
cp -r skills/special-callouts ~/.claude/skills/
```

Then just describe what you want — "build a dashboard at the top of my daily note with my open
tasks", "split this list into three columns", "why is my callout background so faint?" — and it
produces correct markdown instead of plausible-looking guesses.

| File | Contents |
| :--- | :--- |
| [`SKILL.md`](skills/special-callouts/SKILL.md) | Syntax rules, the traps that make valid syntax look broken, debugging checklist |
| [`references/parameters.md`](skills/special-callouts/references/parameters.md) | Every parameter: accepted values, aliases, colour resolution, edge cases |
| [`references/layouts.md`](skills/special-callouts/references/layouts.md) | Multi-column lists, grids, custom visual layouts, Dataview |
| [`references/recipes.md`](skills/special-callouts/references/recipes.md) | Ready-made patterns and tested colour pairs |
| [`references/internals.md`](skills/special-callouts/references/internals.md) | Render pipeline, DOM/CSS contract, settings schema, known bugs |

Works with Claude Code, Claude Desktop and Claude.ai. `SKILL.md` is plain markdown, so any agent
framework that accepts a system prompt can use it too.

---

## Installation

### Community Plugins (Recommended)

1. **Settings → Community Plugins**
2. Turn off Restricted Mode
3. Browse → search **Special Callouts**
4. Install → Enable

Or open directly: [community.obsidian.md/plugins/special-callouts](https://community.obsidian.md/plugins/special-callouts)

### Manual

1. Download `main.js`, `styles.css`, `manifest.json` from the [latest release](https://github.com/ahseyg/special-callouts/releases)
2. Create `VaultFolder/.obsidian/plugins/special-callouts/`
3. Copy the files into the folder
4. Enable in Settings → Community Plugins

---

## Contributing & Issues
 
 - **Bug reports & Errors:** Please report errors and issues directly to the original owner at [ahseyg/special-callouts Issues](https://github.com/ahseyg/special-callouts/issues) — include Obsidian version, callout markdown, and a screenshot.
 - **Feature requests:** [Open an upstream issue](https://github.com/ahseyg/special-callouts/issues)
 - **Pull requests:** Fork → Branch → Code → PR

If you find this plugin useful, consider giving it a [star](https://github.com/ahseyg/special-callouts).

---

## License

MIT — See [LICENSE](LICENSE) for details.

---
<p align="center">
  Developed by <a href="https://github.com/ahseyg">ahseyg</a>
</p>
