/**
 * Loads a TypeScript module from src/ so tests run against the real source rather than a
 * transcribed copy — a copy would drift and quietly stop testing anything.
 *
 * esbuild is already a build dependency, so this adds nothing to install.
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, '..', 'package.json'));
const esbuild = require('esbuild');

const cache = new Map();

/**
 * @param {string} relativePath - path from the plugin root, e.g. 'src/parser.ts'
 * @returns {Promise<Record<string, unknown>>} the module's exports
 */
export async function loadModule(relativePath) {
    if (cache.has(relativePath)) return cache.get(relativePath);

    const result = esbuild.buildSync({
        entryPoints: [join(here, '..', relativePath)],
        bundle: true,
        format: 'esm',
        platform: 'neutral',
        write: false,
        // Obsidian's runtime is not available under `node --test`; nothing exercised here
        // touches it, but parser/utils could gain such an import later.
        external: ['obsidian'],
    });

    const code = result.outputFiles[0].text;
    const mod = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
    cache.set(relativePath, mod);
    return mod;
}

/** The default palette, so colour tests do not depend on the user's settings. */
export const PALETTE = {
    red: '#e74c3c',
    blue: '#3498db',
    green: '#2ecc71',
    grey: '#95a5a6',
};
