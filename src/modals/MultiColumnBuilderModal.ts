/**
 * Special Callouts - MultiColumnBuilderModal
 * Interactive visual drag-and-drop dashboard matrix builder
 * Fully equipped with Content/Type editing, Orphan-free Area management, Unmerge/Split, and clean Grid tokens
 */

import { App, Modal, Editor, Setting, setIcon, Notice } from 'obsidian';
import { SpecialCalloutsSettings } from '../types';
import { DEFAULT_STANDARD_STYLES } from '../constants';
import { parseMetadata, parseGridLayout } from '../parser';
import {
    createColorSetting,
    createIconSetting,
    createBorderStyleSetting,
    createFontSetting,
    createFontSizeSetting,
    applyStyleToLivePreview
} from '../ui/UIComponents';

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
    neon?: string;
    font?: string;
    fontSize?: number;
    borderWidth?: string;
    borderStyle?: string;
    borderRadius?: string;
    col?: number;
    compact?: boolean;
    center?: boolean;
    noIcon?: boolean;
}

type BuilderTab = 'canvas' | 'content' | 'colors' | 'icon' | 'layout';

export class MultiColumnBuilderModal extends Modal {
    private settings: SpecialCalloutsSettings;
    private editor: Editor;
    private selectedText: string;
    private activeTab: BuilderTab = 'canvas';
    private liveDashboardEl: HTMLElement | null = null;

    // Editing State
    private existingRange: { from: { line: number; ch: number }; to: { line: number; ch: number } } | null = null;
    private isEditingExisting: boolean = false;

    // Grid Dimensions (Supports 1x2 up to 6x6)
    private gridRows: number = 2;
    private gridCols: number = 3;

    // Selection & Area Blocks state
    private gridMatrix: string[][] = [];
    private areas: Map<string, GridAreaBlock> = new Map();
    private selectedAreaId: string = 'area1';

    // Drag Selection State
    private isDragging: boolean = false;
    private dragStart: { r: number; c: number } | null = null;
    private dragEnd: { r: number; c: number } | null = null;

    constructor(app: App, settings: SpecialCalloutsSettings, editor: Editor) {
        super(app);
        this.settings = settings;
        this.editor = editor;
        this.selectedText = editor.getSelection().trim();

        // Check if cursor or selection is inside an existing multi-callout
        const detected = this.findMultiCalloutAtCursor();
        if (detected && this.parseExistingMultiCallout(detected.text)) {
            this.existingRange = { from: detected.from, to: detected.to };
            this.isEditingExisting = true;
        } else {
            this.applyPresetLayout('hero_2');
        }
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

        let startLine = -1;
        for (let l = cursor.line; l >= 0; l--) {
            const line = this.editor.getLine(l);
            if (line.match(/^\s*>\s*\[!multi-callout\]/i)) {
                startLine = l;
                break;
            }
            if (l < cursor.line && !line.startsWith('>')) {
                break;
            }
        }

        if (startLine === -1) return null;

        let endLine = startLine;
        for (let l = startLine + 1; l < totalLines; l++) {
            const line = this.editor.getLine(l);
            if (line.startsWith('>') || line.trim() === '') {
                endLine = l;
            } else {
                break;
            }
        }

        const lines: string[] = [];
        for (let l = startLine; l <= endLine; l++) {
            lines.push(this.editor.getLine(l));
        }

        return {
            text: lines.join('\n'),
            from: { line: startLine, ch: 0 },
            to: { line: endLine, ch: this.editor.getLine(endLine).length }
        };
    }

    private parseExistingMultiCallout(text: string): boolean {
        try {
            const lines = text.split('\n');
            const subCalloutRegex = /^\s*>+\s*\[!([^\]]+)\](?:\s*\(([^)]+)\))?\s*(.*)$/;

            let maxCol = 1;
            let maxRow = 1;
            const parsedAreas: GridAreaBlock[] = [];
            let currentBlock: Partial<GridAreaBlock> | null = null;
            let contentLines: string[] = [];

