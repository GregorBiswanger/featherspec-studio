import { describe, expect, it } from 'vitest';
import { cutAt, plainShort, shortTitle } from './shortTitle';

describe('0019 AC-013: the short title of a criterion', () => {
    it.each([
        ['the bold title with an em dash', '**AC-001 — Batch size and interval are configurable**', 'AC-001', 'Batch size and interval are configurable'],
        ['the bold title with a hyphen', '- **AC-001 - Batch size**', 'AC-001', 'Batch size'],
        ['the bold title with a colon', '**AC-001: Batch size**', 'AC-001', 'Batch size'],
        ['the bold title with a pipe', '**AC-001 | Batch size**', 'AC-001', 'Batch size'],
        ['the bold title of underscores', '__AC-001 — Batch size__', 'AC-001', 'Batch size'],
        ['the bold title after the uncertain flag', '**[Uncertain] AC-001 — Batch size**', 'AC-001', 'Batch size'],
        ['the first sentence after a bold ID and a separator', '**AC-002** — Dispatch is unchanged. More text', 'AC-002', 'Dispatch is unchanged.'],
        ['the first sentence after a bold ID with the colon inside the bold', '**AC-006:** The board shall open. Then more.', 'AC-006', 'The board shall open.'],
        ['a list item and an exclamation mark', '1. AC-005 The board shall move! Next.', 'AC-005', 'The board shall move!'],
        ['a question mark', '**AC-005** Does it move? Yes.', 'AC-005', 'Does it move?'],
        ['a sentence that runs over a line break', '**AC-001** The board shall\nshow every card. More.', 'AC-001', 'The board shall show every card.'],
        ['a text without a sentence end', '**AC-001** The board shall show every card', 'AC-001', 'The board shall show every card'],
        ['a period inside a word is no sentence end', '**AC-001** Version 1.10.0 shall load. More.', 'AC-001', 'Version 1.10.0 shall load.'],
        ['code markers removed, the intraword underscore kept', '**AC-003** The `OUTBOX_BATCH_SIZE` shall be read. More.', 'AC-003', 'The OUTBOX_BATCH_SIZE shall be read.'],
        ['emphasis removed around the sentence', '**AC-003** _The board_ shall **show** *cards* and ~~nothing~~ else.', 'AC-003', 'The board shall show cards and nothing else.'],
        ['the text of a link', '**AC-003** See [the spec](0001-a.md) for more.', 'AC-003', 'See the spec for more.'],
        ['the struck ID', '**~~AC-003~~** Struck criterion.', 'AC-003', 'Struck criterion.'],
        ['an ID without a text', '**AC-004**', 'AC-004', ''],
    ])('%s', (_name, text, id, expected) => {
        expect(shortTitle(text, id)).toBe(expected);
    });

    it('no short title keeps a * or an emphasis _ (intraword _ stays)', () => {
        const title = shortTitle('**AC-001** _first_ and __second__ and *third* and snake_case_name here.', 'AC-001');
        expect(title).toBe('first and second and third and snake_case_name here.');
        expect(title).not.toMatch(/\*/);
        expect(title).not.toMatch(/(?<![A-Za-z0-9])_|_(?![A-Za-z0-9])/);
    });

    it('control: a text that is not emphasis keeps what it says', () => {
        expect(shortTitle('**AC-001** Plain words only.', 'AC-001')).toBe('Plain words only.');
    });

    it('a title of exactly 80 characters is kept, one of 81 is cut at the last space within the first 80 and ends with an ellipsis', () => {
        const eighty = `${'a'.repeat(39)} ${'b'.repeat(40)}`;
        expect(eighty).toHaveLength(80);
        expect(shortTitle(`**AC-001** ${eighty}`, 'AC-001')).toBe(eighty);
        const eightyOne = `${eighty}c`;
        expect(shortTitle(`**AC-001** ${eightyOne}`, 'AC-001')).toBe(`${'a'.repeat(39)}…`);
        const words = 'word '.repeat(20).trim();
        expect(words).toHaveLength(99);
        expect(shortTitle(`**AC-001** ${words}`, 'AC-001')).toBe(`${'word '.repeat(16).trim()}…`);
    });

    it('a title without a space in the first 80 characters is cut after 79 characters', () => {
        const long = 'x'.repeat(100);
        const cut = shortTitle(`**AC-001** ${long}`, 'AC-001');
        expect(cut).toBe(`${'x'.repeat(79)}…`);
        expect(cut).toHaveLength(80);
    });

    it('control: the cut applies to the bold title too', () => {
        expect(shortTitle(`**AC-001 — ${'y'.repeat(90)}**`, 'AC-001')).toBe(`${'y'.repeat(79)}…`);
    });
});

describe('0019 AC-011: a next open step title is plain and cut like a short title', () => {
    it('removes markers and cuts', () => {
        expect(plainShort('The `feature` with **emphasis**')).toBe('The feature with emphasis');
        expect(plainShort('z'.repeat(85))).toBe(`${'z'.repeat(79)}…`);
    });
});

describe('0020 AC-004: cutAt, the shared cut with its limit as a parameter', () => {
    it.each([
        ['text up to the limit is not cut', 'a'.repeat(24), 24, 'a'.repeat(24)],
        ['text of 25 characters is cut at its last space within the first 24', 'Focus the Studio on Visibility', 24, 'Focus the Studio on…'],
        ['no space in the first 24 characters: after 23 characters', 'x'.repeat(30), 24, `${'x'.repeat(23)}…`],
        ['a space only at the start does not count', ` ${'y'.repeat(30)}`, 24, ` ${'y'.repeat(22)}…`.trimEnd()],
        ['the limit is a parameter', 'one two three', 8, 'one two…'],
    ])('%s', (_name, text, max, expected) => {
        expect(cutAt(text, max)).toBe(expected);
    });

    it('the 80-character cut of the picture is unchanged', () => {
        expect(plainShort(`${'word '.repeat(30)}`)).toBe(`${'word '.repeat(16).trimEnd()}…`);
    });
});
