/**
 * Special Callouts - MultiColumnBuilderModal
 * Interactive visual drag-and-drop dashboard matrix builder
 * Fully equipped with Content/Type editing, Spanned Block Canvas, Merge/Split, and clean Grid tokens
 */

import {
    App,
    Modal,
    Editor,
    Setting,
    setIcon,
    Notice,
    TextComponent,
    MarkdownRenderer
} from 'obsidian';
import { SpecialCalloutsSettings, CustomLayout } from '../types';
import { DEFAULT_STANDARD_STYLES, FONT_FAMILIES, FONT_SIZES } from '../constants';
import { normalizeHex, toPx, neonStyles, isCssGradient } from '../utils';
import { parseMetadata, parseGridLayout, extractMetadata } from '../parser';
import { IconPickerModal } from './IconPickerModal';
import { InsertCalloutModal } from './InsertCalloutModal';
import { createMarkdownEditorWithToolbar, createGradientSetting, formatListColumns } from '../ui/UIComponents';

export interface GridAreaBlock {
    id: string; // e.g. "area1", "area2"
    label: string;
    minRow: number;
    maxRow: number;
    minCol: number;
    maxCol: number;
    type: string;
    title: string;
    content: string;
    bgColor?: string;
    borderColor?: string;
    titleColor?: string;
    iconColor?: string;
    iconName?: string;
    textColor?: string;
    linkColor?: string;
    neon?: string;
    gradient?: string;
    font?: string;
    fontSize?: number;
    borderWidth?: string;
    borderStyle?: string;
    borderRadius?: string;
    col?: number;
    compact?: boolean;
    center?: boolean;
    titleCenter?: boolean;
    noIcon?: boolean;
}

export interface MultiColumnBuilderOptions {
    isPresetMode?: boolean;
    layoutToEdit?: CustomLayout;
    onSavePreset?: (layout: CustomLayout) => Promise<void> | void;
    plugin?: any;
}

export class SavePresetDialogModal extends Modal {
    private initialName: string;
    private onSave: (name: string) => Promise<void> | void;

    constructor(app: App, initialName: string, onSave: (name: string) => Promise<void> | void) {
        super(app);
        this.initialName = initialName;
        this.onSave = onSave;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('special-callouts-ui');

        contentEl.createEl('h3', { text: '💾 Save Layout Preset' });
        contentEl.createEl('p', {
            text: 'Enter a name for this custom layout preset to reuse it across notes and in the settings layout manager.',
            cls: 'sc-section-desc'
        });

        let presetName = this.initialName || '';
        const errorEl = contentEl.createDiv();
        errorEl.style.color = 'var(--text-error)';
        errorEl.style.fontSize = '0.85rem';
        errorEl.style.margin = '4px 0 8px 0';
        errorEl.style.display = 'none';

        new Setting(contentEl)
            .setName('Preset Name')
            .setDesc('e.g. hero-dashboard, 3-column-notes, team-workspace')
            .addText(text => {
                text.setPlaceholder('my-layout-preset')
                    .setValue(presetName)
                    .onChange(val => {
                        presetName = val;
                        errorEl.style.display = 'none';
                    });
                text.inputEl.focus();
                text.inputEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        saveAction();
                    }
                });
            });

        const saveAction = async () => {
            const trimmed = presetName.trim();
            if (!trimmed) {
                errorEl.innerText = 'Please enter a name for the layout preset.';
                errorEl.style.display = 'block';
                new Notice('Please enter a name for the layout preset.');
                return;
            }
            this.close();
            await this.onSave(trimmed);
        };

        const footer = new Setting(contentEl);
        footer.addButton(btn => btn
            .setButtonText('Save Preset')
            .setCta()
            .onClick(saveAction));

        footer.addButton(btn => btn
            .setButtonText('Cancel')
            .onClick(() => this.close()));
    }
}

type BuilderTab = 'canvas' | 'colors' | 'icon' | 'layout';

export class MultiColumnBuilderModal extends Modal {
    private settings: SpecialCalloutsSettings;
    private editor: Editor | null;
    private selectedText: string;
    private activeTab: BuilderTab = 'canvas';
    private liveDashboardEl: HTMLElement | null = null;

    // Preset Mode & Layout State
    public isPresetMode: boolean = false;
    public presetLayoutName: string = '';
    private onSavePreset?: (layout: CustomLayout) => Promise<void> | void;
    private pluginInstance?: any;

    // Editing State
    private existingRange: { from: { line: number; ch: number }; to: { line: number; ch: number } } | null = null;
    private isEditingExisting: boolean = false;

    // Grid Dimensions (Default 2x2, supports up to 6x6, e.g., 2x6, 4x4)
    private gridRows: number = 2;
    private gridCols: number = 3;

    // Selection & Area Blocks state
    private gridMatrix: string[][] = []; // matrix[row][col] -> areaId
    private areas: Map<string, GridAreaBlock> = new Map();
    private selectedAreaId: string = 'area1';
    private isViewingLayoutPicker: boolean = false;
    private closeSuggesterFn: (() => void) | null = null;

    // Drag Selection State
    private isDragging: boolean = false;
    private dragStart: { r: number; c: number } | null = null;
    private dragEnd: { r: number; c: number } | null = null;

    constructor(
        app: App,
        settings: SpecialCalloutsSettings,
        editor?: Editor | null,
        options?: MultiColumnBuilderOptions
    ) {
        super(app);
        this.settings = settings;
        this.editor = editor || null;
        this.isPresetMode = options?.isPresetMode || false;
        this.onSavePreset = options?.onSavePreset;
        this.pluginInstance = options?.plugin;
        this.presetLayoutName = options?.layoutToEdit?.name || '';
        this.selectedText = editor ? editor.getSelection().trim() : '';

        if (options?.layoutToEdit) {
            this.applyCustomLayout(options.layoutToEdit);
            this.presetLayoutName = options.layoutToEdit.name;
        } else if (editor) {
            // Check if cursor or selection is inside an existing multi-callout
            const detected = this.findMultiCalloutAtCursor();
            if (detected && this.parseExistingMultiCallout(detected.text)) {
                this.existingRange = { from: detected.from, to: detected.to };
                this.isEditingExisting = true;
            } else {
                // Initialize default layout: Hero + 2 Cards
                this.applyPresetLayout('hero_2');
            }
        } else {
            // Default layout when opened from Settings or without active editor
            this.applyPresetLayout('hero_2');
        }
    }

    public async saveCurrentAsPreset(customName?: string): Promise<boolean> {
        let name = customName?.trim() || this.presetLayoutName?.trim();
        if (!name) {
            new Notice('Please enter a name for the layout preset.');
            return false;
        }

        name = name.toLowerCase().replace(/\s+/g, '-');
        if (!name) {
            new Notice('Please provide a valid layout name.');
            return false;
        }

        // Build gridAreas from gridMatrix
        const areaRows: string[] = [];
        for (let r = 0; r < this.gridRows; r++) {
            const rowTokens: string[] = [];
            for (let c = 0; c < this.gridCols; c++) {
                rowTokens.push(this.gridMatrix[r] && this.gridMatrix[r][c] ? this.gridMatrix[r][c] : `area${r * this.gridCols + c + 1}`);
            }
            areaRows.push(`"${rowTokens.join(' ')}"`);
        }
        const gridAreas = areaRows.join(' ');

        const newLayout: CustomLayout = {
            name,
            cols: this.gridCols,
            rows: this.gridRows,
            gridAreas,
            showInCommandPalette: true
        };

        if (!this.settings.customLayouts) {
            this.settings.customLayouts = [];
        }

        const existingIdx = this.settings.customLayouts.findIndex(l => l.name === name);
        if (existingIdx >= 0) {
            this.settings.customLayouts[existingIdx] = newLayout;
        } else {
            this.settings.customLayouts.push(newLayout);
        }

        if (this.onSavePreset) {
            await this.onSavePreset(newLayout);
        } else if (this.pluginInstance && this.pluginInstance.saveSettings) {
            await this.pluginInstance.saveSettings();
        }

        new Notice(`Saved layout preset "${name}"!`);
        return true;
    }

    private findMultiCalloutAtCursor(): { text: string; from: { line: number; ch: number }; to: { line: number; ch: number } } | null {
        const selection = this.editor.getSelection();
        if (selection && selection.includes('[!multi-callout]')) {
            const cursorFrom = this.editor.getCursor('from');
            const cursorTo = this.editor.getCursor('to');
            return { text: selection, from: cursorFrom, to: cursorTo };
        }

        const cursor = this.editor.getCursor();
        const totalLines = this.editor.lineCount();

        // Scan backwards to find `> [!multi-callout]` header
        let startLine = -1;
        for (let l = cursor.line; l >= 0; l--) {
            const line = this.editor.getLine(l);
            if (/^\s*>\s*\[!multi-callout\]/i.test(line)) {
                startLine = l;
                break;
            }
            // If line doesn't start with blockquote `>` and is not blank, stop search
            if (!/^\s*>/.test(line) && line.trim() !== '') {
                break;
            }
        }

        if (startLine === -1) return null;

        // Scan forwards from startLine to find end of multi-callout block
        let endLine = startLine;
        for (let l = startLine + 1; l < totalLines; l++) {
            const line = this.editor.getLine(l);
            if (/^\s*>/.test(line)) {
                endLine = l;
            } else {
                break;
            }
        }

        // Verify cursor is within startLine..endLine
        if (cursor.line >= startLine && cursor.line <= endLine) {
            const blockLines: string[] = [];
            for (let l = startLine; l <= endLine; l++) {
                blockLines.push(this.editor.getLine(l));
            }
            return {
                text: blockLines.join('\n'),
                from: { line: startLine, ch: 0 },
                to: { line: endLine, ch: this.editor.getLine(endLine).length }
            };
        }

        return null;
    }

