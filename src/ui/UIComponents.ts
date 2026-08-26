/**
 * Special Callouts - Reusable UI Component Primitives
 * Adheres to DRY principles and Obsidian UI guidelines (no static style assignments)
 */

import { Setting, setIcon, App, Component, MarkdownRenderer } from 'obsidian';
import { CalloutStyle, CalloutConfig } from '../types';
import { FONT_FAMILIES, FONT_SIZES } from '../constants';
import { normalizeHex, toPx, neonStyles } from '../utils';
import { IconPickerModal } from '../modals/IconPickerModal';

export const BORDER_STYLES = [
    { value: 'solid', label: 'Solid' },
    { value: 'dashed', label: 'Dashed' },
    { value: 'dotted', label: 'Dotted' },
    { value: 'double', label: 'Double' },
    { value: 'groove', label: 'Groove' },
    { value: 'ridge', label: 'Ridge' },
    { value: 'inset', label: 'Inset' },
    { value: 'outset', label: 'Outset' }
];

export const FONT_OPTIONS = [
    { value: '', label: 'Default' },
    { value: 'mono', label: 'Monospace' },
    { value: 'serif', label: 'Serif' },
    { value: 'sans', label: 'Sans-Serif' },
    { value: 'hand', label: 'Handwritten' },
    { value: 'marker', label: 'Marker' }
];

export interface MarkdownEditorOptions {
    container: HTMLElement;
    app: App;
    initialValue: string;
    placeholder?: string;
    rows?: number;
    onChange: (val: string) => void;
}

