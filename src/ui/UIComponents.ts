/**
 * Special Callouts - Reusable UI Component Primitives
 * Adheres to DRY principles and Obsidian UI guidelines (no static style assignments)
 */

import { Setting, setIcon, App } from 'obsidian';
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

/**
 * Creates a dual Text + Native ColorPicker setting row
 */
export function createColorSetting(
    container: HTMLElement,
    name: string,
    desc: string,
    currentValue: string,
    defaultColor: string,
    onChange: (color: string) => void
): Setting {
    return new Setting(container)
        .setName(name)
        .setDesc(desc)
        .addText(text => text
            .setPlaceholder(defaultColor)
            .setValue(currentValue)
            .onChange(val => onChange(val)))
        .addColorPicker(picker => picker
            .setValue(normalizeHex(currentValue || defaultColor))
            .onChange(val => onChange(val)));
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
 * Renders a sticky Live Callout Preview card into a container
 */
export function renderLiveCalloutPreview(
    container: HTMLElement,
    titleText: string,
    contentText: string
): { previewCard: HTMLElement; titleInner: HTMLElement; iconEl: HTMLElement; bodyEl: HTMLElement } {
    const previewContainer = container.createDiv({ cls: 'sc-live-preview-container' });
    const previewCard = previewContainer.createDiv({ cls: 'callout' });
    previewCard.setAttribute('data-callout', 'note');

    const titleEl = previewCard.createDiv({ cls: 'callout-title' });
    const iconEl = titleEl.createDiv({ cls: 'callout-icon' });
    setIcon(iconEl, 'pencil');
    const titleInner = titleEl.createDiv({ cls: 'callout-title-inner', text: titleText });

    const bodyEl = previewCard.createDiv({ cls: 'callout-content' });
    bodyEl.createEl('p', { text: contentText });

    return { previewCard, titleInner, iconEl, bodyEl };
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

    if (style.bg) {
        cssProps['--sc-bg-color'] = createTransparentBg(style.bg, 15);
        previewCard.setAttribute('data-sc-bg', '');
    }

    if (style.text) {
        cssProps['--sc-text-color'] = style.text;
        previewCard.setAttribute('data-sc-text', '');
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
