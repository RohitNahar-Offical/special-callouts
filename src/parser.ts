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
 * @param customLayoutNames - Custom visual layout names
 * @returns Parsed configuration object
 */
// Module-level constants for performance
const LAYOUT_REGEX = /(?:^|[\s,])(\d+(?:-\d+)?(?:[:,/]\d+(?:-\d+)?){1,4})(?:$|[\s,])/;
const GROUP_REGEX = /^\(([^)]+)\)$/;
const GRID_REGEX = /^(\d+)(?:-(\d+))?[:,/](\d+)(?:[:,/](\d+)(?:-(\d+))?)?(?:[:,/](\d+))?(?:[:,/](\d+))?$/;

// Neither whitespace, separator nor digit, so a masked character can be neither part
// of a layout token nor the boundary the pattern looks for.
const MASK_CHAR = '\u0000';

/**
 * Blanks the contents of every parenthesised group, keeping the string the same length.
 */
function maskGroups(content: string): string {
    let depth = 0;
    let masked = '';

    for (const char of content) {
        if (char === '(') {
            depth++;
            masked += char;
        } else if (char === ')') {
            depth = Math.max(0, depth - 1);
            masked += char;
        } else {
            masked += depth > 0 ? MASK_CHAR : char;
        }
    }

    return masked;
}

/**
 * Expands the grouped form `key:(v1, v2)` into one `key:v1` pair per value.
 */
function expandGroups(params: string[]): string[] {
    const expanded: string[] = [];

    params.forEach(pair => {
        const colon = pair.indexOf(':');
        if (colon === -1) {
            expanded.push(pair);
            return;
        }

        const key = pair.slice(0, colon).trim();
        const groupMatch = pair.slice(colon + 1).trim().match(GROUP_REGEX);
        if (!key || !groupMatch) {
            expanded.push(pair);
            return;
        }

        groupMatch[1]
            .split(',')
            .map(value => value.trim())
            .filter(value => value)
            .forEach(value => expanded.push(`${key}:${value}`));
    });

    return expanded;
}

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
    const layoutMatch = maskGroups(remainingContent).match(LAYOUT_REGEX);

    if (layoutMatch && layoutMatch.index !== undefined) {
        layoutParam = layoutMatch[1];
        const tokenStart = layoutMatch.index + layoutMatch[0].indexOf(layoutParam);
        remainingContent =
            remainingContent.slice(0, tokenStart) +
            remainingContent.slice(tokenStart + layoutParam.length);
    }

    const params = expandGroups(smartSplit(remainingContent));
    if (layoutParam) params.push(layoutParam.trim());

    // Check for style parameter
    const styleParamValue = params.find(p => p.toLowerCase().startsWith('style:'));
    if (styleParamValue) {
        styleParam = styleParamValue.slice('style:'.length).trim().toLowerCase();
        if (!styleParam) styleParam = null;
    }

    // Color resolver helper
    const resolve = (val: string) => resolveColor(val, standardColors, customColors);

    params.forEach(pair => {
        let key = '', rawValue = '';

        // Handle standalone flags (no colon)
        const loweredPair = pair.trim().toLowerCase();
        if (!loweredPair) return;

        // Built-in flags are checked before saved layout names
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

        // Check for custom layout names
        if (customLayoutNames.includes(loweredPair)) {
            config.customLayout = loweredPair;
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
            case 'span': {
                const span = parseInt(rawValue);
                if (!isNaN(span) && span >= 1) {
                    config.span = span;
                }
                break;
            }
        }
    });

    return { config, layoutParam, styleParam };
}

/**
 * Serializes a CalloutConfig (and optional layout/style parameters) back into metadata string syntax.
 */
