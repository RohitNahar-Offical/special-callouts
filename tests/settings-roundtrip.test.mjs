/**
 * The style form's save/load round-trip, checked against the source.
 *
 * SettingsTab.ts pulls in Obsidian's runtime, so it cannot be imported here the way
 * parser.ts and utils.ts are. What matters is structural anyway: every field
 * getStyleFromForm writes into a saved style must be restored by loadStyleToForm, or
 * editing a preset and saving it again drops that field without saying so.
 *
 * This has cost real releases twice — `center`/`titleCenter` in 1.0.8, and `iconColor` in
 * 1.0.9, where the edit button carried its own hand-written copy of the loader that had
 * fallen behind. The test is here so there is no third time.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '..', 'src', 'settings', 'SettingsTab.ts'), 'utf8');

/** Returns the body of a method, from its signature to the first dedented closing brace. */
function methodBody(signature) {
    const start = source.indexOf(signature);
    assert.notEqual(start, -1, `${signature} not found — did the method get renamed?`);
    const end = source.indexOf('\n    }', start);
    assert.notEqual(end, -1, `could not find the end of ${signature}`);
    return source.slice(start, end);
}

const written = new Set(
    [...methodBody('private getStyleFromForm').matchAll(/this\.(temp[A-Za-z]+)/g)].map(m => m[1])
);
const restored = new Set(
    [...methodBody('private loadStyleToForm').matchAll(/this\.(temp[A-Za-z]+)\s*=/g)].map(m => m[1])
);

describe('style form round-trip', () => {
    test('the form writes a non-trivial number of fields, so the scan is finding them', () => {
        assert.ok(written.size >= 15, `only found ${written.size} fields — the scan is probably broken`);
    });

    test('every field the form saves is restored when a preset is reopened', () => {
        const missing = [...written].filter(field => !restored.has(field));
        assert.deepEqual(
            missing,
            [],
            `loadStyleToForm does not restore: ${missing.join(', ')} — editing a preset would drop them`
        );
    });

    test('the edit button delegates to the loader instead of copying it', () => {
        const editHandler = source.slice(
            source.indexOf('editBtn.onclick'),
            source.indexOf('deleteBtn.onclick')
        );
        assert.ok(
            editHandler.includes('this.loadStyleToForm('),
            'the edit button should call loadStyleToForm, not assign temp fields itself'
        );
    });
});
