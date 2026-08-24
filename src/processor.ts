/**
 * Special Callouts - Callout Processor
 * Core logic for processing and styling callouts
 * 
 * IMPORTANT: Before modifying this file, read RULES.md for mandatory protocols.
 */

import { CalloutStyle, CalloutConfig, SpecialCalloutsSettings } from './types';
import { DEFAULT_STANDARD_STYLES, FONT_FAMILIES, FONT_SIZES } from './constants';
import { resolveColor, applyTextBorder, debounce, toPx, neonStyles } from './utils';
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
     * Updates the settings reference
     */
    updateSettings(settings: SpecialCalloutsSettings): void {
        this.settings = settings;
    }

    /**
     * Main entry point for processing a callout element
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

            // Skip if already processed with same content
            if (this.processedElements.get(calloutEl) === cacheKey) return;
            this.processedElements.set(calloutEl, cacheKey);

            // Apply standard style if modified
            this.applyStandardStyleIfModified(calloutEl, calloutType);

            // Apply custom style by type name
            this.applyCustomStyleByType(calloutEl, calloutType);

            // Parse and apply metadata (from pipe and/or title)
            this.processMetadata(calloutEl, innerTitleEl, fullText, pipeMetadata);
        } catch (error) {
            console.error('Special Callouts: Error processing callout', error);
        }
    }

    /**
     * Applies standard style if user has modified it
     */
    private applyStandardStyleIfModified(calloutEl: HTMLElement, calloutType: string | null): void {
        if (!calloutType) return;

        const standardStyle = this.settings.standardStyles[calloutType.toLowerCase()];
        const defaultStyle = DEFAULT_STANDARD_STYLES[calloutType.toLowerCase()];

        if (standardStyle && defaultStyle) {
            const isModified = standardStyle.bg !== defaultStyle.bg ||
                standardStyle.text !== defaultStyle.text ||
                standardStyle.titleColor !== defaultStyle.titleColor ||
                standardStyle.link !== defaultStyle.link;

            if (isModified) {
                this.applyStyleObject(calloutEl, standardStyle);
            }
        }
    }

    /**
     * Applies custom style if callout type matches a custom style name
     */
    private applyCustomStyleByType(calloutEl: HTMLElement, calloutType: string | null): void {
        if (!calloutType) return;

        const typeStyle = this.settings.customStyles.find(
            s => s.name.toLowerCase() === calloutType.toLowerCase()
        );
        if (typeStyle) {
            this.applyStyleObject(calloutEl, typeStyle);
        }
    }

    /**
     * Processes metadata from callout title and pipe attribute
     */
    private processMetadata(calloutEl: HTMLElement, innerTitleEl: HTMLElement, fullText: string, pipeMetadata: string): void {
        const extracted = extractMetadata(fullText);
        
        // Safely update title text if metadata was inside parentheses in the title
        if (extracted && innerTitleEl.textContent !== extracted.title) {
            // Find text nodes to update text cleanly without destroying child nodes (like fold indicator or custom icons)
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

        // Combine metadata from pipe (e.g. [!note|bg:red]) and title (e.g. (bg:red))
        const rawMetadataParts: string[] = [];
        if (pipeMetadata.trim()) {
            rawMetadataParts.push(pipeMetadata.trim());
        }
        if (extracted && extracted.content.trim()) {
            rawMetadataParts.push(extracted.content.trim());
        }

        if (rawMetadataParts.length === 0) return;
        const combinedMetadata = rawMetadataParts.join(', ');

        // Extract custom layout names
        const layoutNames = (this.settings.customLayouts || []).map(l => l.name);

        // Parse metadata
        const { config, layoutParam, styleParam } = parseMetadata(
            combinedMetadata,
            this.settings.standardColors,
            this.settings.customColors,
            layoutNames
        );

        // Apply style parameter first (or if pipe metadata matches a custom style name)
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

        // Apply parsed configuration
        this.applyConfig(calloutEl, config);

        // Handle grid layout
        if (layoutParam) {
            const gridConfig = parseGridLayout(layoutParam);
            if (gridConfig && gridConfig.columns > 0) {
                this.applyGridLayout(calloutEl, gridConfig);
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
     * Applies configuration to callout element
     */
    private applyConfig(calloutEl: HTMLElement, config: CalloutConfig): void {
        if (config.bg) {
            this.applyColor(calloutEl, config.bg);
        }

        if (config.text) {
            this.applyTextColor(calloutEl, config.text);
        }

        if (config.textBorder) {
            const content = calloutEl.querySelector('.callout-content');
            if (content) applyTextBorder(content as HTMLElement, config.textBorder);
        }

        if (config.link) {
            this.applyLinkColor(calloutEl, config.link);
        }

        if (config.linkBorder) {
            calloutEl.setAttribute('data-link-border', config.linkBorder);
        }

        if (config.titleColor) {
            // Set CSS custom property; .callout[data-sc-title-color] rule in styles.css applies it
            calloutEl.setCssProps({ '--sc-title-color': config.titleColor });
            calloutEl.setAttribute('data-sc-title-color', '');
        }

        // AI_CONTEXT: Ayri ikon rengi. title: ile birlikte verilirse bu kazanir, cunku
        // styles.css'te [data-sc-icon-color] kurali [data-sc-title-color]'dan sonra gelir.
        if (config.iconColor) {
            calloutEl.setCssProps({ '--sc-icon-color': config.iconColor });
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
                // AI_CONTEXT: Eger icon elementi yoksa (bazı temalar/ayarlar) baslıgın basına ekliyoruz
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
                calloutEl.setCssProps({ '--sc-border': `${width} ${style} ${config.border}` });
                calloutEl.setAttribute('data-sc-border', '');
            }
        }

        if (config.borderWidth) {
            calloutEl.setCssProps({ '--sc-border-width': toPx(config.borderWidth) });
            calloutEl.setAttribute('data-sc-bw', '');
        }

        if (config.borderStyle) {
            calloutEl.setCssProps({ '--sc-border-style': config.borderStyle });
            calloutEl.setAttribute('data-sc-bs', '');
        }

        if (config.radius) {
            calloutEl.setCssProps({ '--sc-radius': toPx(config.radius) });
            calloutEl.setAttribute('data-sc-radius', '');
        }

        if (config.neon) {
            calloutEl.setCssProps(neonStyles(config.neon));
            calloutEl.setAttribute('data-sc-neon', '');
        }

        if (config.gradient) {
            this.applyGradient(calloutEl, config.gradient);
        }

        if (config.font && FONT_FAMILIES[config.font]) {
            calloutEl.setCssProps({ '--font-interface': FONT_FAMILIES[config.font], '--sc-font-family': FONT_FAMILIES[config.font] });
            calloutEl.setAttribute('data-sc-font', '');
        }

        if (config.fontSize && FONT_SIZES[config.fontSize]) {
            calloutEl.setCssProps({ '--sc-font-size': FONT_SIZES[config.fontSize] });
            calloutEl.setAttribute('data-sc-fontsize', '');
        }

        // AI_CONTEXT: Compact mode reduces padding throughout the callout
        // AI_CONTEXT_WHY: Users want denser callouts for dashboards/lists
        // AI_CONTEXT_WARN: Must set padding on callout, title, AND content elements
        // AI_CONTEXT_WARN: Also sets data-compact attribute for CSS fallback
        if (config.compact) {
            // CSS class .callout[data-compact="true"] in styles.css handles all padding overrides
            calloutEl.setAttribute('data-compact', 'true');
        }

        // AI_CONTEXT: dense is compact plus a tighter line-height. It sets compact too (see
        // parser.ts), so writing `dense` alone still reduces padding as it always has.
        if (config.dense) {
            calloutEl.setAttribute('data-dense', 'true');
        }

        // AI_CONTEXT: Center mode aligns everything to the center
        if (config.center) {
            // CSS .callout[data-center="true"] in styles.css handles all alignment overrides
            calloutEl.setAttribute('data-center', 'true');
        } else if (config.titleCenter) {
            calloutEl.setAttribute('data-title-center', 'true');
        }
    }

    /**
     * Applies gradient background
     */
    private applyGradient(calloutEl: HTMLElement, gradient: string): void {
        const colors = gradient.split('-');
        if (colors.length === 2) {
            const c1 = resolveColor(colors[0], this.settings.standardColors, this.settings.customColors);
            const c2 = resolveColor(colors[1], this.settings.standardColors, this.settings.customColors);
            // Use CSS var + data attribute; .callout[data-sc-gradient] rule in styles.css applies it
            calloutEl.setCssProps({ '--sc-gradient': `linear-gradient(90deg, ${c1}, ${c2})` });
            calloutEl.setAttribute('data-sc-gradient', '');
            calloutEl.setAttribute('data-sc-no-border', '');
        }
    }

    /**
     * Gets the direct wrapper of the callout under .callout-content,
     * which handles the nested blockquote issue.
     */
    private getDirectWrapper(calloutEl: HTMLElement): HTMLElement {
        let current: HTMLElement | null = calloutEl;
        let parent = current.parentElement;
        
        // Traverse up until the parent is .callout-content
        while (parent && !parent.classList.contains('callout-content')) {
            current = parent;
            parent = parent.parentElement;
        }
        
        return current || calloutEl;
    }

    /**
     * Neutralizes blockquote wrapper styles to fix the "purple line" bug
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
    private applyGridLayout(calloutEl: HTMLElement, gridConfig: import('./types').GridConfig): void {
        const wrapper = this.getDirectWrapper(calloutEl);
        this.neutralizeWrapper(wrapper);

        const colSpan = gridConfig.colSpan || 1;
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

        // Set CSS custom properties; .callout[data-sc-custom-layout] rule in styles.css drives the grid
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
        
        // Clean up previous observer if exists
        const prevObserver = this.observers.get(calloutEl);
        if (prevObserver) {
            prevObserver.disconnect();
            this.activeObservers.delete(prevObserver);
        }

        const observer = new MutationObserver(() => {
            if (!calloutEl.isConnected) {
                observer.disconnect();
                this.activeObservers.delete(observer);
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
        children.forEach(child => {
            const el = child as HTMLElement;

            // Hide empty structural nodes inserted by Markdown rendering so they don't break grid areas
            if (el.tagName === 'BR' || el.tagName === 'HR') {
                el.style.display = 'none';
                return;
            }
            if (el.tagName === 'P') {
                const html = el.innerHTML.trim();
                if (html === '' || html === '<br>' || html === '&nbsp;') {
                    el.style.display = 'none';
                    return;
                }
            }

            this.neutralizeWrapper(el);
            // CSS var + class; .sc-area-child rule in styles.css sets grid-area, flex, etc.
            el.setCssProps({ '--sc-grid-area': `area${areaIndex}` });
            el.addClass('sc-area-child');

            const innerCallout = el.classList.contains('callout') ? el : el.querySelector('.callout');
            if (innerCallout) {
                (innerCallout as HTMLElement).addClass('sc-area-inner');
            }

            areaIndex++;
        });
    }

    /**
     * Applies a style object to callout
     */
    applyStyleObject(calloutEl: HTMLElement, style: CalloutStyle): void {
        const config: CalloutConfig = {
            bg: style.bg || '',
            text: style.text || '',
            textBorder: '',
            link: style.link || '',
            linkBorder: '',
            titleColor: style.titleColor || '',
            titleBorder: '',
            border: style.border || '',
            borderWidth: style.borderWidth || (style.boldBorder ? '4px' : ''),
            borderStyle: style.borderStyle || 'solid',
            neon: style.neon || '',
            radius: style.borderRadius || '',
            gradient: '',
            font: style.font || '',
            fontSize: style.fontSize || null,
            col: null,
            customLayout: null,
            compact: !!style.compact,
            dense: false,
            noIcon: !!style.noIcon,
            center: !!style.center,
            titleCenter: !!style.titleCenter,
            icon: style.icon || null,
            iconColor: style.iconColor || ''
        };
        this.applyConfig(calloutEl, config);
    }

    /**
     * Applies background color
     */
    applyColor(callout: HTMLElement, color: string): void {
        callout.setCssProps({ '--sc-bg-color': `color-mix(in srgb, ${color} 15%, transparent)` });
        callout.setAttribute('data-sc-bg', '');
    }

    /**
     * Applies text color
     */
    applyTextColor(callout: HTMLElement, color: string): void {
        callout.setCssProps({ '--sc-text-color': color });
        callout.setAttribute('data-sc-text', '');
    }

    /**
     * Applies link color
     */
    applyLinkColor(callout: HTMLElement, color: string): void {
        callout.setAttribute('data-link-color', color);
        callout.setCssProps({ '--link-color': color });
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

            lists.forEach(list => {
                const listEl = list as HTMLElement;
                const items: HTMLElement[] = [];
                for (let i = 0; i < listEl.children.length; i++) {
                    const child = listEl.children[i] as HTMLElement;
                    if (child.tagName === 'LI' || child.classList.contains('list-item')) {
                        items.push(child);
                    }
                }

                const itemCount = items.length;
                if (itemCount === 0) return;

                const rowCount = Math.ceil(itemCount / colCount);

                listEl.setCssProps({
                    '--sc-list-cols': colCount.toString(),
                    '--sc-list-rows': rowCount.toString()
                });
                listEl.addClass('sc-multi-col-list');

                items.forEach((liEl, index) => {
                    const col = Math.floor(index / rowCount) + 1;
                    const row = (index % rowCount) + 1;

                    liEl.setCssProps({ '--sc-col': col.toString(), '--sc-row': row.toString() });
                    liEl.addClass('sc-multi-col-item');
                });
            });
        });
    }

    /**
     * Schedules retry attempts for column layout (handles Dataview/Homepage delayed rendering)
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
                    // Cancel remaining timeouts if element was unmounted from DOM
                    timerIds.forEach(tId => window.clearTimeout(tId));
                    this.activeTimeouts.delete(calloutEl);
                    return;
                }

                const contentEl = calloutEl.querySelector('.callout-content');
                if (!contentEl) return;

                const lists = contentEl.querySelectorAll(LIST_SELECTOR);
                if (lists.length > 0) {
                    this.applyColumnsToContainer(calloutEl, colCount);
                    // Cancel remaining timeouts once successfully applied
                    timerIds.forEach(tId => window.clearTimeout(tId));
                    this.activeTimeouts.delete(calloutEl);
                }
            }, delay);
            timerIds.push(id);
        });

        this.activeTimeouts.set(calloutEl, timerIds);
    }

    /**
     * Sets up mutation observer for dynamic content
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
