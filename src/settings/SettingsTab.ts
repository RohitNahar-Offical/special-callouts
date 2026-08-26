import {
    App,
    PluginSettingTab,
    Plugin,
    Setting,
    setIcon,
    Notice,
    Modal,
    ButtonComponent,
    DropdownComponent,
    SliderComponent,
    ToggleComponent,
    TextComponent
} from 'obsidian';
import { SpecialCalloutsSettings, CalloutStyle, CustomLayout } from '../types';
import {
    DEFAULT_STANDARD_STYLES,
    DEFAULT_STANDARD_COLORS,
    FONT_FAMILIES,
    FONT_SIZES,
    QUICK_START_PRESETS
} from '../constants';
import { isValidHex, normalizeHex, toPx, neonStyles, isCssGradient } from '../utils';
import { createGradientSetting } from '../ui/UIComponents';
import { IconPickerModal } from '../modals/IconPickerModal';
import { MultiColumnBuilderModal } from '../modals/MultiColumnBuilderModal';
import { showHowToUse } from '../modals/HowToModal';
import { showMetadataReference } from '../modals/MetadataModal';

interface PluginWithSettings {
    settings: SpecialCalloutsSettings;
    saveSettings(): Promise<void>;
}

type SettingsTabId = 'styles' | 'standard' | 'layouts' | 'commands' | 'guide' | 'general';

export class SpecialCalloutsSettingTab extends PluginSettingTab {
    plugin: PluginWithSettings;
    activeTab: SettingsTabId = 'styles';

    // Search query for filtering styles
    searchQuery: string = '';

    constructor(app: App, plugin: PluginWithSettings) {
        super(app, plugin as unknown as Plugin);
        this.plugin = plugin;
    }

    display(): void {
        this.renderSettings();
    }

    renderSettings(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass('special-callouts-ui');

        this.renderHeader(containerEl);
        this.renderNavTabs(containerEl);

        const tabContentContainer = containerEl.createDiv({ cls: 'sc-tab-content' });

        switch (this.activeTab) {
            case 'styles':
                this.renderCustomStylesTab(tabContentContainer);
                break;
            case 'standard':
                this.renderStandardStylesTab(tabContentContainer);
                break;
            case 'layouts':
                this.renderLayoutPresetsTab(tabContentContainer);
                break;
            case 'commands':
                this.renderCommandPaletteTab(tabContentContainer);
                break;
            case 'guide':
                this.renderGuideTab(tabContentContainer);
                break;
            case 'general':
                this.renderGeneralTab(tabContentContainer);
                break;
        }
    }

    private renderHeader(container: HTMLElement): void {
        const banner = container.createDiv({ cls: 'sc-header-banner' });
        const left = banner.createDiv();
        left.createEl('h2', { text: 'Special Callouts', cls: 'sc-header-title' });
        left.createEl('p', {
            text: 'Visual styling, multi-column dashboards, and custom callout presets for Obsidian',
            cls: 'sc-header-subtitle'
        });

        const right = banner.createDiv();
        right.style.display = 'flex';
        right.style.gap = '8px';

        new ButtonComponent(right)
            .setButtonText('📖 Cheat Sheet')
            .onClick(() => showMetadataReference(this.app));

        const newBtn = new ButtonComponent(right)
            .setButtonText('+ New Style')
            .setCta()
            .onClick(() => this.openStyleEditorModal());
        newBtn.buttonEl.style.fontWeight = '600';
    }

    private renderNavTabs(container: HTMLElement): void {
        const nav = container.createDiv({ cls: 'sc-nav-tabs' });

        const tabs: { id: SettingsTabId; label: string; icon: string }[] = [
            { id: 'styles', label: 'Custom Styles', icon: 'palette' },
            { id: 'standard', label: 'Standard Callouts', icon: 'bookmark' },
            { id: 'layouts', label: 'Layout Presets', icon: 'layout-grid' },
            { id: 'commands', label: 'Command Palette', icon: 'terminal' },
            { id: 'guide', label: 'Guide & Syntax', icon: 'book-open' },
            { id: 'general', label: 'General & Defaults', icon: 'settings' }
        ];

        tabs.forEach(tab => {
            const btn = nav.createEl('button', {
                cls: `sc-nav-tab ${this.activeTab === tab.id ? 'is-active' : ''}`
            });
            const iconSpan = btn.createSpan();
            setIcon(iconSpan, tab.icon);
            btn.createSpan({ text: tab.label });

            btn.onclick = () => {
                this.activeTab = tab.id;
                this.renderSettings();
            };
        });
    }

    // =========================================================================
    // TAB 1: CUSTOM STYLES
    // =========================================================================
    private renderCustomStylesTab(container: HTMLElement): void {
        const topBar = container.createDiv({ cls: 'sc-tab-top-bar' });
        topBar.style.display = 'flex';
        topBar.style.justifyContent = 'space-between';
        topBar.style.alignItems = 'center';
        topBar.style.marginBottom = '1.25rem';
        topBar.style.gap = '12px';
        topBar.style.flexWrap = 'wrap';

        // Search box
        const searchInput = topBar.createEl('input', {
            type: 'search',
            placeholder: 'Search custom styles...',
            value: this.searchQuery
        });
        searchInput.style.flex = '1';
        searchInput.style.maxWidth = '300px';
        searchInput.style.padding = '6px 12px';
        searchInput.style.borderRadius = '6px';
        searchInput.style.border = '1px solid var(--background-modifier-border)';
        searchInput.style.background = 'var(--background-primary)';
        searchInput.oninput = (e) => {
            this.searchQuery = (e.target as HTMLInputElement).value.toLowerCase();
            this.renderCustomStylesCards(cardsGrid);
        };

        const rightBtns = topBar.createDiv();
        rightBtns.style.display = 'flex';
        rightBtns.style.gap = '8px';

        new ButtonComponent(rightBtns)
            .setButtonText('How to Use')
            .onClick(() => showHowToUse(this.app));

        new ButtonComponent(rightBtns)
            .setButtonText('Add Starter Presets')
            .onClick(async () => {
                let addedCount = 0;
                QUICK_START_PRESETS.forEach(preset => {
                    if (!this.plugin.settings.customStyles.some(s => s.name.toLowerCase() === preset.name.toLowerCase())) {
                        this.plugin.settings.customStyles.push({
                            name: preset.name.toLowerCase().replace(/\s+/g, '-'),
                            bg: preset.bg,
                            border: preset.border,
                            text: preset.text,
                            link: '',
                            icon: preset.icon,
                            titleColor: preset.title,
                            showInCommandPalette: true
                        });
                        addedCount++;
                    }
                });
                if (addedCount > 0) {
                    await this.plugin.saveSettings();
                    new Notice(`Added ${addedCount} starter preset(s)!`);
                    this.renderCustomStylesCards(cardsGrid);
                } else {
                    new Notice('All starter presets already exist.');
                }
            });

        const cardsGrid = container.createDiv({ cls: 'sc-cards-grid' });
        this.renderCustomStylesCards(cardsGrid);

        // Expandable Palette & Custom Colors Manager
        const colorsDetails = container.createEl('details', { cls: 'sc-colors-details' });
        colorsDetails.style.marginTop = '2rem';
        colorsDetails.style.background = 'var(--background-secondary)';
        colorsDetails.style.border = '1px solid var(--background-modifier-border)';
        colorsDetails.style.borderRadius = '8px';
        colorsDetails.style.padding = '12px 16px';

        const summary = colorsDetails.createEl('summary');
        summary.style.fontWeight = '600';
        summary.style.fontSize = '0.95rem';
        summary.style.cursor = 'pointer';
        summary.style.userSelect = 'none';
        summary.style.color = 'var(--text-normal)';
        summary.innerText = '🌈 Named Color Palette & Keyword Overrides (Optional)';

        const colorsContent = colorsDetails.createDiv();
        colorsContent.style.marginTop = '1rem';
        this.renderColorsSection(colorsContent);
    }