            const saveCurrentBlock = () => {
                if (currentBlock && currentBlock.type) {
                    currentBlock.content = contentLines.join('\n').trim();
                    parsedAreas.push(currentBlock as GridAreaBlock);
                    currentBlock = null;
                    contentLines = [];
                }
            };

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.includes('[!multi-callout]')) continue;

                const match = line.match(subCalloutRegex);
                if (match) {
                    saveCurrentBlock();

                    const rawType = match[1].trim().toLowerCase();
                    const rawMeta = match[2] || '';
                    const rawTitle = match[3]?.trim() || rawType.toUpperCase();

                    const { config, layoutParam } = parseMetadata(
                        rawMeta,
                        this.settings.standardColors,
                        this.settings.customColors
                    );

                    let minCol = 1, maxColPos = 1, minRow = 1, maxRowPos = 1;
                    if (layoutParam) {
                        const gridCfg = parseGridLayout(layoutParam);
                        if (gridCfg) {
                            minCol = gridCfg.position;
                            maxColPos = minCol + (gridCfg.colSpan ? gridCfg.colSpan - 1 : 0);
                            minRow = gridCfg.row;
                            maxRowPos = minRow + (gridCfg.rowSpan ? gridCfg.rowSpan - 1 : 0);

                            if (gridCfg.columns > maxCol) maxCol = gridCfg.columns;
                            if (maxRowPos > maxRow) maxRow = maxRowPos;
                        }
                    }

                    const areaId = `area${parsedAreas.length + 1}`;
                    currentBlock = {
                        id: areaId,
                        label: rawTitle || `Box ${parsedAreas.length + 1}`,
                        minRow,
                        maxRow: maxRowPos,
                        minCol,
                        maxCol: maxColPos,
                        type: rawType,
                        title: rawTitle,
                        content: '',
                        bgColor: config.bg,
                        borderColor: config.border,
                        titleColor: config.titleColor,
                        iconColor: config.iconColor,
                        iconName: config.icon || undefined,
                        neon: config.neon,
                        font: config.font,
                        fontSize: config.fontSize || undefined,
                        borderWidth: config.borderWidth,
                        borderStyle: config.borderStyle,
                        borderRadius: config.radius,
                        col: config.col || undefined,
                        compact: config.compact,
                        center: config.center,
                        noIcon: config.noIcon
                    };
                } else if (currentBlock) {
                    const cleanLine = line.replace(/^\s*>+\s?/, '');
                    contentLines.push(cleanLine);
                }
            }
            saveCurrentBlock();

            if (parsedAreas.length === 0) return false;

            this.gridCols = Math.max(maxCol, 2);
            this.gridRows = Math.max(maxRow, 2);
            this.initMatrix();
            this.areas.clear();

            parsedAreas.forEach(area => {
                this.areas.set(area.id, area);
                for (let r = area.minRow - 1; r < area.maxRow; r++) {
                    for (let c = area.minCol - 1; c < area.maxCol; c++) {
                        if (r < this.gridRows && c < this.gridCols) {
                            this.gridMatrix[r][c] = area.id;
                        }
                    }
                }
            });

            this.syncAreaBoundsFromMatrix();
            this.selectedAreaId = parsedAreas[0].id;
            return true;
        } catch (e) {
            console.error('Failed to parse existing multi-callout', e);
            return false;
        }
    }

    private initMatrix(): void {
        this.gridMatrix = [];
        for (let r = 0; r < this.gridRows; r++) {
            const row: string[] = [];
            for (let c = 0; c < this.gridCols; c++) {
                row.push('');
            }
            this.gridMatrix.push(row);
        }
    }

    /**
     * Recalculates bounding rows/cols for all areas from the gridMatrix and purges orphans
     */
    private syncAreaBoundsFromMatrix(): void {
        const activeIds = new Set<string>();
        const bounds = new Map<string, { minR: number; maxR: number; minC: number; maxC: number }>();

        for (let r = 0; r < this.gridRows; r++) {
            for (let c = 0; c < this.gridCols; c++) {
                const id = this.gridMatrix[r]?.[c];
                if (id) {
                    activeIds.add(id);
                    const b = bounds.get(id);
                    if (!b) {
                        bounds.set(id, { minR: r + 1, maxR: r + 1, minC: c + 1, maxC: c + 1 });
                    } else {
                        b.minR = Math.min(b.minR, r + 1);
                        b.maxR = Math.max(b.maxR, r + 1);
                        b.minC = Math.min(b.minC, c + 1);
                        b.maxC = Math.max(b.maxC, c + 1);
                    }
                }
            }
        }

        // Purge orphan areas that are no longer in matrix
        for (const id of Array.from(this.areas.keys())) {
            if (!activeIds.has(id)) {
                this.areas.delete(id);
            }
        }

        // Update bounds for remaining active areas
        bounds.forEach((b, id) => {
            const area = this.areas.get(id);
            if (area) {
                area.minRow = b.minR;
                area.maxRow = b.maxR;
                area.minCol = b.minC;
                area.maxCol = b.maxC;
            }
        });

        // Ensure selectedAreaId is valid
        if (!this.areas.has(this.selectedAreaId)) {
            this.selectedAreaId = this.areas.keys().next().value || '';
        }
    }

    public applyPresetLayout(presetKey: string): void {
        this.areas.clear();

        switch (presetKey) {
            case 'hero_2':
                this.gridRows = 2;
                this.gridCols = 2;
                this.initMatrix();
                this.areas.set('area1', {
                    id: 'area1', label: 'Hero Banner', minRow: 1, maxRow: 1, minCol: 1, maxCol: 2,
                    type: 'info', title: 'Featured Hero Header', content: 'Highlights or main objective.',
                    bgColor: '#00b8d4', iconName: 'sparkles'
                });
                this.areas.set('area2', {
                    id: 'area2', label: 'Left Column', minRow: 2, maxRow: 2, minCol: 1, maxCol: 1,
                    type: 'note', title: 'Details & Tasks', content: '- Task 1\n- Task 2',
                    bgColor: '#448aff', iconName: 'list-todo'
                });
                this.areas.set('area3', {
                    id: 'area3', label: 'Right Column', minRow: 2, maxRow: 2, minCol: 2, maxCol: 2,
                    type: 'tip', title: 'Notes & Next Steps', content: 'Key takeaways and references.',
                    bgColor: '#00bfa5', iconName: 'lightbulb'
                });
                break;

            case 'header_sidebar':
                this.gridRows = 2;
                this.gridCols = 3;
                this.initMatrix();
                this.areas.set('area1', {
                    id: 'area1', label: 'Header', minRow: 1, maxRow: 1, minCol: 1, maxCol: 3,
                    type: 'abstract', title: 'Project Overview & Metrics', content: 'Executive briefing and stats.',
                    bgColor: '#7c4dff', iconName: 'activity'
                });
                this.areas.set('area2', {
                    id: 'area2', label: 'Sidebar', minRow: 2, maxRow: 2, minCol: 1, maxCol: 1,
                    type: 'quote', title: 'Resources', content: '- [Documentation](https://obsidian.md)\n- [Roadmap](https://github.com)',
                    bgColor: '#607d8b', iconName: 'link'
                });
                this.areas.set('area3', {
                    id: 'area3', label: 'Main Workspace', minRow: 2, maxRow: 2, minCol: 2, maxCol: 3,
                    type: 'success', title: 'Main Deliverables', content: 'Active milestones and progress charts.',
                    bgColor: '#00c853', iconName: 'check-circle'
                });
                break;

            case 'cols_3':
                this.gridRows = 1;
                this.gridCols = 3;
                this.initMatrix();
                this.areas.set('area1', {
                    id: 'area1', label: 'Column 1', minRow: 1, maxRow: 1, minCol: 1, maxCol: 1,
                    type: 'note', title: 'Backlog', content: '- Item A\n- Item B',
                    bgColor: '#448aff', iconName: 'clock'
                });
                this.areas.set('area2', {
                    id: 'area2', label: 'Column 2', minRow: 1, maxRow: 1, minCol: 2, maxCol: 2,
                    type: 'warning', title: 'In Progress', content: '- Item C',
                    bgColor: '#ff9100', iconName: 'play'
                });
                this.areas.set('area3', {
                    id: 'area3', label: 'Column 3', minRow: 1, maxRow: 1, minCol: 3, maxCol: 3,
                    type: 'success', title: 'Completed', content: '- Item D',
                    bgColor: '#00c853', iconName: 'check'
                });
                break;

            case 'quad_2x2':
            default:
                this.gridRows = 2;
                this.gridCols = 2;
                this.initMatrix();
                this.areas.set('area1', {
                    id: 'area1', label: 'Card 1', minRow: 1, maxRow: 1, minCol: 1, maxCol: 1,
                    type: 'note', title: 'Section 1', content: 'Notes and thoughts.',
                    bgColor: '#448aff', iconName: 'pencil'
                });
                this.areas.set('area2', {
                    id: 'area2', label: 'Card 2', minRow: 1, maxRow: 1, minCol: 2, maxCol: 2,
                    type: 'tip', title: 'Section 2', content: 'Tips and tricks.',
                    bgColor: '#00bfa5', iconName: 'flame'
                });
                this.areas.set('area3', {
                    id: 'area3', label: 'Card 3', minRow: 2, maxRow: 2, minCol: 1, maxCol: 1,
                    type: 'warning', title: 'Section 3', content: 'Warnings and checks.',
                    bgColor: '#ff9100', iconName: 'alert-triangle'
                });
                this.areas.set('area4', {
                    id: 'area4', label: 'Card 4', minRow: 2, maxRow: 2, minCol: 2, maxCol: 2,
                    type: 'success', title: 'Section 4', content: 'Success criteria.',
                    bgColor: '#00c853', iconName: 'check'
                });
                break;
        }

        // Populate matrix from preset definitions
        this.areas.forEach(area => {
            for (let r = area.minRow - 1; r < area.maxRow; r++) {
                for (let c = area.minCol - 1; c < area.maxCol; c++) {
                    if (r < this.gridRows && c < this.gridCols) {
                        this.gridMatrix[r][c] = area.id;
                    }
                }
            }
        });

        this.syncAreaBoundsFromMatrix();
        this.selectedAreaId = this.areas.keys().next().value || 'area1';
    }

    onOpen(): void {
        this.modalEl.addClass('sc-multicolumn-builder-modal');
        this.renderModal();
    }

    private renderModal(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('special-callouts-ui');

        contentEl.createEl('h2', {
            text: this.isEditingExisting ? 'Edit Multi-Column Dashboard' : 'Multi-Column Dashboard Builder'
        });

        // 1. Sticky Dashboard Live Preview
        const previewContainer = contentEl.createDiv({ cls: 'sc-live-preview-container sc-sticky-preview' });
        const previewHeader = previewContainer.createDiv({ cls: 'sc-live-preview-header' });
        previewHeader.createSpan({ text: `Live Dashboard Preview (${this.gridCols} Columns Grid)` });

        this.liveDashboardEl = previewContainer.createDiv({ cls: 'callout sc-live-callout' });
        this.updateLivePreview();

        // 2. Navigation Tabs
        const nav = contentEl.createDiv({ cls: 'sc-nav-tabs sc-margin-bottom' });

        const activeArea = this.areas.get(this.selectedAreaId);
        const activeLabel = activeArea ? (activeArea.title || activeArea.label) : 'Active Box';

        const tabs: { id: BuilderTab; label: string; icon: string }[] = [
            { id: 'canvas', label: 'Layout Matrix & Canvas', icon: 'layout-grid' },
            { id: 'content', label: `Content & Type (${activeLabel})`, icon: 'file-text' },
            { id: 'colors', label: `Colors & Glow (${activeLabel})`, icon: 'palette' },
            { id: 'icon', label: `Icon & Font (${activeLabel})`, icon: 'type' },
            { id: 'layout', label: `Borders & Style (${activeLabel})`, icon: 'layout' }
        ];

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

        // 3. Dynamic Tab Container
        const tabContainer = contentEl.createDiv({ cls: 'sc-section-content' });
        this.renderTabContent(tabContainer);

        // 4. Action Footer
        new Setting(contentEl)
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

    private renderTabContent(container: HTMLElement): void {
        container.empty();

        switch (this.activeTab) {
            case 'canvas':
                this.renderGridCanvasSection(container);
                break;
            case 'content':
                this.renderContentSection(container);
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

    private renderGridCanvasSection(container: HTMLElement): void {
        // Presets Gallery
        const gallerySection = container.createDiv();
        gallerySection.createEl('h4', { text: 'Step 1: Choose Layout Preset' });

        const galleryGrid = gallerySection.createDiv({ cls: 'sc-cards-grid' });

        const presetCards = [
            { key: 'hero_2', name: '⚡ Hero + 2 Cards', desc: 'Top wide hero & 2 columns', icon: 'sparkles' },
            { key: 'header_sidebar', name: '📊 Workspace', desc: 'Header, Sidebar & Main', icon: 'layout-dashboard' },
            { key: 'cols_3', name: '📰 3 Columns', desc: '3 equal vertical cards', icon: 'columns' },
            { key: 'quad_2x2', name: '🔲 2×2 Quad', desc: '4 equal grid boxes', icon: 'grid' }
        ];

        presetCards.forEach(p => {
            const card = galleryGrid.createDiv({ cls: 'sc-card-item' });
            const iconDiv = card.createDiv();
            setIcon(iconDiv, p.icon);

            card.createDiv({ cls: 'sc-card-title', text: p.name });
            card.createEl('small', { text: p.desc, cls: 'sc-muted' });

            card.onclick = () => {
                this.applyPresetLayout(p.key);
                this.renderModal();
            };
        });

        // Dimensions Control & Tools
        const ctrlRow = container.createDiv({ cls: 'sc-flex-row sc-margin-top' });
        ctrlRow.createEl('strong', { text: 'Grid Matrix Dimensions:' });

        const presetSelect = ctrlRow.createEl('select');
        const presets = [
            { label: '2×2 Quad', r: 2, c: 2 },
            { label: '2×3 Standard', r: 2, c: 3 },
            { label: '3×3 Master', r: 3, c: 3 },
            { label: '2×4 Wide', r: 2, c: 4 },
            { label: '1×3 Columns', r: 1, c: 3 },
            { label: '1×2 Split', r: 1, c: 2 }
        ];

        presets.forEach(pr => {
            const opt = presetSelect.createEl('option', { text: pr.label, value: `${pr.r}x${pr.c}` });
            if (this.gridRows === pr.r && this.gridCols === pr.c) opt.selected = true;
        });

        presetSelect.onchange = () => {
            const [rStr, cStr] = presetSelect.value.split('x');
            this.setGridDimensions(parseInt(rStr, 10), parseInt(cStr, 10));
        };

        // Merge Button
        const mergeBtn = ctrlRow.createEl('button', { cls: 'mod-cta', text: 'Merge Selected Cells' });
        mergeBtn.onclick = () => this.mergeSelectedCells();

        // Split / Unmerge Button
        const splitBtn = ctrlRow.createEl('button', { text: 'Split / Unmerge Active Box' });
        splitBtn.onclick = () => this.splitActiveArea();

        // Matrix Canvas Grid
        this.renderVisualCanvas(container);

        // Box Quick Switcher
        this.renderBoxSwitcher(container);
    }

    private setGridDimensions(rows: number, cols: number): void {
        this.gridRows = rows;
        this.gridCols = cols;
        this.initMatrix();
        this.areas.clear();

        let count = 1;
        for (let r = 0; r < this.gridRows; r++) {
            for (let c = 0; c < this.gridCols; c++) {
                const id = `area${count}`;
                this.gridMatrix[r][c] = id;
                this.areas.set(id, {
                    id, label: `Box ${count}`,
                    minRow: r + 1, maxRow: r + 1, minCol: c + 1, maxCol: c + 1,
                    type: 'note', title: `Box ${count}`, content: 'Content goes here...'
                });
                count++;
            }
        }
        this.selectedAreaId = 'area1';
        this.renderModal();
    }

    private renderVisualCanvas(container: HTMLElement): void {
        const canvasWrapper = container.createDiv({ cls: 'sc-margin-top' });
        canvasWrapper.createEl('h4', { text: 'Step 2: Visual Grid Matrix (Click or Drag to Select & Merge)' });

        const canvasEl = canvasWrapper.createDiv({ cls: 'sc-cards-grid' });
        canvasEl.setCssProps({
            '--sc-grid-cols': `repeat(${this.gridCols}, 1fr)`
        });

        for (let r = 0; r < this.gridRows; r++) {
            for (let c = 0; c < this.gridCols; c++) {
                const areaId = this.gridMatrix[r]?.[c] || '';
                const area = this.areas.get(areaId);
                const isSelected = this.selectedAreaId === areaId;
                const isInDrag = this.isCellInDragSelection(r, c);

                const cell = canvasEl.createDiv({ cls: `sc-card-item ${isSelected || isInDrag ? 'is-active' : ''}` });
                cell.createDiv({ cls: 'sc-card-title', text: area ? area.title : `Cell (${r + 1},${c + 1})` });

                cell.onmousedown = () => {
                    this.isDragging = true;
                    this.dragStart = { r, c };
                    this.dragEnd = { r, c };
                    if (areaId) {
                        this.selectedAreaId = areaId;
                        this.updateLivePreview();
                    }
                };

                cell.onmouseenter = () => {
                    if (this.isDragging) {
                        this.dragEnd = { r, c };
                        this.renderVisualCanvas(container);
                    }
                };

                cell.onmouseup = () => {
                    this.isDragging = false;
                };
            }
        }

        window.onmouseup = () => { this.isDragging = false; };
    }

    private isCellInDragSelection(r: number, c: number): boolean {
        if (!this.dragStart || !this.dragEnd) return false;
        const minR = Math.min(this.dragStart.r, this.dragEnd.r);
        const maxR = Math.max(this.dragStart.r, this.dragEnd.r);
        const minC = Math.min(this.dragStart.c, this.dragEnd.c);
        const maxC = Math.max(this.dragStart.c, this.dragEnd.c);
        return r >= minR && r <= maxR && c >= minC && c <= maxC;
    }

    private mergeSelectedCells(): void {
        if (!this.dragStart || !this.dragEnd) {
            new Notice('Drag across cells on the matrix first to merge them!');
            return;
        }

        const minR = Math.min(this.dragStart.r, this.dragEnd.r);
        const maxR = Math.max(this.dragStart.r, this.dragEnd.r);
        const minC = Math.min(this.dragStart.c, this.dragEnd.c);
        const maxC = Math.max(this.dragStart.c, this.dragEnd.c);

        if (minR === maxR && minC === maxC) {
            new Notice('Please select more than 1 cell to merge!');
            return;
        }

        const newId = `area_${Date.now()}`;
        const newArea: GridAreaBlock = {
            id: newId,
            label: `Merged (${minR + 1}:${minC + 1} - ${maxR + 1}:${maxC + 1})`,
            minRow: minR + 1,
            maxRow: maxR + 1,
            minCol: minC + 1,
            maxCol: maxC + 1,
            type: 'note',
            title: `Merged Card`,
            content: 'Merged area content...'
        };

        for (let r = minR; r <= maxR; r++) {
            for (let c = minC; c <= maxC; c++) {
                this.gridMatrix[r][c] = newId;
            }
        }

        this.areas.set(newId, newArea);
        this.syncAreaBoundsFromMatrix();
        this.selectedAreaId = newId;
        this.dragStart = null;
        this.dragEnd = null;

        new Notice('Merged cells into a single card!');
        this.renderModal();
    }

    private splitActiveArea(): void {
        const area = this.areas.get(this.selectedAreaId);
        if (!area) return;

        const isSpanned = (area.maxRow > area.minRow) || (area.maxCol > area.minCol);
        if (!isSpanned) {
            new Notice('This card is already a single 1×1 cell.');
            return;
        }

        let count = 1;
        for (let r = area.minRow - 1; r < area.maxRow; r++) {
            for (let c = area.minCol - 1; c < area.maxCol; c++) {
                const subId = `area_${Date.now()}_${count}`;
                this.gridMatrix[r][c] = subId;
                this.areas.set(subId, {
                    id: subId,
                    label: `Cell (${r + 1},${c + 1})`,
                    minRow: r + 1,
                    maxRow: r + 1,
                    minCol: c + 1,
                    maxCol: c + 1,
                    type: area.type || 'note',
                    title: `${area.title} (${count})`,
                    content: 'Card content...',
                    bgColor: area.bgColor,
                    borderColor: area.borderColor
                });
                count++;
            }
        }

        this.syncAreaBoundsFromMatrix();
        new Notice('Split card into individual cells!');
        this.renderModal();
    }

    private renderBoxSwitcher(container: HTMLElement): void {
        const row = container.createDiv({ cls: 'sc-flex-row sc-margin-top' });
        row.createEl('strong', { text: 'Edit Active Box:' });

        const select = row.createEl('select');
        this.areas.forEach(a => {
            const opt = select.createEl('option', {
                text: `${a.title || a.label} (cols ${a.minCol}-${a.maxCol}, rows ${a.minRow}-${a.maxRow})`,
                value: a.id
            });
            if (a.id === this.selectedAreaId) opt.selected = true;
        });

        select.onchange = () => {
            this.selectedAreaId = select.value;
            this.renderModal();
        };
    }

    private renderContentSection(container: HTMLElement): void {
        const area = this.areas.get(this.selectedAreaId);
        if (!area) return;

        // Callout Type Chooser
        new Setting(container)
            .setName('Callout Type / Preset')
            .setDesc('Standard type or custom style')
            .addDropdown(drop => {
                Object.keys(DEFAULT_STANDARD_STYLES).forEach(type => {
                    drop.addOption(type, `Standard: ${type.toUpperCase()}`);
                });

                this.settings.customStyles.forEach(style => {
                    drop.addOption(style.name, `Custom: ${style.name}`);
                });

                drop.setValue(area.type || 'note');
                drop.onChange(val => {
                    area.type = val;
                    const std = DEFAULT_STANDARD_STYLES[val];
                    if (std) {
                        area.bgColor = std.bg;
                        area.borderColor = std.border;
                        area.iconName = std.icon;
                    }
                    this.updateLivePreview();
                });
            });

        // Title Input
        new Setting(container)
            .setName('Card Title')
            .addText(text => text
                .setValue(area.title || '')
                .onChange(val => {
                    area.title = val;
                    this.updateLivePreview();
                }));

        // Content Textarea
        new Setting(container)
            .setName('Card Content')
            .setDesc('Card markdown or bullet items')
            .addTextArea(text => text
                .setValue(area.content || '')
                .onChange(val => {
                    area.content = val;
                    this.updateLivePreview();
                }));
    }

    private renderColorsSection(container: HTMLElement): void {
        const area = this.areas.get(this.selectedAreaId);
        if (!area) return;

        createColorSetting(container, 'Background Color', 'Card background tint', area.bgColor || '', '#448aff', val => {
            area.bgColor = val;
            this.updateLivePreview();
        });

        createColorSetting(container, 'Border Color', 'Card outline border', area.borderColor || '', '#448aff', val => {
            area.borderColor = val;
            this.updateLivePreview();
        });

        createColorSetting(container, 'Title Color', 'Header title text color', area.titleColor || '', '', val => {
            area.titleColor = val;
            this.updateLivePreview();
        });

        createColorSetting(container, 'Neon Glow', 'Cyberpunk neon border & glow', area.neon || '', '', val => {
            area.neon = val;
            this.updateLivePreview();
        });
    }

    private renderIconSection(container: HTMLElement): void {
        const area = this.areas.get(this.selectedAreaId);
        if (!area) return;

        new Setting(container)
            .setName('Hide Icon (no-icon)')
            .addToggle(toggle => toggle
                .setValue(!!area.noIcon)
                .onChange(val => {
                    area.noIcon = val;
                    this.updateLivePreview();
                }));

        createIconSetting(container, this.app, 'Card Icon', 'Lucide icon name', area.iconName || 'pencil', icon => {
            area.iconName = icon;
            this.updateLivePreview();
        });

        createColorSetting(container, 'Icon Color', 'Dedicated icon color', area.iconColor || '', '', val => {
            area.iconColor = val;
            this.updateLivePreview();
        });

        createFontSetting(container, area.font || '', val => {
            area.font = val;
            this.updateLivePreview();
        });

        createFontSizeSetting(container, area.fontSize, val => {
            area.fontSize = val;
            this.updateLivePreview();
        });
    }

    private renderLayoutSection(container: HTMLElement): void {
        const area = this.areas.get(this.selectedAreaId);
        if (!area) return;

        createBorderStyleSetting(container, area.borderStyle || 'solid', val => {
            area.borderStyle = val;
            this.updateLivePreview();
        });

        new Setting(container)
            .setName('Border Width')
            .addDropdown(drop => {
                drop.addOption('0px', 'None (0px)');
                drop.addOption('1px', 'Thin (1px)');
                drop.addOption('2px', 'Medium (2px)');
                drop.addOption('4px', 'Thick (4px)');
                drop.setValue(area.borderWidth || '1px');
                drop.onChange(val => {
                    area.borderWidth = val;
                    this.updateLivePreview();
                });
            });

        new Setting(container)
            .setName('Corner Radius')
            .addSlider(slider => slider
                .setLimits(0, 30, 2)
                .setValue(parseInt(area.borderRadius || '8', 10) || 8)
                .setDynamicTooltip()
                .onChange(val => {
                    area.borderRadius = `${val}px`;
                    this.updateLivePreview();
                }));

        new Setting(container)
            .setName('Compact Padding')
            .addToggle(toggle => toggle
                .setValue(!!area.compact)
                .onChange(val => {
                    area.compact = val;
                    this.updateLivePreview();
                }));

        new Setting(container)
            .setName('Center Alignment')
            .addToggle(toggle => toggle
                .setValue(!!area.center)
                .onChange(val => {
                    area.center = val;
                    this.updateLivePreview();
                }));
    }

    private updateLivePreview(): void {
        if (!this.liveDashboardEl) return;
        this.liveDashboardEl.empty();
        this.liveDashboardEl.setAttribute('data-callout', 'multi-callout');

        const content = this.liveDashboardEl.createDiv({ cls: 'callout-content' });
        content.setCssProps({
            '--sc-multi-cols': this.gridCols.toString()
        });

        // Ensure bounds are accurate before previewing
        this.syncAreaBoundsFromMatrix();

        this.areas.forEach(area => {
            const cardWrapper = content.createDiv({ cls: 'sc-grid-item-wrapper' });
            const colSpan = area.maxCol - area.minCol + 1;
            const rowSpan = area.maxRow - area.minRow + 1;

            cardWrapper.setCssProps({
                '--sc-grid-col-start': area.minCol.toString(),
                '--sc-grid-col-span': colSpan.toString(),
                '--sc-grid-row-start': area.minRow.toString(),
                '--sc-grid-row-span': rowSpan.toString()
            });

            const card = cardWrapper.createDiv({ cls: 'callout sc-area-inner' });
            card.setAttribute('data-callout', area.type || 'note');

            const titleEl = card.createDiv({ cls: 'callout-title' });
            const iconEl = titleEl.createDiv({ cls: 'callout-icon' });
            const titleInner = titleEl.createDiv({ cls: 'callout-title-inner', text: area.title || area.label });
            const bodyEl = card.createDiv({ cls: 'callout-content' });
            bodyEl.createEl('p', { text: area.content || '...' });

            applyStyleToLivePreview(card, iconEl, titleInner, {
                bg: area.bgColor,
                border: area.borderColor,
                titleColor: area.titleColor,
                iconColor: area.iconColor,
                icon: area.iconName,
                neon: area.neon,
                font: area.font,
                fontSize: area.fontSize,
                borderWidth: area.borderWidth,
                borderStyle: area.borderStyle,
                borderRadius: area.borderRadius,
                compact: area.compact,
                center: area.center,
                noIcon: area.noIcon
            });
        });
    }

    private insertCalloutIntoEditor(): void {
        this.syncAreaBoundsFromMatrix();

        let result = `> [!multi-callout]\n>\n`;

        this.areas.forEach(area => {
            const colSpan = area.maxCol - area.minCol + 1;
            const rowSpan = area.maxRow - area.minRow + 1;

            // Generate clean canonical grid tokens
            let gridToken = '';
            if (rowSpan > 1 || area.minRow > 1) {
                // Multi-row: (colStart-colEnd:gridCols:rowStart-rowEnd)
                const colPart = colSpan > 1 ? `${area.minCol}-${area.maxCol}` : `${area.minCol}`;
                const rowPart = rowSpan > 1 ? `${area.minRow}-${area.maxRow}` : `${area.minRow}`;
                gridToken = `${colPart}:${this.gridCols}:${rowPart}`;
            } else if (colSpan > 1) {
                // Single row multi-col: (colStart-colEnd:gridCols)
                gridToken = `${area.minCol}-${area.maxCol}:${this.gridCols}`;
            } else {
                // Single cell: (pos:gridCols)
                gridToken = `${area.minCol}:${this.gridCols}`;
            }

            const metaParts: string[] = [gridToken];
            if (area.bgColor) metaParts.push(`bg:${area.bgColor}`);
            if (area.borderColor) metaParts.push(`border:${area.borderColor}`);
            if (area.titleColor) metaParts.push(`title:${area.titleColor}`);
            if (area.iconColor) metaParts.push(`icon-color:${area.iconColor}`);
            if (area.iconName) metaParts.push(`icon:${area.iconName}`);
            if (area.neon) metaParts.push(`neon:${area.neon}`);
            if (area.font) metaParts.push(`font:${area.font}`);
            if (area.fontSize && area.fontSize !== 3) metaParts.push(`font-size:${area.fontSize}`);
            if (area.borderWidth && area.borderWidth !== '1px') metaParts.push(`bw:${area.borderWidth}`);
            if (area.borderStyle && area.borderStyle !== 'solid') metaParts.push(`bs:${area.borderStyle}`);
            if (area.borderRadius && area.borderRadius !== '8px') metaParts.push(`radius:${area.borderRadius}`);
            if (area.col) metaParts.push(`col:${area.col}`);
            if (area.compact) metaParts.push('compact');
            if (area.center) metaParts.push('center');
            if (area.noIcon) metaParts.push('no-icon');

            const metaStr = metaParts.join(', ');
            result += `>> [!${area.type || 'note'}] (${metaStr}) ${area.title || area.label}\n`;
            const contentLines = (area.content || 'Content goes here...').split('\n');
            contentLines.forEach(cl => {
                result += `>> ${cl}\n`;
            });
            result += `>\n`;
        });

        if (this.existingRange) {
            this.editor.replaceRange(result, this.existingRange.from, this.existingRange.to);
            new Notice('Updated Dashboard Callout!');
        } else {
            this.editor.replaceSelection(result);
            new Notice('Inserted Dashboard Callout!');
        }
    }
}
