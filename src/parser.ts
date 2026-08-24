/**
 * Special Callouts - Metadata Parser
 * Parses callout title metadata into configuration objects
 * 
 * IMPORTANT: Before modifying this file, read RULES.md for mandatory protocols.
 */

import { CalloutConfig, GridConfig } from './types';
import { DEFAULT_CALLOUT_CONFIG } from './constants';
import { resolveColor, smartSplit } from './utils';

/**
 * Parses the metadata content from callout title
 * @param content - Content inside the parentheses
 * @param standardColors - Standard color palette
 * @param customColors - Custom user colors
 * @returns Parsed configuration object
 */
// Module-level constants for performance
const LAYOUT_REGEX = /(?:^|[\s,])(\d+(?:-\d+)?(?:[:,/]\d+(?:-\d+)?){1,4})(?:$|[\s,])/;
const GROUP_REGEX = /^\(([^)]+)\)$/;
const GRID_REGEX = /^(\d+)(?:-(\d+))?[:,/](\d+)(?:[:,/](\d+)(?:-(\d+))?)?(?:[:,/](\d+))?(?:[:,/](\d+))?$/;

export function parseMetadata(
    content: string,
    standardColors: Record<string, string>,
    customColors: Array<{ name: string; hex: string }>,
    customLayoutNames: string[] = []
): { config: CalloutConfig; layoutParam: string | null; styleParam: string | null } {
    const config: CalloutConfig = { ...DEFAULT_CALLOUT_CONFIG };
    let layoutParam: string | null = null;
    let styleParam: string | null = null;

    let remainingContent = content;
    const layoutMatch = remainingContent.match(LAYOUT_REGEX);

    if (layoutMatch && layoutMatch.index !== undefined) {
        layoutParam = layoutMatch[1];
        // Replace exact match substring at index to avoid corrupting other matching substrings
        const matchStart = layoutMatch.index + layoutMatch[0].indexOf(layoutParam);
        remainingContent = remainingContent.substring(0, matchStart) + remainingContent.substring(matchStart + layoutParam.length);
    }

    const params = smartSplit(remainingContent);
    if (layoutParam) params.push(layoutParam.trim());

    // Check for style parameter
    const styleParamValue = params.find(p => p.toLowerCase().startsWith('style:'));
    if (styleParamValue) {
        const styleParts = styleParamValue.split(':');
        if (styleParts.length > 1) {
            styleParam = styleParts.slice(1).join(':').trim().toLowerCase();
        }
    }

    // Color resolver helper
    const resolve = (val: string) => resolveColor(val, standardColors, customColors);

    params.forEach(pair => {
        let key = '', rawValue = '';

        // Handle standalone flags (no colon)
        const loweredPair = pair.trim().toLowerCase();
        if (!loweredPair) return;

        // Check for custom layout names
        if (customLayoutNames.includes(loweredPair)) {
            config.customLayout = loweredPair;
            return;
        }

        if (loweredPair === 'no-icon' || loweredPair === 'noicon') {
            config.noIcon = true;
            return;
        }
        if (loweredPair === 'center') {
            config.center = true;
            return;
        }
        if (loweredPair === 'compact' || loweredPair === 'dense') {
            config.compact = true;
            if (loweredPair === 'dense') config.dense = true;
            return;
        }

        if (pair.includes(':')) {
            const parts = pair.split(':');
            key = parts[0].trim().toLowerCase();
            rawValue = parts.slice(1).join(':').trim();
        } else {
            return;
        }

        if (!key || !rawValue) return;

        // Check for grouped syntax: key:(value1, value2)
        const groupMatch = rawValue.match(GROUP_REGEX);
        if (groupMatch) {
            const groupValues = groupMatch[1].split(',').map(v => v.trim().toLowerCase());
            groupValues.forEach(val => {
                if (['dark-border', 'light-border'].includes(val)) {
                    if (key === 'text') config.textBorder = val;
                    else if (key === 'title') config.titleBorder = val;
                    else if (key === 'link') config.linkBorder = val;
                } else if (val === 'center' && key === 'title') {
                    config.titleCenter = true;
                } else if (key === 'icon') {
                    config.icon = val;
                } else if (key === 'icon-color' || key === 'iconcolor') {
                    config.iconColor = resolve(val);
                } else {
                    const color = resolve(val);
                    if (key === 'text') config.text = color;
                    else if (key === 'title') config.titleColor = color;
                    else if (key === 'link') config.link = color;
                    else if (key === 'bg' || key === 'background') config.bg = color;
                    else if (key === 'border') config.border = color;
                }
            });
            return;
        }

        // Check for special border values
        const isBorderValue = ['dark-border', 'light-border'].includes(rawValue.toLowerCase());

        // Parse by key type
        switch (key) {
            case 'col':
            case 'column': {
                const col = parseInt(rawValue);
                if (!isNaN(col)) config.col = col;
                break;
            }
            case 'bg':
            case 'background':
                config.bg = resolve(rawValue);
                break;
            case 'text':
                if (isBorderValue) {
                    config.textBorder = rawValue.toLowerCase();
                } else {
                    config.text = resolve(rawValue);
                }
                break;
            case 'link':
                if (isBorderValue) {
                    config.linkBorder = rawValue.toLowerCase();
                } else {
                    config.link = resolve(rawValue);
                }
                break;
            case 'title':
                if (isBorderValue) {
                    config.titleBorder = rawValue.toLowerCase();
                } else if (rawValue.toLowerCase() === 'center') {
                    config.titleCenter = true;
                } else {
                    config.titleColor = resolve(rawValue);
                }
                break;
            case 'border':
                config.border = resolve(rawValue);
                break;
            case 'bw':
            case 'border-width':
                config.borderWidth = rawValue;
                break;
            case 'bs':
            case 'border-style':
                config.borderStyle = rawValue;
                break;
            case 'neon':
                config.neon = resolve(rawValue);
                break;
            case 'radius':
                config.radius = rawValue;
                break;
            case 'gradient':
                config.gradient = rawValue;
                break;
            case 'font':
                config.font = rawValue.toLowerCase();
                break;
            case 'font-size': {
                const size = parseInt(rawValue);
                if (!isNaN(size) && size >= 1 && size <= 5) {
                    config.fontSize = size;
                }
                break;
            }
            case 'compact':
                config.compact = true;
                break;
            case 'dense':
                config.compact = true;
                config.dense = true;
                break;
            case 'padding':
                if (rawValue === '0') config.compact = true;
                break;
            case 'no-icon':
            case 'noicon':
                config.noIcon = true;
                break;
            case 'center':
                config.center = true;
                break;
            case 'icon':
                config.icon = rawValue.toLowerCase();
                break;
            case 'icon-color':
            case 'iconcolor':
                config.iconColor = resolve(rawValue);
                break;
        }
    });

    return { config, layoutParam, styleParam };
}