export function serializeMetadata(
    config: Partial<CalloutConfig>,
    layoutParam?: string | null,
    styleParam?: string | null
): string {
    const tokens: string[] = [];

    // 1. Preset style parameter
    if (styleParam) {
        tokens.push(`style:${styleParam}`);
    }

    // 2. Custom visual layout or layout token
    if (layoutParam) {
        tokens.push(layoutParam);
    } else if (config.customLayout) {
        tokens.push(config.customLayout);
    }

    // 3. Background / Gradient / Neon
    if (config.gradient) {
        tokens.push(`gradient:${config.gradient}`);
    } else if (config.bg) {
        tokens.push(`bg:${config.bg}`);
    }

    if (config.neon) {
        tokens.push(`neon:${config.neon}`);
    }

    // 4. Text and stroke
    if (config.text && config.textBorder) {
        tokens.push(`text:(${config.text}, ${config.textBorder})`);
    } else if (config.text) {
        tokens.push(`text:${config.text}`);
    } else if (config.textBorder) {
        tokens.push(`text:${config.textBorder}`);
    }

    // 5. Title color, stroke, and center
    const titleParts: string[] = [];
    if (config.titleCenter) {
        titleParts.push('center');
    }
    if (config.titleColor) {
        titleParts.push(config.titleColor);
    }
    if (config.titleBorder) {
        titleParts.push(config.titleBorder);
    }

    if (titleParts.length > 1) {
        tokens.push(`title:(${titleParts.join(', ')})`);
    } else if (titleParts.length === 1) {
        tokens.push(`title:${titleParts[0]}`);
    }

    // 6. Link color and stroke
    if (config.link && config.linkBorder) {
        tokens.push(`link:(${config.link}, ${config.linkBorder})`);
    } else if (config.link) {
        tokens.push(`link:${config.link}`);
    } else if (config.linkBorder) {
        tokens.push(`link:${config.linkBorder}`);
    }

    // 7. Icon and icon color
    if (config.icon) {
        tokens.push(`icon:${config.icon}`);
    }
    if (config.iconColor) {
        tokens.push(`icon-color:${config.iconColor}`);
    }

    // 8. Border properties
    if (config.border) {
        tokens.push(`border:${config.border}`);
    }
    if (config.borderWidth) {
        tokens.push(`bw:${config.borderWidth}`);
    }
    if (config.borderStyle) {
        tokens.push(`bs:${config.borderStyle}`);
    }
    if (config.radius) {
        tokens.push(`radius:${config.radius}`);
    }

    // 9. Typography
    if (config.font) {
        tokens.push(`font:${config.font}`);
    }
    if (config.fontSize) {
        tokens.push(`font-size:${config.fontSize}`);
    }

    // 10. Columns
    if (config.col !== null && config.col !== undefined) {
        tokens.push(`col:${config.col}`);
    }

    // 11. Standalone flags
    if (config.dense) {
        tokens.push('dense');
    } else if (config.compact) {
        tokens.push('compact');
    }

    if (config.center) {
        tokens.push('center');
    }

    if (config.noIcon) {
        tokens.push('no-icon');
    }

    return tokens.join(', ');
}

/**
 * Parses grid layout parameter (e.g., "1:3", "1-2:3:1-2" or "1:3:2")
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

const KNOWN_METADATA_KEYS = new Set([
    'bg', 'background', 'text', 'link', 'title', 'border', 'bw', 'bs',
    'border-width', 'border-style', 'neon', 'radius', 'gradient',
    'font', 'font-size', 'compact', 'dense', 'padding', 'no-icon', 'noicon',
    'center', 'icon', 'icon-color', 'iconcolor', 'col', 'column', 'style', 'span'
]);

const KNOWN_STANDALONE_FLAGS = new Set([
    'no-icon', 'noicon', 'center', 'compact', 'dense'
]);

/**
 * Checks whether parenthesized text actually looks like callout metadata.
 */
export function isLikelyMetadata(content: string, customLayoutNames: string[] = []): boolean {
    const trimmed = content.trim();
    if (!trimmed) return false;

    // Check if the whole string is or contains a layout token (e.g. 1:3)
    if (maskGroups(trimmed).match(LAYOUT_REGEX)) return true;

    const tokens = smartSplit(trimmed);
    if (tokens.length === 0) return false;

    const hasLayouts = customLayoutNames.length > 0;
    const loweredLayouts = hasLayouts ? new Set(customLayoutNames.map(l => l.toLowerCase())) : null;

    // At least one token must match a known parameter key, flag, or custom layout
    for (const token of tokens) {
        const lowered = token.trim().toLowerCase();
        if (!lowered) continue;

        if (KNOWN_STANDALONE_FLAGS.has(lowered)) return true;
        if (loweredLayouts && loweredLayouts.has(lowered)) return true;

        const colonIndex = lowered.indexOf(':');
        if (colonIndex > 0) {
            const key = lowered.slice(0, colonIndex).trim();
            if (KNOWN_METADATA_KEYS.has(key)) return true;
        }
    }

    return false;
}

/**
 * Extracts metadata content from callout title
 * Supports both leading (metadata) Title and trailing Title (metadata)
 */
export function extractMetadata(fullText: string, customLayoutNames: string[] = []): { content: string; title: string } | null {
    const trimmedText = fullText.trim();
    if (!trimmedText) return null;

    // 1. Leading metadata: (metadata) Title
    if (trimmedText.startsWith('(')) {
        const span = findMetadataSpan(trimmedText, 0);
        if (span) {
            return {
                content: span.content,
                title: trimmedText.substring(span.end + 1).trim()
            };
        }
        return null;
    }

    // 2. Trailing metadata: Title (metadata)
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
            const candidate = trimmedText.substring(startIndex + 1, trimmedText.length - 1).trim();
            if (isLikelyMetadata(candidate, customLayoutNames)) {
                return {
                    content: candidate,
                    title: trimmedText.substring(0, startIndex).trim()
                };
            }
        }
    }

    return null;
}

/**
 * Locates the metadata block at or after `from`, counting parenthesis depth.
 */
export function findMetadataSpan(
    line: string,
    from = 0
): { start: number; end: number; content: string } | null {
    let i = from;
    while (i < line.length && line[i] === ' ') i++;
    if (line[i] !== '(') return null;

    let depth = 0;
    for (let j = i; j < line.length; j++) {
        if (line[j] === '(') depth++;
        else if (line[j] === ')') {
            depth--;
            if (depth === 0) {
                return { start: i, end: j, content: line.slice(i + 1, j) };
            }
        }
    }

    return null;
}