    private renderCustomStylesCards(container: HTMLElement): void {
        container.empty();

        const filtered = this.plugin.settings.customStyles.filter(s =>
            s.name.toLowerCase().includes(this.searchQuery)
        );

        if (filtered.length === 0) {
            const emptyEl = container.createDiv({ cls: 'sc-empty-state' });
            emptyEl.style.gridColumn = '1 / -1';
            emptyEl.style.padding = '2.5rem 1rem';
            emptyEl.style.textAlign = 'center';
            emptyEl.style.color = 'var(--text-muted)';
            emptyEl.createEl('p', { text: this.searchQuery ? 'No matching custom styles found.' : 'No custom styles created yet.' });
            new ButtonComponent(emptyEl)
                .setButtonText('+ Create First Style')
                .setCta()
                .onClick(() => this.openStyleEditorModal());
            return;
        }

        filtered.forEach((style, index) => {
            const actualIndex = this.plugin.settings.customStyles.findIndex(s => s.name === style.name);
            const card = container.createDiv({ cls: 'sc-card-item' });

            const top = card.createDiv({ cls: 'sc-card-top' });
            const titleEl = top.createDiv({ cls: 'sc-card-title' });

            if (style.icon) {
                const iconSpan = titleEl.createSpan({ cls: 'sc-card-icon' });
                setIcon(iconSpan, style.icon);
                if (style.iconColor) iconSpan.style.color = style.iconColor;
            }
            titleEl.createSpan({ text: style.name });

            // Render live mini-preview
            const preview = card.createDiv({ cls: 'callout sc-card-preview' });
            preview.setAttribute('data-callout', style.name);
            preview.style.margin = '8px 0';
            preview.style.padding = style.compact ? '6px 10px' : '10px 14px';
            preview.style.borderRadius = style.borderRadius || '8px';
            preview.style.borderWidth = style.borderWidth || '1px';
            preview.style.borderStyle = style.borderStyle || 'solid';
            if (style.gradient) {
                let grad = style.gradient.trim();
                if (!isCssGradient(grad)) {
                    const parts = grad.split('-');
                    if (parts.length >= 2) {
                        grad = `linear-gradient(90deg, ${parts[0]}, ${parts.slice(1).join('-')})`;
                    }
                }
                preview.style.background = grad;
                preview.style.borderColor = style.border || 'transparent';
            } else {
                preview.style.borderColor = style.border || 'var(--text-accent)';
                preview.style.backgroundColor = style.bg ? `color-mix(in srgb, ${style.bg} 15%, transparent)` : 'var(--background-secondary)';
            }

            const previewTitle = preview.createDiv({ cls: 'callout-title' });
            if (!style.noIcon && style.icon) {
                const pIcon = previewTitle.createDiv({ cls: 'callout-icon' });
                setIcon(pIcon, style.icon);
                if (style.iconColor) pIcon.style.color = style.iconColor;
            }
            const pText = previewTitle.createDiv({ cls: 'callout-title-inner', text: style.name });
            if (style.titleColor) pText.style.color = style.titleColor;

            const actions = card.createDiv({ cls: 'sc-card-actions' });

            const editBtn = actions.createEl('button', { cls: 'sc-action-btn', title: 'Edit Style' });
            setIcon(editBtn, 'pencil');
            editBtn.onclick = () => this.openStyleEditorModal(style, actualIndex);

            const cloneBtn = actions.createEl('button', { cls: 'sc-action-btn', title: 'Clone Style' });
            setIcon(cloneBtn, 'copy');
            cloneBtn.onclick = async () => {
                const cloned: CalloutStyle = { ...style, name: `${style.name}-copy` };
                this.plugin.settings.customStyles.push(cloned);
                await this.plugin.saveSettings();
                new Notice(`Cloned "${style.name}" as "${cloned.name}"`);
                this.renderCustomStylesCards(container);
            };

            const delBtn = actions.createEl('button', { cls: 'sc-action-btn is-danger', title: 'Delete Style' });
            setIcon(delBtn, 'trash');
            delBtn.onclick = async () => {
                if (confirm(`Delete custom style "${style.name}"?`)) {
                    this.plugin.settings.customStyles.splice(actualIndex, 1);
                    await this.plugin.saveSettings();
                    new Notice(`Deleted style "${style.name}"`);
                    this.renderCustomStylesCards(container);
                }
            };
        });
    }

    // =========================================================================
    // TAB 2: STANDARD CALLOUTS
    // =========================================================================
    private renderStandardStylesTab(container: HTMLElement): void {
        const topHeader = container.createDiv({ cls: 'sc-section-header' });
        topHeader.createEl('h3', { text: '📝 Standard Obsidian Callouts' });
        topHeader.createEl('p', {
            text: 'Override default colors and styling for Obsidian built-in callouts.',
            cls: 'sc-section-desc'
        });

        const listContainer = container.createDiv({ cls: 'sc-standard-list' });

        const standardTypes = [
            'note', 'tip', 'info', 'warning', 'danger',
            'success', 'question', 'quote', 'bug', 'example',
            'todo', 'abstract', 'failure'
        ];

        standardTypes.forEach(typeName => {
            const currentStyle = this.plugin.settings.standardStyles[typeName] || DEFAULT_STANDARD_STYLES[typeName];
            const row = listContainer.createDiv({ cls: 'sc-standard-row' });
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.padding = '10px 14px';
            row.style.marginBottom = '8px';
            row.style.background = 'var(--background-secondary)';
            row.style.border = '1px solid var(--background-modifier-border)';
            row.style.borderRadius = '8px';

            const left = row.createDiv();
            left.style.display = 'flex';
            left.style.alignItems = 'center';
            left.style.gap = '10px';

            const badge = left.createSpan({ cls: 'sc-studio-badge', text: typeName.toUpperCase() });
            badge.style.minWidth = '80px';
            badge.style.textAlign = 'center';

            const iconSpan = left.createSpan();
            setIcon(iconSpan, currentStyle?.icon || 'pencil');
            iconSpan.style.color = currentStyle?.border || 'var(--text-accent)';

            const labelSpan = left.createSpan({ text: typeName.charAt(0).toUpperCase() + typeName.slice(1) });
            labelSpan.style.fontWeight = '600';

            const right = row.createDiv();
            right.style.display = 'flex';
            right.style.alignItems = 'center';
            right.style.gap = '8px';

            new ButtonComponent(right)
                .setButtonText('Customize')
                .onClick(() => this.openStandardStyleEditorModal(typeName));

            new ButtonComponent(right)
                .setButtonText('Reset')
                .onClick(async () => {
                    const defaultDef = DEFAULT_STANDARD_STYLES[typeName];
                    if (defaultDef) {
                        this.plugin.settings.standardStyles[typeName] = { ...defaultDef };
                        await this.plugin.saveSettings();
                        new Notice(`Reset "${typeName}" to defaults.`);
                        this.renderSettings();
                    }
                });
        });
    }

