import { describe, expect, it } from 'vitest';
import type { SpecSection } from '../specs/parseSpec';
import { describeSpec } from './description';

const section = (heading: string | undefined, raw: string): SpecSection => ({ heading, raw, line: 1 });

describe('card description (PD-043)', () => {
    it('AC-004: the first paragraph under the first heading; text before that heading is skipped', () => {
        const sections = [section(undefined, 'Handoff reference: FS-007 (a paragraph before any heading).'), section('1. Summary', 'A kanban board.\nSecond line of it.\n\nNext paragraph.')];
        expect(describeSpec(sections)).toBe('A kanban board. Second line of it.');
    });

    it('AC-004: the first section with a heading is used whatever its text says (headings vary by language)', () => {
        expect(describeSpec([section('Zusammenfassung', 'Ein Board.'), section('2. Goal', 'Other.')])).toBe('Ein Board.');
    });

    it('AC-004: lists, tables, quotes, code fences and headings are no paragraph; the next one is taken', () => {
        const raw = ['- a list item', '', '| a | b |', '| - | - |', '', '> quoted', '', '```', 'code', '', 'more code', '```', '', '### sub heading', '', 'The real text.'].join('\n');
        expect(describeSpec([section('1. Summary', raw)])).toBe('The real text.');
    });

    it('AC-004: no heading, no paragraph or an empty section gives none ("No summary")', () => {
        expect(describeSpec([])).toBeUndefined();
        expect(describeSpec([section(undefined, 'Only a preamble.')])).toBeUndefined();
        expect(describeSpec([section('1. Summary', '- only\n- a list')])).toBeUndefined();
        expect(describeSpec([section('1. Summary', '')])).toBeUndefined();
    });
});