export function createMarkdownEditorWithToolbar(options: MarkdownEditorOptions): {
    wrapper: HTMLElement;
    textArea: HTMLTextAreaElement;
    getValue: () => string;
    setValue: (val: string) => void;
    closeSuggester: () => void;
} {
    const { container, app, initialValue, placeholder, rows = 4, onChange } = options;
    const wrapper = container.createDiv({ cls: 'sc-markdown-editor-wrap' });

    // Toolbar
    const toolbar = wrapper.createDiv({ cls: 'sc-editor-toolbar' });

    const textArea = wrapper.createEl('textarea', { cls: 'sc-markdown-textarea' });
    textArea.value = initialValue || '';
    textArea.placeholder = placeholder || 'Write callout content (supports markdown, [[links]], #tags)...';
    textArea.rows = rows;

    let suggestEl: HTMLElement | null = null;
    let suggestItems: string[] = [];
    let selectedIndex = 0;
    let suggestType: 'link' | 'tag' | null = null;
    let suggestStart = -1;

    const closeSuggester = () => {
        if (suggestEl) {
            suggestEl.remove();
            suggestEl = null;
        }
        suggestType = null;
        suggestStart = -1;
    };

    const wrapText = (prefix: string, suffix: string, cursorOffset = 0) => {
        const start = textArea.selectionStart;
        const end = textArea.selectionEnd;
        const selected = textArea.value.substring(start, end);
        const before = textArea.value.substring(0, start);
        const after = textArea.value.substring(end);

        textArea.value = before + prefix + selected + suffix + after;

        if (cursorOffset > 0) {
            const newPos = start + cursorOffset;
            textArea.setSelectionRange(newPos, newPos);
        } else {
            textArea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
        }

        onChange(textArea.value);
        textArea.focus();
    };

    const addBtn = (iconName: string, tooltipText: string, action: () => void) => {
        const btn = toolbar.createEl('button', { cls: 'sc-toolbar-btn', title: tooltipText });
        setIcon(btn, iconName);
        btn.onclick = (e) => {
            e.preventDefault();
            action();
        };
    };

    addBtn('bold', 'Bold (Ctrl+B)', () => wrapText('**', '**'));
    addBtn('italic', 'Italic (Ctrl+I)', () => wrapText('*', '*'));
    addBtn('strikethrough', 'Strikethrough', () => wrapText('~~', '~~'));
    addBtn('highlighter', 'Highlight', () => wrapText('==', '=='));
    addBtn('code', 'Inline Code', () => wrapText('`', '`'));
    addBtn('file-code-2', 'Code Block', () => wrapText('\n```\n', '\n```\n'));
    addBtn('link', 'Markdown Link (Ctrl+K)', () => wrapText('[', ']()', 1 + (textArea.selectionEnd - textArea.selectionStart) + 2));
    addBtn('link-2', 'Internal Wikilink [[', () => wrapText('[[', ']]'));
    addBtn('list', 'Bullet List', () => wrapText('\n- ', ''));
    addBtn('check-square', 'Task List', () => wrapText('\n- [ ] ', ''));

    // Clipboard unblocking
    const stopNative = (e: Event) => e.stopPropagation();
    textArea.addEventListener('copy', stopNative);
    textArea.addEventListener('cut', stopNative);
    textArea.addEventListener('paste', stopNative);

    const renderSuggest = () => {
        if (!suggestEl) {
            suggestEl = activeDocument.body.createDiv({ cls: 'sc-suggestion-container' });
            const sub = suggestEl.createDiv({ cls: 'sc-suggestion' });
            suggestItems.forEach((item, idx) => {
                const el = sub.createDiv({ cls: `sc-suggestion-item ${idx === selectedIndex ? 'is-selected' : ''}` });
                const icon = el.createSpan();
                setIcon(icon, suggestType === 'link' ? 'file-text' : 'tag');
                el.createSpan({ cls: 'sc-suggestion-content', text: item });
                el.onclick = () => selectItem(idx);
            });

            const rect = textArea.getBoundingClientRect();
            suggestEl.addClass('sc-var-left', 'sc-var-top');
            suggestEl.setCssProps({
                '--sc-dyn-left': `${Math.max(10, rect.left + 10)}px`,
                '--sc-dyn-top': `${Math.min(window.innerHeight - 230, rect.top + 30)}px`
            });
        } else {
            const sub = suggestEl.querySelector('.sc-suggestion');
            if (sub) {
                sub.empty();
                suggestItems.forEach((item, idx) => {
                    const el = sub.createDiv({ cls: `sc-suggestion-item ${idx === selectedIndex ? 'is-selected' : ''}` });
                    const icon = el.createSpan();
                    setIcon(icon, suggestType === 'link' ? 'file-text' : 'tag');
                    el.createSpan({ cls: 'sc-suggestion-content', text: item });
                    el.onclick = () => selectItem(idx);
                });
            }
        }
    };

    const selectItem = (idx: number) => {
        const item = suggestItems[idx];
        const before = textArea.value.substring(0, suggestStart);
        const after = textArea.value.substring(textArea.selectionStart);

        const inserted = suggestType === 'link' ? `${item}]]` : `${item} `;
        textArea.value = before + inserted + after;
        textArea.focus();
        const newPos = before.length + inserted.length;
        textArea.setSelectionRange(newPos, newPos);

        onChange(textArea.value);
        closeSuggester();
    };

    textArea.onkeydown = (e) => {
        e.stopPropagation();

        if (suggestType && suggestItems.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % suggestItems.length;
                renderSuggest();
                return;
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = (selectedIndex - 1 + suggestItems.length) % suggestItems.length;
                renderSuggest();
                return;
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                selectItem(selectedIndex);
                return;
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeSuggester();
                return;
            }
        }

        if (e.ctrlKey || e.metaKey) {
            const key = e.key.toLowerCase();
            if (key === 'b') {
                e.preventDefault();
                wrapText('**', '**');
            } else if (key === 'i') {
                e.preventDefault();
                wrapText('*', '*');
            } else if (key === 'k') {
                e.preventDefault();
                wrapText('[', ']()', 1 + (textArea.selectionEnd - textArea.selectionStart) + 2);
            }
        }
    };

    textArea.oninput = () => {
        const val = textArea.value;
        const pos = textArea.selectionStart;
        onChange(val);

        if (suggestType) {
            const triggerIntact = suggestType === 'link'
                ? (suggestStart >= 2 && val.substring(suggestStart - 2, suggestStart) === '[[')
                : (suggestStart >= 1 && val.substring(suggestStart - 1, suggestStart) === '#');

            if (pos < suggestStart || !triggerIntact) {
                closeSuggester();
            }
        }

        const lastTwo = val.substring(pos - 2, pos);
        const lastOne = val.substring(pos - 1, pos);

        if (lastTwo === '[[') {
            suggestType = 'link';
            suggestStart = pos;
            selectedIndex = 0;
        } else if (lastOne === '#' && !suggestType) {
            suggestType = 'tag';
            suggestStart = pos;
            selectedIndex = 0;
        }

        if (suggestType) {
            const query = val.substring(suggestStart, pos).toLowerCase();
            if (query.includes(' ') || query.includes('\n')) {
                closeSuggester();
            } else {
                let all: string[] = [];
                if (suggestType === 'link') {
                    all = app.vault.getMarkdownFiles().map(f => f.basename);
                } else {
                    const tagsCache = (app.metadataCache as any)?.getTags?.() || {};
                    all = Object.keys(tagsCache).map(t => t.startsWith('#') ? t.substring(1) : t);
                }

                suggestItems = all.filter(item => item.toLowerCase().includes(query)).slice(0, 10);
                if (suggestItems.length === 0) {
                    closeSuggester();
                } else {
                    renderSuggest();
                }
            }
        }
    };

    textArea.onblur = () => {
        window.setTimeout(() => closeSuggester(), 200);
    };

    return {
        wrapper,
        textArea,
        getValue: () => textArea.value,
        setValue: (val: string) => {
            textArea.value = val;
            onChange(val);
        },
        closeSuggester
    };
}