    // =========================================================================
    // COLOR PALETTES & NAMED COLORS (EMBEDDED IN CUSTOM STYLES)
    // =========================================================================
    private renderColorsSection(container: HTMLElement): void {
        const topHeader = container.createDiv({ cls: 'sc-section-header' });
        topHeader.createEl('h3', { text: '🌈 Color Palettes & Named Colors' });
        topHeader.createEl('p', {
            text: 'Customize the standard color palette and register custom named colors for markdown use (e.g. "bg:brand").',
            cls: 'sc-section-desc'
        });

        // 1. Standard Color Palette
        new Setting(container)
            .setName('Standard Palette Colors')
            .setDesc('Default hex values for built-in color names (red, blue, green, purple, etc.)')
            .setHeading();

        const stdGrid = container.createDiv();
        stdGrid.style.display = 'grid';
        stdGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
        stdGrid.style.gap = '10px';
        stdGrid.style.marginBottom = '1.5rem';

        const standardColors = this.plugin.settings.standardColors || DEFAULT_STANDARD_COLORS;
        Object.entries(standardColors).forEach(([name, hex]) => {
            const item = stdGrid.createDiv();
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.justifyContent = 'space-between';
            item.style.padding = '8px 12px';
            item.style.background = 'var(--background-secondary)';
            item.style.border = '1px solid var(--background-modifier-border)';
            item.style.borderRadius = '6px';

            const nameEl = item.createDiv({ text: name });
            nameEl.style.fontWeight = '500';

            const right = item.createDiv();
            right.style.display = 'flex';
            right.style.alignItems = 'center';
            right.style.gap = '6px';

            const colorInput = right.createEl('input', { type: 'color', value: normalizeHex(hex) });
            colorInput.style.cursor = 'pointer';
            colorInput.style.border = 'none';
            colorInput.style.background = 'transparent';
            colorInput.onchange = async (e) => {
                const val = (e.target as HTMLInputElement).value;
                this.plugin.settings.standardColors[name] = val;
                await this.plugin.saveSettings();
                new Notice(`Updated palette color "${name}"`);
            };
        });

        // 2. Custom Named Colors
        new Setting(container)
            .setName('Custom Named Colors')
            .setDesc('Add your own reusable color keywords (e.g. brand: #6366f1)')
            .setHeading();

        const addRow = container.createDiv();
        addRow.style.display = 'flex';
        addRow.style.gap = '8px';
        addRow.style.marginBottom = '1rem';

        const newNameInput = addRow.createEl('input', { type: 'text', placeholder: 'Color Name (e.g. brand)' });
        newNameInput.style.flex = '1';
        newNameInput.style.padding = '6px 10px';
        newNameInput.style.borderRadius = '6px';
        newNameInput.style.border = '1px solid var(--background-modifier-border)';

        const newHexInput = addRow.createEl('input', { type: 'text', placeholder: '#6366f1' });
        newHexInput.style.flex = '1';
        newHexInput.style.padding = '6px 10px';
        newHexInput.style.borderRadius = '6px';
        newHexInput.style.border = '1px solid var(--background-modifier-border)';

        new ButtonComponent(addRow)
            .setButtonText('+ Add Color')
            .setCta()
            .onClick(async () => {
                const name = newNameInput.value.trim().toLowerCase().replace(/\s+/g, '-');
                const hex = newHexInput.value.trim();
                if (!name || !isValidHex(hex)) {
                    new Notice('Please enter a valid color name and hex code (e.g. #6366f1).');
                    return;
                }
                this.plugin.settings.customColors.push({ name, hex });
                await this.plugin.saveSettings();
                newNameInput.value = '';
                newHexInput.value = '';
                new Notice(`Added custom color "${name}"!`);
                this.renderSettings();
            });

        const customGrid = container.createDiv();
        customGrid.style.display = 'grid';
        customGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
        customGrid.style.gap = '10px';

        (this.plugin.settings.customColors || []).forEach((c, idx) => {
            const item = customGrid.createDiv();
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.justifyContent = 'space-between';
            item.style.padding = '8px 12px';
            item.style.background = 'var(--background-secondary)';
            item.style.border = '1px solid var(--background-modifier-border)';
            item.style.borderRadius = '6px';

            const left = item.createDiv();
            left.style.display = 'flex';
            left.style.alignItems = 'center';
            left.style.gap = '8px';

            const dot = left.createSpan();
            dot.style.width = '14px';
            dot.style.height = '14px';
            dot.style.borderRadius = '50%';
            dot.style.background = c.hex;
            dot.style.border = '1px solid var(--background-modifier-border)';

            left.createSpan({ text: c.name, attr: { style: 'font-weight: 500;' } });

            const delBtn = item.createEl('button', { cls: 'sc-action-btn is-danger', title: 'Delete' });
            setIcon(delBtn, 'trash');
            delBtn.onclick = async () => {
                this.plugin.settings.customColors.splice(idx, 1);
                await this.plugin.saveSettings();
                new Notice(`Deleted color "${c.name}"`);
                this.renderSettings();
            };
        });
    }

