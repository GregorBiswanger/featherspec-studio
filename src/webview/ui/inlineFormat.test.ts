import { describe, expect, it } from 'vitest';
import { splitCells, tidy, tokenize } from './inlineFormat';

describe('0013 AC-014 tokenize: the §3.4 inline subset', () => {
    it.each([
        ['**bold**', [{ kind: 'strong', children: [{ kind: 'text', text: 'bold' }] }]],
        ['__bold__', [{ kind: 'strong', children: [{ kind: 'text', text: 'bold' }] }]],
        ['*it*', [{ kind: 'em', children: [{ kind: 'text', text: 'it' }] }]],
        ['_it_', [{ kind: 'em', children: [{ kind: 'text', text: 'it' }] }]],
        ['`a | b`', [{ kind: 'code', text: 'a | b' }]],
        ['[plan](0002.plan.md)', [{ kind: 'link', children: [{ kind: 'text', text: 'plan' }], target: '0002.plan.md' }]],
    ] as const)('AC-014: %s', (text, expected) => {
        expect(tokenize(text)).toEqual(expected);
    });

    it('AC-014: text around and between forms stays text; code content is not parsed further', () => {
        expect(tokenize('a **b** c `**d**` e')).toEqual([
            { kind: 'text', text: 'a ' },
            { kind: 'strong', children: [{ kind: 'text', text: 'b' }] },
            { kind: 'text', text: ' c ' },
            { kind: 'code', text: '**d**' },
            { kind: 'text', text: ' e' },
        ]);
    });

    it('AC-014: nesting: code inside bold, bold inside a link text', () => {
        expect(tokenize('**see `x`**')).toEqual([{ kind: 'strong', children: [{ kind: 'text', text: 'see ' }, { kind: 'code', text: 'x' }] }]);
        expect(tokenize('[**a**](b)')).toEqual([{ kind: 'link', children: [{ kind: 'strong', children: [{ kind: 'text', text: 'a' }] }], target: 'b' }]);
    });

    it('AC-014: unmatched markers, snake_case, a lone asterisk and an empty pair stay literal', () => {
        expect(tokenize('**open')).toEqual([{ kind: 'text', text: '**open' }]);
        expect(tokenize('snake_case_name')).toEqual([{ kind: 'text', text: 'snake_case_name' }]);
        expect(tokenize('2 * 3 = 6')).toEqual([{ kind: 'text', text: '2 * 3 = 6' }]);
        expect(tokenize('a `` b')).toEqual([{ kind: 'text', text: 'a `` b' }]);
        expect(tokenize('[text] (x)')).toEqual([{ kind: 'text', text: '[text] (x)' }]);
        expect(tokenize('*.plan.md and *x*')).toEqual([{ kind: 'text', text: '*.plan.md and ' }, { kind: 'em', children: [{ kind: 'text', text: 'x' }] }]);
    });

    it('AC-014: HTML is literal text, never a token', () => {
        expect(tokenize('<img src=x onerror=alert(1)>')).toEqual([{ kind: 'text', text: '<img src=x onerror=alert(1)>' }]);
        expect(tokenize('<b>x</b>')).toEqual([{ kind: 'text', text: '<b>x</b>' }]);
    });
});

describe('0013 AC-015 tidy and splitCells', () => {
    it('AC-015: a block quote loses "> " on every line and is marked as quote', () => {
        expect(tidy('> **Given** a **When** b')).toEqual({ text: '**Given** a **When** b', quote: true });
        expect(tidy('> one\n> two')).toEqual({ text: 'one\ntwo', quote: true });
    });

    it('AC-015: a list marker is dropped only where the item is a list item', () => {
        expect(tidy('- item', { listItem: true }).text).toBe('item');
        expect(tidy('* item', { listItem: true }).text).toBe('item');
        expect(tidy('1. item', { listItem: true }).text).toBe('item');
        expect(tidy('- item').text).toBe('- item');
    });

    it('AC-015: a leading repeat of the own ID, bare or bold, then |, -, — or :, is dropped', () => {
        expect(tidy('**AC-001** — text', { id: 'AC-001' }).text).toBe('text');
        expect(tidy('AC-001: text', { id: 'AC-001' }).text).toBe('text');
        expect(tidy('FR-01 | text', { id: 'FR-01' }).text).toBe('text');
        expect(tidy('AC-0010 text', { id: 'AC-001' }).text).toBe('AC-0010 text');
        expect(tidy('AC-002: text', { id: 'AC-001' }).text).toBe('AC-002: text');
    });

    it('AC-015: requirement cells split on " | " into primary text and secondary text joined by " · "', () => {
        expect(splitCells('Find all specs | FR-002.1 | AC-001, AC-010')).toEqual({ primary: 'Find all specs', secondary: 'FR-002.1 · AC-001, AC-010' });
        expect(splitCells('Only text')).toEqual({ primary: 'Only text', secondary: undefined });
        expect(splitCells('`a | b` and more')).toEqual({ primary: '`a | b` and more', secondary: undefined });
    });
});
