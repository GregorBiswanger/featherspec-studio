import { describe, expect, it } from 'vitest';
import { parseUiMemory, serializeUiMemory } from './uiMemory';

describe('AC-009: remembered UI state', () => {
    it('round-trips the area and a selection with and without a path', () => {
        const plain = { v: 1 as const, area: 'specBoard' as const };
        const selected = { v: 1 as const, area: 'specExplorer' as const, selection: { projectRoot: 'file:///p', stem: '0003-x' } };
        const duplicated = { v: 1 as const, area: 'specExplorer' as const, selection: { projectRoot: 'file:///p', stem: '0003-x', path: '.specs/active/0003-x.md' } };
        for (const memory of [plain, selected, duplicated]) {
            expect(parseUiMemory(serializeUiMemory(memory))).toEqual(memory);
        }
    });

    it.each([
        ['nothing stored', undefined],
        ['null', null],
        ['a string', 'specBoard'],
        ['another version', { v: 2, area: 'specBoard' }],
        ['an unknown area', { v: 1, area: 'settings' }],
        ['the removed area agentCenter', { v: 1, area: 'agentCenter' }],
        ['a missing area', { v: 1 }],
        ['a selection without a root', { v: 1, area: 'specBoard', selection: { stem: '0003-x' } }],
        ['a selection with a numeric stem', { v: 1, area: 'specBoard', selection: { projectRoot: 'p', stem: 3 } }],
        ['a selection with a non-string path', { v: 1, area: 'specBoard', selection: { projectRoot: 'p', stem: 'a', path: 4 } }],
        ['an empty stem', { v: 1, area: 'specBoard', selection: { projectRoot: 'p', stem: '' } }],
    ])('a damaged value (%s) is rejected as a whole, so the defaults apply', (_name, value) => {
        expect(parseUiMemory(value)).toBeUndefined();
    });
});