    // =========================================================================
    // TAB 3: LAYOUT PRESETS
    // =========================================================================
    private renderLayoutPresetsTab(container: HTMLElement): void {
        const topHeader = container.createDiv({ cls: 'sc-section-header' });
        topHeader.createEl('h3', { text: '📐 Layout Presets' });
        topHeader.createEl('p', {
            text: 'Create and manage reusable multi-column dashboard layout presets with live preview and interactive drag-and-merge matrix controls.',
            cls: 'sc-section-desc'
        });

        // Top Action Toolbar
        const actionRow = container.createDiv({ cls: 'sc-action-row' });
        actionRow.style.display = 'flex';
        actionRow.style.justifyContent = 'space-between';
        actionRow.style.alignItems = 'center';
        actionRow.style.marginBottom = '1.25rem';

        const addBtn = actionRow.createEl('button', {
            cls: 'mod-cta',
            text: '+ New Layout Preset'
        });
        addBtn.onclick = () => {
            new MultiColumnBuilderModal(this.app, this.plugin.settings, null, {
                isPresetMode: true,
                plugin: this.plugin,
                onSavePreset: async () => {
                    await this.plugin.saveSettings();
                    this.renderSettings();
                }
            }).open();
        };

        const customLayouts = this.plugin.settings.customLayouts || [];

        if (customLayouts.length === 0) {
            const emptyCard = container.createDiv({ cls: 'sc-card-item' });
            emptyCard.style.padding = '2.5rem 1.5rem';
            emptyCard.style.textAlign = 'center';
            emptyCard.style.background = 'var(--background-secondary)';
            emptyCard.style.border = '1px dashed var(--background-modifier-border)';
            emptyCard.style.borderRadius = '8px';

            const emptyIcon = emptyCard.createDiv();
            emptyIcon.style.margin = '0 auto 12px auto';
            emptyIcon.style.opacity = '0.6';
            setIcon(emptyIcon, 'layout-grid');

            emptyCard.createEl('h4', { text: 'No Custom Layout Presets Saved' });
            emptyCard.createEl('p', {
                text: 'Click "+ New Layout Preset" above to visually design a dashboard matrix with live preview!',
                cls: 'sc-section-desc'
            });

            const createFirstBtn = emptyCard.createEl('button', {
                cls: 'mod-cta',
                text: '📐 Design Your First Layout Preset'
            });
            createFirstBtn.style.marginTop = '12px';
            createFirstBtn.onclick = () => {
                new MultiColumnBuilderModal(this.app, this.plugin.settings, null, {
                    isPresetMode: true,
                    plugin: this.plugin,
                    onSavePreset: async () => {
                        await this.plugin.saveSettings();
                        this.renderSettings();
                    }
                }).open();
            };
            return;
        }

        const savedGrid = container.createDiv({ cls: 'sc-cards-grid' });
        customLayouts.forEach((l, idx) => {
            const card = savedGrid.createDiv({ cls: 'sc-card-item' });
            const top = card.createDiv({ cls: 'sc-card-top' });
            top.createDiv({ cls: 'sc-card-title', text: `📐 ${l.name}` });

            const badge = top.createSpan({ cls: 'sc-studio-badge' });
            badge.innerText = `${l.cols}×${l.rows} Grid`;

            const codeSnippet = card.createEl('code', { text: `> [!multi-callout] (${l.name})` });
            codeSnippet.style.fontSize = '0.75rem';
            codeSnippet.style.padding = '4px 8px';
            codeSnippet.style.background = 'var(--background-primary)';
            codeSnippet.style.borderRadius = '4px';
            codeSnippet.style.margin = '8px 0';
            codeSnippet.style.display = 'block';

            const actions = card.createDiv({ cls: 'sc-card-actions' });

            const editBtn = actions.createEl('button', { cls: 'sc-action-btn', title: 'Edit Layout' });
            setIcon(editBtn, 'pencil');
            editBtn.onclick = () => {
                new MultiColumnBuilderModal(this.app, this.plugin.settings, null, {
                    isPresetMode: true,
                    layoutToEdit: l,
                    plugin: this.plugin,
                    onSavePreset: async () => {
                        await this.plugin.saveSettings();
                        this.renderSettings();
                    }
                }).open();
            };

            const delBtn = actions.createEl('button', { cls: 'sc-action-btn is-danger', title: 'Delete Layout' });
            setIcon(delBtn, 'trash');
            delBtn.onclick = async () => {
                customLayouts.splice(idx, 1);
                await this.plugin.saveSettings();
                new Notice(`Deleted layout preset "${l.name}"`);
                this.renderSettings();
            };
        });
    }

