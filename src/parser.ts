/**
 * Special Callouts - Metadata Parser
 * Highly optimized parser for callout title metadata with LRU caching and fast-path heuristics
 * 
 * IMPORTANT: Before modifying this file, read RULES.md for mandatory protocols.
 */

import { CalloutConfig, GridConfig } from './types';
import { DEFAULT_CALLOUT_CONFIG } from './constants';
import { resolveColor, smartSplit } from './utils';

// Module-level constants for maximum performance
const LAYOUT_REGEX = /(?:^|[\s,])(\d+(?:-\d+)?(?:[:,/]\d+(?:-\d+)?){1,4})(?:$|[\s,])/;
const GROUP_REGEX = /^\(([^)]+)\)$/;
const GRID_REGEX = /^(\d+)(?:-(\d+))?[:,/](\d+)(?:[:,/](\d+)(?:-(\d+))?)?(?:[:,/](\d+))?(?:[:,/](\d+))?$/;
const MASK_CHAR = '\u0000';

const KNOWN_METADATA_KEYS = new Set([
    'bg', 'background', 'text', 'link', 'title', 'border', 'bw', 'bs',
    'border-width', 'border-style', 'neon', 'radius', 'gradient',
    'font', 'font-size', 'compact', 'dense', 'padding', 'no-icon', 'noicon',
    'center', 'icon', 'icon-color', 'iconcolor', 'col', 'column', 'style', 'span'
]);

const KNOWN_STANDALONE_FLAGS = new Set([
    'no-icon', 'noicon', 'center', 'compact', 'dense'
]);

// LRU Cache for parsed metadata (Max 500 entries to prevent memory bloat)
const MAX_CACHE_SIZE = 500;
const parseCache = new Map<string, { config: CalloutConfig; layoutParam: string | null; styleParam: string | null }>();

/**
 * Clears the parser LRU cache
 */
export function clearMetadataCache(): void {
    parseCache.clear();
}

/**
 * Blanks the contents of every parenthesised group, keeping the string the same length.
 */
