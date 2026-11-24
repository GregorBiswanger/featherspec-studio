import { readFileSync } from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { fixturePath } from '../discovery/testing/fixtures';
import { fencedLines, locateLeadingIds } from './leadingIds';
import { parseSpec } from './parseSpec';
import { normalizeText } from './text';

const KEY = '.specs/active/0001-sample.md';

function locate(text: string) {
    const lines = text.split('\n');
    return locateLeadingIds(lines, fencedLines(lines), KEY);
}

function fixtureSpec(fixture: string, relative: string): string {
    return normalizeText(readFileSync(path.join(fixturePath(fixture), relative), 'utf-8'));
}

describe('criteria renderings (format section 3.4)', () => {
    it('AC-004: bold ID paragraph with a Given/When/Then blockquote as illustration', () => {
        const text = [
            '## 10. Acceptance criteria',
            '',
            '**AC-001** The system shall answer a valid request.',
            'It continues here.',
            '',
            '> **Given** a bill',
            '> **Then** four amounts',
            '',
            '**AC-002** The system shall sum.',
            '',
        ].join('\n');
        const { criteria } = locate(text);
        expect(criteria).toEqual([
            {
                id: 'AC-001',
                text: '**AC-001** The system shall answer a valid request.\nIt continues here.',
                illustration: '> **Given** a bill\n> **Then** four amounts',
                line: 3,
                uncertain: false,
                struck: false,
            },
            { id: 'AC-002', text: '**AC-002** The system shall sum.', illustration: undefined, line: 9, uncertain: false, struck: false },
        ]);
    });

    it('AC-004: bullet with the colon inside the bold ID keeps continuation lines', () => {
        const { criteria } = locate('- **AC-001:** Der Service muss\n  etwas tun.\n- **AC-002:** Zweites.\n');
        expect(criteria.map((c) => [c.id, c.text, c.line])).toEqual([
            ['AC-001', '- **AC-001:** Der Service muss\n  etwas tun.', 1],
            ['AC-002', '- **AC-002:** Zweites.', 3],
        ]);
    });

    it('AC-004: annotation between ID and colon stays in the item text', () => {
        const { criteria } = locate('- **AC-009 (nicht verbindliches Ziel):** Der Service soll antworten.\n');
        expect(criteria).toHaveLength(1);
        expect(criteria[0].id).toBe('AC-009');
        expect(criteria[0].text).toBe('- **AC-009 (nicht verbindliches Ziel):** Der Service soll antworten.');
    });

    it('AC-004: bold title line followed by the shall sentence in the same paragraph', () => {
        const { criteria } = locate(
            '**AC-001 — The retry budget is bounded**\nWhen five attempts have failed, the workflow shall stop.\n\n**AC-002 — Next**\nIf x, then y shall z.\n',
        );
        expect(criteria.map((c) => [c.id, c.text])).toEqual([
            ['AC-001', '**AC-001 — The retry budget is bounded**\nWhen five attempts have failed, the workflow shall stop.'],
            ['AC-002', '**AC-002 — Next**\nIf x, then y shall z.'],
        ]);
    });

    it('AC-004: plain bullet without emphasis', () => {
        const { criteria } = locate('- AC-001 Wenn ein Teilnehmer absendet, shall das System bleiben.\n');
        expect(criteria.map((c) => c.id)).toEqual(['AC-001']);
    });

    it('AC-004: numbered list item', () => {
        const { criteria } = locate('1. AC-004 The system shall do it.\n');
        expect(criteria.map((c) => c.id)).toEqual(['AC-004']);
    });

    it('AC-004: criterion defined in an arbitrary section, whatever its heading', () => {
        const { criteria } = locate('## Anything at all\n\n- **AC-007** The system shall.\n\n## Offene Punkte\n\n- AC-008 The system shall.\n');
        expect(criteria.map((c) => c.id)).toEqual(['AC-007', 'AC-008']);
    });

    it('AC-004: nested list item is its own criterion and stays inside the outer text', () => {
        const { criteria } = locate('- Intro\n  - AC-001 inner shall.\n');
        expect(criteria.map((c) => [c.id, c.line])).toEqual([['AC-001', 2]]);
    });

    it('AC-004: blockquote indented under a list item is its illustration, not text', () => {
        const { criteria } = locate('- **AC-001:** The system shall.\n\n  > **Given** x\n  > **Then** y\n\n- **AC-002:** Next.\n');
        expect(criteria[0].text).toBe('- **AC-001:** The system shall.');
        expect(criteria[0].illustration).toBe('> **Given** x\n> **Then** y');
        expect(criteria[1].illustration).toBeUndefined();
    });

    it('AC-004: blockquote right under the item, without a blank line, is the illustration', () => {
        const { criteria } = locate('**AC-001** The system shall.\n> **Given** x\n');
        expect(criteria[0].text).toBe('**AC-001** The system shall.');
        expect(criteria[0].illustration).toBe('> **Given** x');
    });

    it('AC-004: blockquote not directly following is no illustration', () => {
        const { criteria } = locate('**AC-001** The system shall.\n\nOther prose.\n\n> A quote.\n');
        expect(criteria[0].illustration).toBeUndefined();
    });
});