    // =========================================================================
    // TAB 5: COMMAND PALETTE MANAGEMENT
    // =========================================================================
    private renderCommandPaletteTab(container: HTMLElement): void {
        const topHeader = container.createDiv({ cls: 'sc-section-header' });
        topHeader.createEl('h3', { text: '⌨️ Command Palette Management' });
        topHeader.createEl('p', {
            text: 'Control which special callouts, dashboards, and layouts appear as executable commands in the Obsidian Command Palette (Ctrl+P / Cmd+P) and manage command defaults.',
            cls: 'sc-section-desc'
        });

        // Tip alert
        const tipAlert = container.createDiv();
        tipAlert.style.background = 'var(--background-secondary)';
        tipAlert.style.border = '1px solid var(--interactive-accent)';
        tipAlert.style.borderRadius = '8px';
        tipAlert.style.padding = '10px 14px';
        tipAlert.style.marginBottom = '1.5rem';
        tipAlert.style.display = 'flex';
        tipAlert.style.alignItems = 'center';
        tipAlert.style.gap = '10px';

        const tipIcon = tipAlert.createSpan();
        setIcon(tipIcon, 'zap');
        tipIcon.style.color = 'var(--interactive-accent)';

        const tipText = tipAlert.createDiv();
        tipText.style.fontSize = '0.85rem';
        tipText.innerHTML = '<strong>Pro-Tip:</strong> Any command enabled below can be bound to custom keyboard shortcuts under <code>Settings → Hotkeys → Special Callouts</code>.';

        // 1. Command Insertion Defaults
        new Setting(container)
            .setName('Default Callout Metadata')
            .setDesc('Metadata automatically appended when inserting callouts via command palette (e.g. "compact, col:2").')
            .addText(text => text
                .setPlaceholder('compact, col:2')
                .setValue(this.plugin.settings.defaultMetadata || '')
                .onChange(async (value) => {
                    this.plugin.settings.defaultMetadata = value;
                    await this.plugin.saveSettings();
                }));

        // 2. Core Studio & Quick Insert Commands
        new Setting(container)
            .setName('Core Plugin Commands')
            .setDesc('Standard studio and builder commands registered globally in the palette')
            .setHeading();

        const coreCommands = [
            { name: 'Special Callout Studio (Create / Edit Single & Multi)...', desc: 'Unified Studio dialog for editing or inserting single callouts and multi-column dashboards with live preview.' },
            { name: 'Insert Special Callout (Single Mode)...', desc: 'Directly opens Single Callout inserter with full color, typography, and border controls.' },
            { name: 'Insert Multi-Column Dashboard (Multi Mode)...', desc: 'Directly opens visual drag-and-drop matrix dashboard builder.' },
            { name: 'Insert Callout from Style Palette...', desc: 'Searchable quick suggester modal listing all standard and custom callout presets.' },
            { name: 'Insert Column Layout from Presets...', desc: 'Quick column suggester to divide note areas into 2-6 columns.' },
            { name: 'Change Icon of Callout at Cursor...', desc: 'Searchable Lucide icon picker that replaces the active callout icon in place.' }
        ];

        const coreTable = container.createDiv();
        coreTable.style.background = 'var(--background-secondary)';
        coreTable.style.border = '1px solid var(--background-modifier-border)';
        coreTable.style.borderRadius = '8px';
        coreTable.style.padding = '8px 12px';
        coreTable.style.marginBottom = '1.5rem';

        coreCommands.forEach((cmd, idx) => {
            const row = coreTable.createDiv();
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.padding = '8px 4px';
            if (idx < coreCommands.length - 1) row.style.borderBottom = '1px solid var(--background-modifier-border)';

            const left = row.createDiv();
            left.createDiv({ text: cmd.name, attr: { style: 'font-weight: 600; font-size: 0.88rem;' } });
            left.createDiv({ text: cmd.desc, attr: { style: 'font-size: 0.78rem; color: var(--text-muted);' } });

            const badge = row.createSpan({ cls: 'sc-studio-badge', text: 'Active' });
            badge.style.marginLeft = '12px';
        });

        // 3. Custom Styles Commands
        const customStyles = this.plugin.settings.customStyles || [];
        const customHeader = new Setting(container)
            .setName(`Custom Styles Commands (${customStyles.length} Styles)`)
            .setDesc('Toggle individual palette commands for each custom callout style')
            .setHeading();

        if (customStyles.length > 0) {
            customHeader
                .addButton(btn => btn
                    .setButtonText('Enable All')
                    .onClick(async () => {
                        customStyles.forEach(s => s.showInCommandPalette = true);
                        await this.plugin.saveSettings();
                        new Notice('Enabled all custom style commands. Reload Obsidian to register new commands.');
                        this.renderSettings();
                    }))
                .addButton(btn => btn
                    .setButtonText('Disable All')
                    .onClick(async () => {
                        customStyles.forEach(s => s.showInCommandPalette = false);
                        await this.plugin.saveSettings();
                        new Notice('Disabled all custom style commands.');
                        this.renderSettings();
                    }));

            const stylesList = container.createDiv();
            stylesList.style.background = 'var(--background-secondary)';
            stylesList.style.border = '1px solid var(--background-modifier-border)';
            stylesList.style.borderRadius = '8px';
            stylesList.style.padding = '8px 12px';
            stylesList.style.marginBottom = '1.5rem';

            customStyles.forEach((style, idx) => {
                const row = stylesList.createDiv();
                row.style.display = 'flex';
                row.style.justifyContent = 'space-between';
                row.style.alignItems = 'center';
                row.style.padding = '8px 4px';
                if (idx < customStyles.length - 1) row.style.borderBottom = '1px solid var(--background-modifier-border)';

                const left = row.createDiv();
                left.style.display = 'flex';
                left.style.alignItems = 'center';
                left.style.gap = '8px';

                if (style.icon) {
                    const iconSpan = left.createSpan();
                    setIcon(iconSpan, style.icon);
                    iconSpan.style.color = style.iconColor || style.border || 'var(--text-accent)';
                }

                const info = left.createDiv();
                info.createDiv({ text: `Insert "${style.name}" Callout`, attr: { style: 'font-weight: 600; font-size: 0.88rem;' } });
                info.createDiv({ text: `Command ID: insert-${style.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`, attr: { style: 'font-size: 0.75rem; color: var(--text-muted);' } });

                const right = row.createDiv();
                new ToggleComponent(right)
                    .setValue(style.showInCommandPalette !== false)
                    .onChange(async (val) => {
                        style.showInCommandPalette = val;
                        await this.plugin.saveSettings();
                        new Notice(`"${style.name}" command ${val ? 'enabled' : 'disabled'}. Reload Obsidian to update palette.`);
                    });
            });
        }

        // 4. Custom Layouts Commands
        const customLayouts = this.plugin.settings.customLayouts || [];
        const layoutHeader = new Setting(container)
            .setName(`Custom Layouts Commands (${customLayouts.length} Layouts)`)
            .setDesc('Toggle individual palette commands for each saved grid layout')
            .setHeading();

        if (customLayouts.length > 0) {
            layoutHeader
                .addButton(btn => btn
                    .setButtonText('Enable All')
                    .onClick(async () => {
                        customLayouts.forEach(l => l.showInCommandPalette = true);
                        await this.plugin.saveSettings();
                        new Notice('Enabled all custom layout commands. Reload Obsidian to register new commands.');
                        this.renderSettings();
                    }))
                .addButton(btn => btn
                    .setButtonText('Disable All')
                    .onClick(async () => {
                        customLayouts.forEach(l => l.showInCommandPalette = false);
                        await this.plugin.saveSettings();
                        new Notice('Disabled all custom layout commands.');
                        this.renderSettings();
                    }));

            const layoutList = container.createDiv();
            layoutList.style.background = 'var(--background-secondary)';
            layoutList.style.border = '1px solid var(--background-modifier-border)';
            layoutList.style.borderRadius = '8px';
            layoutList.style.padding = '8px 12px';
            layoutList.style.marginBottom = '1.5rem';

            customLayouts.forEach((layout, idx) => {
                const row = layoutList.createDiv();
                row.style.display = 'flex';
                row.style.justifyContent = 'space-between';
                row.style.alignItems = 'center';
                row.style.padding = '8px 4px';
                if (idx < customLayouts.length - 1) row.style.borderBottom = '1px solid var(--background-modifier-border)';

                const left = row.createDiv();
                left.createDiv({ text: `Insert "${layout.name}" Layout`, attr: { style: 'font-weight: 600; font-size: 0.88rem;' } });
                left.createDiv({ text: `${layout.cols} Columns × ${layout.rows} Rows`, attr: { style: 'font-size: 0.75rem; color: var(--text-muted);' } });

                const right = row.createDiv();
                new ToggleComponent(right)
                    .setValue(layout.showInCommandPalette === true)
                    .onChange(async (val) => {
                        layout.showInCommandPalette = val;
                        await this.plugin.saveSettings();
                        new Notice(`"${layout.name}" layout command ${val ? 'enabled' : 'disabled'}. Reload Obsidian to update palette.`);
                    });
            });
        }
    }

    // =========================================================================
    // TAB 6: GUIDE & SYNTAX
    // =========================================================================
    private renderGuideTab(container: HTMLElement): void {
        const topHeader = container.createDiv({ cls: 'sc-section-header' });
        topHeader.createEl('h3', { text: '📚 Syntax Guide & Cheat Sheet' });
        topHeader.createEl('p', {
            text: 'Quick reference for inline metadata parameters and syntax rules.',
            cls: 'sc-section-desc'
        });

        const guideCards = [
            {
                title: 'Basic Metadata Syntax',
                syntax: '> [!note] (bg:teal, border:none, compact) Title',
                desc: 'Metadata parentheses must appear immediately after the callout bracket `]`, before title text.'
            },
            {
                title: 'Multi-Column Lists',
                syntax: '> [!todo] (col:3, compact) Sprint Backlog',
                desc: 'Reflows list items (`ul`/`ol`) inside the callout into 2 to 6 vertical columns.'
            },
            {
                title: 'Dashboard Grid Wrapper',
                syntax: '> [!multi-callout]\n> > [!info] (1:2, compact) Left\n>\n> > [!tip] (2:2, compact) Right',
                desc: 'Side-by-side flex grid tiles separated by a single `>` line.'
            },
            {
                title: 'Neon & Gradient Cards',
                syntax: '> [!danger] (gradient:#1a0000-#330000, neon:#ff0044, radius:10px) Alert',
                desc: 'Full-opacity gradient background with glowing border and drop-shadow.'
            }
        ];

        guideCards.forEach(g => {
            const card = container.createDiv({ cls: 'sc-card-item' });
            card.style.background = 'var(--background-secondary)';
            card.style.border = '1px solid var(--background-modifier-border)';
            card.style.borderRadius = '8px';
            card.style.padding = '14px';
            card.style.marginBottom = '12px';

            card.createEl('h4', { text: g.title, attr: { style: 'margin: 0 0 6px 0;' } });
            const pre = card.createEl('pre');
            pre.style.padding = '8px 12px';
            pre.style.background = 'var(--background-primary)';
            pre.style.borderRadius = '6px';
            pre.style.fontSize = '0.82rem';
            pre.createEl('code', { text: g.syntax });
            card.createEl('p', { text: g.desc, attr: { style: 'margin: 6px 0 0 0; font-size: 0.8rem; color: var(--text-muted);' } });
        });
    }

