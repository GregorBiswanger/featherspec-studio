import { describe, expect, it } from 'vitest';
import { withoutLeadingId, withoutListMarker } from './idText';

describe('AC-009: an ID is shown once, so the delivered text loses its own leading ID', () => {
    it.each([
        ['bold ID', '**AC-001** The board shall show cards.', 'AC-001', 'The board shall show cards.'],
        ['uncertain flag inside the bold', '**[Uncertain] AC-002** The board shall sort.', 'AC-002', 'The board shall sort.'],
        ['struck ID', '**~~AC-003~~** Struck criterion.', 'AC-003', 'Struck criterion.'],
        ['bullet and dash separator', '- **AC-004** — The board shall filter.', 'AC-004', 'The board shall filter.'],
        ['numbered item and colon', '1. AC-005: The board shall move.', 'AC-005', 'The board shall move.'],
        ['colon inside the bold', '**AC-006:** The board shall open.', 'AC-006', 'The board shall open.'],
        ['table row', '| FR-01 | Show a board | FR-007.1 | AC-001, AC-002 |', 'FR-01', 'Show a board | FR-007.1 | AC-001, AC-002'],
        ['dotted FR ID', '| FR-02.1 | Sub requirement |', 'FR-02.1', 'Sub requirement'],
    ])('%s', (_name, text, id, expected) => {
        expect(withoutLeadingId(text, id)).toBe(expected);
    });

    it('keeps the continuation lines as delivered and strips only the first line', () => {
        expect(withoutLeadingId('**AC-001** The board shall\nshow *(handoff AC-001)*\nevery card.', 'AC-001')).toBe('The board shall\nshow *(handoff AC-001)*\nevery card.');
    });

    it('an ID that is only the heading of a multi-line text leaves the next lines', () => {
        expect(withoutLeadingId('**AC-007**\nThe board shall wait.', 'AC-007')).toBe('The board shall wait.');
    });

    it('keeps a later mention of the same ID', () => {
        expect(withoutLeadingId('**AC-008** Replaces AC-008 of the old spec.', 'AC-008')).toBe('Replaces AC-008 of the old spec.');
    });

    it('negative control: a text that does not start with the ID is left alone', () => {
        expect(withoutLeadingId('The board shall show AC-009.', 'AC-009')).toBe('The board shall show AC-009.');
    });
});

describe('a stage line keeps its text but not the list number the list adds again', () => {
    it.each([
        ['1. T-001 — board contract', 'T-001 — board contract'],
        ['12) T-012 → T-013 — wiring', 'T-012 → T-013 — wiring'],
        ['- T-001 — contract', 'T-001 — contract'],
        ['T-001 — no marker', 'T-001 — no marker'],
        ['1. T-001 — a\n   continued', 'T-001 — a\n   continued'],
    ])('%s', (raw, expected) => {
        expect(withoutListMarker(raw)).toBe(expected);
    });
});
