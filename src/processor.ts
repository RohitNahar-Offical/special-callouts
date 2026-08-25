/**
 * Special Callouts - Callout Processor
 * High-performance batched DOM styling and observer lifecycle engine
 * 
 * IMPORTANT: Before modifying this file, read RULES.md for mandatory protocols.
 */

import { CalloutStyle, CalloutConfig, SpecialCalloutsSettings } from './types';
import { BG_TINT_OPACITY, DEFAULT_CALLOUT_CONFIG, DEFAULT_STANDARD_STYLES, FONT_FAMILIES, FONT_SIZES, resolveCalloutType } from './constants';
import { resolveColor, applyTextBorder, createTransparentBg, debounce, toPx, neonStyles, isCssGradient } from './utils';
import { parseMetadata, parseGridLayout, extractMetadata } from './parser';
import { setIcon } from 'obsidian';

const LIST_SELECTOR = 'ul, ol, .dataview.list-view-ul, .dataview-result-list-ul, .dataview ul, .block-language-dataview ul, .cm-embed-block ul, .cm-embed-block ol, .markdown-rendered ul, .markdown-rendered ol';
const MUTATION_TARGET_SELECTOR = 'ul,ol,.dataview,.cm-embed-block,.markdown-rendered';

/**
 * CalloutProcessor handles all callout styling operations
 */
export class CalloutProcessor {
    private settings: SpecialCalloutsSettings;
    private observers: WeakMap<HTMLElement, MutationObserver> = new WeakMap();
    private activeObservers: Set<MutationObserver> = new Set();
    private activeTimeouts: WeakMap<HTMLElement, number[]> = new WeakMap();
    private processedElements: WeakMap<HTMLElement, string> = new WeakMap();
    private debouncedColumnApply: (container: HTMLElement, colCount: number) => void;

    constructor(settings: SpecialCalloutsSettings) {
        this.settings = settings;
        this.debouncedColumnApply = debounce((container: HTMLElement, colCount: number) => {
            this.applyColumnsToContainer(container, colCount);
        }, 50);
    }

    /**
     * Updates the settings reference and clears element cache
     */
    updateSettings(settings: SpecialCalloutsSettings): void {
        this.settings = settings;
        this.processedElements = new WeakMap();
    }

    /**
     * Main entry point for processing a callout element with zero-allocation fast paths
     */
    processCallout(calloutEl: HTMLElement): void {
        try {
            const titleEl = calloutEl.querySelector('.callout-title');
            if (!titleEl) return;

            const innerTitleEl = (titleEl.querySelector('.callout-title-inner') || titleEl) as HTMLElement;
            const fullText = innerTitleEl.textContent || '';
            const pipeMetadata = calloutEl.getAttribute('data-callout-metadata') || '';
            const calloutType = calloutEl.getAttribute('data-callout');
            const cacheKey = `${calloutType}_${pipeMetadata}_${fullText}`;

            // Skip if already processed with identical content
            if (this.processedElements.get(calloutEl) === cacheKey) return;
            this.processedElements.set(calloutEl, cacheKey);

            // Apply standard style if modified
            const standardModified = this.applyStandardStyleIfModified(calloutEl, calloutType);

            // Apply custom style by type name
            const customMatched = this.applyCustomStyleByType(calloutEl, calloutType);

            // Fast-path: If there is no pipe metadata and title has no parentheses, skip parsing
            if (!pipeMetadata && !fullText.includes('(')) {
                return;
            }

            // Parse and apply metadata (from pipe and/or title)
            this.processMetadata(calloutEl, innerTitleEl, fullText, pipeMetadata);
        } catch (error) {
            console.error('Special Callouts: Error processing callout', error);
        }
    }