    // =========================================================================
    // TAB 7: GENERAL & DEFAULTS
    // =========================================================================
    private renderGeneralTab(container: HTMLElement): void {
        new Setting(container)
            .setName('Backup & Data Management')
            .setDesc('Export or import your Special Callouts configuration as JSON')
            .setHeading();

        const backupRow = container.createDiv();
        backupRow.style.display = 'flex';
        backupRow.style.gap = '10px';
        backupRow.style.marginTop = '10px';
        backupRow.style.flexWrap = 'wrap';

        new ButtonComponent(backupRow)
            .setButtonText('Export Settings (Copy JSON)')
            .onClick(() => {
                const json = JSON.stringify(this.plugin.settings, null, 2);
                navigator.clipboard.writeText(json);
                new Notice('Copied full settings JSON to clipboard!');
            });

        new ButtonComponent(backupRow)
            .setButtonText('Import Settings (Paste JSON)...')
            .onClick(() => {
                new ImportSettingsModal(this.app, this.plugin, () => this.renderSettings()).open();
            });

        new ButtonComponent(backupRow)
            .setButtonText('Reset All to Defaults')
            .setWarning()
            .onClick(async () => {
                if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
                    this.plugin.settings.customStyles = [];
                    this.plugin.settings.customColors = [];
                    this.plugin.settings.customLayouts = [];
                    this.plugin.settings.standardColors = { ...DEFAULT_STANDARD_COLORS };
                    this.plugin.settings.standardStyles = { ...DEFAULT_STANDARD_STYLES };
                    this.plugin.settings.defaultMetadata = '';
                    await this.plugin.saveSettings();
                    new Notice('Settings reset to defaults.');
                    this.renderSettings();
                }
            });
    }

    // =========================================================================
    // MODAL OPENERS
    // =========================================================================
    private openStyleEditorModal(existingStyle?: CalloutStyle, editIndex?: number): void {
        new StyleEditorModal(this.app, this.plugin, existingStyle, editIndex, () => {
            this.renderSettings();
        }).open();
    }

    private openStandardStyleEditorModal(styleName: string): void {
        const style = this.plugin.settings.standardStyles[styleName] || DEFAULT_STANDARD_STYLES[styleName];
        new StandardStyleEditorModal(this.app, this.plugin, styleName, style, () => {
            this.renderSettings();
        }).open();
    }
}

/**
 * Interactive Modal for editing / creating Custom Callout Styles with Live Preview & Section Tabs
 */
type StyleModalSection = 'identity' | 'colors' | 'icon' | 'layout';

export class StyleEditorModal extends Modal {
    plugin: PluginWithSettings;
    existingStyle?: CalloutStyle;
    editIndex?: number;
    onSave: () => void;

    style: CalloutStyle;
    activeSection: StyleModalSection = 'identity';