describe('references are not criteria', () => {
    it('AC-004: IDs in Covers lines, table cells, running prose and list items not leading are ignored', () => {
        const text = [
            '- **Covers:** AC-001, AC-002',
            '| ID | Criteria |',
            '| --- | --- |',
            '| A-001 | AC-003 |',
            '| AC-004 | table cell |',
            'Some prose with AC-005 in it.',
            '- Prose with (AC-006) in a bullet.',
            'AC-007 plain paragraph start.',
            '**Note:** AC-008 later.',
            '1. Der Teilnehmer wählt (AC-009).',
        ].join('\n');
        expect(locate(text).criteria).toEqual([]);
    });

    it('AC-004: IDs inside a code fence are ignored', () => {
        const text = '```\n- **AC-001** The system shall.\n```\n\n~~~md\n**AC-002** shall\n~~~\n';
        expect(locate(text).criteria).toEqual([]);
    });

    it('AC-004: a bold line continuing a paragraph is not a paragraph start', () => {
        expect(locate('Some text\n**AC-001** The system shall.\n').criteria).toEqual([]);
    });

    it('AC-004: ID with extra digits or suffix is not read as a shorter ID', () => {
        expect(locate('- AC-001a text\n- AC-001-x text\n').criteria).toEqual([]);
    });
});

describe('uncertain and struck flags', () => {
    it('AC-005: [Uncertain] before the ID flags the criterion, wherever it stands', () => {
        const { criteria } = locate('## 3. Acceptance criteria\n\n- [Uncertain] AC-002 Wenn x, shall y.\n- **[Uncertain] AC-003** shall.\n- AC-004 shall.\n');
        expect(criteria.map((c) => [c.id, c.uncertain])).toEqual([
            ['AC-002', true],
            ['AC-003', true],
            ['AC-004', false],
        ]);
    });

    it('AC-005: the flag is not derived from the section, and an AC in Open points is plain', () => {
        const { criteria } = locate('## Offene Punkte\n\n- AC-001 shall.\n\n## Acceptance criteria\n\n- [Uncertain] AC-002 shall.\n');
        expect(criteria.map((c) => [c.id, c.uncertain])).toEqual([
            ['AC-001', false],
            ['AC-002', true],
        ]);
    });

    it('AC-005: [Uncertain] later in the text does not flag', () => {
        expect(locate('- AC-001 shall do x. [Uncertain]\n').criteria[0].uncertain).toBe(false);
    });

    it('AC-004: struck marks before the ID flag the criterion as struck (shape UNVERIFIED)', () => {
        const { criteria } = locate('- ~~**AC-001** The system shall.~~\n- **~~AC-002~~** shall.\n\n~~**AC-003** shall~~\n- AC-004 ~~shall~~\n');
        expect(criteria.map((c) => [c.id, c.struck])).toEqual([
            ['AC-001', true],
            ['AC-002', true],
            ['AC-003', true],
            ['AC-004', false],
        ]);
    });

    it('AC-004: emphasis variants before the ID are skipped', () => {
        const { criteria } = locate('- *AC-001* shall.\n- _AC-002_ shall.\n- ***AC-003*** shall.\n\n__AC-004__ shall.\n');
        expect(criteria.map((c) => c.id)).toEqual(['AC-001', 'AC-002', 'AC-003', 'AC-004']);
    });
});

