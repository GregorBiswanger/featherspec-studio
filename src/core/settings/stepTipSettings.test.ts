import { describe, expect, it } from 'vitest';
import { parseStepTipSettings } from './stepTipSettings';

describe('0021 AC-016, AC-012: reading the two settings', () => {
    it('the defaults show the tips and name no model', () => {
        expect(parseStepTipSettings(true, {})).toEqual({ show: true, hints: {} });
        expect(parseStepTipSettings(undefined, undefined)).toEqual({ show: true, hints: {} });
    });

    it('false hides the tips; a value that is not a boolean acts as true', () => {
        expect(parseStepTipSettings(false, {}).show).toBe(false);
        for (const value of ['false', 0, null, 'no', {}, []]) {
            expect(parseStepTipSettings(value, {}).show, String(value)).toBe(true);
        }
    });

    it('a hint is trimmed and its inner whitespace runs are collapsed', () => {
        expect(parseStepTipSettings(true, { strong: '  my   big one ' }).hints).toEqual({ strong: 'my big one' });
        expect(parseStepTipSettings(true, { fast: 'a\t\nb' }).hints).toEqual({ fast: 'a b' });
    });

    it('a hint of 40 characters stays, one of 41 is cut to 39 and an ellipsis, counted in code points', () => {
        const forty = 'x'.repeat(40);
        expect(parseStepTipSettings(true, { strong: forty }).hints.strong).toBe(forty);
        expect(parseStepTipSettings(true, { strong: `${forty}y` }).hints.strong).toBe(`${'x'.repeat(39)}…`);
        const emoji = '😀'.repeat(41);
        expect(parseStepTipSettings(true, { fast: emoji }).hints.fast).toBe(`${'😀'.repeat(39)}…`);
        expect(parseStepTipSettings(true, { fast: '😀'.repeat(40) }).hints.fast).toBe('😀'.repeat(40));
    });

    it('a hint that is not a string, or empty after trimming, names no model', () => {
        for (const value of [3, true, null, ['a'], {}, '', '   ', '\n\t']) {
            expect(parseStepTipSettings(true, { strong: value, fast: value }).hints, JSON.stringify(value)).toEqual({});
        }
    });

    it('modelHints that is not an object names no model; other keys change nothing', () => {
        for (const value of [[], 'x', null, undefined, 3, true]) {
            expect(parseStepTipSettings(true, value).hints, JSON.stringify(value)).toEqual({});
        }
        expect(parseStepTipSettings(true, { strong: 'A', fast: 'B', other: 'C', balanced: 'D' })).toEqual({ show: true, hints: { strong: 'A', fast: 'B' } });
        expect(parseStepTipSettings(true, { other: 'C' })).toEqual({ show: true, hints: {} });
    });
});
