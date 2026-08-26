/**
 * Special Callouts - Settings Tab
 * Clean, modular tabbed settings interface with live previews & layout builder
 */

import {
    App,
    PluginSettingTab,
    Plugin,
    Setting,
    setIcon,
    Notice,
    Modal,
    ButtonComponent
} from 'obsidian';
import { SpecialCalloutsSettings, CalloutStyle, CustomLayout } from '../types';
import { DEFAULT_STANDARD_STYLES, DEFAULT_STANDARD_COLORS, QUICK_START_PRESETS } from '../constants';
import { isValidHex, normalizeHex } from '../utils';
import { showHowToUse } from '../modals/HowToModal';
import { showMetadataReference } from '../modals/MetadataModal';
import {
    createColorSetting,
    createIconSetting,
    createBorderStyleSetting,
    createFontSetting,
    createFontSizeSetting,
    applyStyleToLivePreview
} from '../ui/UIComponents';

interface PluginWithSettings {
    settings: SpecialCalloutsSettings;
    saveSettings(): Promise<void>;
}

type SettingsTabId = 'styles' | 'standard' | 'colors' | 'layouts' | 'guide' | 'general';

export class SpecialCalloutsSettingTab extends PluginSettingTab {
    plugin: PluginWithSettings;
    activeTab: SettingsTabId = 'styles';

    // Search query for filtering styles
    searchQuery: string = '';

    // Layout Builder State
    builderCols = 3;
    builderRows = 2;
    builderLayoutName = '';
    builderGridMatrix: number[][] = [[1, 2, 3], [4, 5, 6]];
    builderSelectedCells: { r: number; c: number }[] = [];

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
            case 'colors':
                this.renderColorsTab(tabContentContainer);
                break;
            case 'layouts':
                this.renderLayoutBuilderTab(tabContentContainer);
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
        left.createEl('p', { text: 'Design custom styles, multi-column dashboards, and advanced callouts', cls: 'sc-header-subtitle' });

        const right = banner.createDiv({ cls: 'sc-flex-row' });

        new ButtonComponent(right)
            .setButtonText('📖 Cheat Sheet')
            .onClick(() => {
                showMetadataReference(this.app);
            });