/**
 * Renders a sticky Live Callout Preview card into a container
 */
export function renderLiveCalloutPreview(
    container: HTMLElement,
    titleText: string,
    contentText: string,
    app?: App,
    component?: Component
): {
    previewCard: HTMLElement;
    titleInner: HTMLElement;
    iconEl: HTMLElement;
    bodyEl: HTMLElement;
    updateContent: (content: string) => void;
} {
    const previewContainer = container.createDiv({ cls: 'sc-live-preview-container' });
    const previewCard = previewContainer.createDiv({ cls: 'callout' });
    previewCard.setAttribute('data-callout', 'note');

    const titleEl = previewCard.createDiv({ cls: 'callout-title' });
    const iconEl = titleEl.createDiv({ cls: 'callout-icon' });
    setIcon(iconEl, 'pencil');
    const titleInner = titleEl.createDiv({ cls: 'callout-title-inner', text: titleText });

    const bodyEl = previewCard.createDiv({ cls: 'callout-content' });

    const updateContent = (content: string) => {
        bodyEl.empty();
        if (app && component) {
            void MarkdownRenderer.render(app, content || 'Type callout content...', bodyEl, '', component);
        } else {
            const p = bodyEl.createEl('p');
            p.createSpan({ text: content || 'Type callout content...' });
        }
    };

    updateContent(contentText);

    return { previewCard, titleInner, iconEl, bodyEl, updateContent };
}

/**
 * Creates a dual Text + Native ColorPicker setting row with 2-way live sync
 */
export function createColorSetting(
    container: HTMLElement,
    name: string,
    desc: string,
    currentValue: string,
    defaultColor: string,
    onChange: (color: string) => void
): Setting {
    let textComp: any = null;
    let pickerComp: any = null;

    const setting = new Setting(container)
        .setName(name)
        .setDesc(desc)
        .addText(text => {
            textComp = text;
            text
                .setPlaceholder(defaultColor)
                .setValue(currentValue)
                .onChange(val => {
                    const normalized = normalizeHex(val);
                    if (normalized && pickerComp) {
                        pickerComp.setValue(normalized);
                    }
                    onChange(val);
                });
        })
        .addColorPicker(picker => {
            pickerComp = picker;
            picker
                .setValue(normalizeHex(currentValue || defaultColor))
                .onChange(val => {
                    if (textComp) {
                        textComp.setValue(val);
                    }
                    onChange(val);
                });
        });

    return setting;
}

/**
 * Creates an Icon Selector setting row with Lucide picker modal
 */
export function createIconSetting(
    container: HTMLElement,
    app: App,
    name: string,
    desc: string,
    currentIcon: string,
    onSelect: (icon: string) => void
): Setting {
    const setting = new Setting(container)
        .setName(name)
        .setDesc(desc);

    setting.addButton(btn => {
        btn.setButtonText(currentIcon ? `Icon: ${currentIcon}` : 'Choose Icon...');
        if (currentIcon) {
            btn.setIcon(currentIcon);
        }
        btn.onClick(() => {
            new IconPickerModal(app, (selected) => {
                btn.setButtonText(`Icon: ${selected}`);
                btn.setIcon(selected);
                onSelect(selected);
            }).open();
        });
    });

    return setting;
}

/**
 * Creates a Border Style dropdown setting row
 */
export function createBorderStyleSetting(
    container: HTMLElement,
    currentStyle: string,
    onChange: (style: string) => void
): Setting {
    return new Setting(container)
        .setName('Border Style')
        .setDesc('Choose CSS border pattern')
        .addDropdown(drop => {
            BORDER_STYLES.forEach(s => drop.addOption(s.value, s.label));
            drop.setValue(currentStyle || 'solid');
            drop.onChange(val => onChange(val));
        });
}

/**
 * Creates a Font Family dropdown setting row
 */
export function createFontSetting(
    container: HTMLElement,
    currentFont: string,
    onChange: (font: string) => void
): Setting {
    return new Setting(container)
        .setName('Font Family')
        .setDesc('Typography style for callout text')
        .addDropdown(drop => {
            FONT_OPTIONS.forEach(f => drop.addOption(f.value, f.label));
            drop.setValue(currentFont || '');
            drop.onChange(val => onChange(val));
        });
}

/**
 * Creates a Font Size slider setting row (1-5 scale)
 */
