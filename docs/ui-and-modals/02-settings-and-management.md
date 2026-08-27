# Settings Tab & Preset Management

## 1. Tabbed Interface Architecture

In [SettingsTab.ts](file:///r:/Obsidian/Testsub1/.obsidian/plugins/special-callouts/src/settings/SettingsTab.ts), the configuration interface is organized into 5 primary panels:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [🎨 Custom Presets]  [📝 Standard Callouts]  [⌨️ Command Palette]  [📖 Guide]  [⚙️ General] │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Custom Presets**:
   - **Single Callout Presets**: Filterable search bar, live mini-card previews, duplicate, edit, instant delete, and starter preset imports.
   - **Multi-Column Layouts**: Visual layout manager with grid dimension badges, direct visual editor launcher, and deletion.
2. **Standard Callouts**: Color and icon overrides for Obsidian's canonical callout types (`note`, `abstract`, `info`, `todo`, `tip`, `success`, `question`, `warning`, `failure`, `danger`, `bug`, `example`, `quote`, `caption`).
3. **Command Palette Management**: Granular control over which custom presets and layouts register as executable commands in the Obsidian Command Palette (`Ctrl+P` / `Cmd+P`), defaulting to off (`showInCommandPalette: false`) to avoid clutter.
4. **Interactive Guide & Syntax**: In-vault cheatsheets, recipes, and documentation.
5. **General & Defaults**:
   - **Live Callout Preview**: Real-time reactive preview box showing instantaneous visual feedback of default settings.
   - **Universal Callout Defaults**: Global defaults for Border Width & Style, Corner Radius, List Columns, Compact Mode, Center Text, Center Title Only, and Hide Icon applied automatically to newly created callouts.
   - **Named Color Palette**: Add and manage vault-wide design tokens (e.g. `brand: #6366f1`).
   - **Backup & Migration**: JSON configuration export and import.

---

## 2. Universal Callout Defaults (`universalDefaults`)

Settings stored under `settings.universalDefaults`:

| Setting | Options / Values | Default | Purpose |
| :--- | :--- | :--- | :--- |
| `borderWidth` | `1px` to `8px` | `1px` | Default border thickness on new callouts |
| `borderStyle` | `solid`, `dashed`, `dotted`, `double`, `none` | `solid` | Default border line style |
| `borderRadius`| `0px` to `24px` | `8px` | Default corner curvature |
| `listColumns` | `1` to `6` | `2` | Default column count for list reflow (`col:N`) |
| `compact` | Boolean | `false` | Default compact mode |
| `center` | Boolean | `false` | Default centering for text and title |
| `titleCenter`| Boolean | `false` | Default title-only centering |
| `noIcon` | Boolean | `false` | Default icon suppression |

---

## 3. Integrated Color Palette System

The Color Palette section allows users to define named colors (`brand: #6366f1`, `accent: #ec4899`):
- Names can be used directly in markdown metadata: `> [!note] (bg:brand, text:accent)`.
- Replaces raw hex codes with consistent design tokens across entire vaults.

---

## 4. Preset Export & Import Migrations

### JSON Schema
Presets, defaults, and palettes are serialized to `data.json`:
```json
{
  "standardColors": { "red": "#e74c3c", "blue": "#3498db" },
  "customColors": [{ "name": "brand", "color": "#6366f1" }],
  "customStyles": [
    {
      "name": "glass-hero",
      "bg": "#7c4dff",
      "neon": "cyan",
      "icon": "sparkles",
      "showInCommandPalette": false
    }
  ],
  "customLayouts": [],
  "universalDefaults": {
    "borderWidth": "1px",
    "borderStyle": "solid",
    "borderRadius": "8px",
    "listColumns": 2,
    "compact": false,
    "center": false,
    "titleCenter": false,
    "noIcon": false
  }
}
```

### Import Handling
- **Merge Mode**: Adds new styles while preserving existing user modifications.
- **Overwrite Mode**: Replaces vault callout styles cleanly with the imported profile.
