/**
 * Special Callouts - Utility Functions
 * Reusable helper functions
 */

/**
 * Debounce: Controls frequently called functions
 * Waits until the specified time has passed since the last call
 */
export function debounce<T extends (...args: unknown[]) => void>(
    func: T,
    wait: number
): T {
    // window.setTimeout yields a number; @types/node would otherwise infer NodeJS.Timeout
    let timeout: number | null = null;
    return ((...args: Parameters<T>) => {
        if (timeout !== null) window.clearTimeout(timeout);
        timeout = window.setTimeout(() => func(...args), wait);
    }) as T;
}

/**
 * Validates hex color code
 * @param hex - Color code to validate
 * @returns true if valid hex code
 */
export function isValidHex(hex: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
}

/**
 * Normalizes hex code - converts 3-char to 6-char format
 * @param hex - Color code to normalize
 * @returns 6-character uppercase hex code
 */
export function normalizeHex(hex: string): string {
    if (!hex.startsWith('#')) hex = '#' + hex;
    if (hex.length === 4) {
        hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    return hex.toUpperCase();
}

/**
 * Resolves color value from name or hex
 * @param value - Color name or hex value
 * @param standardColors - Standard color palette
 * @param customColors - Custom user colors
 * @returns Resolved hex color
 */
export function resolveColor(
    value: string,
    standardColors: Record<string, string>,
    customColors: Array<{ name: string; hex: string }>
): string {
    // Check standard color name
    const std = standardColors[value.toLowerCase()];
    if (std) return std;

    // Check custom color name
    const custom = customColors.find(c => c.name.toLowerCase() === value.toLowerCase());
    if (custom) return custom.hex;

    // Return as-is (assume hex code)
    return value;
}

/**
 * Creates transparent background using CSS color-mix
 * @param color - Base color
 * @param opacity - Opacity percentage (default 10)
 */
export function createTransparentBg(color: string, opacity: number = 10): string {
    return `color-mix(in srgb, ${color} ${opacity}%, transparent)`;
}

/**
 * True when a value is already a finished CSS gradient function.
 *
 * A saved style stores the composed `linear-gradient(90deg, …)` in its `bg` field, while
 * inline metadata writes the `c1-c2` shorthand. The two have to be told apart before the
 * value is used: treating the finished form as a colour mixes it into `color-mix()`, which
 * is invalid and drops the background, and splitting it on '-' tears the function name in
 * half.
 */
export function isCssGradient(value: string): boolean {
    return /^(repeating-)?(linear|radial|conic)-gradient\(/i.test(value.trim());
}

/**
 * Normalizes a length to a CSS px value.
 *
 * Inline metadata is written unitless (`radius:20`) while saved presets may hold either
 * form. Every caller used to append 'px' on its own, which turned a preset storing '4px'
 * into '4pxpx' and dropped the declaration. Routing both paths through here keeps the
 * two notations interchangeable.
 *
 * @param value - Unitless number or a value that already carries a unit
 * @returns Value with 'px' appended when it is purely numeric, otherwise unchanged
 */
export function toPx(value: string | number): string {
    const raw = String(value).trim();
    if (!raw) return '';
    return /^-?\d*\.?\d+$/.test(raw) ? `${raw}px` : raw;
}

/**
 * Builds the CSS custom properties for the neon border and glow.
 *
 * The glow used to be built by concatenating '40' and '20' onto the color string, which
 * only yields valid CSS for a 6-digit hex — a 3-digit hex or a bare CSS keyword silently
 * lost its glow while keeping its border. color-mix handles any color notation.
 *
 * Inline metadata and saved presets both call this, so a given color can no longer render
 * two different ways depending on which route applied it.
 *
 * @param color - Any CSS color
 */
export function neonStyles(color: string): Record<string, string> {
    const glow = (percent: number) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;
    return {
        '--sc-neon-border': `2px solid ${color}`,
        // 25% / 12% match the alpha the old hex suffixes produced (0x40, 0x20)
        '--sc-neon-shadow': `0 0 8px 2px ${glow(25)}, inset 0 0 8px 2px ${glow(12)}`
    };
}

/**
 * Smart split: splits by comma but not inside parentheses
 * @param str - String to split
 * @returns Array of split parts
 */
export function smartSplit(str: string): string[] {
    const result: string[] = [];
    let current = '';
    let depth = 0;
    for (const char of str) {
        if (char === '(') depth++;
        else if (char === ')') depth--;
        else if (char === ',' && depth === 0) {
            if (current.trim()) result.push(current.trim());
            current = '';
            continue;
        }
        current += char;
    }
    if (current.trim()) result.push(current.trim());
    return result;
}

/**
 * Applies text stroke border for readability
 * @param element - Target HTML element
 * @param borderType - 'dark-border' or 'light-border'
 */
export function applyTextBorder(element: HTMLElement, borderType: string): void {
    const strokeColor = borderType === 'dark-border'
        ? 'rgba(0,0,0,0.8)'
        : 'rgba(255,255,255,0.8)';
    // Use CSS custom property + data attribute; actual rule lives in styles.css
    element.setAttribute('data-sc-text-border', borderType);
    element.setCssProps({ '--sc-text-border-color': strokeColor });
}