function maskGroups(content: string): string {
    let depth = 0;
    let masked = '';

    for (let i = 0; i < content.length; i++) {
        const char = content[i];
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

    for (let i = 0; i < params.length; i++) {
        const pair = params[i];
        const colon = pair.indexOf(':');
        if (colon === -1) {
            expanded.push(pair);
            continue;
        }

        const key = pair.slice(0, colon).trim();
        const groupMatch = pair.slice(colon + 1).trim().match(GROUP_REGEX);
        if (!key || !groupMatch) {
            expanded.push(pair);
            continue;
        }

        const rawGroup = groupMatch[1];
        const parts = rawGroup.split(',');
        for (let j = 0; j < parts.length; j++) {
            const val = parts[j].trim();
            if (val) expanded.push(`${key}:${val}`);
        }
    }

    return expanded;
}

/**
 * Parses the metadata content from callout title with cache lookup
 */
export function parseMetadata(
    content: string,
    standardColors: Record<string, string>,
    customColors: Array<{ name: string; hex: string }>,
    customLayoutNames: string[] = []
): { config: CalloutConfig; layoutParam: string | null; styleParam: string | null } {
    const trimmed = content.trim();
    if (!trimmed) {
        return { config: { ...DEFAULT_CALLOUT_CONFIG }, layoutParam: null, styleParam: null };
    }

    // Cache key incorporates layout names if any exist
    const cacheKey = customLayoutNames.length > 0 ? `${trimmed}::${customLayoutNames.join(',')}` : trimmed;
    const cached = parseCache.get(cacheKey);
    if (cached) {
        // Return a fresh copy of the config object so mutations do not leak
        return { config: { ...cached.config }, layoutParam: cached.layoutParam, styleParam: cached.styleParam };
    }

    const config: CalloutConfig = { ...DEFAULT_CALLOUT_CONFIG };
    let layoutParam: string | null = null;
    let styleParam: string | null = null;

    let remainingContent = trimmed;
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

    for (let i = 0; i < params.length; i++) {
        const pair = params[i];
        let key = '', rawValue = '';

        const loweredPair = pair.trim().toLowerCase();
        if (!loweredPair) continue;

        // Built-in flags
        if (loweredPair === 'no-icon' || loweredPair === 'noicon') {
            config.noIcon = true;
            continue;
        }
        if (loweredPair === 'center') {
            config.center = true;
            continue;
        }
        if (loweredPair === 'compact' || loweredPair === 'dense') {
            config.compact = true;
            if (loweredPair === 'dense') config.dense = true;
            continue;
        }

        // Custom layout names
        if (customLayoutNames.includes(loweredPair)) {
            config.customLayout = loweredPair;
            continue;
        }

        const colonIdx = pair.indexOf(':');
        if (colonIdx > 0) {
            key = pair.slice(0, colonIdx).trim().toLowerCase();
            rawValue = pair.slice(colonIdx + 1).trim();
        } else {
            continue;
        }

        if (!key || !rawValue) continue;

        const isBorderValue = ['dark-border', 'light-border'].includes(rawValue.toLowerCase());

        switch (key) {
            case 'col':
            case 'column': {
                const col = parseInt(rawValue, 10);
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
                const size = parseInt(rawValue, 10);
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
                const span = parseInt(rawValue, 10);
                if (!isNaN(span) && span >= 1) {
                    config.span = span;
                }
                break;
            }
        }
    }

    // Maintain LRU cache size
    if (parseCache.size >= MAX_CACHE_SIZE) {
        const firstKey = parseCache.keys().next().value;
        if (firstKey) parseCache.delete(firstKey);
    }
    parseCache.set(cacheKey, { config: { ...config }, layoutParam, styleParam });

    return { config, layoutParam, styleParam };
}

/**
 * Serializes a CalloutConfig back into metadata string syntax.
 */
export function serializeMetadata(
    config: Partial<CalloutConfig>,
    layoutParam?: string | null,
    styleParam?: string | null
): string {
    const tokens: string[] = [];

    if (styleParam) {
        tokens.push(`style:${styleParam}`);
    }

    if (layoutParam) {
        tokens.push(layoutParam);
    } else if (config.customLayout) {
        tokens.push(config.customLayout);
    }

    if (config.gradient) {
        tokens.push(`gradient:${config.gradient}`);
    } else if (config.bg) {
        tokens.push(`bg:${config.bg}`);
    }

    if (config.neon) {
        tokens.push(`neon:${config.neon}`);
    }

    if (config.text && config.textBorder) {
        tokens.push(`text:(${config.text}, ${config.textBorder})`);
    } else if (config.text) {
        tokens.push(`text:${config.text}`);
    } else if (config.textBorder) {
        tokens.push(`text:${config.textBorder}`);
    }

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

    if (config.link && config.linkBorder) {
        tokens.push(`link:(${config.link}, ${config.linkBorder})`);
    } else if (config.link) {
        tokens.push(`link:${config.link}`);
    } else if (config.linkBorder) {
        tokens.push(`link:${config.linkBorder}`);
    }

    if (config.icon) {
        tokens.push(`icon:${config.icon}`);
    }
    if (config.iconColor) {
        tokens.push(`icon-color:${config.iconColor}`);
    }

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

    if (config.font) {
        tokens.push(`font:${config.font}`);
    }
    if (config.fontSize) {
        tokens.push(`font-size:${config.fontSize}`);
    }

    if (config.col !== null && config.col !== undefined) {
        tokens.push(`col:${config.col}`);
    }

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
 */
export function parseGridLayout(param: string): GridConfig | null {
    const match = param.match(GRID_REGEX);
    if (!match) return null;

    const colStart = parseInt(match[1], 10);
    const colEnd = match[2] ? parseInt(match[2], 10) : colStart;
    const columns = parseInt(match[3], 10);
    const rowStart = match[4] ? parseInt(match[4], 10) : 1;
    const rowEnd = match[5] ? parseInt(match[5], 10) : rowStart;

    let colSpan = match[6] ? parseInt(match[6], 10) : (colEnd - colStart + 1);
    let rowSpan = match[7] ? parseInt(match[7], 10) : (rowEnd - rowStart + 1);

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
 * Checks whether parenthesized text actually looks like callout metadata.
 */
export function isLikelyMetadata(content: string, customLayoutNames: string[] = []): boolean {
    const trimmed = content.trim();
    if (!trimmed) return false;

    if (maskGroups(trimmed).match(LAYOUT_REGEX)) return true;

    const tokens = smartSplit(trimmed);
    if (tokens.length === 0) return false;

    const hasLayouts = customLayoutNames.length > 0;
    const loweredLayouts = hasLayouts ? new Set(customLayoutNames.map(l => l.toLowerCase())) : null;

    for (let i = 0; i < tokens.length; i++) {
        const lowered = tokens[i].trim().toLowerCase();
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
 * Extracts metadata content from callout title with zero-allocation fast-path
 */
export function extractMetadata(fullText: string, customLayoutNames: string[] = []): { content: string; title: string } | null {
    // Fast-path: if there are no parentheses at all, skip everything in O(1)
    if (!fullText.includes('(') || !fullText.includes(')')) return null;

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
