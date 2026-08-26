# Settings Tab & Preset Management

## 1. Consolidated 6-Tab Interface

In [SettingsTab.ts](file:///r:/Obsidian/Testsub1/.obsidian/plugins/special-callouts/src/settings/SettingsTab.ts), the configuration interface is organized into 6 focused panels:

```
┌────────────────────────────────────────────────────────────────────────┐
│  [⚙️ General]  [🎨 Custom Styles]  [📐 Standard]  [📋 Layouts]  [📚 Guide]  [🔄 Data] │
└────────────────────────────────────────────────────────────────────────┘
```

1. **General & Defaults**: Global default metadata, UI flags, and integrated color palette settings.
2. **Custom Styles**: Creation, live preview, and palette integration for reusable style presets.
3. **Standard Styles**: Customization of Obsidian's 14 core callout types (`note`, `abstract`, `info`, `todo`, `tip`, `success`, `question`, `warning`, `failure`, `danger`, `bug`, `example`, `quote`, `caption`).
4. **Saved Layouts**: User-defined grid matrix presets for multi-callout dashboards.
5. **Syntax Guide**: Interactive documentation, recipes, and cheat sheets inside Obsidian.
6. **Data & Backup**: Single-click JSON backup export, import with merge/overwrite options, and reset defaults.

---

## 2. Integrated Color Palette System

The Color Palette section allows users to define named colors (`brand: #6366f1`, `accent: #ec4899`):
- Names can be used directly in markdown metadata: `> [!note] (bg:brand, text:accent)`.
- Replaces raw hex codes with consistent design tokens across entire vaults.

---

## 3. Style Export & Import Migrations

### JSON Schema
Presets and palettes are serialized to `data.json`:
```json
{
  "standardColors": { "red": "#e74c3c", "blue": "#3498db" },
  "customColors": { "brand": "#6366f1" },
  "customStyles": [
    {
      "name": "glass-hero",
      "bg": "#7c4dff",
      "neon": "cyan",
      "icon": "sparkles"
    }
  ],
  "customLayouts": []
}
```

### Import Handling
- **Merge Mode**: Adds new styles while preserving existing user modifications.
- **Overwrite Mode**: Replaces vault callout styles cleanly with the imported profile.