describe('FR requirements', () => {
    it('AC-003: FR IDs with dotted parts in a list item or bold paragraph', () => {
        const { requirements } = locate('- **FR-002.5** Extract steps\n  and criteria.\n\n**FR-01** The service shall.\n');
        expect(requirements).toEqual([
            { id: 'FR-002.5', text: '- **FR-002.5** Extract steps\n  and criteria.', line: 1 },
            { id: 'FR-01', text: '**FR-01** The service shall.', line: 4 },
        ]);
    });

    it('AC-003: FR ID as the first table cell, row kept raw', () => {
        const text = '| ID | Requirement | Criteria |\n| --- | --- | --- |\n| FR-01 | The service shall accept. | AC-001 |\n| **FR-02** | Calculate. | AC-003 |\n';
        expect(locate(text).requirements).toEqual([
            { id: 'FR-01', text: '| FR-01 | The service shall accept. | AC-001 |', line: 3 },
            { id: 'FR-02', text: '| **FR-02** | Calculate. | AC-003 |', line: 4 },
        ]);
        expect(locate(text).criteria).toEqual([]);
    });

    it('AC-003: FR mentioned elsewhere is ignored', () => {
        const text = '| ID | Req |\n| A-001 | see FR-01 |\nSee FR-02 for details.\n- Covers FR-03.\n';
        expect(locate(text).requirements).toEqual([]);
    });
});

describe('duplicates', () => {
    it('AC-015: an AC defined twice keeps both and flags each with the other line', () => {
        const { criteria, diagnostics } = locate('- AC-001 shall a.\n- AC-002 shall b.\n- AC-001 shall c.\n');
        expect(criteria.map((c) => [c.id, c.line])).toEqual([
            ['AC-001', 1],
            ['AC-002', 2],
            ['AC-001', 3],
        ]);
        expect(diagnostics).toEqual([
            { kind: 'duplicate', tier: 'note', scope: { file: KEY, line: 1 }, reason: 'AC-001 is defined more than once in this spec; other definitions at line 3' },
            { kind: 'duplicate', tier: 'note', scope: { file: KEY, line: 3 }, reason: 'AC-001 is defined more than once in this spec; other definitions at line 1' },
        ]);
    });

    it('AC-015: distinct IDs raise no diagnostic', () => {
        expect(locate('- AC-001 a\n- AC-002 b\n').diagnostics).toEqual([]);
    });
});