    /**
     * Applies standard style if user has modified it
     */
    private applyStandardStyleIfModified(calloutEl: HTMLElement, calloutType: string | null): boolean {
        if (!calloutType) return false;

        const resolvedType = resolveCalloutType(calloutType);
        const standardStyle = this.settings.standardStyles[resolvedType];
        const defaultStyle = DEFAULT_STANDARD_STYLES[resolvedType];

        if (standardStyle && defaultStyle) {
            const isModified = standardStyle.bg !== defaultStyle.bg ||
                standardStyle.text !== defaultStyle.text ||
                standardStyle.titleColor !== defaultStyle.titleColor ||
                standardStyle.link !== defaultStyle.link;

            if (isModified) {
                this.applyStyleObject(calloutEl, standardStyle);
                return true;
            }
        }
        return false;
    }

    /**
     * Applies custom style if callout type matches a custom style name
     */
    private applyCustomStyleByType(calloutEl: HTMLElement, calloutType: string | null): boolean {
        if (!calloutType) return false;

        const typeStyle = this.settings.customStyles.find(
            s => s.name.toLowerCase() === calloutType.toLowerCase()
        );
        if (typeStyle) {
            this.applyStyleObject(calloutEl, typeStyle);
            return true;
        }
        return false;
    }

    /**
     * Processes metadata from callout title and pipe attribute
     */
    private processMetadata(calloutEl: HTMLElement, innerTitleEl: HTMLElement, fullText: string, pipeMetadata: string): void {
        const layoutNames = (this.settings.customLayouts || []).map(l => l.name);
        const extracted = extractMetadata(fullText, layoutNames);
        
        // Safely update title text if metadata was inside parentheses in the title
        if (extracted && innerTitleEl.textContent !== extracted.title) {
            let updated = false;
            for (let i = 0; i < innerTitleEl.childNodes.length; i++) {
                const node = innerTitleEl.childNodes[i];
                if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
                    if (node.nodeValue.includes(`(${extracted.content})`)) {
                        node.nodeValue = node.nodeValue.replace(`(${extracted.content})`, '').trim();
                        updated = true;
                        break;
                    }
                }
            }
            if (!updated) {
                innerTitleEl.textContent = extracted.title;
            }
        }

        // Combine metadata from pipe and title
        let combinedMetadata = '';
        if (pipeMetadata.trim() && extracted?.content.trim()) {
            combinedMetadata = `${pipeMetadata.trim()}, ${extracted.content.trim()}`;
        } else if (pipeMetadata.trim()) {
            combinedMetadata = pipeMetadata.trim();
        } else if (extracted?.content.trim()) {
            combinedMetadata = extracted.content.trim();
        }

        if (!combinedMetadata) return;

        // Parse metadata
        const { config, layoutParam, styleParam } = parseMetadata(
            combinedMetadata,
            this.settings.standardColors,
            this.settings.customColors,
            layoutNames
        );

        // Apply style parameter first
        let resolvedStyleName = styleParam;
        if (!resolvedStyleName && pipeMetadata) {
            const matchCustom = this.settings.customStyles.find(
                s => s.name.toLowerCase() === pipeMetadata.trim().toLowerCase()
            );
            if (matchCustom) resolvedStyleName = matchCustom.name;
        }

        if (resolvedStyleName) {
            const manualStyle = this.settings.customStyles.find(
                s => s.name.toLowerCase() === resolvedStyleName.toLowerCase()
            );
            if (manualStyle) {
                this.applyStyleObject(calloutEl, manualStyle);
            }
        }

        // Apply parsed configuration in batched style operations
        this.applyConfig(calloutEl, config);

        // Handle grid layout
        if (layoutParam) {
            const gridConfig = parseGridLayout(layoutParam);
            if (gridConfig && gridConfig.columns > 0) {
                this.applyGridLayout(calloutEl, gridConfig, config);
            }
        }

        // Handle column layout for lists
        if (config.col !== null) {
            calloutEl.setAttribute('data-col', config.col.toString());
            calloutEl.setCssProps({ '--smart-list-cols': config.col.toString() });
            this.applyColumnsToContainer(calloutEl, config.col);
            this.setupObserver(calloutEl, config.col);
            this.scheduleColumnRetry(calloutEl, config.col);
        }

