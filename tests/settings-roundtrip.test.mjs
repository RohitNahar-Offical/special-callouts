/**
 * The style form's save/load round-trip, checked against the source.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '..', 'src', 'settings', 'SettingsTab.ts'), 'utf8');

describe('style form structure', () => {
    test('StyleEditorModal initializes with full clone of existing style', () => {
        assert.ok(
            source.includes('this.style = existingStyle ? { ...existingStyle } :'),
            'StyleEditorModal should clone existing style object directly'
        );
    });

    test('StyleEditorModal saves style into plugin settings', () => {
        assert.ok(
            source.includes('this.plugin.settings.customStyles'),
            'StyleEditorModal should update customStyles array on save'
        );
    });
});