describe('through parseSpec and the fixtures', () => {
    it('AC-004: parseSpec exposes criteria, requirements and duplicate diagnostics', () => {
        const spec = parseSpec('# T\n\n**Status:** Draft\n\n## A\n\n- AC-001 shall.\n- AC-001 shall again.\n\n| FR-01 | x |\n', KEY);
        expect(spec.criteria.map((c) => c.id)).toEqual(['AC-001', 'AC-001']);
        expect(spec.requirements.map((r) => r.id)).toEqual(['FR-01']);
        expect(spec.diagnostics.filter((d) => d.kind === 'duplicate')).toHaveLength(2);
    });

    it('AC-004: TS110 bullets with bold colon IDs, AC-009 annotated, references in prose ignored', () => {
        const spec = parseSpec(fixtureSpec('fs110-de-active-review', '.specs/active/0001-tip-splitter.md'), KEY);
        expect(spec.criteria.map((c) => c.id)).toEqual(Array.from({ length: 14 }, (_, i) => `AC-${String(i + 1).padStart(3, '0')}`));
        expect(spec.criteria[8].text.startsWith('- **AC-009 (nicht verbindliches Ziel):**')).toBe(true);
        expect(spec.criteria.every((c) => !c.uncertain)).toBe(true);
    });

    it('AC-004: TS180 bold paragraphs, illustrations, FR table rows', () => {
        const spec = parseSpec(fixtureSpec('fs180-en-done-archived', '.specs/done/0001-split-bill-with-tip.md'), KEY);
        expect(spec.criteria.length).toBeGreaterThanOrEqual(14);
        expect(spec.criteria[0].id).toBe('AC-001');
        expect(spec.criteria[0].illustration).toContain('**Given** a bill of `60.00`');
        expect(spec.requirements.map((r) => r.id)).toEqual(Array.from({ length: 8 }, (_, i) => `FR-0${i + 1}`));
        expect(spec.diagnostics.filter((d) => d.kind === 'duplicate')).toEqual([]);
    });

    it('AC-004: LS170 title-line criteria', () => {
        const spec = parseSpec(fixtureSpec('fs170-brownfield-mixed', '.specs/done/0002-payment-retry.md'), KEY);
        expect(spec.criteria.map((c) => c.id)).toEqual(['AC-001', 'AC-002']);
        expect(spec.criteria[1].text).toContain('shall not retry');
    });

    it('AC-005: HU180 plain bullets in the criteria list and uncertain ones in Open points', () => {
        const spec = parseSpec(fixtureSpec('fs180-de-baselines', '.specs/done/0001-einer-handsup-session-beitreten.md'), KEY);
        expect(spec.criteria.map((c) => [c.id, c.uncertain])).toEqual([
            ['AC-001', false],
            ['AC-003', false],
            ['AC-002', true],
            ['AC-004', true],
            ['AC-005', true],
        ]);
    });

    it('AC-004: numbered steps citing an AC in HU180 are references', () => {
        const spec = parseSpec(fixtureSpec('fs180-de-baselines', '.specs/done/0001-einer-handsup-session-beitreten.md'), KEY);
        expect(spec.criteria.some((c) => c.text.startsWith('1. Der Teilnehmer'))).toBe(false);
    });
});