    constructor(
        app: App,
        plugin: PluginWithSettings,
        existingStyle?: CalloutStyle,
        editIndex?: number,
        onSave: () => void = () => {}
    ) {
        super(app);
        this.plugin = plugin;
        this.existingStyle = existingStyle;
        this.editIndex = editIndex;
        this.onSave = onSave;

        this.style = existingStyle ? { ...existingStyle } : {
            name: '',
            bg: '#448aff',
            border: '#448aff',
            text: '',
            link: '',
            icon: 'pencil',
            iconColor: '',
            titleColor: '',
            boldBorder: false,
            font: '',
            fontSize: 3,
            borderWidth: '1px',
            borderStyle: 'solid',
            borderRadius: '8px',
            neon: '',
            gradient: '',
            noIcon: false,
            compact: false,
            center: false,
            titleCenter: false,
            showInCommandPalette: true
        };
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('special-callouts-ui');

        contentEl.createEl('h2', { text: this.editIndex !== undefined ? `Edit Style: ${this.style.name}` : 'New Callout Style' });

        // Sticky Live Preview Box
        const previewContainer = contentEl.createDiv({ cls: 'sc-live-preview-container sc-sticky-preview' });
        const previewHeader = previewContainer.createDiv({ cls: 'sc-live-preview-header' });
        previewHeader.createSpan({ text: 'Live Interactive Preview' });

        const liveCallout = previewContainer.createDiv({ cls: 'callout sc-live-callout' });
        this.updateLivePreview(liveCallout);

        // Section Tabs
        const nav = contentEl.createDiv({ cls: 'sc-nav-tabs' });
        nav.style.marginBottom = '1rem';

        const sections: { id: StyleModalSection; label: string; icon: string }[] = [
            { id: 'identity', label: 'Style Name', icon: 'tag' },
            { id: 'colors', label: 'Colors & Glow', icon: 'palette' },
            { id: 'icon', label: 'Icon & Font', icon: 'type' },
            { id: 'layout', label: 'Borders & Layout', icon: 'layout' }
        ];

        sections.forEach(sec => {
            const btn = nav.createEl('button', { cls: `sc-nav-tab ${this.activeSection === sec.id ? 'is-active' : ''}` });
            const iconSpan = btn.createSpan();
            setIcon(iconSpan, sec.icon);
            btn.createSpan({ text: sec.label });

            btn.onclick = () => {
                this.activeSection = sec.id;
                this.renderSectionContent(sectionContainer, liveCallout);
                nav.querySelectorAll('.sc-nav-tab').forEach((b, i) => {
                    if (sections[i].id === sec.id) b.addClass('is-active');
                    else b.removeClass('is-active');
                });
            };
        });

        // Dynamic Section Container
        const sectionContainer = contentEl.createDiv({ cls: 'sc-section-content' });
        sectionContainer.style.minHeight = '200px';
        this.renderSectionContent(sectionContainer, liveCallout);

        // Action Buttons
        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Save Style')
                .setCta()
                .onClick(async () => {
                    if (!this.style.name) {
                        new Notice('Please enter a valid style name.');
                        return;
                    }
                    if (this.editIndex !== undefined) {
                        this.plugin.settings.customStyles[this.editIndex] = this.style;
                    } else {
                        this.plugin.settings.customStyles.push(this.style);
                    }
                    await this.plugin.saveSettings();
                    new Notice(`Saved style "${this.style.name}"!`);
                    this.onSave();
                    this.close();
                }))
            .addButton(btn => btn
                .setButtonText('Cancel')
                .onClick(() => this.close()));
    }

    private renderSectionContent(container: HTMLElement, liveCallout: HTMLElement): void {
        container.empty();

        switch (this.activeSection) {
            case 'identity':
                new Setting(container)
                    .setName('Style Name / Identifier')
                    .setDesc('The identifier used in markdown: > [!style-name]')
                    .addText(text => text
                        .setValue(this.style.name)
                        .onChange(val => {
                            this.style.name = val.toLowerCase().replace(/\s+/g, '-');
                            this.updateLivePreview(liveCallout);
                        }));
                break;

            case 'colors':
                createGradientSetting(container, this.style.gradient || '', val => {
                    this.style.gradient = val;
                    this.updateLivePreview(liveCallout);
                });

                let bgTextComp: TextComponent;
                new Setting(container)
                    .setName('Background Color (Tint)')
                    .setDesc('Translucent 15% background tint (used when gradient is disabled)')
                    .addText(text => {
                        bgTextComp = text;
                        text.setPlaceholder('#3498db or blue')
                            .setValue(this.style.bg)
                            .onChange(val => {
                                this.style.bg = val;
                                this.updateLivePreview(liveCallout);
                            });
                    })
                    .addColorPicker(picker => picker
                        .setValue(normalizeHex(this.style.bg || '#3498db'))
                        .onChange(val => {
                            this.style.bg = val;
                            if (bgTextComp) bgTextComp.setValue(val);
                            this.updateLivePreview(liveCallout);
                        }));

                let borderTextComp: TextComponent;
                new Setting(container)
                    .setName('Border Color')
                    .addText(text => {
                        borderTextComp = text;
                        text.setPlaceholder('#3498db or blue')
                            .setValue(this.style.border)
                            .onChange(val => {
                                this.style.border = val;
                                this.updateLivePreview(liveCallout);
                            });
                    })
                    .addColorPicker(picker => picker
                        .setValue(normalizeHex(this.style.border || '#3498db'))
                        .onChange(val => {
                            this.style.border = val;
                            if (borderTextComp) borderTextComp.setValue(val);
                            this.updateLivePreview(liveCallout);
                        }));

                new Setting(container)
                    .setName('Title Color')
                    .addText(text => text
                        .setPlaceholder('Inherit')
                        .setValue(this.style.titleColor || '')
                        .onChange(val => {
                            this.style.titleColor = val;
                            this.updateLivePreview(liveCallout);
                        }));

                new Setting(container)
                    .setName('Text Color')
                    .addText(text => text
                        .setPlaceholder('Theme Text')
                        .setValue(this.style.text || '')
                        .onChange(val => {
                            this.style.text = val;
                            this.updateLivePreview(liveCallout);
                        }));

                new Setting(container)
                    .setName('Neon Glow Color')
                    .setDesc('Color for glowing neon border effect (e.g. cyan, #00ffcc)')
                    .addText(text => text
                        .setPlaceholder('none')
                        .setValue(this.style.neon || '')
                        .onChange(val => {
                            this.style.neon = val;
                            this.updateLivePreview(liveCallout);
                        }));
                break;

            case 'icon':
                new Setting(container)
                    .setName('Callout Icon')
                    .setDesc(`Current icon: ${this.style.icon || 'none'}`)
                    .addButton(btn => btn
                        .setButtonText('Browse Icons...')
                        .onClick(() => {
                            new IconPickerModal(this.app, (icon) => {
                                this.style.icon = icon;
                                this.renderSectionContent(container, liveCallout);
                                this.updateLivePreview(liveCallout);
                            }).open();
                        }));

                new Setting(container)
                    .setName('Icon Color')
                    .addText(text => text
                        .setPlaceholder('Inherit from Title')
                        .setValue(this.style.iconColor || '')
                        .onChange(val => {
                            this.style.iconColor = val;
                            this.updateLivePreview(liveCallout);
                        }));

                new Setting(container)
                    .setName('Font Family')
                    .addDropdown(drop => {
                        drop.addOption('', 'Default Theme Font');
                        Object.keys(FONT_FAMILIES).forEach((f: string) => drop.addOption(f, f.charAt(0).toUpperCase() + f.slice(1)));
                        drop.setValue(this.style.font || '');
                        drop.onChange(val => {
                            this.style.font = val;
                            this.updateLivePreview(liveCallout);
                        });
                    });

                new Setting(container)
                    .setName('Font Size')
                    .addDropdown(drop => {
                        drop.addOption('1', '1 - Smallest');
                        drop.addOption('2', '2 - Small');
                        drop.addOption('3', '3 - Standard');
                        drop.addOption('4', '4 - Large');
                        drop.addOption('5', '5 - Largest');
                        drop.setValue(String(this.style.fontSize ?? 3));
                        drop.onChange(val => {
                            this.style.fontSize = Number(val);
                            this.updateLivePreview(liveCallout);
                        });
                    });
                break;

            case 'layout':
                new Setting(container)
                    .setName('Border Width')
                    .addDropdown(drop => {
                        ['1px', '2px', '3px', '4px', '5px'].forEach(w => drop.addOption(w, w));
                        drop.setValue(this.style.borderWidth || '1px');
                        drop.onChange(val => {
                            this.style.borderWidth = val;
                            this.updateLivePreview(liveCallout);
                        });
                    });

                new Setting(container)
                    .setName('Border Style')
                    .addDropdown(drop => {
                        ['solid', 'dashed', 'dotted', 'double'].forEach(s => drop.addOption(s, s));
                        drop.setValue(this.style.borderStyle || 'solid');
                        drop.onChange(val => {
                            this.style.borderStyle = val;
                            this.updateLivePreview(liveCallout);
                        });
                    });

                new Setting(container)
                    .setName('Border Radius')
                    .addDropdown(drop => {
                        ['0px', '4px', '8px', '12px', '16px', '24px'].forEach(r => drop.addOption(r, r));
                        drop.setValue(this.style.borderRadius || '8px');
                        drop.onChange(val => {
                            this.style.borderRadius = val;
                            this.updateLivePreview(liveCallout);
                        });
                    });

                new Setting(container)
                    .setName('Compact Mode')
                    .setDesc('Removes vertical padding')
                    .addToggle(t => t
                        .setValue(!!this.style.compact)
                        .onChange(val => {
                            this.style.compact = val;
                            this.updateLivePreview(liveCallout);
                        }));

                new Setting(container)
                    .setName('Center Content')
                    .setDesc('Center aligns title and body text')
                    .addToggle(t => t
                        .setValue(!!this.style.center)
                        .onChange(val => {
                            this.style.center = val;
                            this.updateLivePreview(liveCallout);
                        }));

                new Setting(container)
                    .setName('Hide Icon')
                    .addToggle(t => t
                        .setValue(!!this.style.noIcon)
                        .onChange(val => {
                            this.style.noIcon = val;
                            this.updateLivePreview(liveCallout);
                        }));
                break;
        }
    }

    private updateLivePreview(liveCallout: HTMLElement): void {
        liveCallout.empty();
        liveCallout.setAttribute('data-callout', this.style.name || 'custom');

        if (this.style.gradient) {
            let grad = this.style.gradient.trim();
            if (!isCssGradient(grad)) {
                const parts = grad.split('-');
                if (parts.length >= 2) {
                    grad = `linear-gradient(90deg, ${parts[0]}, ${parts.slice(1).join('-')})`;
                }
            }
            liveCallout.style.background = grad;
            liveCallout.style.border = this.style.border ? `${this.style.borderWidth || '1px'} ${this.style.borderStyle || 'solid'} ${this.style.border}` : 'none';
        } else {
            liveCallout.style.backgroundColor = this.style.bg ? `color-mix(in srgb, ${this.style.bg} 15%, transparent)` : 'var(--background-secondary)';
            liveCallout.style.borderColor = this.style.border || 'var(--text-accent)';
            liveCallout.style.borderWidth = this.style.borderWidth || '1px';
            liveCallout.style.borderStyle = this.style.borderStyle || 'solid';
        }

        liveCallout.style.borderRadius = this.style.borderRadius || '8px';
        liveCallout.style.padding = this.style.compact ? '8px 12px' : '12px 16px';
        liveCallout.style.textAlign = this.style.center ? 'center' : 'left';

        if (this.style.neon) {
            const neon = neonStyles(this.style.neon);
            liveCallout.style.boxShadow = neon.boxShadow;
        } else {
            liveCallout.style.boxShadow = 'none';
        }

        const titleRow = liveCallout.createDiv({ cls: 'callout-title' });
        if (this.style.center) titleRow.style.justifyContent = 'center';

        if (!this.style.noIcon && this.style.icon) {
            const iconEl = titleRow.createDiv({ cls: 'callout-icon' });
            setIcon(iconEl, this.style.icon);
            if (this.style.iconColor) iconEl.style.color = this.style.iconColor;
            else if (this.style.titleColor) iconEl.style.color = this.style.titleColor;
            else iconEl.style.color = this.style.border || 'var(--text-accent)';
        }

        const titleText = titleRow.createDiv({
            cls: 'callout-title-inner',
            text: this.style.name || 'Sample Title'
        });
        if (this.style.titleColor) titleText.style.color = this.style.titleColor;

        const bodyEl = liveCallout.createDiv({ cls: 'callout-content' });
        if (this.style.text) bodyEl.style.color = this.style.text;
        bodyEl.createEl('p', { text: 'This is a live preview demonstrating background, typography, colors, and border styles.' });
    }
}

