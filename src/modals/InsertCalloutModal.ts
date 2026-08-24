import {
    App,
    Modal,
    Editor,
    Setting,
    setIcon,
    Notice
} from 'obsidian';
import { SpecialCalloutsSettings } from '../types';
import { DEFAULT_STANDARD_STYLES, FONT_FAMILIES } from '../constants';
import { normalizeHex, toPx, neonStyles } from '../utils';
import { IconPickerModal } from './IconPickerModal';

import { MultiColumnBuilderModal } from './MultiColumnBuilderModal';

type InserterSection = 'content' | 'colors' | 'icon' | 'layout';

interface ColumnItem {
    type: string;
    title: string;
    content: string;
}

export class InsertCalloutModal extends Modal {
    private settings: SpecialCalloutsSettings;
    private editor: Editor;
    private selectedText: string;
    private activeSection: InserterSection = 'content';
    private liveCalloutEl: HTMLElement | null = null;

    // Form State - Single Callout
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
        this.contentText = this.selectedText || 'Callout content goes here...';
    }

    onOpen(): void {
        this.modalEl.addClass('sc-inserter-modal');
        this.renderModal();
    }

    private renderModal(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('special-callouts-ui');

        contentEl.createEl('h2', { text: 'Insert & Customize Callout' });

        // 1. Sticky Live Preview
        const previewContainer = contentEl.createDiv({ cls: 'sc-live-preview-container sc-sticky-preview' });
        const previewHeader = previewContainer.createDiv({ cls: 'sc-live-preview-header' });
        previewHeader.createSpan({ text: 'Live Callout Preview' });

        this.liveCalloutEl = previewContainer.createDiv({ cls: 'callout sc-live-callout' });
        this.updateLivePreview(this.liveCalloutEl);

        // 2. Section Navigation Tabs
        const nav = contentEl.createDiv({ cls: 'sc-nav-tabs' });
        nav.style.marginBottom = '1.25rem';

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
                this.renderSectionContent(sectionContainer, this.liveCalloutEl!);
                nav.querySelectorAll('.sc-nav-tab').forEach((b, i) => {
                    if (sections[i].id === sec.id) b.addClass('is-active');
                    else b.removeClass('is-active');
                });
            };
        });

        // 3. Dynamic Section Container
        const sectionContainer = contentEl.createDiv({ cls: 'sc-section-content' });
        sectionContainer.style.minHeight = '240px';
        this.renderSectionContent(sectionContainer, this.liveCalloutEl!);

        // 4. Action Footer
        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Insert Callout')
                .setCta()
                .onClick(() => {
                    this.insertCalloutIntoEditor();
                    this.close();
                }))
            .addButton(btn => btn
                .setButtonText('Cancel')
                .onClick(() => this.close()));
    }

    private renderSectionContent(container: HTMLElement, liveCallout: HTMLElement): void {
        container.empty();

        switch (this.activeSection) {
            case 'content':
                this.renderContentSection(container, liveCallout);
                break;
            case 'colors':
                this.renderColorsSection(container, liveCallout);
                break;
            case 'icon':
                this.renderIconSection(container, liveCallout);
                break;
            case 'layout':
                this.renderLayoutSection(container, liveCallout);
                break;
        }
    }

    // ==========================================
    // SECTION 1: CONTENT & MULTI-COLUMN MODE
    // ==========================================
    private renderContentSection(container: HTMLElement, liveCallout: HTMLElement): void {
        container.empty();

        // Multi-Column Dashboard Launcher
        new Setting(container)
            .setName('Multi-Column Dashboard Builder 🚀')
            .setDesc('Design side-by-side multi-line column cards with full per-column colors, icons, & styles')
            .addButton(btn => btn
                .setButtonText('Open Dashboard Builder')
                .setCta()
                .onClick(() => {
                    this.close();
                    new MultiColumnBuilderModal(this.app, this.settings, this.editor).open();
                }));

        // Single Callout Form
        new Setting(container)
            .setName('Callout Preset / Style')
            .setDesc('Pick a standard callout or saved custom style')
            .addDropdown(drop => {
                drop.addOption('note', 'Note (Default)');
                drop.addOption('abstract', 'Abstract / Summary / TLDR');
                drop.addOption('info', 'Info');
                drop.addOption('todo', 'Todo');
                drop.addOption('tip', 'Tip / Hint');
                drop.addOption('important', 'Important');
                drop.addOption('success', 'Success / Check / Done');
                drop.addOption('question', 'Question / Help / FAQ');
                drop.addOption('warning', 'Warning / Caution / Attention');
                drop.addOption('failure', 'Failure / Fail / Missing');
                drop.addOption('danger', 'Danger / Error');
                drop.addOption('bug', 'Bug');
                drop.addOption('example', 'Example');
                drop.addOption('quote', 'Quote / Cite');

                this.settings.customStyles.forEach(s => {
                    drop.addOption(s.name, `Custom: ${s.name}`);
                });

                drop.setValue(this.calloutType);
                drop.onChange(val => {
                    this.calloutType = val;
                    this.applyPreset(val);
                    this.updateLivePreview(liveCallout);
                });
            });

        new Setting(container)
            .setName('Callout Title')
            .addText(text => text
                .setValue(this.titleText)
                .onChange(val => {
                    this.titleText = val;
                    this.updateLivePreview(liveCallout);
                }));

        new Setting(container)
            .setName('Callout Body Text')
            .setDesc('Content lines to put inside the callout')
            .addTextArea(ta => {
                ta.setValue(this.contentText);
                ta.inputEl.rows = 4;
                ta.inputEl.style.width = '100%';
                ta.inputEl.style.fontSize = '0.9rem';
                ta.onChange(val => {
                    this.contentText = val;
                    this.updateLivePreview(liveCallout);
                });
            });
    }

    // ==========================================
    // SECTION 2: COLORS & GLOW
    // ==========================================
    private renderColorsSection(container: HTMLElement, liveCallout: HTMLElement): void {
        new Setting(container)
            .setName('Background Color')
            .addText(text => text
                .setValue(this.bgColor)
                .onChange(val => {
                    this.bgColor = val;
                    this.updateLivePreview(liveCallout);
                }))
            .addColorPicker(picker => picker
                .setValue(normalizeHex(this.bgColor))
                .onChange(val => {
                    this.bgColor = val;
                    this.updateLivePreview(liveCallout);
                }));

        new Setting(container)
            .setName('Border Color')
            .addText(text => text
                .setValue(this.borderColor)
                .onChange(val => {
                    this.borderColor = val;
                    this.updateLivePreview(liveCallout);
                }))
            .addColorPicker(picker => picker
                .setValue(normalizeHex(this.borderColor))
                .onChange(val => {
                    this.borderColor = val;
                    this.updateLivePreview(liveCallout);
                }));

        new Setting(container)
            .setName('Title Color')
            .addText(text => text
                .setPlaceholder('Auto (same as border)')
                .setValue(this.titleColor)
                .onChange(val => {
                    this.titleColor = val;
                    this.updateLivePreview(liveCallout);
                }))
            .addColorPicker(picker => picker
                .setValue(normalizeHex(this.titleColor || '#ffffff'))
                .onChange(val => {
                    this.titleColor = val;
                    this.updateLivePreview(liveCallout);
                }));

        new Setting(container)
            .setName('Icon Color')
            .addText(text => text
                .setPlaceholder('Auto (follows title)')
                .setValue(this.iconColor)
                .onChange(val => {
                    this.iconColor = val;
                    this.updateLivePreview(liveCallout);
                }))
            .addColorPicker(picker => picker
                .setValue(normalizeHex(this.iconColor || '#ffffff'))
                .onChange(val => {
                    this.iconColor = val;
                    this.updateLivePreview(liveCallout);
                }));

        new Setting(container)
            .setName('Neon Glow Effect')
            .setDesc('Color of glowing cyber neon border')
            .addText(text => text
                .setPlaceholder('#00f2ff or cyan')
                .setValue(this.neon)
                .onChange(val => {
                    this.neon = val;
                    this.updateLivePreview(liveCallout);
                }));
    }

    // ==========================================
    // SECTION 3: ICON & FONT
    // ==========================================
    private renderIconSection(container: HTMLElement, liveCallout: HTMLElement): void {
        const iconSetting = new Setting(container)
            .setName('Callout Icon')
            .setDesc('Select any Lucide icon');

        const iconSpan = iconSetting.nameEl.createSpan();
        iconSpan.style.marginLeft = '10px';
        setIcon(iconSpan, this.iconName);

        iconSetting.addButton(btn => btn
            .setButtonText('Change Icon')
            .onClick(() => {
                new IconPickerModal(this.app, (selected) => {
                    this.iconName = selected;
                    iconSpan.empty();
                    setIcon(iconSpan, selected);
                    this.updateLivePreview(liveCallout);
                }).open();
            }));

        new Setting(container)
            .setName('Font Family')
            .addDropdown(drop => drop
                .addOption('', 'Default (Theme Interface)')
                .addOption('mono', 'Monospace')
                .addOption('serif', 'Serif')
                .addOption('sans', 'Sans-Serif')
                .addOption('hand', 'Handwritten')
                .addOption('marker', 'Chalkboard Marker')
                .setValue(this.font)
                .onChange(val => {
                    this.font = val;
                    this.updateLivePreview(liveCallout);
                }));

        new Setting(container)
            .setName('Font Size')
            .addDropdown(drop => drop
                .addOption('1', '1 - Smallest (0.85em)')
                .addOption('2', '2 - Small (0.92em)')
                .addOption('3', '3 - Default (1.0em)')
                .addOption('4', '4 - Large (1.2em)')
                .addOption('5', '5 - Largest (1.5em)')
                .setValue(this.fontSize.toString())
                .onChange(val => {
                    this.fontSize = parseInt(val);
                    this.updateLivePreview(liveCallout);
                }));
    }

    // ==========================================
    // SECTION 4: BORDERS & LAYOUT
    // ==========================================
    private renderLayoutSection(container: HTMLElement, liveCallout: HTMLElement): void {
        new Setting(container)
            .setName('Corner Radius')
            .addSlider(slider => slider
                .setLimits(0, 30, 1)
                .setValue(parseInt(this.borderRadius) || 8)
                .onChange(val => {
                    this.borderRadius = `${val}px`;
                    this.updateLivePreview(liveCallout);
                }));

        new Setting(container)
            .setName('Border Width & Style')
            .addDropdown(drop => drop
                .addOption('', 'Default Width')
                .addOption('1px', '1px (Thin)')
                .addOption('2px', '2px (Medium)')
                .addOption('4px', '4px (Thick)')
                .setValue(this.borderWidth)
                .onChange(val => {
                    this.borderWidth = val;
                    this.updateLivePreview(liveCallout);
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
                .setValue(this.borderStyle)
                .onChange(val => {
                    this.borderStyle = val;
                    this.updateLivePreview(liveCallout);
                }));

        new Setting(container)
            .setName('List Columns')
            .setDesc('Divide lists inside callout into columns')
            .addDropdown(drop => drop
                .addOption('', 'Normal (1 Column)')
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
            .setDesc('Tighter padding for dense notes')
            .addToggle(toggle => toggle
                .setValue(this.compact)
                .onChange(val => {
                    this.compact = val;
                    this.updateLivePreview(liveCallout);
                }));

        new Setting(container)
            .setName('Center Alignment')
            .setDesc('Center align both title and text')
            .addToggle(toggle => toggle
                .setValue(this.center)
                .onChange(val => {
                    this.center = val;
                    this.updateLivePreview(liveCallout);
                }));

        new Setting(container)
            .setName('Hide Icon')
            .addToggle(toggle => toggle
                .setValue(this.noIcon)
                .onChange(val => {
                    this.noIcon = val;
                    this.updateLivePreview(liveCallout);
                }));
    }

    private applyPreset(typeName: string): void {
        const customStyle = this.settings.customStyles.find(s => s.name.toLowerCase() === typeName.toLowerCase());
        if (customStyle) {
            this.titleText = customStyle.name.charAt(0).toUpperCase() + customStyle.name.slice(1);
            this.bgColor = customStyle.bg || '#448aff';
            this.borderColor = customStyle.border || '#448aff';
            this.titleColor = customStyle.titleColor || '';
            this.iconName = customStyle.icon || 'pencil';
            this.iconColor = customStyle.iconColor || '';
            this.textColor = customStyle.text || '';
            this.font = customStyle.font || '';
            this.fontSize = customStyle.fontSize || 3;
            this.borderWidth = customStyle.borderWidth || '1px';
            this.borderStyle = customStyle.borderStyle || 'solid';
            this.borderRadius = customStyle.borderRadius || '8px';
            this.neon = customStyle.neon || '';
            this.compact = customStyle.compact || false;
            this.center = customStyle.center || false;
            this.titleCenter = customStyle.titleCenter || false;
            this.noIcon = customStyle.noIcon || false;
            return;
        }

        const standardStyle = this.settings.standardStyles[typeName.toLowerCase()] || DEFAULT_STANDARD_STYLES[typeName.toLowerCase()];
        if (standardStyle) {
            this.titleText = typeName.charAt(0).toUpperCase() + typeName.slice(1);
            this.bgColor = standardStyle.bg || '#448aff';
            this.borderColor = standardStyle.border || standardStyle.bg || '#448aff';
            this.titleColor = standardStyle.titleColor || '';
            this.iconName = standardStyle.icon || 'pencil';
            this.iconColor = '';
            this.textColor = standardStyle.text || '';
            this.neon = '';
            this.compact = false;
            this.center = false;
        }
    }

    private updateLivePreview(targetEl?: HTMLElement): void {
        const el = targetEl || this.liveCalloutEl;
        if (!el) return;
        el.empty();

        // Single Callout Preview
        const bg = this.bgColor ? `color-mix(in srgb, ${this.bgColor} 15%, transparent)` : 'var(--background-secondary)';
        const border = this.borderColor ? `${this.borderWidth || '1px'} ${this.borderStyle || 'solid'} ${this.borderColor}` : '1px solid var(--background-modifier-border)';

        el.style.backgroundColor = bg;
        el.style.border = border;
        el.style.borderRadius = this.borderRadius ? toPx(this.borderRadius) : '8px';
        el.style.padding = this.compact ? '0.4em 0.8em' : '0.8em 1.2em';
        el.style.textAlign = this.center ? 'center' : 'left';

        if (this.font && FONT_FAMILIES[this.font]) {
            el.style.fontFamily = FONT_FAMILIES[this.font];
        } else {
            el.style.fontFamily = 'inherit';
        }

        if (this.neon) {
            const neon = neonStyles(this.neon);
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
        titleEl.style.justifyContent = (this.center || this.titleCenter) ? 'center' : 'flex-start';
        titleEl.style.color = this.titleColor || this.borderColor || 'var(--text-normal)';
        titleEl.style.fontWeight = '600';
        titleEl.style.marginBottom = '4px';

        if (!this.noIcon) {
            const iconEl = titleEl.createDiv({ cls: 'callout-icon' });
            iconEl.style.color = this.iconColor || this.titleColor || this.borderColor || 'inherit';
            setIcon(iconEl, this.iconName || 'pencil');
        }

        titleEl.createSpan({ text: this.titleText || 'Title' });

        // Content
        const contentEl = el.createDiv({ cls: 'callout-content' });
        contentEl.style.color = this.textColor || 'var(--text-muted)';
        contentEl.style.fontSize = '0.9em';

        const lines = (this.contentText || 'Content').split('\n');
        lines.forEach(l => {
            contentEl.createEl('p', { text: l, attr: { style: 'margin: 2px 0;' } });
        });
    }

    private insertCalloutIntoEditor(): void {
        // Single Callout Markdown Output (parenthesised metadata format: > [!type] (meta) Title)
        const metaParams: string[] = [];

        if (this.bgColor) metaParams.push(`bg:${this.bgColor}`);
        if (this.borderColor && this.borderColor !== this.bgColor) metaParams.push(`border:${this.borderColor}`);
        if (this.titleColor) metaParams.push(`title:${this.titleColor}`);
        if (this.iconColor) metaParams.push(`icon-color:${this.iconColor}`);
        if (this.iconName && this.iconName !== 'pencil') metaParams.push(`icon:${this.iconName}`);
        if (this.neon) metaParams.push(`neon:${this.neon}`);
        if (this.font) metaParams.push(`font:${this.font}`);
        if (this.fontSize && this.fontSize !== 3) metaParams.push(`font-size:${this.fontSize}`);
        if (this.borderRadius) metaParams.push(`radius:${this.borderRadius}`);
        if (this.borderWidth && this.borderWidth !== '1px') metaParams.push(`border-width:${this.borderWidth}`);
        if (this.borderStyle && this.borderStyle !== 'solid') metaParams.push(`border-style:${this.borderStyle}`);
        if (this.colCount) metaParams.push(`col:${this.colCount}`);
        if (this.compact) metaParams.push('compact');
        if (this.center) metaParams.push('center');
        if (this.noIcon) metaParams.push('no-icon');

        const metadataString = metaParams.length > 0 ? `(${metaParams.join(', ')}) ` : '';
        const headerLine = `> [!${this.calloutType}] ${metadataString}${this.titleText || 'Title'}`;

        const bodyLines = (this.contentText || 'Callout content')
            .split('\n')
            .map(line => `> ${line}`)
            .join('\n');

        const finalCalloutMarkdown = `${headerLine}\n${bodyLines}\n`;

        this.editor.replaceSelection(finalCalloutMarkdown);
        new Notice('Callout inserted!');
    }
}