    private parseExistingMultiCallout(markdown: string): boolean {
        const lines = markdown.split('\n');

        interface ParsedSubItem {
            type: string;
            metaStr: string;
            title: string;
            contentLines: string[];
        }

        const layoutNames = (this.settings.customLayouts || []).map(l => l.name);
        const items: ParsedSubItem[] = [];
        let currentItem: ParsedSubItem | null = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const headMatch = line.match(/^\s*>+\s*\[!([a-zA-Z0-9_\-]+)(?:\|([^\]]+))?\]\s*(.*)$/);
            if (headMatch) {
                const subType = headMatch[1].trim();
                if (subType.toLowerCase() === 'multi-callout') {
                    // Skip the outer parent container header
                    continue;
                }
                if (currentItem) {
                    items.push(currentItem);
                }
                const pipeMeta = headMatch[2] ? headMatch[2].trim() : '';
                let rawTitle = headMatch[3] ? headMatch[3].trim() : '';
                let metaStr = pipeMeta;
                const extracted = extractMetadata(rawTitle, layoutNames);
                if (extracted) {
                    metaStr = metaStr ? `${metaStr}, ${extracted.content}` : extracted.content;
                    rawTitle = extracted.title;
                }
                currentItem = {
                    type: subType,
                    metaStr,
                    title: rawTitle,
                    contentLines: []
                };
            } else if (currentItem) {
                const contentMatch = line.match(/^\s*>+\s?(.*)$/);
                if (contentMatch) {
                    currentItem.contentLines.push(contentMatch[1]);
                } else if (line.trim() !== '') {
                    currentItem.contentLines.push(line);
                }
            }
        }
        if (currentItem) {
            items.push(currentItem);
        }

        if (items.length === 0) return false;

        this.areas.clear();
        let maxColsFound = 1;
        let maxRowsFound = 1;

        items.forEach((item, idx) => {
            const areaId = `area${idx + 1}`;
            const { config, layoutParam } = parseMetadata(
                item.metaStr,
                this.settings.standardColors,
                this.settings.customColors,
                layoutNames
            );

            let minCol = 0;
            let maxCol = 0;
            let minRow = 0;
            let maxRow = 0;

            if (layoutParam) {
                const gridConfig = parseGridLayout(layoutParam);
                if (gridConfig) {
                    minCol = gridConfig.position - 1;
                    maxCol = minCol + (gridConfig.colSpan || 1) - 1;
                    minRow = (gridConfig.row || 1) - 1;
                    maxRow = minRow + (gridConfig.rowSpan || 1) - 1;
                    if (gridConfig.columns > maxColsFound) maxColsFound = gridConfig.columns;
                    if (maxRow + 1 > maxRowsFound) maxRowsFound = maxRow + 1;
                }
            } else {
                minCol = idx % 2;
                maxCol = minCol;
                minRow = Math.floor(idx / 2);
                maxRow = minRow;
                if (minCol + 1 > maxColsFound) maxColsFound = minCol + 1;
                if (maxRow + 1 > maxRowsFound) maxRowsFound = maxRow + 1;
            }

            this.areas.set(areaId, {
                id: areaId,
                label: item.title || `Area ${idx + 1}`,
                minRow: Math.max(0, minRow),
                maxRow: Math.max(0, maxRow),
                minCol: Math.max(0, minCol),
                maxCol: Math.max(0, maxCol),
                type: item.type || 'note',
                title: item.title || `Box ${idx + 1}`,
                content: item.contentLines.join('\n').trim(),
                bgColor: config.bg,
                borderColor: config.border,
                titleColor: config.titleColor,
                iconColor: config.iconColor,
                iconName: config.icon || undefined,
                textColor: config.text || undefined,
                linkColor: config.link || undefined,
                neon: config.neon,
                gradient: config.gradient || undefined,
                font: config.font,
                fontSize: config.fontSize || undefined,
                borderWidth: config.borderWidth,
                borderStyle: config.borderStyle,
                borderRadius: config.radius,
                col: config.col || undefined,
                compact: config.compact,
                center: config.center,
                titleCenter: config.titleCenter,
                noIcon: config.noIcon
            });
        });

        this.gridCols = Math.min(6, Math.max(1, maxColsFound));
        this.gridRows = Math.min(6, Math.max(1, maxRowsFound));

        // Build matrix
        this.gridMatrix = [];
        for (let r = 0; r < this.gridRows; r++) {
            const rowArr: string[] = [];
            for (let c = 0; c < this.gridCols; c++) {
                const matchArea = Array.from(this.areas.values()).find(
                    a => r >= a.minRow && r <= a.maxRow && c >= a.minCol && c <= a.maxCol
                );
                if (matchArea) {
                    rowArr.push(matchArea.id);
                } else {
                    const newId = `area${this.areas.size + 1}`;
                    this.areas.set(newId, {
                        id: newId,
                        label: `Box ${this.areas.size + 1}`,
                        minRow: r,
                        maxRow: r,
                        minCol: c,
                        maxCol: c,
                        type: 'note',
                        title: `Box ${this.areas.size + 1}`,
                        content: '',
                        bgColor: '#448aff',
                        borderColor: '#448aff'
                    });
                    rowArr.push(newId);
                }
            }
            this.gridMatrix.push(rowArr);
        }

        this.selectedAreaId = this.areas.keys().next().value || 'area1';
        return true;
    }

    private applyPresetLayout(presetKey: string): void {
        this.areas.clear();

        if (presetKey.startsWith('custom-layout:')) {
            const layoutName = presetKey.slice('custom-layout:'.length);
            const customLayout = (this.settings.customLayouts || []).find(l => l.name === layoutName);
            if (customLayout) {
                this.applyCustomLayout(customLayout);
                return;
            }
        }

        switch (presetKey) {
            case 'hero_2': {
                // 2 Rows x 2 Cols (Top 2x1 Hero, Bottom 2 Cards)
                this.gridRows = 2;
                this.gridCols = 2;
                this.gridMatrix = [
                    ['area1', 'area1'],
                    ['area2', 'area3']
                ];

                this.areas.set('area1', {
                    id: 'area1', label: 'Hero Banner', minRow: 0, maxRow: 0, minCol: 0, maxCol: 1,
                    type: 'info', title: 'Hero Banner', content: this.selectedText || 'Main featured section spanning top row...',
                    bgColor: '#7c4dff', borderColor: '#7c4dff', iconName: 'sparkles', neon: 'cyan'
                });
                this.areas.set('area2', {
                    id: 'area2', label: 'Feature Left', minRow: 1, maxRow: 1, minCol: 0, maxCol: 0,
                    type: 'tip', title: 'Feature Column A', content: 'Details for feature A...',
                    bgColor: '#00e676', borderColor: '#00e676', iconName: 'flame'
                });
                this.areas.set('area3', {
                    id: 'area3', label: 'Feature Right', minRow: 1, maxRow: 1, minCol: 1, maxCol: 1,
                    type: 'note', title: 'Feature Column B', content: 'Details for feature B...',
                    bgColor: '#448aff', borderColor: '#448aff', iconName: 'pencil'
                });
                this.selectedAreaId = 'area1';
                break;
            }
            case 'header_sidebar': {
                // 3 Rows x 3 Cols (Top Header, Left Sidebar 1x2, Right Main 2x2)
                this.gridRows = 3;
                this.gridCols = 3;
                this.gridMatrix = [
                    ['area1', 'area1', 'area1'],
                    ['area2', 'area3', 'area3'],
                    ['area2', 'area3', 'area3']
                ];

                this.areas.set('area1', {
                    id: 'area1', label: 'Header', minRow: 0, maxRow: 0, minCol: 0, maxCol: 2,
                    type: 'quote', title: 'Dashboard Header', content: 'Top overview header banner...',
                    bgColor: '#ff6d00', borderColor: '#ff6d00', iconName: 'layout-dashboard'
                });
                this.areas.set('area2', {
                    id: 'area2', label: 'Sidebar', minRow: 1, maxRow: 2, minCol: 0, maxCol: 0,
                    type: 'example', title: 'Sidebar Menu', content: '- Option 1\n- Option 2\n- Settings',
                    bgColor: '#26a69a', borderColor: '#26a69a', iconName: 'list'
                });
                this.areas.set('area3', {
                    id: 'area3', label: 'Main Area', minRow: 1, maxRow: 2, minCol: 1, maxCol: 2,
                    type: 'note', title: 'Main Workspace', content: 'Spanned main workspace content area...',
                    bgColor: '#7c4dff', borderColor: '#7c4dff', iconName: 'layers'
                });
                this.selectedAreaId = 'area1';
                break;
            }
            case 'cols_3': {
                // 1 Row x 3 Cols
                this.gridRows = 1;
                this.gridCols = 3;
                this.gridMatrix = [['area1', 'area2', 'area3']];

                this.areas.set('area1', {
                    id: 'area1', label: 'Column 1', minRow: 0, maxRow: 0, minCol: 0, maxCol: 0,
                    type: 'note', title: 'Column 1', content: 'Content for column 1...', bgColor: '#448aff', borderColor: '#448aff', iconName: 'pencil'
                });
                this.areas.set('area2', {
                    id: 'area2', label: 'Column 2', minRow: 0, maxRow: 0, minCol: 1, maxCol: 1,
                    type: 'tip', title: 'Column 2', content: 'Content for column 2...', bgColor: '#00e676', borderColor: '#00e676', iconName: 'flame'
                });
                this.areas.set('area3', {
                    id: 'area3', label: 'Column 3', minRow: 0, maxRow: 0, minCol: 2, maxCol: 2,
                    type: 'warning', title: 'Column 3', content: 'Content for column 3...', bgColor: '#ffab00', borderColor: '#ffab00', iconName: 'alert-triangle'
                });
                this.selectedAreaId = 'area1';
                break;
            }
            case 'quad_2x2': {
                // 2 Rows x 2 Cols
                this.gridRows = 2;
                this.gridCols = 2;
                this.gridMatrix = [
                    ['area1', 'area2'],
                    ['area3', 'area4']
                ];

                this.areas.set('area1', {
                    id: 'area1', label: 'Card 1', minRow: 0, maxRow: 0, minCol: 0, maxCol: 0,
                    type: 'note', title: 'Card 1', content: 'Content 1...', bgColor: '#448aff', borderColor: '#448aff', iconName: 'pencil'
                });
                this.areas.set('area2', {
                    id: 'area2', label: 'Card 2', minRow: 0, maxRow: 0, minCol: 1, maxCol: 1,
                    type: 'tip', title: 'Card 2', content: 'Content 2...', bgColor: '#00e676', borderColor: '#00e676', iconName: 'flame'
                });
                this.areas.set('area3', {
                    id: 'area3', label: 'Card 3', minRow: 1, maxRow: 1, minCol: 0, maxCol: 0,
                    type: 'warning', title: 'Card 3', content: 'Content 3...', bgColor: '#ffab00', borderColor: '#ffab00', iconName: 'alert-triangle'
                });
                this.areas.set('area4', {
                    id: 'area4', label: 'Card 4', minRow: 1, maxRow: 1, minCol: 1, maxCol: 1,
                    type: 'danger', title: 'Card 4', content: 'Content 4...', bgColor: '#ff5252', borderColor: '#ff5252', iconName: 'zap'
                });
                this.selectedAreaId = 'area1';
                break;
            }
            default: {
                this.initMatrix(2, 3);
                break;
            }
        }
    }

    private applyCustomLayout(layout: CustomLayout): void {
        this.areas.clear();
        this.gridRows = Math.min(6, Math.max(1, layout.rows));
        this.gridCols = Math.min(6, Math.max(1, layout.cols));

        // Parse gridAreas string: e.g. '"area1 area2" "area1 area3"'
        const rowMatches = layout.gridAreas.match(/"([^"]+)"/g) || [];
        this.gridMatrix = [];

        if (rowMatches.length > 0) {
            for (let r = 0; r < this.gridRows; r++) {
                const rowTokens = (rowMatches[r] ? rowMatches[r].replace(/"/g, '').trim().split(/\s+/) : []);
                const rowArr: string[] = [];
                for (let c = 0; c < this.gridCols; c++) {
                    const token = rowTokens[c] || `area${r * this.gridCols + c + 1}`;
                    rowArr.push(token);
                }
                this.gridMatrix.push(rowArr);
            }
        } else {
            this.initMatrix(this.gridRows, this.gridCols);
            return;
        }

        // Compute unique bounding boxes for each area token
        const areaBounds: Map<string, { minRow: number; maxRow: number; minCol: number; maxCol: number }> = new Map();
        for (let r = 0; r < this.gridRows; r++) {
            for (let c = 0; c < this.gridCols; c++) {
                const id = this.gridMatrix[r][c];
                if (!areaBounds.has(id)) {
                    areaBounds.set(id, { minRow: r, maxRow: r, minCol: c, maxCol: c });
                } else {
                    const b = areaBounds.get(id)!;
                    b.minRow = Math.min(b.minRow, r);
                    b.maxRow = Math.max(b.maxRow, r);
                    b.minCol = Math.min(b.minCol, c);
                    b.maxCol = Math.max(b.maxCol, c);
                }
            }
        }

        let idx = 1;
        const colorPalette = ['#7c4dff', '#00e676', '#448aff', '#ffab00', '#ff5252', '#00bcd4', '#e040fb'];
        const iconList = ['sparkles', 'flame', 'pencil', 'alert-triangle', 'zap', 'layers', 'bookmark'];
        const typeList = ['info', 'tip', 'note', 'warning', 'danger', 'summary', 'example'];

        areaBounds.forEach((bounds, areaId) => {
            const color = colorPalette[(idx - 1) % colorPalette.length];
            const icon = iconList[(idx - 1) % iconList.length];
            const type = typeList[(idx - 1) % typeList.length];

            this.areas.set(areaId, {
                id: areaId,
                label: `Box ${idx}`,
                minRow: bounds.minRow,
                maxRow: bounds.maxRow,
                minCol: bounds.minCol,
                maxCol: bounds.maxCol,
                type,
                title: `Box ${idx}`,
                content: idx === 1 && this.selectedText ? this.selectedText : `Content for Box ${idx}...`,
                bgColor: color,
                borderColor: color,
                iconName: icon
            });
            idx++;
        });

        this.selectedAreaId = this.areas.keys().next().value || 'area1';
    }

    private initMatrix(rows: number, cols: number): void {
        this.gridRows = Math.min(6, Math.max(1, rows));
        this.gridCols = Math.min(6, Math.max(1, cols));
        this.gridMatrix = [];
        this.areas.clear();

        let areaIdx = 1;
        for (let r = 0; r < this.gridRows; r++) {
            const rowArr: string[] = [];
            for (let c = 0; c < this.gridCols; c++) {
                const areaId = `area${areaIdx}`;
                rowArr.push(areaId);

                this.areas.set(areaId, {
                    id: areaId,
                    label: `Area ${areaIdx}`,
                    minRow: r,
                    maxRow: r,
                    minCol: c,
                    maxCol: c,
                    type: areaIdx % 2 === 0 ? 'tip' : 'note',
                    title: `Box ${areaIdx}`,
                    content: areaIdx === 1 && this.selectedText ? this.selectedText : `Content for Box ${areaIdx}...`,
                    bgColor: areaIdx % 2 === 0 ? '#00e676' : '#448aff',
                    borderColor: areaIdx % 2 === 0 ? '#00e676' : '#448aff',
                    iconName: areaIdx % 2 === 0 ? 'flame' : 'pencil'
                });
                areaIdx++;
            }
            this.gridMatrix.push(rowArr);
        }

        this.selectedAreaId = 'area1';
    }

    private setGridDimensions(newRows: number, newCols: number): void {
        newRows = Math.min(6, Math.max(1, newRows));
        newCols = Math.min(6, Math.max(1, newCols));
        if (newRows === this.gridRows && newCols === this.gridCols) return;

        const oldMatrix = this.gridMatrix;
        const oldRows = this.gridRows;
        const oldCols = this.gridCols;

        this.gridRows = newRows;
        this.gridCols = newCols;

        const newMatrix: string[][] = [];
        const validAreaIds = new Set<string>();

        let nextAreaNum = this.areas.size + 1;
        for (let r = 0; r < newRows; r++) {
            const rowArr: string[] = [];
            for (let c = 0; c < newCols; c++) {
                if (r < oldRows && c < oldCols && oldMatrix[r] && oldMatrix[r][c] && this.areas.has(oldMatrix[r][c])) {
                    const existingId = oldMatrix[r][c];
                    rowArr.push(existingId);
                    validAreaIds.add(existingId);
                } else {
                    const newId = `area${nextAreaNum++}`;
                    this.areas.set(newId, {
                        id: newId,
                        label: `Area ${newId.replace('area', '')}`,
                        minRow: r,
                        maxRow: r,
                        minCol: c,
                        maxCol: c,
                        type: 'note',
                        title: `Box ${newId.replace('area', '')}`,
                        content: '',
                        bgColor: '#448aff',
                        borderColor: '#448aff',
                        iconName: 'pencil'
                    });
                    rowArr.push(newId);
                    validAreaIds.add(newId);
                }
            }
            newMatrix.push(rowArr);
        }

        this.gridMatrix = newMatrix;

        // Clean up areas that no longer exist in the grid
        for (const id of Array.from(this.areas.keys())) {
            if (!validAreaIds.has(id)) {
                this.areas.delete(id);
            }
        }

        // Recalculate bounding boxes for all remaining areas
        this.areas.forEach((area, areaId) => {
            let minR = 999, maxR = -1, minC = 999, maxC = -1;
            for (let r = 0; r < newRows; r++) {
                for (let c = 0; c < newCols; c++) {
                    if (newMatrix[r][c] === areaId) {
                        if (r < minR) minR = r;
                        if (r > maxR) maxR = r;
                        if (c < minC) minC = c;
                        if (c > maxC) maxC = c;
                    }
                }
            }
            if (maxR !== -1) {
                area.minRow = minR;
                area.maxRow = maxR;
                area.minCol = minC;
                area.maxCol = maxC;
            }
        });

        if (!this.areas.has(this.selectedAreaId)) {
            this.selectedAreaId = this.areas.keys().next().value || 'area1';
        }
    }

    onOpen(): void {
        this.modalEl.addClass('sc-inserter-modal');
        this.renderModal();
    }

    private renderModal(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('special-callouts-ui');

        // Sleek compact header
        const headerEl = contentEl.createDiv({ cls: 'sc-studio-header' });
        const titleText = this.isPresetMode
            ? (this.presetLayoutName ? `Edit Layout Preset: "${this.presetLayoutName}"` : 'Create Layout Preset')
            : (this.isEditingExisting ? 'Edit Dashboard' : 'Special Callout Studio');

        headerEl.createEl('h3', {
            text: titleText,
            cls: 'sc-studio-title'
        });
        if (this.isPresetMode) {
            headerEl.createSpan({ text: 'Preset Mode', cls: 'sc-studio-badge' });
        } else if (this.isEditingExisting) {
            headerEl.createSpan({ text: 'Editing Existing', cls: 'sc-studio-badge' });
        }

        // Top Primary Mode Switcher: SINGLE | MULTI (Only when editing a note)
        if (!this.isPresetMode) {
            const modeWrap = contentEl.createDiv({ cls: 'sc-mode-switcher-container' });

            const singleBtn = modeWrap.createEl('button', {
                cls: 'sc-mode-btn'
            });
            const singleIcon = singleBtn.createSpan();
            setIcon(singleIcon, 'file-text');
            singleBtn.createSpan({ text: 'Single Callout' });
            singleBtn.onclick = () => {
                if (this.closeSuggesterFn) this.closeSuggesterFn();
                this.close();
                new InsertCalloutModal(this.app, this.settings, this.editor).open();
            };

            const multiBtn = modeWrap.createEl('button', {
                cls: 'sc-mode-btn is-active'
            });
            const multiIcon = multiBtn.createSpan();
            setIcon(multiIcon, 'layout-grid');
            multiBtn.createSpan({ text: 'Multi-Column Dashboard' });
        } else {
            // Preset Name Input Row when in Preset Mode
            const nameRow = contentEl.createDiv({ cls: 'sc-preset-name-row' });
            nameRow.style.display = 'flex';
            nameRow.style.gap = '10px';
            nameRow.style.alignItems = 'center';
            nameRow.style.margin = '4px 0 12px 0';
            nameRow.style.padding = '8px 12px';
            nameRow.style.background = 'var(--background-secondary)';
            nameRow.style.borderRadius = '6px';
            nameRow.style.border = '1px solid var(--background-modifier-border)';

            nameRow.createSpan({ text: 'Preset Name:', attr: { style: 'font-weight: 600; white-space: nowrap;' } });
            const nameInput = nameRow.createEl('input', {
                type: 'text',
                placeholder: 'e.g. hero-dashboard, 3-columns, workspace',
                value: this.presetLayoutName
            });
            nameInput.style.flex = '1';
            nameInput.style.padding = '6px 10px';
            nameInput.style.borderRadius = '4px';
            nameInput.style.border = '1px solid var(--background-modifier-border)';
            nameInput.style.background = 'var(--background-primary)';
            nameInput.oninput = (e) => {
                this.presetLayoutName = (e.target as HTMLInputElement).value;
            };
        }

        // 1. Navigation Tabs
        const nav = contentEl.createDiv({ cls: 'sc-nav-tabs' });

        const activeArea = this.areas.get(this.selectedAreaId);
        const activeLabel = activeArea ? activeArea.title : 'Active Box';
        const tab1Label = this.isViewingLayoutPicker ? 'Layout Presets & Canvas' : `Content (${activeLabel})`;

        const tabs: { id: BuilderTab; label: string; icon: string }[] = [
            { id: 'canvas', label: tab1Label, icon: this.isViewingLayoutPicker ? 'layout-grid' : 'file-text' },
            { id: 'colors', label: `Colors & Glow (${activeLabel})`, icon: 'palette' },
            { id: 'icon', label: `Icon & Font (${activeLabel})`, icon: 'type' },
            { id: 'layout', label: `Borders & Style (${activeLabel})`, icon: 'layout' }
        ];

        // 2. Live Sticky Dashboard Preview
        const previewContainer = contentEl.createDiv({ cls: 'sc-live-preview-container sc-sticky-preview' });
        const previewHeader = previewContainer.createDiv({ cls: 'sc-live-preview-header' });
        previewHeader.createSpan({ text: `Live Dashboard Preview (${this.gridRows}×${this.gridCols} Grid, ${this.areas.size} Callout Boxes)` });

        this.liveDashboardEl = previewContainer.createDiv({ cls: 'callout sc-live-callout' });
        this.updateLivePreview();

        // 3. Dynamic Tab Container
        const tabContainer = contentEl.createDiv({ cls: 'sc-section-content' });
        tabContainer.style.minHeight = '280px';
        this.renderTabContent(tabContainer);

        tabs.forEach(tab => {
            const btn = nav.createEl('button', { cls: `sc-nav-tab ${this.activeTab === tab.id ? 'is-active' : ''}` });
            const iconSpan = btn.createSpan();
            setIcon(iconSpan, tab.icon);
            btn.createSpan({ text: tab.label });

            btn.onclick = () => {
                this.activeTab = tab.id;
                this.renderTabContent(tabContainer);
                nav.querySelectorAll('.sc-nav-tab').forEach((b, i) => {
                    if (tabs[i].id === tab.id) b.addClass('is-active');
                    else b.removeClass('is-active');
                });
            };
        });

        // 4. Action Footer
        const footer = new Setting(contentEl);
        if (this.isPresetMode) {
            footer
                .addButton(btn => btn
                    .setButtonText('Save Layout Preset')
                    .setCta()
                    .onClick(async () => {
                        if (!this.presetLayoutName.trim()) {
                            new SavePresetDialogModal(this.app, this.presetLayoutName, async (name) => {
                                this.presetLayoutName = name;
                                const saved = await this.saveCurrentAsPreset(name);
                                if (saved) this.close();
                            }).open();
                            return;
                        }
                        const saved = await this.saveCurrentAsPreset(this.presetLayoutName);
                        if (saved) {
                            this.close();
                        }
                    }))
                .addButton(btn => btn
                    .setButtonText('Cancel')
                    .onClick(() => this.close()));
        } else {
            footer
                .addButton(btn => btn
                    .setButtonText('💾 Save as Preset')
                    .onClick(() => {
                        new SavePresetDialogModal(this.app, this.presetLayoutName, async (name) => {
                            this.presetLayoutName = name;
                            await this.saveCurrentAsPreset(name);
                            this.renderModal();
                        }).open();
                    }))
                .addButton(btn => btn
                    .setButtonText(this.isEditingExisting ? 'Update Dashboard Callout' : 'Insert Dashboard Callout')
                    .setCta()
                    .onClick(() => {
                        this.insertCalloutIntoEditor();
                        this.close();
                    }))
                .addButton(btn => btn
                    .setButtonText('Cancel')
                    .onClick(() => this.close()));
        }
    }

    private renderTabContent(container: HTMLElement): void {
        container.empty();

        switch (this.activeTab) {
            case 'canvas':
                this.renderGridCanvasSection(container);
                break;
            case 'colors':
                this.renderColorsSection(container);
                break;
            case 'icon':
                this.renderIconSection(container);
                break;
            case 'layout':
                this.renderLayoutSection(container);
                break;
        }
    }

    // ==========================================
    // TAB 1: BOX CONTENT EDITOR vs LAYOUT PRESETS & CANVAS
    // ==========================================
    private renderGridCanvasSection(container: HTMLElement): void {
        const activeArea = this.areas.get(this.selectedAreaId);

        if (!this.isViewingLayoutPicker && activeArea) {
            this.renderBoxContentEditor(container, activeArea);
            return;
        }

        this.renderLayoutPresetsAndCanvas(container);
    }

    private renderBoxContentEditor(container: HTMLElement, activeArea: GridAreaBlock): void {
        const cardHeader = container.createDiv();
        cardHeader.style.display = 'flex';
        cardHeader.style.justifyContent = 'space-between';
        cardHeader.style.alignItems = 'center';
        cardHeader.style.marginBottom = '10px';
        cardHeader.style.flexWrap = 'wrap';
        cardHeader.style.gap = '8px';

        const headerLeft = cardHeader.createDiv();
        headerLeft.style.display = 'inline-flex';
        headerLeft.style.alignItems = 'center';
        headerLeft.style.gap = '8px';

        headerLeft.createEl('h4', { text: `Edit Box: "${activeArea.title}"`, attr: { style: 'margin: 0; font-size: 0.95rem; font-weight: 600; display: inline-flex; align-items: center;' } });
        const typeBadge = headerLeft.createSpan({ cls: 'sc-studio-badge', text: activeArea.type.toUpperCase() });

        const btnGroup = cardHeader.createDiv();
        btnGroup.style.display = 'inline-flex';
        btnGroup.style.alignItems = 'center';
        btnGroup.style.gap = '6px';

        const changeLayoutBtn = btnGroup.createEl('button', { cls: 'sc-action-btn' });
        const layoutIcon = changeLayoutBtn.createSpan();
        setIcon(layoutIcon, 'layout-grid');
        changeLayoutBtn.createSpan({ text: 'Change Layout / Grid' });
        changeLayoutBtn.onclick = () => {
            this.isViewingLayoutPicker = true;
            this.renderModal();
        };

        const formCard = container.createDiv({ cls: 'sc-card-item' });
        formCard.style.background = 'var(--background-secondary)';
        formCard.style.border = '1px solid var(--background-modifier-border)';
        formCard.style.borderRadius = '8px';
        formCard.style.padding = '14px';

        // Top Row: Type & Title
        const topCtrl = formCard.createDiv();
        topCtrl.style.display = 'grid';
        topCtrl.style.gridTemplateColumns = '160px 1fr';
        topCtrl.style.gap = '10px';
        topCtrl.style.marginBottom = '12px';
        topCtrl.style.alignItems = 'center';

        const typeSelect = topCtrl.createEl('select');
        typeSelect.style.height = '34px';
        typeSelect.style.padding = '4px 8px';
        typeSelect.style.borderRadius = '6px';
        typeSelect.style.border = '1px solid var(--background-modifier-border)';
        typeSelect.style.background = 'var(--background-primary)';
        typeSelect.style.color = 'var(--text-normal)';
        typeSelect.style.fontSize = '0.88rem';
        typeSelect.style.boxSizing = 'border-box';
        
        // Standard presets group
        const stdGroup = typeSelect.createEl('optgroup', { attr: { label: 'Standard Callouts' } });
        ['note', 'tip', 'info', 'warning', 'danger', 'success', 'question', 'quote', 'bug', 'example', 'summary', 'important', 'caution', 'todo'].forEach(t => {
            const opt = stdGroup.createEl('option', { value: t, text: t.charAt(0).toUpperCase() + t.slice(1) });
            if (t === activeArea.type) opt.selected = true;
        });

        // Custom user styles group
        if (this.settings.customStyles && this.settings.customStyles.length > 0) {
            const customGroup = typeSelect.createEl('optgroup', { attr: { label: 'Custom Styles' } });
            this.settings.customStyles.forEach(s => {
                const opt = customGroup.createEl('option', { value: s.name, text: s.name });
                if (s.name.toLowerCase() === activeArea.type.toLowerCase()) opt.selected = true;
            });
        }

        typeSelect.onchange = (e) => {
            const selectedType = (e.target as HTMLSelectElement).value;
            this.applyPresetToArea(activeArea, selectedType);
            typeBadge.textContent = selectedType.toUpperCase();
            this.updateLivePreview();
        };

        const titleInput = topCtrl.createEl('input', { type: 'text', value: activeArea.title, placeholder: 'Box Title' });
        titleInput.style.height = '34px';
        titleInput.style.padding = '6px 10px';
        titleInput.style.borderRadius = '6px';
        titleInput.style.border = '1px solid var(--background-modifier-border)';
        titleInput.style.background = 'var(--background-primary)';
        titleInput.style.color = 'var(--text-normal)';
        titleInput.style.fontSize = '0.88rem';
        titleInput.style.boxSizing = 'border-box';
        titleInput.oninput = (e) => {
            activeArea.title = (e.target as HTMLInputElement).value;
            this.updateLivePreview();
        };

        // Rich Markdown Editor with Toolbar & [[ Suggester (Generous height with rows: 6)
        if (this.closeSuggesterFn) {
            this.closeSuggesterFn();
            this.closeSuggesterFn = null;
        }

        const editorComp = createMarkdownEditorWithToolbar({
            container: formCard,
            app: this.app,
            initialValue: activeArea.content,
            placeholder: 'Type box content, [[links]], #tags, or lists...',
            rows: 6,
            onChange: (val) => {
                activeArea.content = val;
                this.updateLivePreview();
            }
        });
        this.closeSuggesterFn = editorComp.closeSuggester;
    }

    private renderLayoutPresetsAndCanvas(container: HTMLElement): void {
        const topHeader = container.createDiv();
        topHeader.style.display = 'flex';
        topHeader.style.justifyContent = 'space-between';
        topHeader.style.alignItems = 'center';
        topHeader.style.marginBottom = '12px';

        topHeader.createEl('h4', { text: 'Choose Layout Preset & Grid Matrix', attr: { style: 'margin: 0;' } });
        
        if (this.areas.size > 0) {
            const doneBtn = topHeader.createEl('button', { cls: 'mod-cta', text: '✓ Done (Edit Box Content)' });
            doneBtn.onclick = () => {
                this.isViewingLayoutPicker = false;
                this.renderModal();
            };
        }

        // 1. Interactive Layout Preset Gallery
        const gallerySection = container.createDiv();
        gallerySection.style.marginBottom = '16px';

        const galleryGrid = gallerySection.createDiv();
        galleryGrid.style.display = 'grid';
        galleryGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(130px, 1fr))';
        galleryGrid.style.gap = '8px';

        const presetCards: { key: string; name: string; desc: string; icon: string }[] = [
            { key: 'hero_2', name: '⚡ Hero + 2 Cards', desc: 'Top wide hero & 2 columns', icon: 'sparkles' },
            { key: 'header_sidebar', name: '📊 Workspace', desc: 'Header, Sidebar & Main', icon: 'layout-dashboard' },
            { key: 'cols_3', name: '📰 3 Columns', desc: '3 equal vertical cards', icon: 'columns' },
            { key: 'quad_2x2', name: '🔲 2×2 Quad', desc: '4 equal grid boxes', icon: 'grid' }
        ];

        // Append saved custom layouts created in Layout Builder
        if (this.settings.customLayouts && this.settings.customLayouts.length > 0) {
            this.settings.customLayouts.forEach(layout => {
                presetCards.push({
                    key: `custom-layout:${layout.name}`,
                    name: `📐 ${layout.name}`,
                    desc: `Saved (${layout.cols}×${layout.rows} Grid)`,
                    icon: 'layout-grid'
                });
            });
        }

        presetCards.forEach(p => {
            const card = galleryGrid.createDiv();
            card.style.background = 'var(--background-secondary)';
            card.style.border = '1px solid var(--background-modifier-border)';
            card.style.borderRadius = '6px';
            card.style.padding = '8px';
            card.style.textAlign = 'center';
            card.style.cursor = 'pointer';
            card.style.transition = 'all 0.15s ease';

            const iconDiv = card.createDiv();
            setIcon(iconDiv, p.icon);
            iconDiv.style.marginBottom = '4px';

            const titleDiv = card.createDiv();
            titleDiv.style.fontWeight = '600';
            titleDiv.style.fontSize = '0.82rem';
            titleDiv.innerText = p.name;

            const descDiv = card.createDiv();
            descDiv.style.fontSize = '0.7rem';
            descDiv.style.color = 'var(--text-muted)';
            descDiv.innerText = p.desc;

            card.onmouseenter = () => { card.style.borderColor = 'var(--interactive-accent)'; };
            card.onmouseleave = () => { card.style.borderColor = 'var(--background-modifier-border)'; };
            card.onclick = () => {
                this.applyPresetLayout(p.key);
                this.isViewingLayoutPicker = false;
                this.renderModal();
            };
        });

        // 2. Custom Grid Matrix Size Selector & Tools (Centered, balanced toolbar)
        const ctrlRow = container.createDiv({ cls: 'sc-matrix-toolbar' });
        ctrlRow.style.display = 'flex';
        ctrlRow.style.flexDirection = 'column';
        ctrlRow.style.alignItems = 'center';
        ctrlRow.style.justifyContent = 'center';
        ctrlRow.style.gap = '10px';
        ctrlRow.style.margin = '16px auto 14px auto';
        ctrlRow.style.maxWidth = '100%';

        // Row 1: Dimensions & Quick Presets (Centered)
        const dimRow = ctrlRow.createDiv({ cls: 'sc-matrix-dim-row' });
        dimRow.style.display = 'flex';
        dimRow.style.alignItems = 'center';
        dimRow.style.justifyContent = 'center';
        dimRow.style.gap = '10px';
        dimRow.style.flexWrap = 'wrap';

        // Columns Selector
        dimRow.createSpan({ text: 'Cols:', attr: { style: 'font-weight: 600;' } });
        const colsSelect = dimRow.createEl('select');
        colsSelect.style.padding = '5px 10px';
        colsSelect.style.borderRadius = '6px';
        colsSelect.style.border = '1px solid var(--background-modifier-border)';
        colsSelect.style.background = 'var(--background-primary)';
        [1, 2, 3, 4, 5, 6].forEach(c => {
            const opt = colsSelect.createEl('option', { value: String(c), text: `${c} Col${c > 1 ? 's' : ''}` });
            if (c === this.gridCols) opt.selected = true;
        });
        colsSelect.onchange = (e) => {
            const newCols = Number((e.target as HTMLSelectElement).value);
            this.setGridDimensions(this.gridRows, newCols);
            this.renderModal();
        };

        // Rows Selector
        dimRow.createSpan({ text: 'Rows:', attr: { style: 'font-weight: 600; margin-left: 6px;' } });
        const rowsSelect = dimRow.createEl('select');
        rowsSelect.style.padding = '5px 10px';
        rowsSelect.style.borderRadius = '6px';
        rowsSelect.style.border = '1px solid var(--background-modifier-border)';
        rowsSelect.style.background = 'var(--background-primary)';
        [1, 2, 3, 4, 5, 6].forEach(r => {
            const opt = rowsSelect.createEl('option', { value: String(r), text: `${r} Row${r > 1 ? 's' : ''}` });
            if (r === this.gridRows) opt.selected = true;
        });
        rowsSelect.onchange = (e) => {
            const newRows = Number((e.target as HTMLSelectElement).value);
            this.setGridDimensions(newRows, this.gridCols);
            this.renderModal();
        };

        // Presets Dropdown
        dimRow.createSpan({ text: 'Presets:', attr: { style: 'font-weight: 600; margin-left: 6px;' } });
        const presetSelect = dimRow.createEl('select');
        presetSelect.style.padding = '5px 12px';
        presetSelect.style.borderRadius = '6px';
        presetSelect.style.border = '1px solid var(--background-modifier-border)';
        presetSelect.style.background = 'var(--background-primary)';

        presetSelect.createEl('option', { value: '', text: '— Quick Templates —' });

        const stdOptGroup = presetSelect.createEl('optgroup', { attr: { label: 'Standard Presets' } });
        stdOptGroup.createEl('option', { value: 'hero_2', text: 'Hero + 2 Cards (2×2)' });
        stdOptGroup.createEl('option', { value: 'header_sidebar', text: 'Header + Sidebar (3×3)' });
        stdOptGroup.createEl('option', { value: 'cols_3', text: '3 Equal Columns (1×3)' });
        stdOptGroup.createEl('option', { value: 'quad_2x2', text: '2×2 Quad Grid' });

        if (this.settings.customLayouts && this.settings.customLayouts.length > 0) {
            const customOptGroup = presetSelect.createEl('optgroup', { attr: { label: 'Saved Custom Layouts' } });
            this.settings.customLayouts.forEach(l => {
                customOptGroup.createEl('option', { value: `custom-layout:${l.name}`, text: `${l.name} (${l.cols}×${l.rows})` });
            });
        }

        presetSelect.onchange = (e) => {
            const val = (e.target as HTMLSelectElement).value;
            if (val) {
                this.applyPresetLayout(val);
                this.renderModal();
            }
        };

        // Row 2: Action Buttons (Centered, spacious)
        const dimBtns = ctrlRow.createDiv({ cls: 'sc-matrix-btns-row' });
        dimBtns.style.display = 'flex';
        dimBtns.style.alignItems = 'center';
        dimBtns.style.justifyContent = 'center';
        dimBtns.style.gap = '8px';
        dimBtns.style.flexWrap = 'wrap';

        const mergeBtn = dimBtns.createEl('button', { cls: 'mod-cta', text: '🧩 Merge Selected' });
        mergeBtn.style.padding = '6px 14px';
        mergeBtn.onclick = () => {
            this.mergeSelectedCells();
            this.renderModal();
        };

        const splitBtn = dimBtns.createEl('button', { text: '✂️ Split Area' });
        splitBtn.style.padding = '6px 14px';
        splitBtn.onclick = () => {
            this.splitSelectedArea();
            this.renderModal();
        };

        const resetBtn = dimBtns.createEl('button', { text: '🔄 Reset' });
        resetBtn.style.padding = '6px 14px';
        resetBtn.onclick = () => {
            this.initMatrix(this.gridRows, this.gridCols);
            this.renderModal();
        };

        // 3. Interactive Matrix Canvas
        const canvasContainer = container.createDiv();
        canvasContainer.style.marginBottom = '16px';

        const gridCanvas = canvasContainer.createDiv({ cls: 'sc-builder-grid' });
        gridCanvas.style.display = 'grid';
        gridCanvas.style.gridTemplateColumns = `repeat(${this.gridCols}, 1fr)`;
        gridCanvas.style.gridTemplateRows = `repeat(${this.gridRows}, 65px)`;
        gridCanvas.style.gap = '8px';
        gridCanvas.style.background = 'var(--background-secondary)';
        gridCanvas.style.padding = '10px';
        gridCanvas.style.borderRadius = '8px';
        gridCanvas.style.border = '1px solid var(--background-modifier-border)';
        gridCanvas.style.userSelect = 'none';

        gridCanvas.onmouseleave = () => { this.isDragging = false; };
        window.onmouseup = () => { this.isDragging = false; };

        // Render Spanned Blocks inside Grid Canvas
        const uniqueAreas = Array.from(this.areas.values());
        uniqueAreas.forEach(area => {
            const isSelected = area.id === this.selectedAreaId;
            const block = gridCanvas.createDiv({ cls: `sc-builder-block ${isSelected ? 'is-selected' : ''}` });
            block.dataset.areaId = area.id;

            block.style.gridRow = `${area.minRow + 1} / ${area.maxRow + 2}`;
            block.style.gridColumn = `${area.minCol + 1} / ${area.maxCol + 2}`;
            block.style.background = isSelected ? 'var(--background-primary-alt)' : 'var(--background-primary)';
            block.style.border = isSelected ? '2px solid var(--interactive-accent)' : '1px solid var(--background-modifier-border)';
            block.style.borderRadius = '6px';
            block.style.padding = '8px';
            block.style.display = 'flex';
            block.style.flexDirection = 'column';
            block.style.justifyContent = 'center';
            block.style.alignItems = 'center';
            block.style.cursor = 'pointer';
            block.style.transition = 'border-color 0.15s, background 0.15s';

            const title = block.createDiv({ cls: 'sc-builder-title' });
            title.style.fontWeight = '600';
            title.style.fontSize = '0.85rem';
            title.style.color = isSelected ? 'var(--text-accent)' : 'var(--text-normal)';
            title.innerText = area.title;

            const spanRows = area.maxRow - area.minRow + 1;
            const spanCols = area.maxCol - area.minCol + 1;
            const dimsTag = block.createDiv({ cls: 'sc-builder-dims' });
            dimsTag.style.fontSize = '0.7rem';
            dimsTag.style.color = 'var(--text-muted)';
            dimsTag.innerText = `${spanCols} × ${spanRows} (${area.type})`;

            block.onclick = (e) => {
                e.stopPropagation();
                this.selectedAreaId = area.id;
                this.isViewingLayoutPicker = false;
                this.renderModal();
            };

            block.onmousedown = (e) => {
                if (e.button !== 0) return;
                this.isDragging = true;
                this.dragStart = { r: area.minRow, c: area.minCol };
                this.dragEnd = { r: area.maxRow, c: area.maxCol };
                this.selectedAreaId = area.id;
                this.updateSelectionStyles(gridCanvas);
            };

            block.onmouseenter = () => {
                if (this.isDragging && this.dragStart) {
                    this.dragEnd = { r: area.maxRow, c: area.maxCol };
                    this.updateSelectionStyles(gridCanvas);
                }
            };
        });
    }

    private updateCanvasBlockTitle(areaId: string): void {
        const activeArea = this.areas.get(areaId);
        if (!activeArea) return;
        const block = this.contentEl.querySelector(`.sc-builder-block[data-area-id="${areaId}"]`);
        if (block) {
            const titleEl = block.querySelector('.sc-builder-title') as HTMLElement;
            if (titleEl) {
                titleEl.textContent = activeArea.title;
            }
        }
    }

    private updateSelectionStyles(canvasEl: HTMLElement): void {
        if (!this.dragStart || !this.dragEnd) return;

        const minR = Math.min(this.dragStart.r, this.dragEnd.r);
        const maxR = Math.max(this.dragStart.r, this.dragEnd.r);
        const minC = Math.min(this.dragStart.c, this.dragEnd.c);
        const maxC = Math.max(this.dragStart.c, this.dragEnd.c);

        Array.from(canvasEl.children).forEach(child => {
            const el = child as HTMLElement;
            const areaId = el.dataset.areaId;
            if (!areaId) return;

            const area = this.areas.get(areaId);
            if (!area) return;

            const inRange = area.minRow >= minR && area.maxRow <= maxR && area.minCol >= minC && area.maxCol <= maxC;
            if (inRange) {
                el.addClass('is-selected');
                el.style.border = '2px solid var(--interactive-accent)';
            } else {
                el.removeClass('is-selected');
                el.style.border = '1px solid var(--background-modifier-border)';
            }
        });
    }

    private mergeSelectedCells(): void {
        if (!this.dragStart || !this.dragEnd) return;

        const minR = Math.min(this.dragStart.r, this.dragEnd.r);
        const maxR = Math.max(this.dragStart.r, this.dragEnd.r);
        const minC = Math.min(this.dragStart.c, this.dragEnd.c);
        const maxC = Math.max(this.dragStart.c, this.dragEnd.c);

        const targetAreaId = this.selectedAreaId || 'area1';
        const targetArea = this.areas.get(targetAreaId);

        if (!targetArea) return;

        targetArea.minRow = minR;
        targetArea.maxRow = maxR;
        targetArea.minCol = minC;
        targetArea.maxCol = maxC;

        for (let r = minR; r <= maxR; r++) {
            for (let c = minC; c <= maxC; c++) {
                const oldAreaId = this.gridMatrix[r][c];
                this.gridMatrix[r][c] = targetAreaId;
                if (oldAreaId !== targetAreaId) {
                    this.areas.delete(oldAreaId);
                }
            }
        }

        this.normalizeMatrix();
    }

    private splitSelectedArea(): void {
        const activeArea = this.areas.get(this.selectedAreaId);
        if (!activeArea) return;

        for (let r = activeArea.minRow; r <= activeArea.maxRow; r++) {
            for (let c = activeArea.minCol; c <= activeArea.maxCol; c++) {
                const newId = `area_temp_${r}_${c}`;
                this.gridMatrix[r][c] = newId;
            }
        }
        this.areas.delete(this.selectedAreaId);
        this.normalizeMatrix();
    }

    private normalizeMatrix(): void {
        const newAreas = new Map<string, GridAreaBlock>();
        let areaIdx = 1;

        for (let r = 0; r < this.gridRows; r++) {
            for (let c = 0; c < this.gridCols; c++) {
                const oldId = this.gridMatrix[r][c];
                if (newAreas.has(oldId)) continue;

                // Find bounds
                let maxR = r;
                let maxC = c;
                while (maxR + 1 < this.gridRows && this.gridMatrix[maxR + 1][c] === oldId) maxR++;
                while (maxC + 1 < this.gridCols && this.gridMatrix[r][maxC + 1] === oldId) maxC++;

                const newId = `area${areaIdx}`;
                const prevBlock = this.areas.get(oldId);

                newAreas.set(newId, {
                    id: newId,
                    label: `Area ${areaIdx}`,
                    minRow: r,
                    maxRow: maxR,
                    minCol: c,
                    maxCol: maxC,
                    type: prevBlock?.type || (areaIdx % 2 === 0 ? 'tip' : 'note'),
                    title: prevBlock?.title || `Box ${areaIdx}`,
                    content: prevBlock?.content || (areaIdx === 1 ? (this.selectedText || 'Content for Box 1...') : `Content for Box ${areaIdx}...`),
                    bgColor: prevBlock?.bgColor || (areaIdx % 2 === 0 ? '#00e676' : '#448aff'),
                    borderColor: prevBlock?.borderColor || (areaIdx % 2 === 0 ? '#00e676' : '#448aff'),
                    titleColor: prevBlock?.titleColor,
                    iconColor: prevBlock?.iconColor,
                    iconName: prevBlock?.iconName || (areaIdx % 2 === 0 ? 'flame' : 'pencil'),
                    font: prevBlock?.font,
                    fontSize: prevBlock?.fontSize,
                    borderWidth: prevBlock?.borderWidth,
                    borderStyle: prevBlock?.borderStyle,
                    borderRadius: prevBlock?.borderRadius,
                    col: prevBlock?.col,
                    neon: prevBlock?.neon,
                    compact: prevBlock?.compact,
                    noIcon: prevBlock?.noIcon
                });

                for (let i = r; i <= maxR; i++) {
                    for (let j = c; j <= maxC; j++) {
                        this.gridMatrix[i][j] = newId;
                    }
                }
                areaIdx++;
            }
        }

        this.areas = newAreas;
        this.selectedAreaId = this.areas.has(this.selectedAreaId) ? this.selectedAreaId : 'area1';
    }

    private applyPresetToArea(area: GridAreaBlock, typeName: string): void {
        area.type = typeName;
        const customStyle = this.settings.customStyles.find(s => s.name.toLowerCase() === typeName.toLowerCase());
        if (customStyle) {
            area.bgColor = customStyle.bg || '#448aff';
            area.borderColor = customStyle.border || customStyle.bg || '#448aff';
            area.titleColor = customStyle.titleColor || '';
            area.textColor = customStyle.text || '';
            area.linkColor = customStyle.link || '';
            area.iconName = customStyle.icon || 'pencil';
            area.iconColor = customStyle.iconColor || '';
            area.font = customStyle.font || '';
            area.fontSize = customStyle.fontSize || 3;
            area.borderWidth = customStyle.borderWidth || '1px';
            area.borderStyle = customStyle.borderStyle || 'solid';
            area.borderRadius = customStyle.borderRadius || '8px';
            area.neon = customStyle.neon || '';
            area.gradient = customStyle.gradient || '';
            area.compact = customStyle.compact || false;
            area.center = customStyle.center || false;
            area.titleCenter = customStyle.titleCenter || false;
            area.noIcon = customStyle.noIcon || false;
            return;
        }

        const standardStyle = this.settings.standardStyles[typeName.toLowerCase()] || DEFAULT_STANDARD_STYLES[typeName.toLowerCase()];
        if (standardStyle) {
            area.bgColor = standardStyle.bg || '#448aff';
            area.borderColor = standardStyle.border || standardStyle.bg || '#448aff';
            area.titleColor = standardStyle.titleColor || '';
            area.textColor = standardStyle.text || '';
            area.linkColor = standardStyle.link || '';
            area.iconName = standardStyle.icon || this.getDefaultIconForType(typeName);
            area.iconColor = standardStyle.iconColor || '';
            area.neon = '';
            area.gradient = '';
            area.compact = false;
            area.center = false;
            area.titleCenter = false;
            area.noIcon = false;
        } else {
            area.iconName = this.getDefaultIconForType(typeName);
            area.gradient = '';
        }
    }

    private getDefaultIconForType(type: string): string {
        switch (type?.toLowerCase()) {
            case 'tip': return 'flame';
            case 'warning': case 'caution': case 'attention': return 'alert-triangle';
            case 'danger': case 'error': case 'bug': return 'zap';
            case 'info': return 'info';
            case 'todo': return 'check-circle-2';
            case 'success': case 'check': case 'done': return 'check';
            case 'question': case 'help': case 'faq': return 'help-circle';
            case 'quote': case 'cite': return 'quote';
            case 'example': return 'list';
            case 'summary': case 'abstract': case 'tldr': return 'clipboard-list';
            case 'important': return 'flame';
            default: return 'pencil';
        }
    }

    // ==========================================
    // TAB 2: PER-BOX COLORS & GLOW
    // ==========================================
    private renderColorsSection(container: HTMLElement): void {
        const area = this.areas.get(this.selectedAreaId);
        if (!area) return;

        createGradientSetting(container, area.gradient || '', val => {
            area.gradient = val || undefined;
            this.updateLivePreview();
        });

        let bgTextComp: TextComponent;
        new Setting(container)
            .setName('Background Color (Tint)')
            .setDesc('Translucent 15% background tint (used when gradient is disabled)')
            .addText(text => {
                bgTextComp = text;
                text.setValue(area.bgColor || '')
                    .setPlaceholder('#448aff or blue')
                    .onChange(val => {
                        area.bgColor = val;
                        this.updateLivePreview();
                    });
            })
            .addColorPicker(picker => picker
                .setValue(normalizeHex(area.bgColor || '#448aff'))
                .onChange(val => {
                    area.bgColor = val;
                    if (bgTextComp) bgTextComp.setValue(val);
                    this.updateLivePreview();
                }));

        let borderTextComp: TextComponent;
        new Setting(container)
            .setName('Border Color')
            .addText(text => {
                borderTextComp = text;
                text.setValue(area.borderColor || '')
                    .setPlaceholder('#448aff or blue')
                    .onChange(val => {
                        area.borderColor = val;
                        this.updateLivePreview();
                    });
            })
            .addColorPicker(picker => picker
                .setValue(normalizeHex(area.borderColor || '#448aff'))
                .onChange(val => {
                    area.borderColor = val;
                    if (borderTextComp) borderTextComp.setValue(val);
                    this.updateLivePreview();
                }));

        let titleTextComp: TextComponent;
        new Setting(container)
            .setName('Title Color')
            .addText(text => {
                titleTextComp = text;
                text.setPlaceholder('Auto (follows theme)')
                    .setValue(area.titleColor || '')
                    .onChange(val => {
                        area.titleColor = val;
                        this.updateLivePreview();
                    });
            })
            .addColorPicker(picker => picker
                .setValue(normalizeHex(area.titleColor || '#ffffff'))
                .onChange(val => {
                    area.titleColor = val;
                    if (titleTextComp) titleTextComp.setValue(val);
                    this.updateLivePreview();
                }));

        let iconTextComp: TextComponent;
        new Setting(container)
            .setName('Icon Color')
            .setDesc('Leave blank to follow title color')
            .addText(text => {
                iconTextComp = text;
                text.setPlaceholder('Auto (follows title)')
                    .setValue(area.iconColor || '')
                    .onChange(val => {
                        area.iconColor = val;
                        this.updateLivePreview();
                    });
            })
            .addColorPicker(picker => picker
                .setValue(normalizeHex(area.iconColor || '#ffffff'))
                .onChange(val => {
                    area.iconColor = val;
                    if (iconTextComp) iconTextComp.setValue(val);
                    this.updateLivePreview();
                }));

        let textColorComp: TextComponent;
        new Setting(container)
            .setName('Body Text Color')
            .setDesc('Callout text color (leave blank for theme default)')
            .addText(text => {
                textColorComp = text;
                text.setPlaceholder('theme default')
                    .setValue(area.textColor || '')
                    .onChange(val => {
                        area.textColor = val;
                        this.updateLivePreview();
                    });
            })
            .addColorPicker(picker => picker
                .setValue(normalizeHex(area.textColor || '#ffffff'))
                .onChange(val => {
                    area.textColor = val;
                    if (textColorComp) textColorComp.setValue(val);
                    this.updateLivePreview();
                }));

        let linkTextComp: TextComponent;
        new Setting(container)
            .setName('Link Color')
            .setDesc('Link color (leave blank for theme default)')
            .addText(text => {
                linkTextComp = text;
                text.setPlaceholder('theme default')
                    .setValue(area.linkColor || '')
                    .onChange(val => {
                        area.linkColor = val;
                        this.updateLivePreview();
                    });
            })
            .addColorPicker(picker => picker
                .setValue(normalizeHex(area.linkColor || '#3498db'))
                .onChange(val => {
                    area.linkColor = val;
                    if (linkTextComp) linkTextComp.setValue(val);
                    this.updateLivePreview();
                }));

        let neonTextComp: TextComponent;
        new Setting(container)
            .setName('Neon Glow Effect')
            .setDesc('Color of glowing cyber neon border')
            .addText(text => {
                neonTextComp = text;
                text.setPlaceholder('#00f2ff or cyan')
                    .setValue(area.neon || '')
                    .onChange(val => {
                        area.neon = val;
                        this.updateLivePreview();
                    });
            })
            .addColorPicker(picker => picker
                .setValue(normalizeHex(area.neon || '#00f2ff'))
                .onChange(val => {
                    area.neon = val;
                    if (neonTextComp) neonTextComp.setValue(val);
                    this.updateLivePreview();
                }));
    }

    // ==========================================
    // TAB 3: PER-BOX ICON & FONT
    // ==========================================
    private renderIconSection(container: HTMLElement): void {
        const area = this.areas.get(this.selectedAreaId);
        if (!area) return;

        const iconSetting = new Setting(container)
            .setName(`Box Icon (${area.iconName || 'pencil'})`)
            .setDesc('Select Lucide icon for this box');

        const iconSpan = iconSetting.nameEl.createSpan();
        iconSpan.style.marginLeft = '10px';
        setIcon(iconSpan, area.iconName || 'pencil');

        iconSetting.addButton(btn => btn
            .setButtonText('Change Icon')
            .onClick(() => {
                new IconPickerModal(this.app, (selected) => {
                    area.iconName = selected;
                    iconSpan.empty();
                    setIcon(iconSpan, selected);
                    this.updateLivePreview();
                }).open();
            }));

        new Setting(container)
            .setName('Font Family')
            .addDropdown(drop => drop
                .addOption('', 'Default')
                .addOption('mono', 'Monospace')
                .addOption('serif', 'Serif')
                .addOption('sans', 'Sans-Serif')
                .addOption('hand', 'Handwritten')
                .addOption('marker', 'Chalkboard Marker')
                .setValue(area.font || '')
                .onChange(val => {
                    area.font = val;
                    this.updateLivePreview();
                }));

        new Setting(container)
            .setName('Font Size')
            .addDropdown(drop => drop
                .addOption('1', '1 - Smallest')
                .addOption('2', '2 - Small')
                .addOption('3', '3 - Default')
                .addOption('4', '4 - Large')
                .addOption('5', '5 - Largest')
                .setValue((area.fontSize || 3).toString())
                .onChange(val => {
                    area.fontSize = parseInt(val);
                    this.updateLivePreview();
                }));
    }

    // ==========================================
    // TAB 4: PER-BOX BORDERS & LAYOUT
    // ==========================================
    private renderLayoutSection(container: HTMLElement): void {
        const area = this.areas.get(this.selectedAreaId);
        if (!area) return;

        new Setting(container)
            .setName('Border Width & Style')
            .addDropdown(drop => drop
                .addOption('', 'Default Width')
                .addOption('1px', '1px (Thin)')
                .addOption('2px', '2px (Medium)')
                .addOption('4px', '4px (Thick)')
                .setValue(area.borderWidth || '')
                .onChange(val => {
                    area.borderWidth = val;
                    this.updateLivePreview();
                }))
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
                .setValue(area.borderStyle || 'solid')
                .onChange(val => {
                    area.borderStyle = val;
                    this.updateLivePreview();
                }));

        new Setting(container)
            .setName('Corner Radius')
            .addSlider(slider => slider
                .setLimits(0, 30, 1)
                .setValue(parseInt(area.borderRadius || '8') || 8)
                .onChange(val => {
                    area.borderRadius = `${val}px`;
                    this.updateLivePreview();
                }));

        new Setting(container)
            .setName('List Columns')
            .setDesc('Divide lists inside this callout box into columns')
            .addDropdown(drop => drop
                .addOption('', 'Normal (1 Column)')
                .addOption('2', '2 Columns')
                .addOption('3', '3 Columns')
                .addOption('4', '4 Columns')
                .setValue(area.col ? area.col.toString() : '')
                .onChange(val => {
                    area.col = val ? parseInt(val) : undefined;
                    this.updateLivePreview();
                }));

        new Setting(container)
            .setName('Compact Mode')
            .setDesc('Tighter padding inside this box')
            .addToggle(toggle => toggle
                .setValue(area.compact || false)
                .onChange(val => {
                    area.compact = val;
                    this.updateLivePreview();
                }));

        new Setting(container)
            .setName('Center Text (center)')
            .setDesc('Center align all text inside this callout box')
            .addToggle(toggle => toggle
                .setValue(area.center || false)
                .onChange(val => {
                    area.center = val;
                    this.updateLivePreview();
                }));

        new Setting(container)
            .setName('Center Title Only (title:center)')
            .setDesc('Center align only the box title header')
            .addToggle(toggle => toggle
                .setValue(area.titleCenter || false)
                .onChange(val => {
                    area.titleCenter = val;
                    this.updateLivePreview();
                }));

        new Setting(container)
            .setName('Hide Icon')
            .addToggle(toggle => toggle
                .setValue(area.noIcon || false)
                .onChange(val => {
                    area.noIcon = val;
                    this.updateLivePreview();
                }));
    }

    // ==========================================
    // LIVE STICKY DASHBOARD PREVIEW & MARKDOWN OUTPUT
    // ==========================================
    private updateLivePreview(targetEl?: HTMLElement): void {
        const el = targetEl || this.liveDashboardEl;
        if (!el) return;

        el.empty();
        el.style.backgroundColor = 'transparent';
        el.style.border = 'none';
        el.style.padding = '0';
        el.style.boxShadow = 'none';

        const outerCallout = el.createDiv({ cls: 'callout' });
        outerCallout.setAttribute('data-callout', 'multi-callout');
        outerCallout.style.background = 'var(--background-primary)';
        outerCallout.style.border = '1px dashed var(--background-modifier-border)';
        outerCallout.style.padding = '8px 10px';
        outerCallout.style.margin = '2px 4px';
        outerCallout.style.borderRadius = '8px';

        const grid = outerCallout.createDiv();
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = `repeat(${this.gridCols}, 1fr)`;
        grid.style.gridTemplateRows = `repeat(${this.gridRows}, auto)`;
        grid.style.gap = '12px';
        grid.style.padding = '6px 8px';

        const uniqueAreas = Array.from(this.areas.values());
        uniqueAreas.forEach((area, idx) => {
            const isSelected = area.id === this.selectedAreaId;
            const subCallout = grid.createDiv({ cls: 'callout' });
            subCallout.setAttribute('data-callout', area.type || 'note');

            subCallout.style.gridRow = `${area.minRow + 1} / ${area.maxRow + 2}`;
            subCallout.style.gridColumn = `${area.minCol + 1} / ${area.maxCol + 2}`;

            const borderStyleVal = area.borderStyle || 'solid';
            const borderWidthVal = toPx(area.borderWidth || '1px');
            const borderColorVal = area.borderColor || 'var(--interactive-accent)';
            const normalBorder = borderStyleVal === 'none' ? 'none' : `${borderWidthVal} ${borderStyleVal} ${borderColorVal}`;

            if (area.gradient) {
                let grad = area.gradient.trim();
                if (!isCssGradient(grad)) {
                    const parts = grad.split('-');
                    if (parts.length >= 2) {
                        grad = `linear-gradient(90deg, ${parts[0]}, ${parts.slice(1).join('-')})`;
                    }
                }
                subCallout.style.background = grad;
                subCallout.style.border = area.borderColor && borderStyleVal !== 'none'
                    ? `${borderWidthVal} ${borderStyleVal} ${area.borderColor}`
                    : 'none';
            } else {
                const bg = area.bgColor ? `color-mix(in srgb, ${area.bgColor} 15%, transparent)` : 'var(--background-secondary)';
                subCallout.style.backgroundColor = bg;
                subCallout.style.border = normalBorder;
            }

            subCallout.dataset.areaId = area.id;
            subCallout.style.outline = 'none';
            subCallout.style.overflow = 'hidden';
            subCallout.style.boxSizing = 'border-box';
            subCallout.style.borderRadius = area.borderRadius ? toPx(area.borderRadius) : '6px';
            subCallout.style.padding = area.compact ? '8px 12px' : '12px 16px';
            subCallout.style.textAlign = area.center ? 'center' : 'left';
            subCallout.style.cursor = 'pointer';
            subCallout.onclick = () => {
                this.selectedAreaId = area.id;
                this.isViewingLayoutPicker = false;
                this.renderModal();
            };

            if (area.font && FONT_FAMILIES[area.font]) {
                subCallout.style.fontFamily = FONT_FAMILIES[area.font];
            }

            if (area.fontSize && FONT_SIZES[area.fontSize]) {
                subCallout.style.fontSize = FONT_SIZES[area.fontSize];
            }

            if (area.neon) {
                const neon = neonStyles(area.neon);
                subCallout.style.boxShadow = isSelected
                    ? `0 0 0 2.5px var(--background-primary), 0 0 0 4.5px var(--interactive-accent), ${neon['--sc-neon-shadow']}`
                    : neon['--sc-neon-shadow'];
            } else if (isSelected) {
                subCallout.style.boxShadow = '0 0 0 2.5px var(--background-primary), 0 0 0 4.5px var(--interactive-accent)';
            } else {
                subCallout.style.boxShadow = 'none';
            }

            if (area.center) {
                subCallout.setAttribute('data-center', 'true');
                subCallout.removeAttribute('data-title-center');
            } else if (area.titleCenter) {
                subCallout.setAttribute('data-title-center', 'true');
                subCallout.removeAttribute('data-center');
            } else {
                subCallout.removeAttribute('data-center');
                subCallout.removeAttribute('data-title-center');
            }

            const titleEl = subCallout.createDiv({ cls: 'callout-title' });
            titleEl.style.display = 'flex';
            titleEl.style.alignItems = 'center';
            titleEl.style.gap = '6px';
            titleEl.style.width = '100%';
            titleEl.style.justifyContent = (area.center || area.titleCenter) ? 'center' : 'flex-start';
            titleEl.style.fontWeight = '600';
            titleEl.style.color = area.titleColor || area.borderColor || 'var(--text-normal)';

            if (!area.noIcon) {
                const iconEl = titleEl.createDiv({ cls: 'callout-icon' });
                iconEl.style.color = area.iconColor || area.titleColor || area.borderColor || 'inherit';
                iconEl.empty();
                setIcon(iconEl, area.iconName || this.getDefaultIconForType(area.type));
            }

            const titleSpan = titleEl.createSpan({ cls: 'callout-title-inner', text: area.title || `Box ${idx + 1}` });
            if (area.center || area.titleCenter) {
                titleSpan.style.textAlign = 'center';
                titleSpan.style.flex = '0 1 auto';
            }

            const contentEl = subCallout.createDiv({ cls: 'callout-content' });
            contentEl.style.fontSize = '0.85em';
            contentEl.style.marginTop = '4px';
            contentEl.style.textAlign = area.center ? 'center' : 'left';
            if (area.textColor) {
                contentEl.style.color = area.textColor;
                subCallout.setCssProps({ '--sc-text-color': area.textColor });
                subCallout.setAttribute('data-sc-text', '');
            } else {
                subCallout.removeAttribute('data-sc-text');
                contentEl.style.color = '';
            }

            if (area.linkColor) {
                subCallout.setCssProps({
                    '--link-color': area.linkColor,
                    '--link-color-hover': area.linkColor,
                    '--link-internal-color': area.linkColor,
                    '--link-external-color': area.linkColor,
                    '--sc-link-color': area.linkColor
                });
                subCallout.setAttribute('data-link-color', area.linkColor);
            }

            if (area.col && area.col > 1) {
                subCallout.setAttribute('data-col', area.col.toString());
                subCallout.setCssProps({ '--smart-list-cols': area.col.toString() });
            } else {
                subCallout.removeAttribute('data-col');
                subCallout.setCssProps({ '--smart-list-cols': '' });
            }

            const defaultListContent = '- Item 1\n- Item 2\n- Item 3\n- Item 4\n- Item 5\n- Item 6';
            const rawContent = area.content
                ? area.content
                : (area.col && area.col > 1 ? defaultListContent : `Main featured section for ${area.title || `Box ${idx + 1}`}...`);

            void MarkdownRenderer.render(this.app, rawContent, contentEl, '', this as unknown as any).then(() => {
                if (area.col && area.col > 1) {
                    formatListColumns(contentEl, area.col);
                }
            });
        });
    }

    private insertCalloutIntoEditor(): void {
        let multiMarkdown = `> [!multi-callout]\n>\n`;

        const uniqueAreas = Array.from(this.areas.values());
        uniqueAreas.forEach((area, idx) => {
            const colStart = area.minCol + 1;
            const colEnd = area.maxCol + 1;
            const rowStart = area.minRow + 1;
            const rowEnd = area.maxRow + 1;

            const posToken = (colEnd > colStart || rowEnd > rowStart)
                ? `${colStart}-${colEnd}:${this.gridCols}:${rowStart}-${rowEnd}`
                : `${colStart}:${this.gridCols}:${rowStart}`;

            const metaParams: string[] = [posToken];

            if (area.gradient) {
                metaParams.push(`gradient:${area.gradient}`);
            } else if (area.bgColor) {
                metaParams.push(`bg:${area.bgColor}`);
            }
            if (area.borderColor && area.borderColor !== area.bgColor) metaParams.push(`border:${area.borderColor}`);
            if (area.titleColor) metaParams.push(`title:${area.titleColor}`);
            if (area.iconColor) metaParams.push(`icon-color:${area.iconColor}`);
            if (area.iconName) metaParams.push(`icon:${area.iconName}`);
            if (area.textColor) metaParams.push(`text:${area.textColor}`);
            if (area.linkColor) metaParams.push(`link:${area.linkColor}`);
            if (area.neon) metaParams.push(`neon:${area.neon}`);
            if (area.font) metaParams.push(`font:${area.font}`);
            if (area.fontSize && area.fontSize !== 3) metaParams.push(`font-size:${area.fontSize}`);
            if (area.borderRadius) metaParams.push(`radius:${area.borderRadius}`);
            if (area.borderWidth && area.borderWidth !== '1px') metaParams.push(`bw:${area.borderWidth}`);
            if (area.borderStyle && area.borderStyle !== 'solid') metaParams.push(`bs:${area.borderStyle}`);
            if (area.col) metaParams.push(`col:${area.col}`);
            if (area.compact) metaParams.push('compact');
            if (area.center) metaParams.push('center');
            if (area.titleCenter) metaParams.push('title:center');
            if (area.noIcon) metaParams.push('no-icon');

            const metadataString = `(${metaParams.join(', ')})`;
            const subHeader = `>> [!${area.type || 'note'}] ${metadataString} ${area.title || `Box ${idx + 1}`}\n`;

            const subLines = (area.content || '')
                .split('\n')
                .map(line => `>> ${line}`)
                .join('\n');

            multiMarkdown += `${subHeader}${subLines}\n>\n`;
        });

        if (this.existingRange) {
            this.editor.replaceRange(multiMarkdown.trimEnd(), this.existingRange.from, this.existingRange.to);
            new Notice('Multi-column grid dashboard updated!');
        } else {
            this.editor.replaceSelection(multiMarkdown);
            new Notice('Multi-column grid dashboard inserted!');
        }
    }

    onClose(): void {
        if (this.closeSuggesterFn) {
            this.closeSuggesterFn();
            this.closeSuggesterFn = null;
        }
        this.liveDashboardEl = null;
        this.contentEl.empty();
    }
}
