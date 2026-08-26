/**
 * utils.ts — colour resolution, unit handling and the parenthesis-aware splitter.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule, PALETTE } from './helpers.mjs';

const { toPx, neonStyles, smartSplit, resolveColor, isValidHex, normalizeHex, createTransparentBg, isCssGradient } =
    await loadModule('src/utils.ts');

describe('toPx', () => {
    test('appends px to a bare number', () => {
        assert.equal(toPx('4'), '4px');
        assert.equal(toPx(20), '20px');
        assert.equal(toPx('1.5'), '1.5px');
    });

    test('leaves a value that already has a unit alone — the 4pxpx bug', () => {
        assert.equal(toPx('4px'), '4px');
        assert.equal(toPx('2em'), '2em');
        assert.equal(toPx('50%'), '50%');
    });

    test('empty input stays empty', () => {
        assert.equal(toPx(''), '');
        assert.equal(toPx('   '), '');
    });
});

describe('neonStyles', () => {
    test('produces a border and a two-part glow', () => {
        const props = neonStyles('#00f2ff');
        assert.equal(props['--sc-neon-border'], '2px solid #00f2ff');
        assert.match(props['--sc-neon-shadow'], /inset/);
    });

    test('builds the glow with color-mix, not by concatenating hex alpha', () => {
        // '#f00' + '40' used to yield '#f0040', which is not a colour
        const shadow = neonStyles('#f00')['--sc-neon-shadow'];
        assert.match(shadow, /color-mix/);
        assert.doesNotMatch(shadow, /#f0040/);
    });

    test('works for a bare CSS keyword, which the old build silently dropped', () => {
        const shadow = neonStyles('rebeccapurple')['--sc-neon-shadow'];
        assert.match(shadow, /color-mix\(in srgb, rebeccapurple/);
    });
});

describe('smartSplit', () => {
    test('splits on top-level commas', () => {
        assert.deepEqual(smartSplit('bg:red, compact, col:2'), ['bg:red', 'compact', 'col:2']);
    });

    test('does not split inside parentheses — grouped values stay whole', () => {
        assert.deepEqual(smartSplit('text:(white, dark-border), bg:red'), [
            'text:(white, dark-border)',
            'bg:red',
        ]);
    });

    test('drops empty segments', () => {
        assert.deepEqual(smartSplit('bg:red,,compact'), ['bg:red', 'compact']);
    });
});

describe('resolveColor', () => {
    test('matches the standard palette regardless of case', () => {
        assert.equal(resolveColor('RED', PALETTE, []), '#e74c3c');
    });

    test('custom colours take part too', () => {
        assert.equal(resolveColor('brand', PALETTE, [{ name: 'Brand', hex: '#1a73e8' }]), '#1a73e8');
    });

    test('an unrecognised value passes through untouched', () => {
        assert.equal(resolveColor('#abcdef', PALETTE, []), '#abcdef');
        assert.equal(resolveColor('none', PALETTE, []), 'none');
    });
});

describe('hex helpers', () => {
    test('isValidHex accepts 3 and 6 digit forms with or without hash', () => {
        assert.equal(isValidHex('#fff'), true);
        assert.equal(isValidHex('#ffffff'), true);
        assert.equal(isValidHex('fff'), true);
        assert.equal(isValidHex('ffffff'), true);
        assert.equal(isValidHex('#gggggg'), false);
        assert.equal(isValidHex('gggggg'), false);
    });

    test('normalizeHex expands the short form and uppercases', () => {
        assert.equal(normalizeHex('#abc'), '#AABBCC');
        assert.equal(normalizeHex('abcdef'), '#ABCDEF');
    });
});

describe('createTransparentBg', () => {
    test('is the 15%-style tint that surprises people about bg:', () => {
        assert.equal(createTransparentBg('#ff0000', 15), 'color-mix(in srgb, #ff0000 15%, transparent)');
    });
});

describe('isCssGradient', () => {
    test('recognises the finished form a saved style stores', () => {
        assert.equal(isCssGradient('linear-gradient(90deg, #a1b2c3, #d4e5f6)'), true);
        assert.equal(isCssGradient('  radial-gradient(circle, red, blue)'), true);
        assert.equal(isCssGradient('repeating-linear-gradient(45deg, red, blue)'), true);
    });

    test('the inline c1-c2 shorthand is not one, so it still gets resolved and composed', () => {
        assert.equal(isCssGradient('blue-purple'), false);
        assert.equal(isCssGradient('#667eea-#764ba2'), false);
    });

    test('a plain colour is not one', () => {
        assert.equal(isCssGradient('#e74c3c'), false);
        assert.equal(isCssGradient('red'), false);
        assert.equal(isCssGradient(''), false);
    });
});
