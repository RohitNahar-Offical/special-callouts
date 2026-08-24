/**
 * The stylesheet contract between TypeScript and styles.css.
 *
 * The settings UI and the modals are built almost entirely from generated `sc-style-*` and
 * `sc-var-*` class names. Nothing checks them at build time: a name that exists in the code
 * but not in the stylesheet produces an unstyled element and no error at all, which is the
 * hardest kind of breakage to notice. So check both directions here.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

function collectSources(dir, found = []) {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) collectSources(full, found);
        else if (full.endsWith('.ts')) found.push(full);
    }
    return found;
}

const sources = [...collectSources(join(root, 'src')), join(root, 'main.ts')];
const code = sources.map(f => readFileSync(f, 'utf8')).join('\n');
const css = readFileSync(join(root, 'styles.css'), 'utf8');

/** Class names the code asks for, as written in string literals. */
function usedClasses(prefix) {
    const names = new Set();
    const pattern = new RegExp(`['"\`](${prefix}[a-z0-9-]+)['"\`]`, 'g');
    for (const match of code.matchAll(pattern)) names.add(match[1]);
    return names;
}

/** Class names the stylesheet defines. */
function definedClasses(prefix) {
    const names = new Set();
    const pattern = new RegExp(`\\.(${prefix}[a-z0-9-]+)`, 'g');
    for (const match of css.matchAll(pattern)) names.add(match[1]);
    return names;
}

describe('generated style classes', () => {
    test('every sc-style-* class the code applies is defined in styles.css', () => {
        const used = usedClasses('sc-style-');
        const defined = definedClasses('sc-style-');
        assert.ok(used.size > 50, `only found ${used.size} sc-style- uses — the scan is probably broken`);

        const missing = [...used].filter(name => !defined.has(name)).sort();
        assert.deepEqual(missing, [], `applied but never defined: ${missing.join(', ')}`);
    });

    test('every sc-var-* class the code applies is defined in styles.css', () => {
        const used = usedClasses('sc-var-');
        const defined = definedClasses('sc-var-');
        assert.ok(used.size > 10, `only found ${used.size} sc-var- uses — the scan is probably broken`);

        const missing = [...used].filter(name => !defined.has(name)).sort();
        assert.deepEqual(missing, [], `applied but never defined: ${missing.join(', ')}`);
    });
});

describe('the styling contract', () => {
    test('no !important outside the stylesheet', () => {
        const offenders = [];
        for (const file of sources) {
            readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
                const trimmed = line.trim();
                // Comments may name the rule they are describing.
                if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
                if (line.includes('!important')) offenders.push(`${file.slice(root.length + 1)}:${i + 1}`);
            });
        }
        assert.deepEqual(
            offenders,
            [],
            'every !important belongs in styles.css, under a data-attribute selector'
        );
    });

    test('no styles assigned straight onto an element', () => {
        // Obsidian's plugin review rejects styling written from JavaScript; v1.0.6 was spent
        // removing every instance. setCssProps and setCssStyles are the sanctioned routes.
        const offenders = [];
        for (const file of sources) {
            const lines = readFileSync(file, 'utf8').split('\n');
            lines.forEach((line, i) => {
                if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
                if (/\.style\.[a-zA-Z]+\s*=/.test(line) || /\.style\.setProperty\(/.test(line)) {
                    offenders.push(`${file.slice(root.length + 1)}:${i + 1}`);
                }
            });
        }
        assert.deepEqual(offenders, [], 'use a data attribute plus a CSS custom property instead');
    });

    test('no innerHTML assignment', () => {
        const offenders = [];
        for (const file of sources) {
            const lines = readFileSync(file, 'utf8').split('\n');
            lines.forEach((line, i) => {
                if (/\.(inner|outer)HTML\s*=/.test(line)) {
                    offenders.push(`${file.slice(root.length + 1)}:${i + 1}`);
                }
            });
        }
        assert.deepEqual(offenders, [], 'build nodes with createEl/createDiv instead');
    });
});