        new ButtonComponent(right)
            .setButtonText('+ New Custom Style')
            .setCta()
            .onClick(() => {
                this.openStyleEditorModal();
            });
    }

    private renderNavTabs(container: HTMLElement): void {
        const nav = container.createDiv({ cls: 'sc-nav-tabs sc-margin-bottom' });

        const tabs: { id: SettingsTabId; label: string; icon: string }[] = [
            { id: 'styles', label: 'Custom Styles', icon: 'palette' },
            { id: 'standard', label: 'Standard Callouts', icon: 'layers' },
            { id: 'colors', label: 'Color Palette', icon: 'droplet' },
            { id: 'layouts', label: 'Visual Layout Builder', icon: 'layout-grid' },
            { id: 'guide', label: 'Interactive Guide', icon: 'book-open' },
            { id: 'general', label: 'General Settings', icon: 'settings' }
        ];

        tabs.forEach(tab => {
            const btn = nav.createEl('button', { cls: `sc-nav-tab ${this.activeTab === tab.id ? 'is-active' : ''}` });
            const iconSpan = btn.createSpan();
            setIcon(iconSpan, tab.icon);
            btn.createSpan({ text: tab.label });

            btn.onclick = () => {
                this.activeTab = tab.id;
                this.renderSettings();
            };
        });
    }

    // ==========================================
    // TAB 1: CUSTOM STYLES
    // ==========================================
    private renderCustomStylesTab(container: HTMLElement): void {
        const topBar = container.createDiv({ cls: 'sc-section-header sc-flex-row' });

        // Search Bar
        const searchInput = topBar.createEl('input', {
            type: 'text',
            placeholder: 'Search saved custom styles...',
            cls: 'sc-search-input'
        });
        searchInput.value = this.searchQuery;
        searchInput.oninput = () => {
            this.searchQuery = searchInput.value.toLowerCase();
            this.renderCustomStylesList(listContainer);
        };

        const listContainer = container.createDiv({ cls: 'sc-styles-list-container' });
        this.renderCustomStylesList(listContainer);
    }

    private renderCustomStylesList(container: HTMLElement): void {
        container.empty();

        const filtered = this.plugin.settings.customStyles.filter(s =>
            s.name.toLowerCase().includes(this.searchQuery) ||
            (s.icon && s.icon.toLowerCase().includes(this.searchQuery))
        );

        if (filtered.length === 0) {
            const emptyState = container.createDiv({ cls: 'sc-empty-state' });
            emptyState.createEl('h4', { text: this.searchQuery ? 'No matching styles found' : 'No custom styles created yet' });
            emptyState.createEl('p', { text: 'Create your first custom callout preset or choose from quick-start templates below.' });

            const quickStartRow = container.createDiv({ cls: 'sc-quick-presets sc-margin-top' });
            quickStartRow.createEl('h5', { text: '⚡ Quick-Start Starter Presets:' });

            const presetGrid = quickStartRow.createDiv({ cls: 'sc-cards-grid' });
            QUICK_START_PRESETS.forEach(p => {
                const card = presetGrid.createDiv({ cls: 'sc-card-item' });
                card.createDiv({ cls: 'sc-card-title', text: p.name });
                card.createEl('code', { text: `> [!${p.name.toLowerCase().replace(/\s+/g, '-')}]` });

                card.onclick = async () => {
                    this.plugin.settings.customStyles.push({
                        name: p.name.toLowerCase().replace(/\s+/g, '-'),
                        bg: p.bg,
                        border: p.border,
                        titleColor: p.title,
                        text: p.text,
                        link: '',
                        icon: p.icon,
                        boldBorder: false
                    });
                    await this.plugin.saveSettings();
                    new Notice(`Added "${p.name}" to Custom Styles!`);
                    this.renderSettings();
                };
            });
            return;
        }

        const cardsGrid = container.createDiv({ cls: 'sc-cards-grid' });

        filtered.forEach((style) => {
            const index = this.plugin.settings.customStyles.indexOf(style);
            const card = cardsGrid.createDiv({ cls: 'sc-card-item' });

            const top = card.createDiv({ cls: 'sc-card-top' });
            const titleRow = top.createDiv({ cls: 'sc-flex-row' });
            if (style.icon) {
                const iconDiv = titleRow.createDiv({ cls: 'sc-card-icon' });
                setIcon(iconDiv, style.icon);
            }
            titleRow.createDiv({ cls: 'sc-card-title', text: style.name });

            // Mini Callout Preview inside card
            const miniPreview = card.createDiv({ cls: 'callout sc-mini-preview' });
            miniPreview.setAttribute('data-callout', 'note');
            const titleEl = miniPreview.createDiv({ cls: 'callout-title' });
            const iconEl = titleEl.createDiv({ cls: 'callout-icon' });
            const titleInner = titleEl.createDiv({ cls: 'callout-title-inner', text: style.name });
            const bodyEl = miniPreview.createDiv({ cls: 'callout-content' });
            bodyEl.createEl('p', { text: 'Preview content text...' });

            applyStyleToLivePreview(miniPreview, iconEl, titleInner, style);

            // Action Buttons
            const actions = card.createDiv({ cls: 'sc-card-actions' });
            const editBtn = actions.createEl('button', { cls: 'sc-action-btn', title: 'Edit Style' });
            setIcon(editBtn, 'pencil');
            editBtn.onclick = () => {
                this.openStyleEditorModal(style, index);
            };

            const dupBtn = actions.createEl('button', { cls: 'sc-action-btn', title: 'Duplicate Style' });
            setIcon(dupBtn, 'copy');
            dupBtn.onclick = async () => {
                const copy = { ...style, name: `${style.name}-copy` };
                this.plugin.settings.customStyles.push(copy);
                await this.plugin.saveSettings();
                this.renderSettings();
            };

            const delBtn = actions.createEl('button', { cls: 'sc-action-btn is-danger', title: 'Delete Style' });
            setIcon(delBtn, 'trash');
            delBtn.onclick = async () => {
                this.plugin.settings.customStyles.splice(index, 1);
                await this.plugin.saveSettings();
                this.renderSettings();
            };
        });
    }

    // ==========================================
    // TAB 2: STANDARD OBSIDIAN CALLOUTS
    // ==========================================
    private renderStandardStylesTab(container: HTMLElement): void {
        new Setting(container)
            .setName('Standard Obsidian Callouts')
            .setDesc('Customize background, border, and title colors of default callout types')
            .setHeading();

        const grid = container.createDiv({ cls: 'sc-cards-grid' });

        Object.keys(DEFAULT_STANDARD_STYLES).forEach(key => {
            const currentStyle = this.plugin.settings.standardStyles[key] || DEFAULT_STANDARD_STYLES[key];
            const card = grid.createDiv({ cls: 'sc-card-item' });

            const top = card.createDiv({ cls: 'sc-card-top' });
            const titleRow = top.createDiv({ cls: 'sc-flex-row' });
            if (currentStyle.icon) {
                const iconDiv = titleRow.createDiv({ cls: 'sc-card-icon' });
                setIcon(iconDiv, currentStyle.icon);
            }
            titleRow.createDiv({ cls: 'sc-card-title', text: key.toUpperCase() });

            // Mini Preview
            const mini = card.createDiv({ cls: 'callout sc-mini-preview' });
            mini.setAttribute('data-callout', key);
            const titleEl = mini.createDiv({ cls: 'callout-title' });
            const iconEl = titleEl.createDiv({ cls: 'callout-icon' });
            const titleInner = titleEl.createDiv({ cls: 'callout-title-inner', text: key.charAt(0).toUpperCase() + key.slice(1) });
            const bodyEl = mini.createDiv({ cls: 'callout-content' });
            bodyEl.createEl('p', { text: `Standard ${key} body...` });

            applyStyleToLivePreview(mini, iconEl, titleInner, currentStyle);

            const actions = card.createDiv({ cls: 'sc-card-actions' });
            const editBtn = actions.createEl('button', { cls: 'sc-action-btn', title: 'Edit Standard Style' });
            setIcon(editBtn, 'pencil');
            editBtn.onclick = () => {
                this.openStandardStyleEditorModal(key);
            };

            const resetBtn = actions.createEl('button', { cls: 'sc-action-btn', title: 'Reset to Default' });
            setIcon(resetBtn, 'rotate-ccw');
            resetBtn.onclick = async () => {
                this.plugin.settings.standardStyles[key] = { ...DEFAULT_STANDARD_STYLES[key] };
                await this.plugin.saveSettings();
                this.renderSettings();
                new Notice(`Reset "${key}" to default.`);
            };
        });
    }

    // ==========================================
    // TAB 3: COLOR PALETTE
    // ==========================================
    private renderColorsTab(container: HTMLElement): void {
        new Setting(container)
            .setName('Standard Palette Colors')
            .setDesc('Color keywords available in inline metadata (e.g. bg:blue, border:green)')
            .setHeading();

        const stdGrid = container.createDiv({ cls: 'sc-palette-grid' });
        Object.entries(this.plugin.settings.standardColors).forEach(([name, hex]) => {
            const swatch = stdGrid.createDiv({ cls: 'sc-color-swatch-item' });
            const preview = swatch.createDiv({ cls: 'sc-color-preview' });
            preview.setCssProps({ '--sc-dyn-background': hex });
            preview.addClass('sc-var-background');

            const info = swatch.createDiv({ cls: 'sc-color-info' });
            info.createEl('strong', { text: name });
            info.createEl('code', { text: hex });

            const picker = swatch.createEl('input', { type: 'color' });
            picker.value = normalizeHex(hex);
            picker.onchange = async () => {
                this.plugin.settings.standardColors[name] = picker.value;
                await this.plugin.saveSettings();
                this.renderSettings();
            };
        });

        new Setting(container)
            .setName('Custom Named Colors')
            .setDesc('Create your own color names to use in markdown (e.g. bg:brand)')
            .setHeading();

        const addRow = container.createDiv({ cls: 'sc-add-color-row sc-flex-row sc-margin-bottom' });
        const nameInput = addRow.createEl('input', { type: 'text', placeholder: 'Color Name (e.g. brand)' });
        const hexInput = addRow.createEl('input', { type: 'text', placeholder: '#1a73e8', value: '#1a73e8' });
        const hexPicker = addRow.createEl('input', { type: 'color', value: '#1a73e8' });

        hexPicker.oninput = () => { hexInput.value = hexPicker.value; };
        hexInput.oninput = () => { if (isValidHex(hexInput.value)) hexPicker.value = normalizeHex(hexInput.value); };

        const addBtn = addRow.createEl('button', { cls: 'mod-cta', text: '+ Add Custom Color' });
        addBtn.onclick = async () => {
            const name = nameInput.value.trim().toLowerCase();
            const hex = hexInput.value.trim();
            if (!name || !hex) {
                new Notice('Please provide both name and hex color code.');
                return;
            }
            this.plugin.settings.customColors.push({ name, hex });
            await this.plugin.saveSettings();
            this.renderSettings();
        };

        if (this.plugin.settings.customColors.length > 0) {
            const customGrid = container.createDiv({ cls: 'sc-palette-grid' });
            this.plugin.settings.customColors.forEach((color, idx) => {
                const swatch = customGrid.createDiv({ cls: 'sc-color-swatch-item' });
                const preview = swatch.createDiv({ cls: 'sc-color-preview' });
                preview.setCssProps({ '--sc-dyn-background': color.hex });
                preview.addClass('sc-var-background');

                const info = swatch.createDiv({ cls: 'sc-color-info' });
                info.createEl('strong', { text: color.name });
                info.createEl('code', { text: color.hex });

                const delBtn = swatch.createEl('button', { cls: 'sc-action-btn is-danger', title: 'Delete' });
                setIcon(delBtn, 'trash');
                delBtn.onclick = async () => {
                    this.plugin.settings.customColors.splice(idx, 1);
                    await this.plugin.saveSettings();
                    this.renderSettings();
                };
            });
        }
    }

    // ==========================================
    // TAB 4: VISUAL LAYOUT BUILDER
    // ==========================================
    private renderLayoutBuilderTab(container: HTMLElement): void {
        new Setting(container)
            .setName('Visual Layout Matrix Builder')
            .setDesc('Design custom named grid-template-areas by selecting and merging cells')
            .setHeading();

        const ctrlRow = container.createDiv({ cls: 'sc-flex-row sc-margin-bottom' });
        ctrlRow.createEl('strong', { text: 'Grid Size:' });

        const colsInput = ctrlRow.createEl('input', { type: 'number', value: this.builderCols.toString(), cls: 'sc-var-width' });
        colsInput.setCssProps({ '--sc-dyn-width': '60px' });
        colsInput.min = '1';
        colsInput.max = '6';

        ctrlRow.createSpan({ text: '×' });

        const rowsInput = ctrlRow.createEl('input', { type: 'number', value: this.builderRows.toString(), cls: 'sc-var-width' });
        rowsInput.setCssProps({ '--sc-dyn-width': '60px' });
        rowsInput.min = '1';
        rowsInput.max = '6';

        const updateDimBtn = ctrlRow.createEl('button', { text: 'Apply Size' });
        updateDimBtn.onclick = () => {
            this.builderCols = Math.max(1, Math.min(6, parseInt(colsInput.value, 10) || 3));
            this.builderRows = Math.max(1, Math.min(6, parseInt(rowsInput.value, 10) || 2));
            this.initLayoutMatrix();
            this.renderSettings();
        };

        const mergeBtn = ctrlRow.createEl('button', { cls: 'mod-cta', text: 'Merge Selected Cells' });
        mergeBtn.onclick = () => {
            this.mergeBuilderSelection();
            this.renderSettings();
        };

        const resetBtn = ctrlRow.createEl('button', { text: 'Reset Grid' });
        resetBtn.onclick = () => {
            this.initLayoutMatrix();
            this.renderSettings();
        };

        // Grid Matrix Visualization
        const matrixEl = container.createDiv({ cls: 'sc-cards-grid sc-margin-top' });
        matrixEl.setCssProps({ '--sc-grid-cols': `repeat(${this.builderCols}, 1fr)` });

        for (let r = 0; r < this.builderRows; r++) {
            for (let c = 0; c < this.builderCols; c++) {
                const id = this.builderGridMatrix[r]?.[c] || 1;
                const isSelected = this.builderSelectedCells.some(s => s.r === r && s.c === c);

                const cell = matrixEl.createDiv({ cls: `sc-card-item ${isSelected ? 'is-active' : ''}` });
                cell.createDiv({ cls: 'sc-card-title', text: `Area ${id}` });

                cell.onclick = () => {
                    const idx = this.builderSelectedCells.findIndex(s => s.r === r && s.c === c);
                    if (idx >= 0) {
                        this.builderSelectedCells.splice(idx, 1);
                    } else {
                        this.builderSelectedCells.push({ r, c });
                    }
                    this.renderSettings();
                };
            }
        }

        // Save Layout Row
        const saveRow = container.createDiv({ cls: 'sc-flex-row sc-margin-top' });
        const nameInput = saveRow.createEl('input', { type: 'text', placeholder: 'Layout Name (e.g. workspace)' });
        const saveBtn = saveRow.createEl('button', { cls: 'mod-cta', text: 'Save Named Layout' });

        saveBtn.onclick = async () => {
            const name = nameInput.value.trim().toLowerCase().replace(/\s+/g, '-');
            if (!name) {
                new Notice('Please enter a layout name.');
                return;
            }

            this.normalizeMatrix();
            const gridAreas = this.builderGridMatrix
                .map(row => `"${row.map(id => `area${id}`).join(' ')}"`)
                .join(' ');

            const newLayout: CustomLayout = {
                name,
                cols: this.builderCols,
                rows: this.builderRows,
                gridAreas,
                showInCommandPalette: true
            };

            const existingIdx = this.plugin.settings.customLayouts.findIndex(l => l.name === name);
            if (existingIdx >= 0) {
                this.plugin.settings.customLayouts[existingIdx] = newLayout;
            } else {
                this.plugin.settings.customLayouts.push(newLayout);
            }

            await this.plugin.saveSettings();
            new Notice(`Saved layout "${name}"!`);
            this.renderSettings();
        };

        // Saved Layouts
        if (this.plugin.settings.customLayouts.length > 0) {
            new Setting(container)
                .setName('Saved Layouts')
                .setHeading();

            const savedGrid = container.createDiv({ cls: 'sc-cards-grid' });
            this.plugin.settings.customLayouts.forEach((layout, idx) => {
                const card = savedGrid.createDiv({ cls: 'sc-card-item' });
                card.createDiv({ cls: 'sc-card-title', text: layout.name });
                card.createEl('code', { text: `> [!multi-callout] (${layout.name})` });

                const actions = card.createDiv({ cls: 'sc-card-actions' });
                const delBtn = actions.createEl('button', { cls: 'sc-action-btn is-danger', title: 'Delete' });
                setIcon(delBtn, 'trash');
                delBtn.onclick = async () => {
                    this.plugin.settings.customLayouts.splice(idx, 1);
                    await this.plugin.saveSettings();
                    this.renderSettings();
                };
            });
        }
    }

    private initLayoutMatrix(): void {
        this.builderGridMatrix = [];
        let id = 1;
        for (let r = 0; r < this.builderRows; r++) {
            const row: number[] = [];
            for (let c = 0; c < this.builderCols; c++) {
                row.push(id++);
            }
            this.builderGridMatrix.push(row);
        }
        this.builderSelectedCells = [];
    }

    private mergeBuilderSelection(): void {
        if (this.builderSelectedCells.length < 2) {
            new Notice('Select at least 2 cells to merge!');
            return;
        }

        const targetId = this.builderGridMatrix[this.builderSelectedCells[0].r][this.builderSelectedCells[0].c];
        this.builderSelectedCells.forEach(cell => {
            this.builderGridMatrix[cell.r][cell.c] = targetId;
        });

        this.normalizeMatrix();
        this.builderSelectedCells = [];
        new Notice('Merged cells!');
    }

    private normalizeMatrix(): void {
        const idMap = new Map<number, number>();
        let nextId = 1;

        for (let r = 0; r < this.builderRows; r++) {
            for (let c = 0; c < this.builderCols; c++) {
                const curr = this.builderGridMatrix[r][c];
                if (!idMap.has(curr)) {
                    idMap.set(curr, nextId++);
                }
                this.builderGridMatrix[r][c] = idMap.get(curr)!;
            }
        }
    }

    // ==========================================
    // TAB 5: INTERACTIVE GUIDE
    // ==========================================
    private renderGuideTab(container: HTMLElement): void {
        new Setting(container)
            .setName('Interactive Documentation & Quick Reference')
            .setHeading();

        const guideRow = container.createDiv({ cls: 'sc-flex-row sc-margin-bottom' });

        new ButtonComponent(guideRow)
            .setButtonText('📖 Open Full Metadata Cheat Sheet')
            .setCta()
            .onClick(() => showMetadataReference(this.app));

        new ButtonComponent(guideRow)
            .setButtonText('💡 Open Interactive How-To Walkthrough')
            .onClick(() => showHowToUse(this.app));
    }

    // ==========================================
    // TAB 6: GENERAL SETTINGS
    // ==========================================
    private renderGeneralTab(container: HTMLElement): void {
        new Setting(container)
            .setName('Default Callout Metadata')
            .setDesc('Default parameters automatically attached when creating callouts (e.g. col:2, compact)')
            .addText(text => text
                .setValue(this.plugin.settings.defaultMetadata || '')
                .onChange(async val => {
                    this.plugin.settings.defaultMetadata = val;
                    await this.plugin.saveSettings();
                }));
    }

    private openStyleEditorModal(existingStyle?: CalloutStyle, editIndex?: number): void {
        new StyleEditorModal(this.app, this.plugin, existingStyle, editIndex, () => {
            this.renderSettings();
        }).open();
    }

    private openStandardStyleEditorModal(styleName: string): void {
        const style = this.plugin.settings.standardStyles[styleName];
        new StandardStyleEditorModal(this.app, this.plugin, styleName, style, () => {
            this.renderSettings();
        }).open();
    }
}

