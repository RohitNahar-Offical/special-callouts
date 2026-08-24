/**
 * constants.ts — the standard palette and Obsidian's callout type aliases.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers.mjs';

const { resolveCalloutType, CALLOUT_TYPE_ALIASES, DEFAULT_STANDARD_STYLES } =
    await loadModule('src/constants.ts');

describe('callout type aliases', () => {
    test('an alias resolves to the type it renders as', () => {
        assert.equal(resolveCalloutType('tldr'), 'abstract');
        assert.equal(resolveCalloutType('summary'), 'abstract');
        assert.equal(resolveCalloutType('error'), 'danger');
        assert.equal(resolveCalloutType('cite'), 'quote');
    });

    test('it is case-insensitive, since Obsidian accepts [!TLDR]', () => {
        assert.equal(resolveCalloutType('TLDR'), 'abstract');
    });

    test('a canonical type passes through unchanged', () => {
        assert.equal(resolveCalloutType('warning'), 'warning');
    });

    test('an unknown type is returned lowercased rather than dropped', () => {
        assert.equal(resolveCalloutType('MyCustomType'), 'mycustomtype');
    });

    test('every alias points at a type that actually has a default style', () => {
        Object.keys(CALLOUT_TYPE_ALIASES).forEach(alias => {
            const target = CALLOUT_TYPE_ALIASES[alias];
            assert.ok(
                DEFAULT_STANDARD_STYLES[target],
                `alias ${alias} points at ${target}, which has no default style`
            );
        });
    });

    test('no alias shadows a canonical type', () => {
        Object.keys(CALLOUT_TYPE_ALIASES).forEach(alias => {
            assert.equal(
                DEFAULT_STANDARD_STYLES[alias],
                undefined,
                `${alias} is both an alias and a standard type`
            );
        });
    });
});
