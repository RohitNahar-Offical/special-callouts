/**
 * Special Callouts - InsertCalloutModal
 * Unified, tabbed insertion modal with sticky real-time live preview
 */

import { App, Modal, Editor, Setting, setIcon, Notice } from 'obsidian';
import { SpecialCalloutsSettings, CalloutStyle } from '../types';
import { DEFAULT_STANDARD_STYLES } from '../constants';
import { serializeMetadata } from '../parser';
import {
    createColorSetting,
    createIconSetting,
    createBorderStyleSetting,
    createFontSetting,
    createFontSizeSetting,
    applyStyleToLivePreview
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
        this.liveCalloutEl.setAttribute('data-callout', this.calloutType);

        const titleEl = this.liveCalloutEl.createDiv({ cls: 'callout-title' });
        this.iconEl = titleEl.createDiv({ cls: 'callout-icon' });
        this.titleInnerEl = titleEl.createDiv({ cls: 'callout-title-inner', text: this.titleText });
        this.bodyEl = this.liveCalloutEl.createDiv({ cls: 'callout-content' });
        this.bodyEl.createEl('p', { text: this.contentText });

        this.updateLivePreview();

        // 2. Section Navigation Tabs
        const nav = contentEl.createDiv({ cls: 'sc-nav-tabs sc-margin-bottom' });

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

        // 3. Dynamic Section Container
        const sectionContainer = contentEl.createDiv({ cls: 'sc-section-content' });
        this.renderSectionContent(sectionContainer);

        // 4. Action Buttons
        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Insert Into Note')
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
                this.renderIconFontSection(container);
                break;
            case 'layout':
                this.renderBordersLayoutSection(container);
                break;
        }
    }

    private renderContentSection(container: HTMLElement): void {
        // Preset / Type Chooser
        new Setting(container)
            .setName('Callout Preset / Type')
            .setDesc('Select standard Obsidian type or a saved custom style')
            .addDropdown(drop => {
                drop.addOption('custom-builder', '⚡ Open Multi-Column Dashboard Builder...');
                
                Object.keys(DEFAULT_STANDARD_STYLES).forEach(type => {
                    drop.addOption(`std:${type}`, `Standard: ${type.toUpperCase()}`);
                });

                if (this.settings.customStyles.length > 0) {
                    this.settings.customStyles.forEach(style => {
                        drop.addOption(`custom:${style.name}`, `Custom Style: ${style.name}`);
                    });
                }

                drop.setValue(`std:${this.calloutType}`);
                drop.onChange(val => {
                    if (val === 'custom-builder') {
                        this.close();
                        new MultiColumnBuilderModal(this.app, this.settings, this.editor).open();
                        return;
                    }

                    if (val.startsWith('std:')) {
                        const type = val.slice(4);
                        this.calloutType = type;
                        this.titleText = type.charAt(0).toUpperCase() + type.slice(1);
                        const std = DEFAULT_STANDARD_STYLES[type];
                        if (std) {
                            this.bgColor = std.bg;
                            this.borderColor = std.border;
                            this.iconName = std.icon;
                        }
                    } else if (val.startsWith('custom:')) {
                        const name = val.slice(7);
                        const custom = this.settings.customStyles.find(s => s.name === name);
                        if (custom) {
                            this.calloutType = custom.name;
                            this.titleText = custom.name;
                            this.bgColor = custom.bg || '#448aff';
                            this.borderColor = custom.border || '#448aff';
                            this.textColor = custom.text || '';
                            this.titleColor = custom.titleColor || '';
                            this.iconColor = custom.iconColor || '';
                            this.iconName = custom.icon || 'pencil';
                            this.borderWidth = custom.borderWidth || '1px';
                            this.borderStyle = custom.borderStyle || 'solid';
                            this.borderRadius = custom.borderRadius || '8px';
                            this.neon = custom.neon || '';
                            this.compact = !!custom.compact;
                            this.center = !!custom.center;
                            this.titleCenter = !!custom.titleCenter;
                        }
                    }
                    this.updateLivePreview();
                });
            });

        // Title Input
        new Setting(container)
            .setName('Callout Title')
            .addText(text => text
                .setValue(this.titleText)
                .onChange(val => {
                    this.titleText = val;
                    this.updateLivePreview();
                }));

        // Content Input
        new Setting(container)
            .setName('Content Body')
            .setDesc('Callout body text or markdown')
            .addTextArea(text => text
                .setValue(this.contentText)
                .onChange(val => {
                    this.contentText = val;
                    this.updateLivePreview();
                }));
    }

    private renderColorsSection(container: HTMLElement): void {
        createColorSetting(container, 'Background Color', 'Background tint', this.bgColor, '#448aff', val => {
            this.bgColor = val;
            this.updateLivePreview();
        });

        createColorSetting(container, 'Border Color', 'Outline border color', this.borderColor, '#448aff', val => {
            this.borderColor = val;
            this.updateLivePreview();
        });

        createColorSetting(container, 'Title Color', 'Header text color', this.titleColor, '', val => {
            this.titleColor = val;
            this.updateLivePreview();
        });

        createColorSetting(container, 'Body Text Color', 'Callout text color', this.textColor, '', val => {
            this.textColor = val;
            this.updateLivePreview();
        });

        createColorSetting(container, 'Neon Glow', 'Cyberpunk neon border & shadow glow', this.neon, '', val => {
            this.neon = val;
            this.updateLivePreview();
        });
    }

    private renderIconFontSection(container: HTMLElement): void {
        new Setting(container)
            .setName('Hide Icon (no-icon)')
            .addToggle(toggle => toggle
                .setValue(this.noIcon)
                .onChange(val => {
                    this.noIcon = val;
                    this.updateLivePreview();
                }));

        createIconSetting(container, this.app, 'Callout Icon', 'Lucide icon name', this.iconName, icon => {
            this.iconName = icon;
            this.updateLivePreview();
        });

        createColorSetting(container, 'Custom Icon Color', 'Dedicated icon color', this.iconColor, '', val => {
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

    private renderBordersLayoutSection(container: HTMLElement): void {
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

        createBorderStyleSetting(container, this.borderStyle, val => {
            this.borderStyle = val;
            this.updateLivePreview();
        });

        new Setting(container)
            .setName('Corner Radius')
            .addSlider(slider => slider
                .setLimits(0, 30, 2)
                .setValue(parseInt(this.borderRadius, 10) || 8)
                .setDynamicTooltip()
                .onChange(val => {
                    this.borderRadius = `${val}px`;
                    this.updateLivePreview();
                }));

        new Setting(container)
            .setName('List Columns')
            .setDesc('Split bullet/numbered lists into multi-column layout')
            .addDropdown(drop => {
                drop.addOption('', 'Default (1 Column)');
                drop.addOption('2', '2 Columns (col:2)');
                drop.addOption('3', '3 Columns (col:3)');
                drop.addOption('4', '4 Columns (col:4)');
                drop.setValue(this.colCount ? this.colCount.toString() : '');
                drop.onChange(val => {
                    this.colCount = val ? parseInt(val, 10) : null;
                });
            });

        new Setting(container)
            .setName('Compact Mode')
            .setDesc('Reduce internal padding')
            .addToggle(toggle => toggle
                .setValue(this.compact)
                .onChange(val => {
                    this.compact = val;
                    this.updateLivePreview();
                }));

        new Setting(container)
            .setName('Center Alignment')
            .addToggle(toggle => toggle
                .setValue(this.center)
                .onChange(val => {
                    this.center = val;
                    this.updateLivePreview();
                }));
    }

    private updateLivePreview(): void {
        if (!this.liveCalloutEl || !this.iconEl || !this.titleInnerEl || !this.bodyEl) return;

        this.titleInnerEl.textContent = this.titleText || 'Callout';
        this.bodyEl.empty();
        this.bodyEl.createEl('p', { text: this.contentText || 'Content...' });

        const styleObj: Partial<CalloutStyle> = {
            bg: this.bgColor,
            border: this.borderColor,
            text: this.textColor,
            titleColor: this.titleColor,
            iconColor: this.iconColor,
            icon: this.iconName,
            font: this.font,
            fontSize: this.fontSize,
            borderWidth: this.borderWidth,
            borderStyle: this.borderStyle,
            borderRadius: this.borderRadius,
            neon: this.neon,
            compact: this.compact,
            center: this.center,
            titleCenter: this.titleCenter,
            noIcon: this.noIcon
        };

        applyStyleToLivePreview(this.liveCalloutEl, this.iconEl, this.titleInnerEl, styleObj);
    }

    private insertCallout(): void {
        const styleConfig: Partial<CalloutStyle> = {
            bg: this.bgColor,
            border: this.borderColor,
            text: this.textColor,
            titleColor: this.titleColor,
            iconColor: this.iconColor,
            icon: this.iconName,
            font: this.font,
            fontSize: this.fontSize !== 3 ? this.fontSize : undefined,
            borderWidth: this.borderWidth !== '1px' ? this.borderWidth : undefined,
            borderStyle: this.borderStyle !== 'solid' ? this.borderStyle : undefined,
            borderRadius: this.borderRadius !== '8px' ? this.borderRadius : undefined,
            neon: this.neon,
            compact: this.compact,
            center: this.center,
            titleCenter: this.titleCenter,
            noIcon: this.noIcon
        };

        const serialized = serializeMetadata(styleConfig as any);
        const metaStr = serialized ? ` (${serialized})` : '';
        const header = `> [!${this.calloutType}]${metaStr} ${this.titleText}\n`;
        const body = this.contentText
            .split('\n')
            .map(l => `> ${l}`)
            .join('\n');

        const fullBlock = `${header}${body}\n`;
        this.editor.replaceSelection(fullBlock);
        new Notice('Inserted Callout!');
    }
}
