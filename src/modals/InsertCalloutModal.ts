import { App, Modal, Editor, Setting, setIcon, Notice, MarkdownRenderer } from 'obsidian';
import { SpecialCalloutsSettings, CalloutStyle, CalloutConfig } from '../types';
import { DEFAULT_STANDARD_STYLES } from '../constants';
import { serializeMetadata, parseMetadata, extractMetadata } from '../parser';
import {
    createColorSetting,
    createIconSetting,
    createBorderStyleSetting,
    createFontSetting,
    createFontSizeSetting,
    createGradientSetting,
    applyStyleToLivePreview,
    createMarkdownEditorWithToolbar
} from '../ui/UIComponents';
import { MultiColumnBuilderModal } from './MultiColumnBuilderModal';

type InserterSection = 'content' | 'colors' | 'icon' | 'layout';

export class InsertCalloutModal extends Modal {
    private settings: SpecialCalloutsSettings;
    private editor: Editor;
    private selectedText: string;
    private activeSection: InserterSection = 'content';
    private liveCalloutEl: HTMLElement | null = null;
    private titleInnerEl: HTMLElement | null = null;
    private iconEl: HTMLElement | null = null;
    private bodyEl: HTMLElement | null = null;
    private closeSuggesterFn: (() => void) | null = null;

    // Existing Callout Detection State
    private existingRange: { from: { line: number; ch: number }; to: { line: number; ch: number } } | null = null;
    private isEditingExisting: boolean = false;

    // Form State
    private calloutType: string = 'note';
    private titleText: string = 'Note';
    private contentText: string = '';
    private iconName: string = 'pencil';
    private iconColor: string = '';
    private titleColor: string = '';
    private bgColor: string = '#448aff';
    private borderColor: string = '#448aff';
    private textColor: string = '';
    private linkColor: string = '';
    private gradient: string = '';
    private font: string = '';
    private fontSize: number = 3;
    private borderWidth: string = '1px';
    private borderStyle: string = 'solid';
    private borderRadius: string = '8px';
    private neon: string = '';
    private colCount: number | null = null;
    private compact: boolean = false;
    private center: boolean = false;
    private titleCenter: boolean = false;
    private noIcon: boolean = false;

    constructor(app: App, settings: SpecialCalloutsSettings, editor: Editor) {
        super(app);
        this.settings = settings;
        this.editor = editor;
        this.selectedText = editor.getSelection().trim();

        // Check if cursor or selection is inside an existing single callout
        const detected = this.findCalloutAtCursor();
        if (detected && this.parseExistingCallout(detected.text)) {
            this.existingRange = { from: detected.from, to: detected.to };
            this.isEditingExisting = true;
        } else {
            this.contentText = this.selectedText || 'Callout content goes here...';
        }
    }

    private findCalloutAtCursor(): { text: string; from: { line: number; ch: number }; to: { line: number; ch: number } } | null {
        const selection = this.editor.getSelection();
        if (selection && /^\s*>\s*\[!([a-zA-Z0-9_\-]+)(?:\|[^\]]+)?\]/m.test(selection)) {
            const cursorFrom = this.editor.getCursor('from');
            const cursorTo = this.editor.getCursor('to');
            return { text: selection, from: cursorFrom, to: cursorTo };
        }

        const cursor = this.editor.getCursor();
        const totalLines = this.editor.lineCount();