        // Handle custom visual layout
        if (config.customLayout) {
            const layout = this.settings.customLayouts.find(l => l.name.toLowerCase() === config.customLayout);
            if (layout) {
                this.applyCustomLayoutAreas(calloutEl, layout);
            }
        }
    }

    /**
     * Applies configuration to callout element with single-pass batched setCssProps
     */
    private applyConfig(calloutEl: HTMLElement, config: CalloutConfig): void {
        const cssProps: Record<string, string> = {};

        if (config.bg) {
            cssProps['--sc-bg-color'] = createTransparentBg(config.bg, BG_TINT_OPACITY);
            calloutEl.setAttribute('data-sc-bg', '');
        }

        if (config.text) {
            cssProps['--sc-text-color'] = config.text;
            calloutEl.setAttribute('data-sc-text', '');
        }

        if (config.textBorder) {
            const content = calloutEl.querySelector('.callout-content');
            if (content) applyTextBorder(content as HTMLElement, config.textBorder);
        }

        if (config.link) {
            cssProps['--link-color'] = config.link;
            calloutEl.setAttribute('data-link-color', config.link);
        }

        if (config.linkBorder) {
            calloutEl.setAttribute('data-link-border', config.linkBorder);
        }

        if (config.titleColor) {
            cssProps['--sc-title-color'] = config.titleColor;
            calloutEl.setAttribute('data-sc-title-color', '');
        }

        if (config.iconColor) {
            cssProps['--sc-icon-color'] = config.iconColor;
            calloutEl.setAttribute('data-sc-icon-color', '');
        }

        if (config.titleBorder) {
            const title = calloutEl.querySelector('.callout-title');
            if (title) applyTextBorder(title as HTMLElement, config.titleBorder);
        }

        if (config.noIcon) {
            const icon = calloutEl.querySelector('.callout-icon');
            if (icon) (icon as HTMLElement).addClass('sc-hidden');
        } else if (config.icon) {
            let iconEl = calloutEl.querySelector('.callout-icon');
            if (!iconEl) {
                const titleEl = calloutEl.querySelector('.callout-title');
                if (titleEl) {
                    iconEl = titleEl.createDiv({ cls: 'callout-icon' });
                    titleEl.prepend(iconEl);
                }
            }
            if (iconEl) {
                this.forceApplyIcon(iconEl as HTMLElement, config.icon);
            }
        }

        if (config.border) {
            if (config.border === 'none') {
                calloutEl.setAttribute('data-sc-no-border', '');
            } else {
                const style = config.borderStyle || 'solid';
                const width = config.borderWidth ? toPx(config.borderWidth) : '1px';
                cssProps['--sc-border'] = `${width} ${style} ${config.border}`;
                calloutEl.setAttribute('data-sc-border', '');
            }
        }

        if (config.borderWidth) {
            cssProps['--sc-border-width'] = toPx(config.borderWidth);
            calloutEl.setAttribute('data-sc-bw', '');
        }

        if (config.borderStyle) {
            cssProps['--sc-border-style'] = config.borderStyle;
            calloutEl.setAttribute('data-sc-bs', '');
        }

        if (config.radius) {
            cssProps['--sc-radius'] = toPx(config.radius);
            calloutEl.setAttribute('data-sc-radius', '');
        }

        if (config.neon) {
            Object.assign(cssProps, neonStyles(config.neon));
            calloutEl.setAttribute('data-sc-neon', '');
        }

        if (config.gradient) {
            const grad = this.resolveGradientValue(config.gradient);
            if (grad) {
                cssProps['--sc-gradient'] = grad;
                calloutEl.setAttribute('data-sc-gradient', '');
                calloutEl.setAttribute('data-sc-no-border', '');
            }
        }

        if (config.font && FONT_FAMILIES[config.font]) {
            const fontVal = FONT_FAMILIES[config.font];
            cssProps['--font-interface'] = fontVal;
            cssProps['--sc-font-family'] = fontVal;
            calloutEl.setAttribute('data-sc-font', '');
        }

        if (config.fontSize && FONT_SIZES[config.fontSize]) {
            cssProps['--sc-font-size'] = FONT_SIZES[config.fontSize];
            calloutEl.setAttribute('data-sc-fontsize', '');
        }

        if (config.compact) {
            calloutEl.setAttribute('data-compact', 'true');
        }

        if (config.dense) {
            calloutEl.setAttribute('data-dense', 'true');
        }

        if (config.center) {
            calloutEl.setAttribute('data-center', 'true');
        } else if (config.titleCenter) {
            calloutEl.setAttribute('data-title-center', 'true');
        }

        // Apply all gathered CSS properties in one single call
        if (Object.keys(cssProps).length > 0) {
            calloutEl.setCssProps(cssProps);
        }
    }

    /**
     * Resolves gradient CSS function value
     */
    private resolveGradientValue(gradient: string): string | null {
        if (isCssGradient(gradient)) {
            return gradient.trim();
        }
        const colors = gradient.split('-');
        if (colors.length === 2) {
            const c1 = resolveColor(colors[0], this.settings.standardColors, this.settings.customColors);
            const c2 = resolveColor(colors[1], this.settings.standardColors, this.settings.customColors);
            return `linear-gradient(90deg, ${c1}, ${c2})`;
        }
        return null;
    }

    /**
     * Gets the direct wrapper of the callout under .callout-content
     */
    private getDirectWrapper(calloutEl: HTMLElement): HTMLElement {
        let current: HTMLElement | null = calloutEl;
        let parent = current.parentElement;
        
        while (parent && !parent.classList.contains('callout-content')) {
            current = parent;
            parent = parent.parentElement;
        }
        
        return current || calloutEl;
    }

    /**
     * Neutralizes blockquote wrapper styles
     */
    private neutralizeWrapper(wrapper: HTMLElement): void {
        if (wrapper.tagName === 'BLOCKQUOTE') {
            wrapper.addClass('sc-wrapper-bq');
        } else if (wrapper.tagName === 'P') {
            wrapper.addClass('sc-wrapper-p');
        }
    }

    /**
     * Applies grid layout to callout
     */
    private applyGridLayout(calloutEl: HTMLElement, gridConfig: import('./types').GridConfig, config: import('./types').CalloutConfig): void {
        const wrapper = this.getDirectWrapper(calloutEl);
        this.neutralizeWrapper(wrapper);

        const span = Math.min(config.span ?? gridConfig.colSpan ?? 1, gridConfig.columns);
        const colSpan = span > 0 ? span : (gridConfig.colSpan || 1);
        const rowSpan = gridConfig.rowSpan || 1;

        wrapper.setCssProps({
            '--sc-grid-col-start': gridConfig.position.toString(),
            '--sc-grid-col-span': colSpan.toString(),
            '--sc-grid-row-start': gridConfig.row.toString(),
            '--sc-grid-row-span': rowSpan.toString()
        });
        wrapper.addClass('sc-grid-item-wrapper');

        if (wrapper !== calloutEl) {
            calloutEl.setCssProps({ '--sc-callout-width': '100%' });
            calloutEl.addClass('sc-area-inner');
        }

        calloutEl.setAttribute('data-grid-pos', gridConfig.position.toString());
        calloutEl.setAttribute('data-grid-cols', gridConfig.columns.toString());
        calloutEl.setAttribute('data-grid-row', gridConfig.row.toString());
        if (colSpan > 1) {
            calloutEl.setAttribute('data-grid-span', colSpan.toString());
        }

        // Update outer container grid column count
        const outerMulti = wrapper.closest('.callout[data-callout="multi-callout"]') as HTMLElement;
        if (outerMulti) {
            const content = outerMulti.querySelector('.callout-content') as HTMLElement;
            if (content) {
                content.setCssProps({ '--sc-multi-cols': gridConfig.columns.toString() });
            }
        }
    }

    /**
     * Applies visually built custom layouts from settings using grid-template-areas
     */
    private applyCustomLayoutAreas(calloutEl: HTMLElement, layout: import('./types').CustomLayout): void {
        const content = calloutEl.querySelector('.callout-content');
        if (!content) return;

        calloutEl.setCssProps({
            '--sc-grid-cols': `repeat(${layout.cols}, 1fr)`,
            '--sc-grid-areas': layout.gridAreas
        });
        calloutEl.setAttribute('data-sc-custom-layout', '');

        this.setupCustomLayoutObserver(calloutEl);
        this.applyAreasToChildren(content as HTMLElement);
    }
    
    private setupCustomLayoutObserver(calloutEl: HTMLElement): void {
        const contentEl = calloutEl.querySelector('.callout-content');
        if (!contentEl) return;
        
        const prevObserver = this.observers.get(calloutEl);
        if (prevObserver) {
            prevObserver.disconnect();
            this.activeObservers.delete(prevObserver);
        }

        const observer = new MutationObserver(() => {
            if (!calloutEl.isConnected) {
                observer.disconnect();
                this.activeObservers.delete(observer);
                this.observers.delete(calloutEl);
                return;
            }
            this.applyAreasToChildren(contentEl as HTMLElement);
        });

        observer.observe(contentEl, { childList: true });
        this.observers.set(calloutEl, observer);
        this.activeObservers.add(observer);
    }

    private applyAreasToChildren(contentEl: HTMLElement): void {
        const children = Array.from(contentEl.children);

        let areaIndex = 1;
        for (let i = 0; i < children.length; i++) {
            const el = children[i] as HTMLElement;

            // Hide empty structural nodes
            if (el.tagName === 'BR' || el.tagName === 'HR') {
                el.addClass('sc-hidden');
                continue;
            }
            if (el.tagName === 'P') {
                const text = el.textContent?.trim() || '';
                if (text === '') {
                    el.addClass('sc-hidden');
                    continue;
                }
            }

            this.neutralizeWrapper(el);
            el.setCssProps({ '--sc-grid-area': `area${areaIndex}` });
            el.addClass('sc-area-child');

            const innerCallout = el.classList.contains('callout') ? el : el.querySelector('.callout');
            if (innerCallout) {
                (innerCallout as HTMLElement).addClass('sc-area-inner');
            }

            areaIndex++;
        }
    }

    /**
     * Applies a saved style object to a callout.
     */
    applyStyleObject(calloutEl: HTMLElement, style: CalloutStyle): void {
        const bgIsGradient = !!style.bg && isCssGradient(style.bg);

        this.applyConfig(calloutEl, {
            ...DEFAULT_CALLOUT_CONFIG,
            bg: bgIsGradient ? '' : (style.bg || ''),
            gradient: bgIsGradient ? style.bg : '',
            text: style.text || '',
            link: style.link || '',
            titleColor: style.titleColor || '',
            iconColor: style.iconColor || '',
            border: style.border || '',
            borderWidth: style.borderWidth || (style.boldBorder ? '4px' : ''),
            borderStyle: style.borderStyle || '',
            radius: style.borderRadius || '',
            neon: style.neon || '',
            font: style.font || '',
            fontSize: style.fontSize ?? null,
            icon: style.icon || null,
            noIcon: !!style.noIcon,
            compact: !!style.compact,
            center: !!style.center,
            titleCenter: !!style.titleCenter
        });
    }

    /**
     * Applies column layout to list containers using CSS Grid
     */
    applyColumnsToContainer(container: HTMLElement, colCount: number): void {
        window.requestAnimationFrame(() => {
            if (!container.isConnected) return;

            const contentEl = container.querySelector('.callout-content');
            if (!contentEl) return;

            const lists = contentEl.querySelectorAll(LIST_SELECTOR);

            for (let i = 0; i < lists.length; i++) {
                const listEl = lists[i] as HTMLElement;
                const items: HTMLElement[] = [];
                for (let j = 0; j < listEl.children.length; j++) {
                    const child = listEl.children[j] as HTMLElement;
                    if (child.tagName === 'LI' || child.classList.contains('list-item')) {
                        items.push(child);
                    }
                }

                const itemCount = items.length;
                if (itemCount === 0) continue;

                const rowCount = Math.ceil(itemCount / colCount);

                listEl.setCssProps({
                    '--sc-list-cols': colCount.toString(),
                    '--sc-list-rows': rowCount.toString()
                });
                listEl.addClass('sc-multi-col-list');

                for (let k = 0; k < items.length; k++) {
                    const liEl = items[k];
                    const col = Math.floor(k / rowCount) + 1;
                    const row = (k % rowCount) + 1;

                    liEl.setCssProps({ '--sc-col': col.toString(), '--sc-row': row.toString() });
                    liEl.addClass('sc-multi-col-item');
                }
            }
        });
    }

    /**
     * Schedules retry attempts for column layout with timeout lifecycle management
     */
    private scheduleColumnRetry(calloutEl: HTMLElement, colCount: number): void {
        const existingTimers = this.activeTimeouts.get(calloutEl);
        if (existingTimers) {
            existingTimers.forEach(id => window.clearTimeout(id));
        }

        const retryDelays = [100, 300, 600, 1000, 2000];
        const timerIds: number[] = [];

        retryDelays.forEach(delay => {
            const id = window.setTimeout(() => {
                if (!calloutEl.isConnected) {
                    timerIds.forEach(tId => window.clearTimeout(tId));
                    this.activeTimeouts.delete(calloutEl);
                    return;
                }

                const contentEl = calloutEl.querySelector('.callout-content');
                if (!contentEl) return;

                const lists = contentEl.querySelectorAll(LIST_SELECTOR);
                if (lists.length > 0) {
                    this.applyColumnsToContainer(calloutEl, colCount);
                    timerIds.forEach(tId => window.clearTimeout(tId));
                    this.activeTimeouts.delete(calloutEl);
                }
            }, delay);
            timerIds.push(id);
        });

        this.activeTimeouts.set(calloutEl, timerIds);
    }

    /**
     * Sets up mutation observer for dynamic content with lifecycle cleanup
     */
    setupObserver(calloutEl: HTMLElement, colCount: number): void {
        const prev = this.observers.get(calloutEl);
        if (prev) {
            prev.disconnect();
            this.activeObservers.delete(prev);
        }

        const contentEl = calloutEl.querySelector('.callout-content');
        if (!contentEl) return;

        const observer = new MutationObserver((mutations) => {
            if (!calloutEl.isConnected) {
                observer.disconnect();
                this.activeObservers.delete(observer);
                this.observers.delete(calloutEl);
                return;
            }
            let update = false;
            for (let i = 0; i < mutations.length; i++) {
                const m = mutations[i];
                if (m.addedNodes.length > 0) {
                    for (let j = 0; j < m.addedNodes.length; j++) {
                        const n = m.addedNodes[j];
                        if (n.nodeType === 1) {
                            const el = n as Element;
                            if (el.matches(MUTATION_TARGET_SELECTOR) || el.querySelector(MUTATION_TARGET_SELECTOR)) {
                                update = true;
                                break;
                            }
                        }
                    }
                }
                if (m.type === 'characterData') {
                    update = true;
                }
                if (update) break;
            }
            if (update) this.debouncedColumnApply(calloutEl, colCount);
        });

        observer.observe(contentEl, { childList: true, subtree: true, characterData: true });
        this.observers.set(calloutEl, observer);
        this.activeObservers.add(observer);
    }

    /**
     * Safely applies an icon bypassing Obsidian's native override
     */
    private forceApplyIcon(iconEl: HTMLElement, iconName: string): void {
        iconEl.empty();
        setIcon(iconEl, iconName);
        iconEl.removeClass('sc-hidden');
    }

    /**
     * Cleans up all observers and active timeouts
     */
    cleanup(): void {
        this.activeObservers.forEach(o => o.disconnect());
        this.activeObservers.clear();
    }
}
