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
import { DEFAULT_STANDARD_STYLES, DEFAULT_STANDARD_COLORS, FONT_FAMILIES, FONT_SIZES, QUICK_START_PRESETS } from '../constants';
import { isValidHex, normalizeHex, toPx, neonStyles } from '../utils';
import { IconPickerModal } from '../modals/IconPickerModal';
import { showHowToUse } from '../modals/HowToModal';
import { showMetadataReference } from '../modals/MetadataModal';

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

        const right = banner.createDiv();
        right.style.display = 'flex';
        right.style.gap = '8px';

        const guideBtn = new ButtonComponent(right)
            .setButtonText('=��� Cheat Sheet')
            .onClick(() => {
                showMetadataReference(this.app);
            });

        const newBtn = new ButtonComponent(right)
            .setButtonText('+ New Style')
            .setCta()
            .onClick(() => {
                this.openStyleEditorModal();
            });
        newBtn.buttonEl.style.fontWeight = '600';
    }

    private renderNavTabs(container: HTMLElement): void {
        const nav = container.createDiv({ cls: 'sc-nav-tabs' });

        const tabs: { id: SettingsTabId; label: string; icon: string }[] = [
            { id: 'styles', label: 'Custom Styles', icon: 'palette' },
            { id: 'standard', label: 'Standard Callouts', icon: 'bookmark' },
            { id: 'colors', label: 'Color Palettes', icon: 'droplet' },
            { id: 'layouts', label: 'Layout Builder', icon: 'layout-grid' },
            { id: 'guide', label: 'Guide & Syntax', icon: 'book-open' },
            { id: 'general', label: 'General & Defaults', icon: 'settings' }
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

    // =========================================================================
    // TAB 1: CUSTOM STYLES
    // =========================================================================
    private renderCustomStylesTab(container: HTMLElement): void {
        const topBar = container.createDiv({ cls: 'sc-tab-top-bar' });
        topBar.style.display = 'flex';
        topBar.style.justifyContent = 'space-between';
        topBar.style.alignItems = 'center';
        topBar.style.marginBottom = '1rem';
        topBar.style.gap = '12px';

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
                            link: preset.border,
                            titleColor: preset.title,
                            icon: preset.icon,
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
                            titleCenter: false
                        });
                        addedCount++;
                    }
                });
                await this.plugin.saveSettings();
                new Notice(`Added ${addedCount} starter presets!`);
                this.renderSettings();
            });

        const cardsGrid = container.createDiv({ cls: 'sc-cards-grid' });
        this.renderCustomStylesCards(cardsGrid);
    }

    private renderCustomStylesCards(cardsGrid: HTMLElement): void {
        cardsGrid.empty();

        const filtered = this.plugin.settings.customStyles.filter(style =>
            style.name.toLowerCase().includes(this.searchQuery) ||
            (style.icon && style.icon.toLowerCase().includes(this.searchQuery))
        );

        if (filtered.length === 0) {
            const emptyNotice = cardsGrid.createDiv();
            emptyNotice.style.gridColumn = '1 / -1';
            emptyNotice.style.textAlign = 'center';
            emptyNotice.style.padding = '2.5rem 1rem';
            emptyNotice.style.color = 'var(--text-muted)';
            emptyNotice.createEl('p', { text: this.searchQuery ? 'No styles match your search.' : 'No custom styles created yet. Click "+ New Style" or "Add Starter Presets" to get started!' });
            return;
        }

        filtered.forEach((style, index) => {
            const card = cardsGrid.createDiv({ cls: 'sc-card-item' });

            const top = card.createDiv({ cls: 'sc-card-top' });

            const iconContainer = top.createDiv({ cls: 'sc-card-icon' });
            iconContainer.style.backgroundColor = style.bg ? `color-mix(in srgb, ${style.bg} 25%, transparent)` : 'var(--background-modifier-border)';
            iconContainer.style.color = style.iconColor || style.titleColor || style.bg || 'var(--text-normal)';
            setIcon(iconContainer, style.icon || 'pencil');

            const title = top.createDiv({ cls: 'sc-card-title', text: style.name });
            title.style.color = style.titleColor || 'var(--text-normal)';

            // Callout Mini Preview
            const preview = card.createDiv({ cls: 'sc-card-preview' });
            preview.style.padding = '6px 10px';
            preview.style.borderRadius = style.borderRadius ? toPx(style.borderRadius) : '6px';
            preview.style.border = style.border ? `${style.borderWidth || '1px'} ${style.borderStyle || 'solid'} ${style.border}` : '1px solid var(--background-modifier-border)';
            preview.style.backgroundColor = style.bg ? `color-mix(in srgb, ${style.bg} 15%, transparent)` : 'var(--background-secondary)';
            preview.style.fontSize = '0.8rem';
            preview.style.color = style.text || 'var(--text-muted)';
            preview.createEl('div', { text: `> [!${style.name}] Example text preview` });

            // Actions
            const actions = card.createDiv({ cls: 'sc-card-actions' });

            // Copy Markdown
            const copyBtn = actions.createEl('button', { cls: 'sc-action-btn', title: 'Copy Markdown (> [!name])' });
            setIcon(copyBtn, 'copy');
            copyBtn.onclick = () => {
                const md = `> [!${style.name}]\n> `;
                navigator.clipboard.writeText(md);
                copyBtn.empty();
                setIcon(copyBtn, 'check');
                copyBtn.addClass('sc-btn-success');
                setTimeout(() => {
                    copyBtn.empty();
                    setIcon(copyBtn, 'copy');
                    copyBtn.removeClass('sc-btn-success');
                }, 1500);
                new Notice(`Copied: > [!${style.name}]`);
            };

            // Duplicate
            const dupBtn = actions.createEl('button', { cls: 'sc-action-btn', title: 'Duplicate Style' });
            setIcon(dupBtn, 'copy-plus');
            dupBtn.onclick = async () => {
                let copyName = `${style.name}-copy`;
                let copyCount = 1;
                while (this.plugin.settings.customStyles.some(s => s.name.toLowerCase() === copyName.toLowerCase())) {
                    copyCount++;
                    copyName = `${style.name}-copy-${copyCount}`;
                }
                const copy: CalloutStyle = { ...style, name: copyName };
                this.plugin.settings.customStyles.push(copy);
                await this.plugin.saveSettings();
                new Notice(`Duplicated as "${copy.name}"`);
                this.renderSettings();
            };

            // Edit
            const editBtn = actions.createEl('button', { cls: 'sc-action-btn', title: 'Edit Style' });
            setIcon(editBtn, 'pencil');
            editBtn.onclick = () => {
                this.openStyleEditorModal(style, index);
            };

            // Delete
            const delBtn = actions.createEl('button', { cls: 'sc-action-btn is-danger', title: 'Delete Style' });
            setIcon(delBtn, 'trash');
            delBtn.onclick = async () => {
                this.plugin.settings.customStyles.splice(index, 1);
                await this.plugin.saveSettings();
                new Notice(`Deleted style "${style.name}"`);
                this.renderSettings();
            };
        });
    }

    // =========================================================================
    // TAB 2: STANDARD CALLOUTS
    // =========================================================================
    private renderStandardStylesTab(container: HTMLElement): void {
        container.createEl('p', {
            text: 'Customize default colors and icons for Obsidian native callouts (Note, Tip, Warning, Danger, Info, etc.)',
            cls: 'sc-header-subtitle'
        });

        const cardsGrid = container.createDiv({ cls: 'sc-cards-grid' });
        const standardKeys = Object.keys(this.plugin.settings.standardStyles);

        standardKeys.forEach(key => {
            const style = this.plugin.settings.standardStyles[key];
            const defaultStyle = DEFAULT_STANDARD_STYLES[key];
            const isModified = defaultStyle && (
                style.bg !== defaultStyle.bg ||
                style.text !== defaultStyle.text ||
                style.titleColor !== defaultStyle.titleColor ||
                style.link !== defaultStyle.link ||
                style.icon !== defaultStyle.icon
            );

            const card = cardsGrid.createDiv({ cls: 'sc-card-item' });

            const top = card.createDiv({ cls: 'sc-card-top' });
            const iconContainer = top.createDiv({ cls: 'sc-card-icon' });
            iconContainer.style.backgroundColor = `color-mix(in srgb, ${style.bg} 25%, transparent)`;
            iconContainer.style.color = style.bg;
            setIcon(iconContainer, style.icon || 'pencil');

            const title = top.createDiv({ cls: 'sc-card-title', text: key.toUpperCase() });
            title.style.color = style.titleColor || style.bg;

            if (isModified) {
                const badge = top.createSpan({ text: 'MODIFIED' });
                badge.style.fontSize = '0.65rem';
                badge.style.padding = '2px 6px';
                badge.style.borderRadius = '4px';
                badge.style.background = 'var(--interactive-accent)';
                badge.style.color = 'var(--text-on-accent)';
            }

            // Preview
            const preview = card.createDiv({ cls: 'sc-card-preview' });
            preview.style.padding = '6px 10px';
            preview.style.borderRadius = '6px';
            preview.style.border = `1px solid ${style.border || style.bg}`;
            preview.style.backgroundColor = `color-mix(in srgb, ${style.bg} 15%, transparent)`;
            preview.style.fontSize = '0.8rem';
            preview.style.color = style.text || 'var(--text-normal)';
            preview.createEl('div', { text: `> [!${key}] Standard ${key} callout` });

            // Actions
            const actions = card.createDiv({ cls: 'sc-card-actions' });

            const editBtn = actions.createEl('button', { cls: 'sc-action-btn', title: 'Edit Callout' });
            setIcon(editBtn, 'pencil');
            editBtn.onclick = () => {
                this.openStandardStyleEditorModal(key);
            };

            if (isModified && defaultStyle) {
                const resetBtn = actions.createEl('button', { cls: 'sc-action-btn', title: 'Reset to Default' });
                setIcon(resetBtn, 'rotate-ccw');
                resetBtn.onclick = async () => {
                    this.plugin.settings.standardStyles[key] = { ...defaultStyle };
                    await this.plugin.saveSettings();
                    new Notice(`Reset "${key}" to default.`);
                    this.renderSettings();
                };
            }
        });
    }

    // =========================================================================
    // TAB 3: COLOR PALETTES
    // =========================================================================
    private renderColorsTab(container: HTMLElement): void {
        new Setting(container)
            .setName('Standard Palette')
            .setDesc('Built-in named colors for quick metadata shortcuts (e.g. bg:red, border:purple)')
            .setHeading();

        const stdGrid = container.createDiv({ cls: 'sc-cards-grid' });
        stdGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';

        Object.entries(this.plugin.settings.standardColors).forEach(([name, hex]) => {
            const item = stdGrid.createDiv({ cls: 'sc-card-item' });
            item.style.padding = '10px 12px';

            const row = item.createDiv();
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.gap = '10px';

            const swatch = row.createDiv();
            swatch.style.width = '24px';
            swatch.style.height = '24px';
            swatch.style.borderRadius = '50%';
            swatch.style.backgroundColor = hex;
            swatch.style.border = '1px solid var(--background-modifier-border)';

            const label = row.createDiv();
            label.createEl('div', { text: name, cls: 'sc-card-title' });
            label.createEl('div', { text: hex, attr: { style: 'font-size: 0.75rem; color: var(--text-muted);' } });

            const picker = row.createEl('input', { type: 'color', value: normalizeHex(hex) });
            picker.style.marginLeft = 'auto';
            picker.style.cursor = 'pointer';
            picker.onchange = async (e) => {
                const val = (e.target as HTMLInputElement).value;
                this.plugin.settings.standardColors[name] = val;
                await this.plugin.saveSettings();
                this.renderSettings();
            };
        });

        // Custom User Colors
        new Setting(container)
            .setName('Custom Named Colors')
            .setDesc('Define your own named colors for use in callouts (e.g. bg:brand, border:accent)')
            .setHeading();

        const addRow = container.createDiv();
        addRow.style.display = 'flex';
        addRow.style.gap = '10px';
        addRow.style.marginBottom = '1rem';
        addRow.style.alignItems = 'center';

        const nameInput = addRow.createEl('input', { type: 'text', placeholder: 'Color Name (e.g. brand)' });
        nameInput.style.padding = '6px 12px';
        nameInput.style.borderRadius = '6px';
        nameInput.style.border = '1px solid var(--background-modifier-border)';
        nameInput.style.background = 'var(--background-primary)';

        const colorPicker = addRow.createEl('input', { type: 'color', value: '#3498db' });
        colorPicker.style.cursor = 'pointer';

        new ButtonComponent(addRow)
            .setButtonText('+ Add Color')
            .setCta()
            .onClick(async () => {
                const name = nameInput.value.trim().toLowerCase();
                const hex = colorPicker.value;
                if (!name) {
                    new Notice('Please enter a color name.');
                    return;
                }
                if (this.plugin.settings.customColors.some(c => c.name.toLowerCase() === name)) {
                    new Notice('A color with this name already exists.');
                    return;
                }
                this.plugin.settings.customColors.push({ name, hex });
                await this.plugin.saveSettings();
                new Notice(`Added custom color "${name}"`);
                this.renderSettings();
            });

        const customGrid = container.createDiv({ cls: 'sc-cards-grid' });
        customGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';

        this.plugin.settings.customColors.forEach((color, index) => {
            const item = customGrid.createDiv({ cls: 'sc-card-item' });
            item.style.padding = '10px 12px';

            const row = item.createDiv();
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.gap = '10px';

            const swatch = row.createDiv();
            swatch.style.width = '24px';
            swatch.style.height = '24px';
            swatch.style.borderRadius = '50%';
            swatch.style.backgroundColor = color.hex;
            swatch.style.border = '1px solid var(--background-modifier-border)';

            const label = row.createDiv();
            label.createEl('div', { text: color.name, cls: 'sc-card-title' });
            label.createEl('div', { text: color.hex, attr: { style: 'font-size: 0.75rem; color: var(--text-muted);' } });

            const delBtn = row.createEl('button', { cls: 'sc-action-btn is-danger', title: 'Delete' });
            delBtn.style.marginLeft = 'auto';
            setIcon(delBtn, 'trash');
            delBtn.onclick = async () => {
                this.plugin.settings.customColors.splice(index, 1);
                await this.plugin.saveSettings();
                this.renderSettings();
            };
        });
    }

    // =========================================================================
    // TAB 4: LAYOUT BUILDER
    // =========================================================================
    private renderLayoutBuilderTab(container: HTMLElement): void {
        new Setting(container)
            .setName('Visual Layout Builder (Interactive)')
            .setDesc('Design custom multi-callout grid dashboards with merged/split areas. Use with > [!multi-callout] (layout_name).')
            .setHeading();

        const builderCard = container.createDiv({ cls: 'sc-live-preview-container' });

        const controlsRow = builderCard.createDiv();
        controlsRow.style.display = 'flex';
        controlsRow.style.gap = '12px';
        controlsRow.style.flexWrap = 'wrap';
        controlsRow.style.alignItems = 'flex-end';
        controlsRow.style.marginBottom = '1rem';

        // Layout Name
        const nameGroup = controlsRow.createDiv();
        nameGroup.createEl('label', { text: 'Layout Name', attr: { style: 'display:block; font-size:0.8rem; margin-bottom:4px;' } });
        const nameInput = nameGroup.createEl('input', { type: 'text', placeholder: 'my-dashboard', value: this.builderLayoutName });
        nameInput.style.padding = '6px 10px';
        nameInput.style.borderRadius = '4px';
        nameInput.style.border = '1px solid var(--background-modifier-border)';
        nameInput.style.background = 'var(--background-primary)';
        nameInput.oninput = (e) => this.builderLayoutName = (e.target as HTMLInputElement).value;

        // Columns
        const colsGroup = controlsRow.createDiv();
        colsGroup.createEl('label', { text: 'Cols', attr: { style: 'display:block; font-size:0.8rem; margin-bottom:4px;' } });
        const colsSelect = new DropdownComponent(colsGroup);
        [1, 2, 3, 4, 5, 6].forEach(n => colsSelect.addOption(n.toString(), n.toString()));
        colsSelect.setValue(this.builderCols.toString());
        colsSelect.onChange(val => {
            this.builderCols = parseInt(val);
            this.initLayoutMatrix();
            drawGrid();
        });

        // Rows
        const rowsGroup = controlsRow.createDiv();
        rowsGroup.createEl('label', { text: 'Rows', attr: { style: 'display:block; font-size:0.8rem; margin-bottom:4px;' } });
        const rowsSelect = new DropdownComponent(rowsGroup);
        [1, 2, 3, 4, 5, 6].forEach(n => rowsSelect.addOption(n.toString(), n.toString()));
        rowsSelect.setValue(this.builderRows.toString());
        rowsSelect.onChange(val => {
            this.builderRows = parseInt(val);
            this.initLayoutMatrix();
            drawGrid();
        });

        // Action Buttons: Merge & Split
        const actionGroup = controlsRow.createDiv();
        actionGroup.style.display = 'flex';
        actionGroup.style.gap = '8px';
        actionGroup.style.alignItems = 'center';

        const mergeBtn = actionGroup.createEl('button', { cls: 'mod-cta' });
        mergeBtn.style.display = 'flex';
        mergeBtn.style.alignItems = 'center';
        mergeBtn.style.gap = '6px';
        setIcon(mergeBtn.createSpan(), 'combine');
        mergeBtn.createSpan({ text: 'Merge' });
        mergeBtn.title = 'Merge selected cells into one unified block';
        mergeBtn.onclick = () => {
            if (this.builderSelectedCells.length < 2) {
                new Notice('Please select 2 or more adjacent cells/areas to merge.');
                return;
            }
            const minR = Math.min(...this.builderSelectedCells.map(s => s.r));
            const maxR = Math.max(...this.builderSelectedCells.map(s => s.r));
            const minC = Math.min(...this.builderSelectedCells.map(s => s.c));
            const maxC = Math.max(...this.builderSelectedCells.map(s => s.c));

            const targetId = this.builderGridMatrix[minR][minC];
            for (let r = minR; r <= maxR; r++) {
                for (let c = minC; c <= maxC; c++) {
                    this.builderGridMatrix[r][c] = targetId;
                }
            }
            this.normalizeMatrix();
            this.builderSelectedCells = [];
            drawGrid();
        };

        const splitBtn = actionGroup.createEl('button');
        splitBtn.style.display = 'flex';
        splitBtn.style.alignItems = 'center';
        splitBtn.style.gap = '6px';
        setIcon(splitBtn.createSpan(), 'scissors');
        splitBtn.createSpan({ text: 'Split' });
        splitBtn.title = 'Split selected area back into individual 1x1 cells';
        splitBtn.onclick = () => {
            if (this.builderSelectedCells.length === 0) {
                new Notice('Please select an area to split.');
                return;
            }
            let maxId = 0;
            for (let r = 0; r < this.builderRows; r++) {
                for (let c = 0; c < this.builderCols; c++) {
                    if (this.builderGridMatrix[r][c] > maxId) maxId = this.builderGridMatrix[r][c];
                }
            }
            this.builderSelectedCells.forEach(({ r, c }) => {
                maxId++;
                this.builderGridMatrix[r][c] = maxId;
            });
            this.normalizeMatrix();
            this.builderSelectedCells = [];
            drawGrid();
        };

        const resetGridBtn = actionGroup.createEl('button');
        resetGridBtn.style.display = 'flex';
        resetGridBtn.style.alignItems = 'center';
        resetGridBtn.style.gap = '6px';
        setIcon(resetGridBtn.createSpan(), 'rotate-ccw');
        resetGridBtn.createSpan({ text: 'Reset Grid' });
        resetGridBtn.onclick = () => {
            this.initLayoutMatrix();
            this.builderSelectedCells = [];
            drawGrid();
        };

        // Grid Drawing Container
        // Grid Drawing Container
        const gridCanvas = builderCard.createDiv();
        gridCanvas.style.display = 'grid';
        gridCanvas.style.gap = '8px';
        gridCanvas.style.padding = '12px';
        gridCanvas.style.backgroundColor = 'var(--background-primary)';
        gridCanvas.style.borderRadius = '8px';
        gridCanvas.style.border = '1px dashed var(--background-modifier-border)';
        gridCanvas.style.minHeight = '160px';
        gridCanvas.style.marginBottom = '1rem';
        gridCanvas.style.userSelect = 'none';

        let isDragging = false;
        let dragStart: { r: number; c: number } | null = null;
        let dragMoved = false;

        const stopDragging = () => {
            isDragging = false;
            dragStart = null;
        };

        gridCanvas.onmouseleave = stopDragging;

        // Global mouseup stop listener bound once to plugin window
        const windowMouseUpHandler = () => stopDragging();
        window.addEventListener('mouseup', windowMouseUpHandler);

        const getUniqueAreas = () => {
            const areaMap = new Map<number, { id: number; minR: number; maxR: number; minC: number; maxC: number; cells: { r: number; c: number }[] }>();
            for (let r = 0; r < this.builderRows; r++) {
                for (let c = 0; c < this.builderCols; c++) {
                    const id = this.builderGridMatrix[r][c];
                    if (!areaMap.has(id)) {
                        areaMap.set(id, {
                            id,
                            minR: r,
                            maxR: r,
                            minC: c,
                            maxC: c,
                            cells: [{ r, c }]
                        });
                    } else {
                        const block = areaMap.get(id)!;
                        block.minR = Math.min(block.minR, r);
                        block.maxR = Math.max(block.maxR, r);
                        block.minC = Math.min(block.minC, c);
                        block.maxC = Math.max(block.maxC, c);
                        block.cells.push({ r, c });
                    }
                }
            }
            return Array.from(areaMap.values()).sort((a, b) => a.id - b.id);
        };

        const updateSelectionStyles = () => {
            const blocks = gridCanvas.querySelectorAll<HTMLElement>('.sc-builder-block');
            const areas = getUniqueAreas();

            blocks.forEach((block, index) => {
                const area = areas[index];
                if (!area) return;

                const isSelected = area.cells.length > 0 && area.cells.every(cell =>
                    this.builderSelectedCells.some(s => s.r === cell.r && s.c === cell.c)
                );

                block.style.border = isSelected ? '2px solid var(--interactive-accent)' : '1px solid var(--background-modifier-border)';
                block.style.backgroundColor = isSelected ? 'var(--background-modifier-hover)' : 'var(--background-secondary)';
                block.style.boxShadow = isSelected ? '0 0 10px rgba(var(--color-accent-rgb, 100, 100, 255), 0.25)' : 'none';

                const title = block.querySelector<HTMLElement>('.sc-builder-title');
                if (title) {
                    title.style.color = isSelected ? 'var(--text-accent)' : 'var(--text-normal)';
                }
            });
        };

        const drawGrid = () => {
            gridCanvas.empty();
            gridCanvas.style.gridTemplateColumns = `repeat(${this.builderCols}, 1fr)`;
            gridCanvas.style.gridTemplateRows = `repeat(${this.builderRows}, 70px)`;

            const areas = getUniqueAreas();

            areas.forEach(area => {
                const isSelected = area.cells.length > 0 && area.cells.every(cell =>
                    this.builderSelectedCells.some(s => s.r === cell.r && s.c === cell.c)
                );

                const spanCols = area.maxC - area.minC + 1;
                const spanRows = area.maxR - area.minR + 1;

                const block = gridCanvas.createDiv({ cls: 'sc-builder-block' });
                block.style.gridRow = `${area.minR + 1} / ${area.maxR + 2}`;
                block.style.gridColumn = `${area.minC + 1} / ${area.maxC + 2}`;
                block.style.display = 'flex';
                block.style.flexDirection = 'column';
                block.style.alignItems = 'center';
                block.style.justifyContent = 'center';
                block.style.borderRadius = '6px';
                block.style.cursor = 'pointer';
                block.style.userSelect = 'none';
                block.style.transition = 'all 0.15s ease';
                block.style.border = isSelected ? '2px solid var(--interactive-accent)' : '1px solid var(--background-modifier-border)';
                block.style.backgroundColor = isSelected ? 'var(--background-modifier-hover)' : 'var(--background-secondary)';
                block.style.boxShadow = isSelected ? '0 0 10px rgba(var(--color-accent-rgb, 100, 100, 255), 0.25)' : 'none';

                const title = block.createDiv({ cls: 'sc-builder-title' });
                title.style.fontWeight = '700';
                title.style.fontSize = '0.95rem';
                title.style.color = isSelected ? 'var(--text-accent)' : 'var(--text-normal)';
                title.innerText = `Area ${area.id}`;

                const badge = block.createDiv();
                badge.style.fontSize = '0.72rem';
                badge.style.color = 'var(--text-muted)';
                badge.style.marginTop = '2px';
                badge.innerText = (spanCols > 1 || spanRows > 1) ? `${spanCols} +� ${spanRows} Merged` : '1 +� 1 Slot';

                // Mouse Drag & Click Selection
                block.onmousedown = (e: MouseEvent) => {
                    if (e.button !== 0) return;
                    e.preventDefault();
                    isDragging = true;
                    dragMoved = false;
                    dragStart = { r: area.minR, c: area.minC };

                    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                        const alreadySelected = area.cells.every(cell =>
                            this.builderSelectedCells.some(s => s.r === cell.r && s.c === cell.c)
                        );
                        if (alreadySelected && this.builderSelectedCells.length === area.cells.length) {
                            this.builderSelectedCells = [];
                        } else {
                            this.builderSelectedCells = [...area.cells];
                        }
                    } else {
                        area.cells.forEach(cell => {
                            if (!this.builderSelectedCells.some(s => s.r === cell.r && s.c === cell.c)) {
                                this.builderSelectedCells.push({ r: cell.r, c: cell.c });
                            }
                        });
                    }
                    updateSelectionStyles();
                };

                block.onmouseenter = () => {
                    if (!isDragging || !dragStart) return;
                    dragMoved = true;

                    const minR = Math.min(dragStart.r, area.minR);
                    const maxR = Math.max(dragStart.r, area.maxR);
                    const minC = Math.min(dragStart.c, area.minC);
                    const maxC = Math.max(dragStart.c, area.maxC);

                    const newSelected: { r: number; c: number }[] = [];
                    for (let r = minR; r <= maxR; r++) {
                        for (let c = minC; c <= maxC; c++) {
                            newSelected.push({ r, c });
                        }
                    }
                    this.builderSelectedCells = newSelected;
                    updateSelectionStyles();
                };

                block.onmouseup = () => {
                    stopDragging();
                };
            });
        };

        drawGrid();

        // Save Layout Button
        const saveLayoutBtn = builderCard.createEl('button', { cls: 'mod-cta', text: 'Save Custom Layout' });
        saveLayoutBtn.onclick = async () => {
            const name = this.builderLayoutName.trim().toLowerCase().replace(/\s+/g, '-');
            if (!name) {
                new Notice('Please enter a layout name.');
                return;
            }

            const areaRows: string[] = [];
            for (let r = 0; r < this.builderRows; r++) {
                const rowCells = this.builderGridMatrix[r].map(id => `area${id}`).join(' ');
                areaRows.push(`"${rowCells}"`);
            }
            const gridAreas = areaRows.join(' ');

            const newLayout: CustomLayout = {
                name,
                cols: this.builderCols,
                rows: this.builderRows,
                gridAreas,
                showInCommandPalette: true
            };

            const existingIdx = this.plugin.settings.customLayouts.findIndex(l => l.name.toLowerCase() === name);
            if (existingIdx >= 0) {
                this.plugin.settings.customLayouts[existingIdx] = newLayout;
            } else {
                this.plugin.settings.customLayouts.push(newLayout);
            }

            await this.plugin.saveSettings();
            new Notice(`Layout "${name}" saved! Use with: > [!multi-callout] (${name})`);
            this.renderSettings();
        };

        // Saved Layouts List
        if (this.plugin.settings.customLayouts.length > 0) {
            new Setting(container)
                .setName('Saved Layouts')
                .setHeading();

            const savedGrid = container.createDiv({ cls: 'sc-cards-grid' });
            this.plugin.settings.customLayouts.forEach((layout, index) => {
                const item = savedGrid.createDiv({ cls: 'sc-card-item' });
                const top = item.createDiv({ cls: 'sc-card-top' });
                top.createDiv({ cls: 'sc-card-title', text: layout.name });

                const code = item.createEl('code', { text: `> [!multi-callout] (${layout.name})` });
                code.style.fontSize = '0.75rem';
                code.style.padding = '4px 6px';
                code.style.background = 'var(--background-primary)';
                code.style.borderRadius = '4px';

                const actions = item.createDiv({ cls: 'sc-card-actions' });
                const delBtn = actions.createEl('button', { cls: 'sc-action-btn is-danger', title: 'Delete' });
                setIcon(delBtn, 'trash');
                delBtn.onclick = async () => {
                    this.plugin.settings.customLayouts.splice(index, 1);
                    await this.plugin.saveSettings();
                    this.renderSettings();
                };
            });
        }
    }

    private initLayoutMatrix(): void {
        this.builderGridMatrix = [];
        let nextId = 1;
        for (let r = 0; r < this.builderRows; r++) {
            const row: number[] = [];
            for (let c = 0; c < this.builderCols; c++) {
                row.push(nextId++);
            }
            this.builderGridMatrix.push(row);
        }
    }

    private normalizeMatrix(): void {
        let currentId = 1;
        const oldToNew = new Map<number, number>();
        for (let r = 0; r < this.builderRows; r++) {
            for (let c = 0; c < this.builderCols; c++) {
                const oldId = this.builderGridMatrix[r][c];
                if (!oldToNew.has(oldId)) {
                    oldToNew.set(oldId, currentId++);
                }
                this.builderGridMatrix[r][c] = oldToNew.get(oldId)!;
            }
        }
    }

    // =========================================================================
    // TAB 5: GUIDE & SYNTAX REFERENCE
    // =========================================================================
    private renderGuideTab(container: HTMLElement): void {
        new Setting(container)
            .setName('Syntax & Metadata Cheat Sheet')
            .setDesc('Learn all ways to write and customize callouts in Special Callouts.')
            .setHeading();

        const guideContainer = container.createDiv({ cls: 'sc-live-preview-container' });

        // Method Overview
        guideContainer.createEl('h3', { text: '=�� Supported Callout Formats', attr: { style: 'margin-top:0; color:var(--interactive-accent);' } });
        
        const methods = [
            { title: '1. Direct Type Name', code: '> [!my-style]\n> Callout content', desc: 'Use any custom style directly as the callout type name.' },
            { title: '2. Native Obsidian Pipe Syntax', code: '> [!note|bg:red,icon:flame,compact]\n> Callout content', desc: 'Add parameters after the pipe delimiter.' },
            { title: '3. Leading / Trailing Parentheses', code: '> [!note] (bg:blue,radius:12) Title\n-- OR --\n> [!note] Title (bg:blue,compact)', desc: 'Place parameters in parentheses anywhere in the title line.' },
            { title: '4. Multi-Column Lists', code: '> [!note] (col:3)\n> - Item 1\n> - Item 2\n> - Item 3', desc: 'Divide bullet lists into responsive CSS columns.' },
            { title: '5. Multi-Callout Dashboard Grid', code: '> [!multi-callout]\n> > [!info] (1:2)\n> > Left Column\n> > [!tip] (2:2)\n> > Right Column', desc: 'Side-by-side callout grids using position:columns syntax.' }
        ];

        methods.forEach(m => {
            const box = guideContainer.createDiv({ cls: 'sc-card-item' });
            box.style.marginBottom = '12px';
            box.createEl('strong', { text: m.title });
            box.createEl('p', { text: m.desc, attr: { style: 'margin:4px 0 8px 0; font-size:0.85rem; color:var(--text-muted);' } });
            const pre = box.createEl('pre', { text: m.code });
            pre.style.margin = '0';
            pre.style.padding = '8px 10px';
            pre.style.borderRadius = '4px';
            pre.style.background = 'var(--background-primary)';
            pre.style.fontSize = '0.82rem';
        });

        // Parameters Table
        guideContainer.createEl('h3', { text: '=�Ŀ All Available Metadata Modifiers', attr: { style: 'margin-top:1.5rem; color:var(--interactive-accent);' } });

        const paramTable = guideContainer.createEl('table');
        paramTable.style.width = '100%';
        paramTable.style.borderCollapse = 'collapse';
        paramTable.style.fontSize = '0.85rem';

        const thead = paramTable.createEl('thead');
        const hRow = thead.createEl('tr');
        hRow.createEl('th', { text: 'Parameter', attr: { style: 'text-align:left; padding:6px; border-bottom:1px solid var(--background-modifier-border);' } });
        hRow.createEl('th', { text: 'Example', attr: { style: 'text-align:left; padding:6px; border-bottom:1px solid var(--background-modifier-border);' } });
        hRow.createEl('th', { text: 'Description', attr: { style: 'text-align:left; padding:6px; border-bottom:1px solid var(--background-modifier-border);' } });

        const paramsList = [
            ['bg:color', 'bg:#00bcd4 or bg:red', 'Background tint color'],
            ['text:color', 'text:#ffffff or text:white', 'Content text color'],
            ['title:color', 'title:cyan', 'Title text color'],
            ['icon:name', 'icon:flame or icon:star', 'Lucide icon name'],
            ['icon-color:color', 'icon-color:gold', 'Override icon color separately from title'],
            ['border:color', 'border:#ff9800 or border:none', 'Border color or remove border'],
            ['border-width:N', 'border-width:2 or border-width:4px', 'Border thickness'],
            ['border-style:style', 'border-style:dashed', 'solid, dashed, dotted, double'],
            ['radius:N', 'radius:16 or radius:0', 'Corner roundness (in px)'],
            ['neon:color', 'neon:#00f2ff', 'Glowing cyber neon border effect'],
            ['font:name', 'font:mono, font:serif, font:hand', 'Custom typography style'],
            ['font-size:1-5', 'font-size:4', 'Font size multiplier (3 is default)'],
            ['compact', 'compact', 'Dense mode with tighter padding'],
            ['dense', 'dense', 'Compact padding + tighter line height'],
            ['center', 'center', 'Center align title and text'],
            ['title:center', 'title:center', 'Center title only'],
            ['no-icon', 'no-icon', 'Hide callout icon completely'],
            ['col:N', 'col:2 or col:3', 'Multi-column list layout']
        ];

        const tbody = paramTable.createEl('tbody');
        paramsList.forEach(([p, ex, desc]) => {
            const tr = tbody.createEl('tr');
            tr.style.borderBottom = '1px solid var(--background-modifier-border-focus, rgba(128,128,128,0.1))';
            tr.createEl('td', { text: p, attr: { style: 'padding:6px; font-weight:600;' } });
            const tdEx = tr.createEl('td', { attr: { style: 'padding:6px;' } });
            tdEx.createEl('code', { text: ex });
            tr.createEl('td', { text: desc, attr: { style: 'padding:6px; color:var(--text-muted);' } });
        });
    }

    // =========================================================================
    // TAB 6: GENERAL & DEFAULTS
    // =========================================================================
    private renderGeneralTab(container: HTMLElement): void {
        new Setting(container)
            .setName('Default Callout Metadata')
            .setDesc('Default metadata (e.g. "compact, col:2") automatically appended when inserting callouts via command palette.')
            .addText(text => text
                .setPlaceholder('compact, col:2')
                .setValue(this.plugin.settings.defaultMetadata || '')
                .onChange(async (value) => {
                    this.plugin.settings.defaultMetadata = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(container)
            .setName('Command Palette Shortcuts')
            .setDesc('You can assign hotkeys to your favorite callouts in Settings G�� Hotkeys G�� Special Callouts.')
            .setHeading();

        new Setting(container)
            .setName('Backup & Data Management')
            .setDesc('Export or import your Special Callouts configuration as JSON')
            .setHeading();

        const backupRow = container.createDiv();
        backupRow.style.display = 'flex';
        backupRow.style.gap = '10px';
        backupRow.style.marginTop = '10px';

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
                new ImportSettingsModal(this.app, this.plugin, () => {
                    this.renderSettings();
                }).open();
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
    // STYLE EDITOR MODALS WITH FULL PARAMETERS & LIVE PREVIEW
    // =========================================================================
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
 * Interactive Modal for editing / creating Custom Callout Styles with Live Preview & Section Tabs
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
                    .setDesc('The identifier you will use in markdown: > [!style-name]')
                    .addText(text => text
                        .setValue(this.style.name)
                        .onChange(val => {
                            this.style.name = val.toLowerCase().replace(/\s+/g, '-');
                            this.updateLivePreview(liveCallout);
                        }));
                break;

            case 'colors':
                let bgTextComp: TextComponent;
                new Setting(container)
                    .setName('Background Color')
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

                let titleTextComp: TextComponent;
                new Setting(container)
                    .setName('Title Color')
                    .addText(text => {
                        titleTextComp = text;
                        text.setPlaceholder('#ffffff or auto')
                            .setValue(this.style.titleColor || '')
                            .onChange(val => {
                                this.style.titleColor = val;
                                this.updateLivePreview(liveCallout);
                            });
                    })
                    .addColorPicker(picker => picker
                        .setValue(normalizeHex(this.style.titleColor || '#ffffff'))
                        .onChange(val => {
                            this.style.titleColor = val;
                            if (titleTextComp) titleTextComp.setValue(val);
                            this.updateLivePreview(liveCallout);
                        }));

                let iconTextComp: TextComponent;
                new Setting(container)
                    .setName('Icon Color')
                    .setDesc('Leave blank to follow title color')
                    .addText(text => {
                        iconTextComp = text;
                        text.setPlaceholder('Auto (follows title)')
                            .setValue(this.style.iconColor || '')
                            .onChange(val => {
                                this.style.iconColor = val;
                                this.updateLivePreview(liveCallout);
                            });
                    })
                    .addColorPicker(picker => picker
                        .setValue(normalizeHex(this.style.iconColor || '#ffffff'))
                        .onChange(val => {
                            this.style.iconColor = val;
                            if (iconTextComp) iconTextComp.setValue(val);
                            this.updateLivePreview(liveCallout);
                        }));

                let textColorComp: TextComponent;
                new Setting(container)
                    .setName('Text Color')
                    .setDesc('Content text color (leave blank for theme default)')
                    .addText(text => {
                        textColorComp = text;
                        text.setPlaceholder('theme default')
                            .setValue(this.style.text || '')
                            .onChange(val => {
                                this.style.text = val;
                                this.updateLivePreview(liveCallout);
                            });
                    })
                    .addColorPicker(picker => picker
                        .setValue(normalizeHex(this.style.text || '#ffffff'))
                        .onChange(val => {
                            this.style.text = val;
                            if (textColorComp) textColorComp.setValue(val);
                            this.updateLivePreview(liveCallout);
                        }));

                let linkTextComp: TextComponent;
                new Setting(container)
                    .setName('Link Color')
                    .addText(text => {
                        linkTextComp = text;
                        text.setPlaceholder('theme default')
                            .setValue(this.style.link || '')
                            .onChange(val => {
                                this.style.link = val;
                                this.updateLivePreview(liveCallout);
                            });
                    })
                    .addColorPicker(picker => picker
                        .setValue(normalizeHex(this.style.link || '#3498db'))
                        .onChange(val => {
                            this.style.link = val;
                            if (linkTextComp) linkTextComp.setValue(val);
                            this.updateLivePreview(liveCallout);
                        }));

                let neonTextComp: TextComponent;
                new Setting(container)
                    .setName('Neon Glow Effect')
                    .setDesc('Illuminated cyber neon border glow')
                    .addText(text => {
                        neonTextComp = text;
                        text.setPlaceholder('#00f2ff or cyan')
                            .setValue(this.style.neon || '')
                            .onChange(val => {
                                this.style.neon = val;
                                this.updateLivePreview(liveCallout);
                            });
                    })
                    .addColorPicker(picker => picker
                        .setValue(normalizeHex(this.style.neon || '#00f2ff'))
                        .onChange(val => {
                            this.style.neon = val;
                            if (neonTextComp) neonTextComp.setValue(val);
                            this.updateLivePreview(liveCallout);
                        }));
                break;

            case 'icon':
                const iconSetting = new Setting(container)
                    .setName('Callout Icon')
                    .setDesc('Choose a Lucide icon');

                const iconPreviewSpan = iconSetting.nameEl.createSpan();
                iconPreviewSpan.style.marginLeft = '10px';
                setIcon(iconPreviewSpan, this.style.icon || 'pencil');

                iconSetting.addButton(btn => btn
                    .setButtonText('Choose Icon')
                    .onClick(() => {
                        new IconPickerModal(this.app, (selected) => {
                            this.style.icon = selected;
                            iconPreviewSpan.empty();
                            setIcon(iconPreviewSpan, selected);
                            this.updateLivePreview(liveCallout);
                        }).open();
                    }));

                new Setting(container)
                    .setName('Font Family')
                    .addDropdown(drop => drop
                        .addOption('', 'Default (Interface Font)')
                        .addOption('mono', 'Monospace')
                        .addOption('serif', 'Serif')
                        .addOption('sans', 'Sans-Serif')
                        .addOption('hand', 'Handwritten')
                        .addOption('marker', 'Marker')
                        .setValue(this.style.font || '')
                        .onChange(val => {
                            this.style.font = val;
                            this.updateLivePreview(liveCallout);
                        }));

                new Setting(container)
                    .setName('Font Size')
                    .addDropdown(drop => drop
                        .addOption('1', '1 - Smallest (0.85em)')
                        .addOption('2', '2 - Small (0.92em)')
                        .addOption('3', '3 - Medium / Default (1.0em)')
                        .addOption('4', '4 - Large (1.2em)')
                        .addOption('5', '5 - Largest (1.5em)')
                        .setValue((this.style.fontSize || 3).toString())
                        .onChange(val => {
                            this.style.fontSize = parseInt(val);
                            this.updateLivePreview(liveCallout);
                        }));
                break;

            case 'layout':
                new Setting(container)
                    .setName('Border Width')
                    .addDropdown(drop => drop
                        .addOption('', 'Default')
                        .addOption('1px', '1px (Thin)')
                        .addOption('2px', '2px (Medium)')
                        .addOption('4px', '4px (Thick)')
                        .setValue(this.style.borderWidth || '1px')
                        .onChange(val => {
                            this.style.borderWidth = val;
                            this.updateLivePreview(liveCallout);
                        }));

                new Setting(container)
                    .setName('Border Style')
                    .addDropdown(drop => drop
                        .addOption('solid', 'Solid')
                        .addOption('dashed', 'Dashed')
                        .addOption('dotted', 'Dotted')
                        .addOption('double', 'Double')
                        .addOption('groove', 'Groove')
                        .addOption('ridge', 'Ridge')
                        .addOption('inset', 'Inset')
                        .addOption('outset', 'Outset')
                        .addOption('none', 'None')
                        .setValue(this.style.borderStyle || 'solid')
                        .onChange(val => {
                            this.style.borderStyle = val;
                            this.updateLivePreview(liveCallout);
                        }));

                new Setting(container)
                    .setName('Corner Radius')
                    .addSlider(slider => slider
                        .setLimits(0, 30, 1)
                        .setValue(parseInt(this.style.borderRadius) || 8)
                        .onChange(val => {
                            this.style.borderRadius = `${val}px`;
                            this.updateLivePreview(liveCallout);
                        }));

                new Setting(container)
                    .setName('Compact Mode')
                    .setDesc('Tighter padding for lists & dense notes')
                    .addToggle(toggle => toggle
                        .setValue(this.style.compact || false)
                        .onChange(val => {
                            this.style.compact = val;
                            this.updateLivePreview(liveCallout);
                        }));

                new Setting(container)
                    .setName('Center Alignment')
                    .setDesc('Center align both title and content text')
                    .addToggle(toggle => toggle
                        .setValue(this.style.center || false)
                        .onChange(val => {
                            this.style.center = val;
                            this.updateLivePreview(liveCallout);
                        }));

                new Setting(container)
                    .setName('Center Title Only')
                    .setDesc('Center align only the title while keeping text left-aligned')
                    .addToggle(toggle => toggle
                        .setValue(this.style.titleCenter || false)
                        .onChange(val => {
                            this.style.titleCenter = val;
                            this.updateLivePreview(liveCallout);
                        }));

                new Setting(container)
                    .setName('Hide Icon (no-icon)')
                    .setDesc('Hide the callout icon completely for a minimalist look')
                    .addToggle(toggle => toggle
                        .setValue(this.style.noIcon || false)
                        .onChange(val => {
                            this.style.noIcon = val;
                            this.updateLivePreview(liveCallout);
                        }));

                new Setting(container)
                    .setName('Show in Command Palette')
                    .setDesc('Add a command to Obsidian command palette for inserting this style')
                    .addToggle(toggle => toggle
                        .setValue(this.style.showInCommandPalette !== false)
                        .onChange(val => {
                            this.style.showInCommandPalette = val;
                        }));
                break;
        }
    }

    private updateLivePreview(el: HTMLElement): void {
        el.empty();

        const bg = this.style.bg ? `color-mix(in srgb, ${this.style.bg} 15%, transparent)` : 'var(--background-secondary)';
        const border = this.style.border ? `${this.style.borderWidth || '1px'} ${this.style.borderStyle || 'solid'} ${this.style.border}` : '1px solid var(--background-modifier-border)';

        el.style.backgroundColor = bg;
        el.style.border = border;
        el.style.borderRadius = this.style.borderRadius ? toPx(this.style.borderRadius) : '8px';
        el.style.padding = this.style.compact ? '0.4em 0.8em' : '0.8em 1.2em';
        el.style.textAlign = this.style.center ? 'center' : 'left';

        if (this.style.font && FONT_FAMILIES[this.style.font]) {
            el.style.fontFamily = FONT_FAMILIES[this.style.font];
        } else {
            el.style.fontFamily = 'inherit';
        }

        if (this.style.fontSize && FONT_SIZES[this.style.fontSize]) {
            el.style.fontSize = FONT_SIZES[this.style.fontSize];
        } else {
            el.style.fontSize = '1em';
        }

        if (this.style.neon) {
            const neon = neonStyles(this.style.neon);
            el.style.border = neon['--sc-neon-border'];
            el.style.boxShadow = neon['--sc-neon-shadow'];
        } else {
            el.style.boxShadow = 'none';
        }

        // Title
        const titleEl = el.createDiv({ cls: 'callout-title' });
        titleEl.style.display = 'flex';
        titleEl.style.alignItems = 'center';
        titleEl.style.gap = '8px';
        titleEl.style.justifyContent = (this.style.center || this.style.titleCenter) ? 'center' : 'flex-start';
        titleEl.style.color = this.style.titleColor || this.style.border || 'var(--text-normal)';
        titleEl.style.fontWeight = '600';
        titleEl.style.marginBottom = '4px';

        if (!this.style.noIcon) {
            const iconEl = titleEl.createDiv({ cls: 'callout-icon' });
            iconEl.style.color = this.style.iconColor || this.style.titleColor || this.style.border || 'inherit';
            setIcon(iconEl, this.style.icon || 'pencil');
        }

        titleEl.createSpan({ text: this.style.name || 'Sample Title' });

        // Content
        const contentEl = el.createDiv({ cls: 'callout-content' });
        contentEl.style.color = this.style.text || 'var(--text-muted)';
        const p = contentEl.createEl('p');
        p.createSpan({ text: 'This is how your callout renders with ' });
        p.createEl('code', { text: 'inline_code()' });
        p.createSpan({ text: ', text, and ' });
        const sampleLink = p.createEl('a', { text: 'links inside', href: '#' });
        if (this.style.link) {
            sampleLink.style.color = this.style.link;
        }
        p.createSpan({ text: '!' });
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

    constructor(app: App, plugin: PluginWithSettings, styleName: string, existingStyle: CalloutStyle, onSave?: () => void) {
        super(app);
        this.plugin = plugin;
        this.styleName = styleName;
        this.style = existingStyle ? { ...existingStyle } : {
            name: styleName,
            bg: '#448aff',
            border: '#448aff',
            text: '',
            link: '',
            icon: 'pencil'
        };
        this.onSave = onSave || (() => {});
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('special-callouts-ui');

        contentEl.createEl('h2', { text: `Edit Standard "${this.styleName.toUpperCase()}" Callout` });

        // Sticky Live Preview
        const previewWrap = contentEl.createDiv({ cls: 'sc-preview-wrap' });
        const liveCallout = previewWrap.createDiv({ cls: 'callout sc-live-callout' });
        this.updateLivePreview(liveCallout);

        let bgTextComp: TextComponent;
        new Setting(contentEl)
            .setName('Background Color')
            .addText(text => {
                bgTextComp = text;
                text.setValue(this.style.bg || '')
                    .onChange(val => {
                        this.style.bg = val;
                        this.updateLivePreview(liveCallout);
                    });
            })
            .addColorPicker(picker => picker
                .setValue(normalizeHex(this.style.bg || '#448aff'))
                .onChange(val => {
                    this.style.bg = val;
                    if (bgTextComp) bgTextComp.setValue(val);
                    this.updateLivePreview(liveCallout);
                }));

        let titleTextComp: TextComponent;
        new Setting(contentEl)
            .setName('Title Color')
            .addText(text => {
                titleTextComp = text;
                text.setPlaceholder('Auto (follows theme)')
                    .setValue(this.style.titleColor || '')
                    .onChange(val => {
                        this.style.titleColor = val;
                        this.updateLivePreview(liveCallout);
                    });
            })
            .addColorPicker(picker => picker
                .setValue(normalizeHex(this.style.titleColor || '#ffffff'))
                .onChange(val => {
                    this.style.titleColor = val;
                    if (titleTextComp) titleTextComp.setValue(val);
                    this.updateLivePreview(liveCallout);
                }));

        let textComp: TextComponent;
        new Setting(contentEl)
            .setName('Text Color')
            .setDesc('Color of the callout content text')
            .addText(text => {
                textComp = text;
                text.setPlaceholder('Auto (follows theme)')
                    .setValue(this.style.text || '')
                    .onChange(val => {
                        this.style.text = val;
                        this.updateLivePreview(liveCallout);
                    });
            })
            .addColorPicker(picker => picker
                .setValue(normalizeHex(this.style.text || '#ffffff'))
                .onChange(val => {
                    this.style.text = val;
                    if (textComp) textComp.setValue(val);
                    this.updateLivePreview(liveCallout);
                }));

        let linkTextComp: TextComponent;
        new Setting(contentEl)
            .setName('Link Color')
            .setDesc('Color of links inside the callout')
            .addText(text => {
                linkTextComp = text;
                text.setPlaceholder('Auto (follows theme)')
                    .setValue(this.style.link || '')
                    .onChange(val => {
                        this.style.link = val;
                        this.updateLivePreview(liveCallout);
                    });
            })
            .addColorPicker(picker => picker
                .setValue(normalizeHex(this.style.link || '#3498db'))
                .onChange(val => {
                    this.style.link = val;
                    if (linkTextComp) linkTextComp.setValue(val);
                    this.updateLivePreview(liveCallout);
                }));

        new Setting(contentEl)
            .setName('Icon')
            .addButton(btn => btn
                .setButtonText(this.style.icon ? `Icon: ${this.style.icon}` : 'Choose Icon...')
                .onClick(() => {
                    new IconPickerModal(this.app, (selected: string) => {
                        this.style.icon = selected;
                        btn.setButtonText(`Icon: ${selected}`);
                        this.updateLivePreview(liveCallout);
                    }).open();
                }));

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Save Changes')
                .setCta()
                .onClick(async () => {
                    this.plugin.settings.standardStyles[this.styleName] = this.style;
                    await this.plugin.saveSettings();
                    new Notice(`Updated "${this.styleName}" callout!`);
                    this.onSave();
                    this.close();
                }))
            .addButton(btn => btn
                .setButtonText('Cancel')
                .onClick(() => this.close()));
    }

    private updateLivePreview(el: HTMLElement): void {
        el.empty();
        el.style.backgroundColor = `color-mix(in srgb, ${this.style.bg} 15%, transparent)`;
        el.style.border = `1px solid ${this.style.bg}`;
        el.style.borderRadius = '8px';
        el.style.padding = '0.8em 1.2em';

        if (this.style.link) {
            el.setCssProps({
                '--link-color': this.style.link,
                '--link-color-hover': this.style.link,
                '--link-internal-color': this.style.link,
                '--link-external-color': this.style.link,
                '--sc-link-color': this.style.link
            });
            el.setAttribute('data-link-color', this.style.link);
        } else {
            el.removeAttribute('data-link-color');
        }

        const titleEl = el.createDiv({ cls: 'callout-title' });
        titleEl.style.display = 'flex';
        titleEl.style.alignItems = 'center';
        titleEl.style.gap = '8px';
        titleEl.style.color = this.style.titleColor || this.style.bg;
        titleEl.style.fontWeight = '600';
        titleEl.style.marginBottom = '4px';

        const iconEl = titleEl.createDiv({ cls: 'callout-icon' });
        iconEl.style.color = 'inherit';
        setIcon(iconEl, this.style.icon || 'pencil');

        titleEl.createSpan({ text: this.styleName.toUpperCase() });

        const contentEl = el.createDiv({ cls: 'callout-content' });
        contentEl.style.color = this.style.text || 'var(--text-muted)';
        contentEl.style.fontSize = '0.9em';
        const p = contentEl.createEl('p');
        p.createSpan({ text: `This is a sample ${this.styleName} callout with ` });
        p.createEl('code', { text: 'inline_code()' });
        p.createSpan({ text: ' and a ' });
        const sampleLink = p.createEl('a', { text: 'sample link', href: '#' });
        if (this.style.link) {
            sampleLink.style.color = this.style.link;
        }
        p.createSpan({ text: '.' });
    }
}

/**
 * Interactive Modal for importing and validating JSON settings with merge / replace options
 */
class ImportSettingsModal extends Modal {
    private plugin: PluginWithSettings;
    private onDone: () => void;

    constructor(app: App, plugin: PluginWithSettings, onDone: () => void) {
        super(app);
        this.plugin = plugin;
        this.onDone = onDone;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('special-callouts-ui');

        contentEl.createEl('h2', { text: 'Import Settings JSON' });
        contentEl.createEl('p', {
            text: 'Paste your exported Special Callouts JSON configuration below to restore or merge settings.',
            cls: 'sc-header-subtitle'
        });

        const ta = contentEl.createEl('textarea', {
            placeholder: '{\n  "customStyles": [...],\n  "customColors": [...]\n}',
            attr: { style: 'width:100%; height:180px; font-family:var(--font-monospace); font-size:0.85rem; margin-bottom:12px;' }
        });

        const statusEl = contentEl.createDiv({ attr: { style: 'margin-bottom:14px; font-size:0.85rem; font-weight:500;' } });

        ta.oninput = () => {
            const raw = ta.value.trim();
            if (!raw) {
                statusEl.textContent = '';
                return;
            }
            try {
                const parsed = JSON.parse(raw);
                if (typeof parsed !== 'object' || parsed === null) {
                    statusEl.textContent = '❌ Invalid JSON object.';
                    statusEl.style.color = 'var(--text-error)';
                    return;
                }
                const stylesCount = Array.isArray(parsed.customStyles) ? parsed.customStyles.length : 0;
                const colorsCount = Array.isArray(parsed.customColors) ? parsed.customColors.length : 0;
                const layoutsCount = Array.isArray(parsed.customLayouts) ? parsed.customLayouts.length : 0;
                statusEl.textContent = `✓ Valid configuration: ${stylesCount} custom styles, ${colorsCount} custom colors, ${layoutsCount} layouts detected.`;
                statusEl.style.color = 'var(--text-success, #2ecc71)';
            } catch (err) {
                statusEl.textContent = '❌ Invalid JSON syntax.';
                statusEl.style.color = 'var(--text-error)';
            }
        };

        const btnRow = contentEl.createDiv({ attr: { style: 'display:flex; gap:10px; justify-content:flex-end;' } });

        new ButtonComponent(btnRow)
            .setButtonText('Merge with Existing')
            .setCta()
            .onClick(async () => {
                try {
                    const parsed = JSON.parse(ta.value.trim());
                    if (typeof parsed !== 'object' || parsed === null) {
                        new Notice('Invalid JSON. Please check formatting.');
                        return;
                    }

                    if (Array.isArray(parsed.customStyles)) {
                        parsed.customStyles.forEach((newStyle: CalloutStyle) => {
                            if (!newStyle?.name) return;
                            const idx = this.plugin.settings.customStyles.findIndex(s => s.name.toLowerCase() === newStyle.name.toLowerCase());
                            if (idx >= 0) {
                                this.plugin.settings.customStyles[idx] = newStyle;
                            } else {
                                this.plugin.settings.customStyles.push(newStyle);
                            }
                        });
                    }

                    if (Array.isArray(parsed.customColors)) {
                        parsed.customColors.forEach((newColor: { name: string; hex: string }) => {
                            if (!newColor?.name) return;
                            const idx = this.plugin.settings.customColors.findIndex(c => c.name.toLowerCase() === newColor.name.toLowerCase());
                            if (idx >= 0) {
                                this.plugin.settings.customColors[idx] = newColor;
                            } else {
                                this.plugin.settings.customColors.push(newColor);
                            }
                        });
                    }

                    if (Array.isArray(parsed.customLayouts)) {
                        parsed.customLayouts.forEach((newLayout: CustomLayout) => {
                            if (!newLayout?.name) return;
                            const idx = this.plugin.settings.customLayouts.findIndex(l => l.name.toLowerCase() === newLayout.name.toLowerCase());
                            if (idx >= 0) {
                                this.plugin.settings.customLayouts[idx] = newLayout;
                            } else {
                                this.plugin.settings.customLayouts.push(newLayout);
                            }
                        });
                    }

                    if (parsed.standardStyles && typeof parsed.standardStyles === 'object') {
                        Object.assign(this.plugin.settings.standardStyles, parsed.standardStyles);
                    }

                    if (parsed.standardColors && typeof parsed.standardColors === 'object') {
                        Object.assign(this.plugin.settings.standardColors, parsed.standardColors);
                    }

                    await this.plugin.saveSettings();
                    new Notice('Merged settings successfully!');
                    this.onDone();
                    this.close();
                } catch (e) {
                    new Notice('Failed to parse or apply settings JSON.');
                }
            });

        new ButtonComponent(btnRow)
            .setButtonText('Replace All')
            .setWarning()
            .onClick(async () => {
                if (!confirm('Are you sure you want to replace ALL current settings with this JSON?')) {
                    return;
                }
                try {
                    const parsed = JSON.parse(ta.value.trim());
                    if (typeof parsed !== 'object' || parsed === null) {
                        new Notice('Invalid JSON. Please check formatting.');
                        return;
                    }

                    this.plugin.settings.customStyles = Array.isArray(parsed.customStyles) ? parsed.customStyles : [];
                    this.plugin.settings.customColors = Array.isArray(parsed.customColors) ? parsed.customColors : [];
                    this.plugin.settings.customLayouts = Array.isArray(parsed.customLayouts) ? parsed.customLayouts : [];
                    this.plugin.settings.standardStyles = parsed.standardStyles && typeof parsed.standardStyles === 'object' ? parsed.standardStyles : { ...DEFAULT_STANDARD_STYLES };
                    this.plugin.settings.standardColors = parsed.standardColors && typeof parsed.standardColors === 'object' ? parsed.standardColors : { ...DEFAULT_STANDARD_COLORS };
                    if (parsed.defaultMetadata !== undefined) {
                        this.plugin.settings.defaultMetadata = parsed.defaultMetadata;
                    }

                    await this.plugin.saveSettings();
                    new Notice('Replaced all settings successfully!');
                    this.onDone();
                    this.close();
                } catch (e) {
                    new Notice('Failed to parse or apply settings JSON.');
                }
            });

        new ButtonComponent(btnRow)
            .setButtonText('Cancel')
            .onClick(() => this.close());
    }
}