/**
 * Interactive Modal for editing / creating Custom Callout Styles with Live Preview
 */
type StyleModalSection = 'identity' | 'colors' | 'icon' | 'layout';

class StyleEditorModal extends Modal {
    private plugin: PluginWithSettings;
    private style: CalloutStyle;
    private editIndex?: number;
    private onSave: () => void;
    private activeSection: StyleModalSection = 'identity';

    constructor(app: App, plugin: PluginWithSettings, existingStyle?: CalloutStyle, editIndex?: number, onSave?: () => void) {
        super(app);
        this.plugin = plugin;
        this.editIndex = editIndex;
        this.onSave = onSave || (() => {});

        this.style = existingStyle ? { ...existingStyle } : {
            name: 'custom-' + Math.floor(Math.random() * 900 + 100),
            bg: '#3498db',
            border: '#3498db',
            text: '',
            link: '',
            titleColor: '',
            icon: 'pencil',
            iconColor: '',
            boldBorder: false,
            font: '',
            fontSize: 3,
            borderWidth: '1px',
            borderStyle: 'solid',
            borderRadius: '8px',
            neon: '',
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

        const previewContainer = contentEl.createDiv({ cls: 'sc-live-preview-container sc-sticky-preview' });
        const previewHeader = previewContainer.createDiv({ cls: 'sc-live-preview-header' });
        previewHeader.createSpan({ text: 'Live Interactive Preview' });

        const liveCallout = previewContainer.createDiv({ cls: 'callout sc-live-callout' });
        this.updateLivePreview(liveCallout);

        const nav = contentEl.createDiv({ cls: 'sc-nav-tabs sc-margin-bottom' });
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

        const sectionContainer = contentEl.createDiv({ cls: 'sc-section-content' });
        this.renderSectionContent(sectionContainer, liveCallout);

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
                    .setDesc('Identifier used in markdown: > [!style-name]')
                    .addText(text => text
                        .setValue(this.style.name)
                        .onChange(val => {
                            this.style.name = val.toLowerCase().replace(/\s+/g, '-');
                            this.updateLivePreview(liveCallout);
                        }));

                new Setting(container)
                    .setName('Show in Command Palette')
                    .setDesc('Register an "Insert <Style Name> Callout" command in Obsidian\'s Command Palette')
                    .addToggle(toggle => toggle
                        .setValue(this.style.showInCommandPalette !== false)
                        .onChange(val => {
                            this.style.showInCommandPalette = val;
                        }));
                break;

            case 'colors':
                createColorSetting(container, 'Background Color', 'Card background tint', this.style.bg || '', '#3498db', val => {
                    this.style.bg = val;
                    this.updateLivePreview(liveCallout);
                });

                createColorSetting(container, 'Border Color', 'Card outline border', this.style.border || '', '#3498db', val => {
                    this.style.border = val;
                    this.updateLivePreview(liveCallout);
                });

                createColorSetting(container, 'Title Color', 'Header title text color', this.style.titleColor || '', '', val => {
                    this.style.titleColor = val;
                    this.updateLivePreview(liveCallout);
                });

                createColorSetting(container, 'Body Text Color', 'Callout body text color', this.style.text || '', '', val => {
                    this.style.text = val;
                    this.updateLivePreview(liveCallout);
                });

                createColorSetting(container, 'Neon Glow', 'Cyberpunk neon border & glow', this.style.neon || '', '', val => {
                    this.style.neon = val;
                    this.updateLivePreview(liveCallout);
                });
                break;

            case 'icon':
                new Setting(container)
                    .setName('Hide Icon (no-icon)')
                    .addToggle(toggle => toggle
                        .setValue(!!this.style.noIcon)
                        .onChange(val => {
                            this.style.noIcon = val;
                            this.updateLivePreview(liveCallout);
                        }));

                createIconSetting(container, this.app, 'Callout Icon', 'Lucide icon name', this.style.icon || 'pencil', icon => {
                    this.style.icon = icon;
                    this.updateLivePreview(liveCallout);
                });

                createColorSetting(container, 'Custom Icon Color', 'Dedicated icon color', this.style.iconColor || '', '', val => {
                    this.style.iconColor = val;
                    this.updateLivePreview(liveCallout);
                });

                createFontSetting(container, this.style.font || '', val => {
                    this.style.font = val;
                    this.updateLivePreview(liveCallout);
                });

                createFontSizeSetting(container, this.style.fontSize, val => {
                    this.style.fontSize = val;
                    this.updateLivePreview(liveCallout);
                });
                break;

            case 'layout':
                createBorderStyleSetting(container, this.style.borderStyle || 'solid', val => {
                    this.style.borderStyle = val;
                    this.updateLivePreview(liveCallout);
                });

                new Setting(container)
                    .setName('Border Width')
                    .addDropdown(drop => {
                        drop.addOption('0px', 'None (0px)');
                        drop.addOption('1px', 'Thin (1px)');
                        drop.addOption('2px', 'Medium (2px)');
                        drop.addOption('4px', 'Thick (4px)');
                        drop.setValue(this.style.borderWidth || '1px');
                        drop.onChange(val => {
                            this.style.borderWidth = val;
                            this.updateLivePreview(liveCallout);
                        });
                    });

                new Setting(container)
                    .setName('Corner Radius')
                    .addSlider(slider => slider
                        .setLimits(0, 30, 2)
                        .setValue(parseInt(this.style.borderRadius || '8', 10) || 8)
                        .setDynamicTooltip()
                        .onChange(val => {
                            this.style.borderRadius = `${val}px`;
                            this.updateLivePreview(liveCallout);
                        }));

                new Setting(container)
                    .setName('Compact Padding')
                    .addToggle(toggle => toggle
                        .setValue(!!this.style.compact)
                        .onChange(val => {
                            this.style.compact = val;
                            this.updateLivePreview(liveCallout);
                        }));

                new Setting(container)
                    .setName('Center Alignment')
                    .addToggle(toggle => toggle
                        .setValue(!!this.style.center)
                        .onChange(val => {
                            this.style.center = val;
                            this.updateLivePreview(liveCallout);
                        }));
                break;
        }
    }