/**
 * Standard Style Editor Modal
 */
export class StandardStyleEditorModal extends Modal {
    plugin: PluginWithSettings;
    styleName: string;
    style: CalloutStyle;
    onSave: () => void;

    constructor(app: App, plugin: PluginWithSettings, styleName: string, style: CalloutStyle, onSave: () => void = () => {}) {
        super(app);
        this.plugin = plugin;
        this.styleName = styleName;
        this.style = { ...style };
        this.onSave = onSave;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('special-callouts-ui');

        contentEl.createEl('h2', { text: `Customize "${this.styleName}" Callout` });

        let bgText: TextComponent;
        new Setting(contentEl)
            .setName('Background Tint')
            .addText(text => {
                bgText = text;
                text.setValue(this.style.bg || '').onChange(val => this.style.bg = val);
            })
            .addColorPicker(picker => picker
                .setValue(normalizeHex(this.style.bg || '#448aff'))
                .onChange(val => {
                    this.style.bg = val;
                    if (bgText) bgText.setValue(val);
                }));

        let borderText: TextComponent;
        new Setting(contentEl)
            .setName('Border / Accent Color')
            .addText(text => {
                borderText = text;
                text.setValue(this.style.border || '').onChange(val => this.style.border = val);
            })
            .addColorPicker(picker => picker
                .setValue(normalizeHex(this.style.border || '#448aff'))
                .onChange(val => {
                    this.style.border = val;
                    if (borderText) borderText.setValue(val);
                }));

        new Setting(contentEl)
            .setName('Icon')
            .addButton(btn => btn
                .setButtonText(this.style.icon || 'Browse Icon...')
                .onClick(() => {
                    new IconPickerModal(this.app, (icon) => {
                        this.style.icon = icon;
                        btn.setButtonText(icon);
                    }).open();
                }));

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Save Changes')
                .setCta()
                .onClick(async () => {
                    this.plugin.settings.standardStyles[this.styleName] = this.style;
                    await this.plugin.saveSettings();
                    new Notice(`Updated "${this.styleName}" standard style!`);
                    this.onSave();
                    this.close();
                }))
            .addButton(btn => btn
                .setButtonText('Cancel')
                .onClick(() => this.close()));
    }
}

/**
 * Import Settings JSON Modal
 */
export class ImportSettingsModal extends Modal {
    plugin: PluginWithSettings;
    onImport: () => void;

    constructor(app: App, plugin: PluginWithSettings, onImport: () => void = () => {}) {
        super(app);
        this.plugin = plugin;
        this.onImport = onImport;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('special-callouts-ui');

        contentEl.createEl('h2', { text: 'Import Settings JSON' });
        contentEl.createEl('p', {
            text: 'Paste exported JSON configuration below to merge or replace current styles and layouts.',
            cls: 'sc-section-desc'
        });

        const textarea = contentEl.createEl('textarea');
        textarea.style.width = '100%';
        textarea.style.height = '200px';
        textarea.style.fontFamily = 'var(--font-monospace)';
        textarea.style.fontSize = '0.82rem';
        textarea.style.padding = '8px 12px';
        textarea.style.borderRadius = '6px';
        textarea.style.border = '1px solid var(--background-modifier-border)';
        textarea.style.marginBottom = '14px';

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Import & Apply')
                .setCta()
                .onClick(async () => {
                    const raw = textarea.value.trim();
                    if (!raw) {
                        new Notice('Please paste valid JSON.');
                        return;
                    }
                    try {
                        const parsed = JSON.parse(raw);
                        if (parsed.customStyles && Array.isArray(parsed.customStyles)) {
                            this.plugin.settings.customStyles = parsed.customStyles;
                        }
                        if (parsed.customColors && Array.isArray(parsed.customColors)) {
                            this.plugin.settings.customColors = parsed.customColors;
                        }
                        if (parsed.customLayouts && Array.isArray(parsed.customLayouts)) {
                            this.plugin.settings.customLayouts = parsed.customLayouts;
                        }
                        if (parsed.standardColors && typeof parsed.standardColors === 'object') {
                            this.plugin.settings.standardColors = parsed.standardColors;
                        }
                        if (parsed.standardStyles && typeof parsed.standardStyles === 'object') {
                            this.plugin.settings.standardStyles = parsed.standardStyles;
                        }
                        await this.plugin.saveSettings();
                        new Notice('Settings successfully imported!');
                        this.onImport();
                        this.close();
                    } catch (e) {
                        new Notice('Invalid JSON format: ' + (e as Error).message);
                    }
                }))
            .addButton(btn => btn
                .setButtonText('Cancel')
                .onClick(() => this.close()));
    }
}