/**
 * Parses grid layout parameter (e.g., "1:3" or "1:3:2")
 * @param param - Layout parameter string
 * @returns Grid configuration or null
 */
export function parseGridLayout(param: string): GridConfig | null {
    const match = param.match(GRID_REGEX);
    if (!match) return null;

    const colStart = parseInt(match[1]);
    const colEnd = match[2] ? parseInt(match[2]) : colStart;
    const columns = parseInt(match[3]);
    const rowStart = match[4] ? parseInt(match[4]) : 1;
    const rowEnd = match[5] ? parseInt(match[5]) : rowStart;

    let colSpan = match[6] ? parseInt(match[6]) : (colEnd - colStart + 1);
    let rowSpan = match[7] ? parseInt(match[7]) : (rowEnd - rowStart + 1);

    if (colSpan < 1) colSpan = 1;
    if (rowSpan < 1) rowSpan = 1;

    const res: GridConfig = {
        position: colStart,
        columns: columns,
        row: rowStart
    };

    if (colSpan > 1) res.colSpan = colSpan;
    if (rowSpan > 1) res.rowSpan = rowSpan;

    return res;
}

/**
 * Extracts metadata content from callout title
 * @param fullText - Full title text
 * @returns Object with metadata content and remaining title
 */
export function extractMetadata(fullText: string): { content: string; title: string } | null {
    const trimmedText = fullText.trim();
    if (!trimmedText) return null;

    // 1. Check leading metadata: (metadata) Title
    if (trimmedText.startsWith('(')) {
        let depth = 0;
        let endIndex = -1;
        for (let i = 0; i < trimmedText.length; i++) {
            if (trimmedText[i] === '(') depth++;
            else if (trimmedText[i] === ')') {
                depth--;
                if (depth === 0) {
                    endIndex = i;
                    break;
                }
            }
        }

        if (endIndex !== -1) {
            return {
                content: trimmedText.substring(1, endIndex).trim(),
                title: trimmedText.substring(endIndex + 1).trim()
            };
        }
        return null;
    }

    // 2. Check trailing metadata: Title (metadata)
    if (trimmedText.endsWith(')')) {
        let depth = 0;
        let startIndex = -1;
        for (let i = trimmedText.length - 1; i >= 0; i--) {
            if (trimmedText[i] === ')') depth++;
            else if (trimmedText[i] === '(') {
                depth--;
                if (depth === 0) {
                    startIndex = i;
                    break;
                }
            }
        }

        if (startIndex !== -1) {
            return {
                content: trimmedText.substring(startIndex + 1, trimmedText.length - 1).trim(),
                title: trimmedText.substring(0, startIndex).trim()
            };
        }
    }

    return null;
}