        // Scan backwards to find `> [!...` header
        let startLine = -1;
        for (let l = cursor.line; l >= 0; l--) {
            const line = this.editor.getLine(l);
            if (/^\s*>\s*\[!([a-zA-Z0-9_\-]+)(?:\|[^\]]+)?\]/i.test(line)) {
                startLine = l;
                break;
            }
            if (!/^\s*>/.test(line) && line.trim() !== '') {
                break;
            }
        }

        if (startLine === -1) return null;

        // Scan forwards from startLine to find end of callout block
        let endLine = startLine;
        for (let l = startLine + 1; l < totalLines; l++) {
            const line = this.editor.getLine(l);
            if (/^\s*>/.test(line)) {
                endLine = l;
            } else {
                break;
            }
        }

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

    private parseExistingCallout(markdown: string): boolean {
        const lines = markdown.split('\n');
        if (lines.length === 0) return false;

        const headerLine = lines[0];
        const headMatch = headerLine.match(/^\s*>\s*\[!([a-zA-Z0-9_\-]+)(?:\|([^\]]+))?\]\s*(.*)$/);
        if (!headMatch) return false;

        const rawType = headMatch[1].trim();
        if (rawType.toLowerCase() === 'multi-callout') {
            return false;
        }

        this.calloutType = rawType;
        const pipeMeta = headMatch[2] ? headMatch[2].trim() : '';
        let rawTitle = headMatch[3] ? headMatch[3].trim() : '';

        // Extract metadata span in title if present: e.g. "(bg:red, link:yellow) My Title" or "My Title (bg:red)"
        let metaStr = pipeMeta;
        const extracted = extractMetadata(rawTitle, (this.settings.customLayouts || []).map(l => l.name));
        if (extracted) {
            metaStr = metaStr ? `${metaStr}, ${extracted.content}` : extracted.content;
            rawTitle = extracted.title;
        }

        this.titleText = rawTitle || this.calloutType.charAt(0).toUpperCase() + this.calloutType.slice(1);

        // Extract clean body lines (strip leading > and optional space)
        const bodyLines = lines.slice(1).map(l => l.replace(/^\s*>\s?/, ''));
        this.contentText = bodyLines.join('\n');

        // Apply metadata if found
        if (metaStr) {
            const parsed = parseMetadata(
                metaStr,
                this.settings.standardColors,
                this.settings.customColors,
                (this.settings.customLayouts || []).map(l => l.name)
            );
            const cfg = parsed.config;
            if (cfg.bg) this.bgColor = cfg.bg;
            if (cfg.border) this.borderColor = cfg.border;
            if (cfg.text) this.textColor = cfg.text;
            if (cfg.link) this.linkColor = cfg.link;
            if (cfg.titleColor) this.titleColor = cfg.titleColor;
            if (cfg.iconColor) this.iconColor = cfg.iconColor;
            if (cfg.icon) this.iconName = cfg.icon;
            if (cfg.font) this.font = cfg.font;
            if (cfg.fontSize) this.fontSize = cfg.fontSize;
            if (cfg.borderWidth) this.borderWidth = cfg.borderWidth;
            if (cfg.borderStyle) this.borderStyle = cfg.borderStyle;
            if (cfg.radius) this.borderRadius = cfg.radius;
            if (cfg.neon) this.neon = cfg.neon;
            if (cfg.gradient) this.gradient = cfg.gradient;
            if (cfg.col) this.colCount = cfg.col;
            if (cfg.compact !== undefined) this.compact = cfg.compact;
            if (cfg.center !== undefined) this.center = cfg.center;
            if (cfg.titleCenter !== undefined) this.titleCenter = cfg.titleCenter;
            if (cfg.noIcon !== undefined) this.noIcon = cfg.noIcon;
        } else {
            const std = DEFAULT_STANDARD_STYLES[this.calloutType.toLowerCase()];
            if (std) {
                this.bgColor = std.bg;
                this.borderColor = std.border;
                this.iconName = std.icon;
            }
            const custom = this.settings.customStyles.find(s => s.name.toLowerCase() === this.calloutType.toLowerCase());
            if (custom) {
                this.bgColor = custom.bg || '#448aff';
                this.borderColor = custom.border || '#448aff';
                this.textColor = custom.text || '';
                this.linkColor = custom.link || '';
                this.titleColor = custom.titleColor || '';
                this.iconColor = custom.iconColor || '';
                this.iconName = custom.icon || 'pencil';
                this.font = custom.font || '';
                this.fontSize = custom.fontSize ?? 3;
                this.borderWidth = custom.borderWidth || '1px';
                this.borderStyle = custom.borderStyle || 'solid';
                this.borderRadius = custom.borderRadius || '8px';
                this.neon = custom.neon || '';
                this.gradient = custom.gradient || '';
                this.compact = !!custom.compact;
                this.center = !!custom.center;
                this.titleCenter = !!custom.titleCenter;
                this.noIcon = !!custom.noIcon;
            }
        }

        return true;
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
        headerEl.createEl('h3', {
            text: this.isEditingExisting ? 'Edit Callout' : 'Special Callout Studio',
            cls: 'sc-studio-title'
        });
        if (this.isEditingExisting) {
            headerEl.createSpan({ text: 'Editing Existing', cls: 'sc-studio-badge' });
        }

        // Top Primary Mode Switcher: SINGLE | MULTI
        const modeWrap = contentEl.createDiv({ cls: 'sc-mode-switcher-container' });

        const singleBtn = modeWrap.createEl('button', {
            cls: 'sc-mode-btn is-active'
        });
        const singleIcon = singleBtn.createSpan();
        setIcon(singleIcon, 'file-text');
        singleBtn.createSpan({ text: 'Single Callout' });

        const multiBtn = modeWrap.createEl('button', {
            cls: 'sc-mode-btn'
        });
        const multiIcon = multiBtn.createSpan();
        setIcon(multiIcon, 'layout-grid');
        multiBtn.createSpan({ text: 'Multi-Column Dashboard' });
        multiBtn.onclick = () => {
            if (this.closeSuggesterFn) this.closeSuggesterFn();
            this.close();
            new MultiColumnBuilderModal(this.app, this.settings, this.editor).open();
        };

        // 1. Section Navigation Tabs (Placed directly below Mode Switcher)
        const nav = contentEl.createDiv({ cls: 'sc-nav-tabs' });

        const sections: { id: InserterSection; label: string; icon: string }[] = [
            { id: 'content', label: 'Content & Mode', icon: 'file-text' },
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
                this.renderSectionContent(sectionContainer);
                nav.querySelectorAll('.sc-nav-tab').forEach((b, i) => {
                    if (sections[i].id === sec.id) b.addClass('is-active');
                    else b.removeClass('is-active');
                });
            };
        });

        // 2. Sticky Live Preview
        const previewContainer = contentEl.createDiv({ cls: 'sc-live-preview-container sc-sticky-preview' });
        const previewHeader = previewContainer.createDiv({ cls: 'sc-live-preview-header' });
        previewHeader.createSpan({ text: 'Live Callout Preview' });

        this.liveCalloutEl = previewContainer.createDiv({ cls: 'callout sc-live-callout' });
        this.liveCalloutEl.setAttribute('data-callout', this.calloutType);

        const titleEl = this.liveCalloutEl.createDiv({ cls: 'callout-title' });
        this.iconEl = titleEl.createDiv({ cls: 'callout-icon' });
        this.titleInnerEl = titleEl.createDiv({ cls: 'callout-title-inner', text: this.titleText });
        this.bodyEl = this.liveCalloutEl.createDiv({ cls: 'callout-content' });
        this.bodyEl.createEl('p', { text: this.contentText });

        this.updateLivePreview();

        // 3. Dynamic Section Container
        const sectionContainer = contentEl.createDiv({ cls: 'sc-section-content' });
        this.renderSectionContent(sectionContainer);

        // 4. Action Buttons
        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText(this.isEditingExisting ? 'Update Callout' : 'Insert Into Note')
                .setCta()
                .onClick(() => {
                    this.insertCallout();
                    this.close();
                }))
            .addButton(btn => btn
                .setButtonText('Cancel')
                .onClick(() => this.close()));
    }

    private renderSectionContent(container: HTMLElement): void {
        container.empty();

        switch (this.activeSection) {
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

    private renderContentSection(container: HTMLElement): void {
        const formCard = container.createDiv({ cls: 'sc-card-item' });
        formCard.style.background = 'var(--background-secondary)';
        formCard.style.border = '1px solid var(--background-modifier-border)';
        formCard.style.borderRadius = '8px';
        formCard.style.padding = '14px';

        // Top Row: Type Select & Title Input
        const topCtrl = formCard.createDiv();
        topCtrl.style.display = 'grid';
        topCtrl.style.gridTemplateColumns = '150px 1fr';
        topCtrl.style.gap = '10px';
        topCtrl.style.marginBottom = '12px';

        const typeSelect = topCtrl.createEl('select');

        // Standard presets group
        const stdGroup = typeSelect.createEl('optgroup', { attr: { label: 'Standard Callouts' } });
        ['note', 'tip', 'info', 'warning', 'danger', 'success', 'question', 'quote', 'bug', 'example', 'summary', 'important', 'caution', 'todo'].forEach(t => {
            const opt = stdGroup.createEl('option', { value: t, text: t.charAt(0).toUpperCase() + t.slice(1) });
            if (t.toLowerCase() === this.calloutType.toLowerCase()) opt.selected = true;
        });

        // Custom user styles group
        if (this.settings.customStyles && this.settings.customStyles.length > 0) {
            const customGroup = typeSelect.createEl('optgroup', { attr: { label: 'Custom Styles' } });
            this.settings.customStyles.forEach(s => {
                const opt = customGroup.createEl('option', { value: `custom:${s.name}`, text: s.name });
                if (s.name.toLowerCase() === this.calloutType.toLowerCase()) opt.selected = true;
            });
        }

        const titleInput = topCtrl.createEl('input', {
            type: 'text',
            value: this.titleText,
            placeholder: 'Callout Title'
        });

        typeSelect.onchange = (e) => {
            const val = (e.target as HTMLSelectElement).value;
            if (val.startsWith('custom:')) {
                const name = val.slice(7);
                const custom = this.settings.customStyles.find(s => s.name === name);
                if (custom) {
                    this.calloutType = custom.name;
                    if (!this.titleText || this.titleText.toLowerCase() === 'note' || this.titleText === this.calloutType) {
                        this.titleText = custom.name;
                        titleInput.value = custom.name;
                    }
                    this.bgColor = custom.bg || '#448aff';
                    this.borderColor = custom.border || '#448aff';
                    this.textColor = custom.text || '';
                    this.linkColor = custom.link || '';
                    this.titleColor = custom.titleColor || '';
                    this.iconColor = custom.iconColor || '';
                    this.iconName = custom.icon || 'pencil';
                    this.font = custom.font || '';
                    this.fontSize = custom.fontSize ?? 3;
                    this.borderWidth = custom.borderWidth || '1px';
                    this.borderStyle = custom.borderStyle || 'solid';
                    this.borderRadius = custom.borderRadius || '8px';
                    this.neon = custom.neon || '';
                    this.gradient = custom.gradient || '';
                    this.compact = !!custom.compact;
                    this.center = !!custom.center;
                    this.titleCenter = !!custom.titleCenter;
                    this.noIcon = !!custom.noIcon;
                }
            } else {
                const type = val;
                this.calloutType = type;
                this.gradient = '';
                const formattedTitle = type.charAt(0).toUpperCase() + type.slice(1);
                if (!this.titleText || this.titleText.toLowerCase() === this.calloutType.toLowerCase()) {
                    this.titleText = formattedTitle;
                    titleInput.value = formattedTitle;
                }
                const std = DEFAULT_STANDARD_STYLES[type];
                if (std) {
                    this.bgColor = std.bg;
                    this.borderColor = std.border;
                    this.iconName = std.icon;
                }
            }
            this.updateLivePreview();
        };

        titleInput.oninput = (e) => {
            this.titleText = (e.target as HTMLInputElement).value;
            this.updateLivePreview();
        };

        // Rich Markdown Editor with Toolbar & [[ Suggester
        if (this.closeSuggesterFn) {
            this.closeSuggesterFn();
            this.closeSuggesterFn = null;
        }

        const editorComp = createMarkdownEditorWithToolbar({
            container: formCard,
            app: this.app,
            initialValue: this.contentText,
            placeholder: 'Type callout content, [[links]], #tags, or lists...',
            rows: 6,
            onChange: (val) => {
                this.contentText = val;
                this.updateLivePreview();
            }
        });
        this.closeSuggesterFn = editorComp.closeSuggester;
    }

    private renderColorsSection(container: HTMLElement): void {
        createGradientSetting(container, this.gradient, val => {
            this.gradient = val;
            this.updateLivePreview();
        });

        createColorSetting(container, 'Background Color (Tint)', 'Translucent 15% background tint (used when gradient is off)', this.bgColor, '#448aff', val => {
            this.bgColor = val;
            this.updateLivePreview();
        });

        createColorSetting(container, 'Border Color', 'Outline border color', this.borderColor, '#448aff', val => {
            this.borderColor = val;
            this.updateLivePreview();
        });

        createColorSetting(container, 'Title Color', 'Header text color', this.titleColor, '#ffffff', val => {
            this.titleColor = val;
            this.updateLivePreview();
        });

        createColorSetting(container, 'Body Text Color', 'Callout text color (leave blank for theme default)', this.textColor, '#ffffff', val => {
            this.textColor = val;
            this.updateLivePreview();
        });

        createColorSetting(container, 'Link Color', 'Link text color inside callout', this.linkColor, '#3498db', val => {
            this.linkColor = val;
            this.updateLivePreview();
        });

        createColorSetting(container, 'Neon Glow Effect', 'Color of glowing cyber neon border', this.neon, '#00f2ff', val => {
            this.neon = val;
            this.updateLivePreview();
        });
    }

    private renderIconSection(container: HTMLElement): void {
        createIconSetting(container, this.app, 'Callout Icon', 'Lucide icon name', this.iconName, (selected: string) => {
            this.iconName = selected;
            this.updateLivePreview();
        });

        createColorSetting(container, 'Icon Color', 'Custom icon tint (leave blank to follow title)', this.iconColor, '#ffffff', val => {
            this.iconColor = val;
            this.updateLivePreview();
        });

        createFontSetting(container, this.font, val => {
            this.font = val;
            this.updateLivePreview();
        });

        createFontSizeSetting(container, this.fontSize, val => {
            this.fontSize = val;
            this.updateLivePreview();
        });
    }

    private renderLayoutSection(container: HTMLElement): void {
        new Setting(container)
            .setName('Border Width')
            .addDropdown(drop => {
                drop.addOption('0px', 'None (0px)');
                drop.addOption('1px', 'Thin (1px)');
                drop.addOption('2px', 'Medium (2px)');
                drop.addOption('4px', 'Thick (4px)');
                drop.setValue(this.borderWidth);
                drop.onChange(val => {
                    this.borderWidth = val;
                    this.updateLivePreview();
                });
            });

        createBorderStyleSetting(container, this.borderStyle, (s: string) => {
            this.borderStyle = s;
            this.updateLivePreview();
        });

        new Setting(container)
            .setName('Corner Radius')
            .addSlider(slider => slider
                .setLimits(0, 30, 1)
                .setValue(parseInt(this.borderRadius || '8') || 8)
                .onChange(val => {
                    this.borderRadius = `${val}px`;
                    this.updateLivePreview();
                }));

        new Setting(container)
            .setName('List Columns')
            .setDesc('Split list items inside callout into columns')
            .addDropdown(drop => drop
                .addOption('', 'None')
                .addOption('2', '2 Columns')
                .addOption('3', '3 Columns')
                .addOption('4', '4 Columns')
                .setValue(this.colCount ? this.colCount.toString() : '')
                .onChange(val => {
                    this.colCount = val ? parseInt(val) : null;
                    this.updateLivePreview();
                }));

        new Setting(container)
            .setName('Compact Mode')
            .setDesc('Tighter padding for lists & dense notes')
            .addToggle(toggle => toggle
                .setValue(this.compact)
                .onChange(val => {
                    this.compact = val;
                    this.updateLivePreview();
                }));

        new Setting(container)
            .setName('Center Text (center)')
            .setDesc('Center align both title and body text')
            .addToggle(toggle => toggle
                .setValue(this.center)
                .onChange(val => {
                    this.center = val;
                    this.updateLivePreview();
                }));

        new Setting(container)
            .setName('Center Title Only (title:center)')
            .setDesc('Center align only the title header')
            .addToggle(toggle => toggle
                .setValue(this.titleCenter)
                .onChange(val => {
                    this.titleCenter = val;
                    this.updateLivePreview();
                }));

        new Setting(container)
            .setName('Hide Icon (no-icon)')
            .setDesc('Hide icon completely')
            .addToggle(toggle => toggle
                .setValue(this.noIcon)
                .onChange(val => {
                    this.noIcon = val;
                    this.updateLivePreview();
                }));
    }

    private updateLivePreview(): void {
        if (!this.liveCalloutEl || !this.iconEl || !this.titleInnerEl || !this.bodyEl) return;

        this.titleInnerEl.textContent = this.titleText || 'Callout';
        this.bodyEl.empty();
        void MarkdownRenderer.render(this.app, this.contentText || 'Type callout content...', this.bodyEl, '', this as unknown as any);

        const styleObj: Partial<CalloutStyle> = {
            bg: this.bgColor,
            border: this.borderColor,
            text: this.textColor,
            link: this.linkColor,
            titleColor: this.titleColor,
            iconColor: this.iconColor,
            icon: this.iconName,
            font: this.font,
            fontSize: this.fontSize,
            borderWidth: this.borderWidth,
            borderStyle: this.borderStyle,
            borderRadius: this.borderRadius,
            neon: this.neon,
            gradient: this.gradient,
            compact: this.compact,
            center: this.center,
            titleCenter: this.titleCenter,
            noIcon: this.noIcon
        };

        applyStyleToLivePreview(this.liveCalloutEl, this.iconEl, this.titleInnerEl, styleObj);
    }

    private insertCallout(): void {
        const config: Partial<CalloutConfig> = {
            bg: this.bgColor,
            border: this.borderColor,
            text: this.textColor,
            link: this.linkColor,
            titleColor: this.titleColor,
            iconColor: this.iconColor,
            icon: this.iconName,
            font: this.font,
            fontSize: this.fontSize !== 3 ? this.fontSize : null,
            borderWidth: this.borderWidth !== '1px' ? this.borderWidth : '',
            borderStyle: this.borderStyle !== 'solid' ? this.borderStyle : '',
            radius: this.borderRadius !== '8px' ? this.borderRadius : '',
            neon: this.neon,
            gradient: this.gradient,
            col: this.colCount,
            compact: this.compact,
            center: this.center,
            titleCenter: this.titleCenter,
            noIcon: this.noIcon
        };

        const serialized = serializeMetadata(config);
        const metaStr = serialized ? ` (${serialized})` : '';
        const header = `> [!${this.calloutType}]${metaStr} ${this.titleText}\n`;
        const body = this.contentText
            .split('\n')
            .map(l => `> ${l}`)
            .join('\n');

        const fullBlock = `${header}${body}\n`;
        if (this.existingRange) {
            this.editor.replaceRange(fullBlock.trimEnd() + '\n', this.existingRange.from, this.existingRange.to);
            new Notice('Callout updated!');
        } else {
            this.editor.replaceSelection(fullBlock);
            new Notice('Inserted Callout!');
        }
    }

    onClose(): void {
        if (this.closeSuggesterFn) {
            this.closeSuggesterFn();
            this.closeSuggesterFn = null;
        }
        this.liveCalloutEl = null;
        this.titleInnerEl = null;
        this.iconEl = null;
        this.bodyEl = null;
        this.contentEl.empty();
    }
}