export function createFontSizeSetting(
    container: HTMLElement,
    currentSize: number | null | undefined,
    onChange: (size: number) => void
): Setting {
    return new Setting(container)
        .setName('Font Size')
        .setDesc('Scale text size (1: Tiny → 5: Huge)')
        .addSlider(slider => slider
            .setLimits(1, 5, 1)
            .setValue(currentSize || 3)
            .setDynamicTooltip()
            .onChange(val => onChange(val)));
}

/**
 * Updates a Live Callout Preview DOM element with style properties safely
 */
export function applyStyleToLivePreview(
    previewCard: HTMLElement,
    iconEl: HTMLElement,
    titleInner: HTMLElement,
    style: Partial<CalloutStyle>
): void {
    const cssProps: Record<string, string> = {};

    // Reset attributes
    previewCard.removeAttribute('data-sc-bg');
    previewCard.removeAttribute('data-sc-border');
    previewCard.removeAttribute('data-sc-bw');
    previewCard.removeAttribute('data-sc-bs');
    previewCard.removeAttribute('data-sc-radius');
    previewCard.removeAttribute('data-sc-neon');
    previewCard.removeAttribute('data-sc-font');
    previewCard.removeAttribute('data-sc-fontsize');
    previewCard.removeAttribute('data-compact');
    previewCard.removeAttribute('data-center');
    previewCard.removeAttribute('data-title-center');
    previewCard.removeAttribute('data-sc-title-color');
    previewCard.removeAttribute('data-sc-icon-color');
    previewCard.removeAttribute('data-sc-text');
    previewCard.removeAttribute('data-link-color');

    if (style.bg) {
        cssProps['--sc-bg-color'] = createTransparentBg(style.bg, 15);
        previewCard.setAttribute('data-sc-bg', '');
    }

    if (style.text) {
        cssProps['--sc-text-color'] = style.text;
        previewCard.setAttribute('data-sc-text', '');
    }

    if (style.link) {
        cssProps['--link-color'] = style.link;
        cssProps['--link-color-hover'] = style.link;
        cssProps['--link-internal-color'] = style.link;
        cssProps['--link-external-color'] = style.link;
        cssProps['--sc-link-color'] = style.link;
        previewCard.setAttribute('data-link-color', style.link);
    }

    if (style.titleColor) {
        cssProps['--sc-title-color'] = style.titleColor;
        previewCard.setAttribute('data-sc-title-color', '');
    }

    if (style.iconColor) {
        cssProps['--sc-icon-color'] = style.iconColor;
        previewCard.setAttribute('data-sc-icon-color', '');
    }

    if (style.border) {
        const width = style.borderWidth ? toPx(style.borderWidth) : '1px';
        const borderPattern = style.borderStyle || 'solid';
        cssProps['--sc-border'] = `${width} ${borderPattern} ${style.border}`;
        previewCard.setAttribute('data-sc-border', '');
    }

    if (style.borderWidth) {
        cssProps['--sc-border-width'] = toPx(style.borderWidth);
        previewCard.setAttribute('data-sc-bw', '');
    }

    if (style.borderStyle) {
        cssProps['--sc-border-style'] = style.borderStyle;
        previewCard.setAttribute('data-sc-bs', '');
    }

    if (style.borderRadius) {
        cssProps['--sc-radius'] = toPx(style.borderRadius);
        previewCard.setAttribute('data-sc-radius', '');
    }

    if (style.neon) {
        Object.assign(cssProps, neonStyles(style.neon));
        previewCard.setAttribute('data-sc-neon', '');
    }

    if (style.font && FONT_FAMILIES[style.font]) {
        const fontVal = FONT_FAMILIES[style.font];
        cssProps['--font-interface'] = fontVal;
        cssProps['--sc-font-family'] = fontVal;
        previewCard.setAttribute('data-sc-font', '');
    }

    if (style.fontSize && FONT_SIZES[style.fontSize]) {
        cssProps['--sc-font-size'] = FONT_SIZES[style.fontSize];
        previewCard.setAttribute('data-sc-fontsize', '');
    }

    if (style.compact) {
        previewCard.setAttribute('data-compact', 'true');
    }

    if (style.center) {
        previewCard.setAttribute('data-center', 'true');
    } else if (style.titleCenter) {
        previewCard.setAttribute('data-title-center', 'true');
    }

    if (style.noIcon) {
        iconEl.addClass('sc-hidden');
    } else {
        iconEl.removeClass('sc-hidden');
        if (style.icon) {
            iconEl.empty();
            setIcon(iconEl, style.icon);
        }
    }

    previewCard.setCssProps(cssProps);
}

function createTransparentBg(color: string, opacity: number): string {
    return `color-mix(in srgb, ${color} ${opacity}%, transparent)`;
}