describe('AC-024: criteria defined by headings', () => {
    const HEADING_SPEC = [
        '# T',
        '',
        '### AC-001 — Gültige Rechnung aufteilen',
        '',
        'Text eins.',
        '',
        'Absatz zwei.',
        '',
        '> **Given** x',
        '',
        '#### Detail',
        '',
        'Unterpunkt.',
        '',
        '### AC-002: Geldbeträge runden',
        'Text.',
        '### ~~AC-003 | Alt~~',
        '### [Uncertain] AC-004',
        '',
        '### AC-005 – Ende',
        '',
        '## Klärungsprotokoll',
        '',
        '1. AC-002 ohne Beispiel → ergänzt.',
        '2) AC-001/AC-003 wörtlich → wörtlich.',
        '',
    ].join('\n');

    it('AC-024: recognises #-headings with every separator, with or without a title, with the markers', () => {
        const { criteria } = locate(HEADING_SPEC);
        expect(criteria.map((c) => [c.id, c.line, c.uncertain, c.struck])).toEqual([
            ['AC-001', 3, false, false],
            ['AC-002', 15, false, false],
            ['AC-003', 17, false, true],
            ['AC-004', 18, true, false],
            ['AC-005', 20, false, false],
        ]);
    });

    it('AC-024: the block is the heading line and its body up to the next heading of the same or a higher level', () => {
        const { criteria } = locate(HEADING_SPEC);
        expect(criteria[0].text).toBe('### AC-001 — Gültige Rechnung aufteilen\n\nText eins.\n\nAbsatz zwei.\n\n> **Given** x\n\n#### Detail\n\nUnterpunkt.');
        expect(criteria[1].text).toBe('### AC-002: Geldbeträge runden\nText.');
        expect(criteria[3].text).toBe('### [Uncertain] AC-004');
        expect(criteria[4].text).toBe('### AC-005 – Ende');
    });

    it('AC-024: a higher-level heading definition contains its sub-headings, a deeper one ends at the next sibling', () => {
        const { criteria } = locate('## AC-001 — A\n\n### Unter\n\nx\n\n#### AC-002 — B\n\ny\n\n### Nächste\n');
        expect(criteria.map((c) => [c.id, c.text.split('\n').length])).toEqual([['AC-001', 11], ['AC-002', 3]]);
    });

    it('AC-024: a heading without an ID separator, an ID inside a fence and a non-AC heading are no definition', () => {
        const { criteria } = locate('### AC-001abc x\n\n### AC-0011 y\n\n```\n### AC-002 — x\n```\n\n### Titel AC-003\n\n### AC-004.1 z\n');
        expect(criteria).toEqual([]);
    });

    it('AC-024: later numbered mentions of a heading-defined ID are neither a definition nor a duplicate', () => {
        const { criteria, diagnostics } = locate(HEADING_SPEC);
        expect(criteria.filter((c) => c.text.startsWith('1.') || c.text.startsWith('2)'))).toEqual([]);
        expect(criteria.map((c) => c.id)).toEqual(['AC-001', 'AC-002', 'AC-003', 'AC-004', 'AC-005']);
        expect(diagnostics).toEqual([]);
    });

    it('AC-024: a bold or bulleted definition also keeps a later numbered mention out', () => {
        const bold = locate('**AC-001** Text.\n\n1. AC-001 geklärt.\n');
        expect(bold.criteria.map((c) => c.line)).toEqual([1]);
        expect(bold.diagnostics).toEqual([]);
        const bullet = locate('- AC-001 Text.\n\n1. AC-001 geklärt.\n');
        expect(bullet.criteria.map((c) => c.line)).toEqual([1]);
        expect(bullet.diagnostics).toEqual([]);
    });

    it('AC-024: a second heading or bullet definition of the same ID is still a duplicate', () => {
        const { criteria, diagnostics } = locate('### AC-001 — A\n\n### AC-001 — B\n\n- AC-001 C\n');
        expect(criteria).toHaveLength(3);
        expect(diagnostics.filter((d) => d.kind === 'duplicate')).toHaveLength(3);
    });

    it('AC-024: without any non-numbered definition, numbered AC items stay definitions (unchanged)', () => {
        const { criteria, diagnostics } = locate('## Kriterien\n\n1. AC-001 Erstes.\n2. AC-002 Zweites.\n\n3. AC-001 nochmal.\n');
        expect(criteria.map((c) => [c.id, c.line])).toEqual([['AC-001', 3], ['AC-002', 4], ['AC-001', 6]]);
        expect(diagnostics.filter((d) => d.kind === 'duplicate')).toHaveLength(2);
    });

    it('AC-024: a numbered mention before the heading definition stays a definition (only later ones are mentions)', () => {
        const { criteria } = locate('1. AC-001 früh.\n\n### AC-001 — Titel\n');
        expect(criteria.map((c) => c.line)).toEqual([1, 3]);
    });

    it('AC-024: the fixture mirrors Gregor\'s hands-on: six heading criteria, three protocol mentions, no diagnostics', () => {
        const spec = parseSpec(fixtureSpec('studio-heading-acs', '.specs/active/0001-trinkgeld-aufteilen.md'), KEY);
        expect(spec.criteria.map((c) => [c.id, c.line])).toEqual([['AC-001', 8], ['AC-002', 14], ['AC-003', 20], ['AC-004', 28], ['AC-005', 32], ['AC-006', 36]]);
        expect(spec.criteria[0].illustration).toBeUndefined();
        expect(spec.diagnostics.filter((d) => d.kind === 'duplicate')).toEqual([]);
    });
});