    private updateLivePreview(liveCallout: HTMLElement): void {
        liveCallout.empty();
        liveCallout.setAttribute('data-callout', 'note');

        const titleEl = liveCallout.createDiv({ cls: 'callout-title' });
        const iconEl = titleEl.createDiv({ cls: 'callout-icon' });
        const titleInner = titleEl.createDiv({ cls: 'callout-title-inner', text: this.style.name || 'Preview' });
        const bodyEl = liveCallout.createDiv({ cls: 'callout-content' });
        bodyEl.createEl('p', { text: 'Custom callout style live preview...' });

        applyStyleToLivePreview(liveCallout, iconEl, titleInner, this.style);
    }
}

/**
 * Interactive Modal for editing standard Obsidian callouts
 */
class StandardStyleEditorModal extends Modal {
    private plugin: PluginWithSettings;
    private styleName: string;
    private style: CalloutStyle;
    private onSave: () => void;

    constructor(app: App, plugin: PluginWithSettings, styleName: string, existingStyle?: CalloutStyle, onSave?: () => void) {
        super(app);
        this.plugin = plugin;
        this.styleName = styleName;
        this.onSave = onSave || (() => {});

        const def = DEFAULT_STANDARD_STYLES[styleName] || { name: styleName, bg: '#448aff', border: '#448aff', text: '', link: '', icon: 'pencil', titleColor: '' };
        this.style = existingStyle ? { ...existingStyle } : { ...def };
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('special-callouts-ui');

        contentEl.createEl('h2', { text: `Edit Standard Callout: ${this.styleName.toUpperCase()}` });

        const previewContainer = contentEl.createDiv({ cls: 'sc-live-preview-container sc-sticky-preview' });
        const liveCallout = previewContainer.createDiv({ cls: 'callout sc-live-callout' });
        this.updateLivePreview(liveCallout);

        const formContainer = contentEl.createDiv({ cls: 'sc-section-content' });

        createColorSetting(formContainer, 'Background Color', 'Standard callout tint', this.style.bg || '', '#448aff', val => {
            this.style.bg = val;
            this.updateLivePreview(liveCallout);
        });

        createColorSetting(formContainer, 'Border Color', 'Standard outline border', this.style.border || '', '#448aff', val => {
            this.style.border = val;
            this.updateLivePreview(liveCallout);
        });

        createColorSetting(formContainer, 'Title Color', 'Header title color', this.style.titleColor || '', '', val => {
            this.style.titleColor = val;
            this.updateLivePreview(liveCallout);
        });

        createColorSetting(formContainer, 'Body Text Color', 'Text color', this.style.text || '', '', val => {
            this.style.text = val;
            this.updateLivePreview(liveCallout);
        });

        createIconSetting(formContainer, this.app, 'Default Icon', 'Standard icon', this.style.icon || 'pencil', icon => {
            this.style.icon = icon;
            this.updateLivePreview(liveCallout);
        });

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Save Changes')
                .setCta()
                .onClick(async () => {
                    this.plugin.settings.standardStyles[this.styleName] = this.style;
                    await this.plugin.saveSettings();
                    new Notice(`Updated standard style "${this.styleName}"!`);
                    this.onSave();
                    this.close();
                }))
            .addButton(btn => btn
                .setButtonText('Cancel')
                .onClick(() => this.close()));
    }

    private updateLivePreview(liveCallout: HTMLElement): void {
        liveCallout.empty();
        liveCallout.setAttribute('data-callout', this.styleName);

        const titleEl = liveCallout.createDiv({ cls: 'callout-title' });
        const iconEl = titleEl.createDiv({ cls: 'callout-icon' });
        const titleInner = titleEl.createDiv({ cls: 'callout-title-inner', text: this.styleName.toUpperCase() });
        const bodyEl = liveCallout.createDiv({ cls: 'callout-content' });
        bodyEl.createEl('p', { text: `Standard ${this.styleName} preview content...` });

        applyStyleToLivePreview(liveCallout, iconEl, titleInner, this.style);
    }
}
