import { describe, expect, it } from 'vitest';
import { parseUiMemory, serializeUiMemory } from './uiMemory';

describe('AC-009: remembered UI state', () => {
    it('round-trips the area and a selection with and without a path', () => {
        const plain = { v: 1 as const, area: 'board' as const };
        const selected = { v: 1 as const, area: 'overview' as const, selection: { projectRoot: 'file:///p', stem: '0003-x' } };
        const duplicated = { v: 1 as const, area: 'overview' as const, selection: { projectRoot: 'file:///p', stem: '0003-x', path: '.specs/active/0003-x.md' } };
        for (const memory of [plain, selected, duplicated]) {
            expect(parseUiMemory(serializeUiMemory(memory))).toEqual(memory);
        }
    });

    it.each([
        ['nothing stored', undefined],
        ['null', null],
        ['a string', 'board'],
        ['another version', { v: 2, area: 'board' }],
        ['an unknown area', { v: 1, area: 'settings' }],
        ['the removed area agentCenter', { v: 1, area: 'agentCenter' }],
        ['a missing area', { v: 1 }],
        ['a selection without a root', { v: 1, area: 'board', selection: { stem: '0003-x' } }],
        ['a selection with a numeric stem', { v: 1, area: 'board', selection: { projectRoot: 'p', stem: 3 } }],
        ['a selection with a non-string path', { v: 1, area: 'board', selection: { projectRoot: 'p', stem: 'a', path: 4 } }],
        ['an empty stem', { v: 1, area: 'board', selection: { projectRoot: 'p', stem: '' } }],
    ])('a damaged value (%s) is rejected as a whole, so the defaults apply', (_name, value) => {
        expect(parseUiMemory(value)).toBeUndefined();
    });
});

describe('0020 AC-017: a remembered Spec Explorer', () => {
    const selection = { projectRoot: 'file:///p', stem: '0003-x' };

    it('maps to Overview and keeps the selection, with and without a path', () => {
        expect(parseUiMemory({ v: 1, area: 'specExplorer', selection })).toEqual({ v: 1, area: 'overview', selection });
        const duplicated = { ...selection, path: '.specs/active/0003-x.md' };
        expect(parseUiMemory({ v: 1, area: 'specExplorer', selection: duplicated })).toEqual({ v: 1, area: 'overview', selection: duplicated });
        expect(parseUiMemory({ v: 1, area: 'specExplorer' })).toEqual({ v: 1, area: 'overview' });
    });

    it('control: a damaged selection, another version or another unknown area still drop the whole memory', () => {
        expect(parseUiMemory({ v: 1, area: 'specExplorer', selection: { stem: 4 } })).toBeUndefined();
        expect(parseUiMemory({ v: 2, area: 'specExplorer' })).toBeUndefined();
        expect(parseUiMemory({ v: 1, area: 'explorer', selection })).toBeUndefined();
    });

    it('control: a remembered board stays the board', () => {
        expect(parseUiMemory({ v: 1, area: 'board', selection })).toEqual({ v: 1, area: 'board', selection });
    });
});

