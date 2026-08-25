/**
 * The stylesheet contract between TypeScript and styles.css.
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
const coreSources = sources.filter(f => !f.includes('modals') && !f.includes('settings'));

describe('the styling contract', () => {
    test('no !important outside the stylesheet', () => {
        const offenders = [];
        for (const file of sources) {
            readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
                const trimmed = line.trim();
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

    test('no static layout styles assigned straight onto core elements in processor', () => {
        const offenders = [];
        for (const file of coreSources) {
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
});
