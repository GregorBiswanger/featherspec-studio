import { readdirSync, readFileSync } from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { fixturePath } from '../discovery/testing/fixtures';
import { parseSpec } from './parseSpec';
import { normalizeText } from './text';

const KEY = '.specs/active/0001-sample.md';

function fixtureSpec(fixture: string, relative: string): string {
    return normalizeText(readFileSync(path.join(fixturePath(fixture), relative), 'utf-8'));
}

function parse(text: string) {
    return parseSpec(text, KEY);
}

describe('parseSpec title and header lines', () => {
    it('AC-003: reads title and the two header lines of a plain spec', () => {
        const spec = parse('# My title\n\n**Status:** Draft\n**Plan:** _none yet_\n\n## 1. Summary\n\nText\n');
        expect(spec.title).toEqual({ value: { state: 'value', raw: 'My title' }, line: 1 });
        expect(spec.status).toEqual({ value: { state: 'value', raw: 'Draft' }, line: 3 });
        expect(spec.plan).toEqual({ value: { state: 'placeholder', raw: '_none yet_' }, line: 4 });
        expect(spec.diagnostics).toEqual([]);
    });

    it('AC-003: reads all six known header lines of a baseline with values as written', () => {
        const spec = parse(
            [
                '# Baseline',
                '',
                '**Status:** Baseline',
                '**Plan:** _none_',
                '**Ticket:** #42',
                '**Origin:** Reverse — Brownfield',
                '**Validated by:** Gregor Biswanger · 2026-09-24',
                '**Clarified:** 2026-10-01',
                '',
                '## Summary',
            ].join('\n'),
        );
        expect(spec.ticket.value).toEqual({ state: 'value', raw: '#42' });
        expect(spec.origin.value).toEqual({ state: 'value', raw: 'Reverse — Brownfield' });
        expect(spec.validatedBy.value).toEqual({ state: 'value', raw: 'Gregor Biswanger · 2026-09-24' });
        expect(spec.clarified).toEqual({ value: { state: 'value', raw: '2026-10-01' }, line: 8 });
        expect(spec.unsupportedHeaderLines).toEqual([]);
        expect(spec.diagnostics).toEqual([]);
    });

    it('AC-019: absent fields stay absent without a default', () => {
        const spec = parse('## Only a section\n\ntext\n');
        expect(spec.title).toEqual({ value: { state: 'absent' } });
        expect(spec.status).toEqual({ value: { state: 'absent' } });
        expect(spec.plan).toEqual({ value: { state: 'absent' } });
        expect(spec.planClassification).toEqual({ kind: 'absent' });
        expect(spec.ticket.value).toEqual({ state: 'absent' });
        expect(spec.origin.value).toEqual({ state: 'absent' });
        expect(spec.validatedBy.value).toEqual({ state: 'absent' });
        expect(spec.clarified.value).toEqual({ state: 'absent' });
        expect(spec.diagnostics).toEqual([]);
    });

    it('AC-019: a header line without a value is empty, not absent', () => {
        const spec = parse('# T\n\n**Status:**\n**Plan:**   \n**Ticket:** \n');
        expect(spec.status.value).toEqual({ state: 'empty', raw: '' });
        expect(spec.plan.value).toEqual({ state: 'empty', raw: '' });
        expect(spec.planClassification).toEqual({ kind: 'empty' });
        expect(spec.ticket.value).toEqual({ state: 'empty', raw: '' });
    });

    it('AC-019: an empty H1 is empty', () => {
        expect(parse('# \n\n**Status:** Draft\n').title.value).toEqual({ state: 'empty', raw: '' });
    });

    it('AC-019: the three placeholders are reported as placeholder', () => {
        for (const raw of ['_none yet_', '_none_', '—']) {
            const spec = parse(`# T\n\n**Status:** Draft\n**Plan:** ${raw}\n**Ticket:** ${raw}\n`);
            expect(spec.plan.value).toEqual({ state: 'placeholder', raw });
            expect(spec.ticket.value).toEqual({ state: 'placeholder', raw });
            expect(spec.planClassification).toEqual({ kind: 'placeholder', raw });
        }
    });

    it('AC-003: a spec with no H1 is still parsed and header lines at the top are read', () => {
        const spec = parse('**Status:** Draft\n**Plan:** _none yet_\n\n## 1. A\n\nx\n');
        expect(spec.title.value).toEqual({ state: 'absent' });
        expect(spec.status.value).toEqual({ state: 'value', raw: 'Draft' });
        expect(spec.sections).toEqual([{ heading: '1. A', raw: 'x', line: 4 }]);
    });

    it('AC-014: other bold header lines are unsupported content with a diagnostic', () => {
        const spec = parse('# T\n\n**Status:** Draft\n**Owner:** Gregor\n**Plan:** _none yet_\n');
        expect(spec.unsupportedHeaderLines).toEqual([{ label: 'Owner', raw: '**Owner:** Gregor', line: 4 }]);
        expect(spec.plan.value).toEqual({ state: 'placeholder', raw: '_none yet_' });
        expect(spec.diagnostics).toEqual([
            { kind: 'unknown-content', tier: 'note', scope: { file: KEY, line: 4 }, reason: 'unknown header line "Owner"' },
        ]);
    });

    it('AC-002: a Successor header line is a known header line, read as a field, with no diagnostic', () => {
        const spec = parse('# T\n\n**Status:** Deprecated\n**Successor:** [b](../backlog/0002-b.md)\n');
        expect(spec.successor).toEqual({ value: { state: 'value', raw: '[b](../backlog/0002-b.md)' }, line: 4 });
        expect(spec.unsupportedHeaderLines).toEqual([]);
        expect(spec.diagnostics).toEqual([]);
    });

    it('AC-002: a spec without a Successor line has an absent successor field (negative control)', () => {
        expect(parse('# T\n\n**Status:** Draft\n').successor).toEqual({ value: { state: 'absent' } });
    });

    it('AC-002: a second Successor line is a repeated-header format note and keeps the first', () => {
        const spec = parse('# T\n\n**Status:** Deprecated\n**Successor:** [b](b.md)\n**Successor:** [c](c.md)\n');
        expect(spec.successor.value).toEqual({ state: 'value', raw: '[b](b.md)' });
        expect(spec.diagnostics).toEqual([
            { kind: 'unknown-content', tier: 'note', scope: { file: KEY, line: 5 }, reason: 'repeated header line "Successor"' },
        ]);
    });

    it('AC-014: a repeated known header line keeps the first and flags the repeat', () => {
        const spec = parse('# T\n\n**Status:** Draft\n**Status:** Implemented\n');
        expect(spec.status.value).toEqual({ state: 'value', raw: 'Draft' });
        expect(spec.unsupportedHeaderLines).toEqual([
            { label: 'Status', raw: '**Status:** Implemented', line: 4 },
        ]);
        expect(spec.diagnostics).toHaveLength(1);
        expect(spec.diagnostics[0]).toMatchObject({ kind: 'unknown-content', scope: { file: KEY, line: 4 } });
    });

    it('AC-014: an unknown Status value is returned as written with a diagnostic', () => {
        const spec = parse('# T\n\n**Status:** Half done\n');
        expect(spec.status.value).toEqual({ state: 'value', raw: 'Half done' });
        expect(spec.diagnostics).toEqual([
            {
                kind: 'unknown-content',
                tier: 'problem',
                scope: { file: KEY, line: 3 },
                reason: 'unknown **Status:** value "Half done"',
            },
        ]);
    });

    it('AC-014: all five documented Status values raise no diagnostic', () => {
        for (const status of ['Draft', 'In Progress', 'Implemented', 'Deprecated', 'Baseline']) {
            expect(parse(`# T\n\n**Status:** ${status}\n`).diagnostics).toEqual([]);
        }
    });

    it('AC-014: Status matching is case-sensitive, a lower-case value is unknown', () => {
        expect(parse('# T\n\n**Status:** draft\n').diagnostics).toHaveLength(1);
    });

    it('header lines after the block (a bold paragraph later in the body) are not header lines', () => {
        const spec = parse('# T\n\n**Status:** Draft\n\n## 1. A\n\n**Note:** body text\n');
        expect(spec.unsupportedHeaderLines).toEqual([]);
        expect(spec.diagnostics).toEqual([]);
        expect(spec.sections).toEqual([{ heading: '1. A', raw: '**Note:** body text', line: 5 }]);
    });

    it('a bold line with the colon outside the bold does not start or extend the block', () => {
        const spec = parse('# T\n\n**Status**: Draft\n');
        expect(spec.status.value).toEqual({ state: 'absent' });
        expect(spec.sections).toEqual([{ heading: undefined, raw: '**Status**: Draft', line: 3 }]);
    });

    it('a header-like line inside the body after a pre-heading paragraph is not read as a header', () => {
        const spec = parse('# T\n\nIntro paragraph\n**Status:** Draft\n');
        expect(spec.status.value).toEqual({ state: 'absent' });
    });

    it('an H1 inside a fenced code block is not the title', () => {
        const spec = parse('```\n# comment\n```\n\n# Real\n');
        expect(spec.title.value).toEqual({ state: 'value', raw: 'Real' });
    });
});

describe('parseSpec Plan classification', () => {
    function classify(value: string) {
        return parse(`# T\n\n**Status:** Draft\n**Plan:** ${value}\n`).planClassification;
    }

    it('AC-003: a sibling link', () => {
        expect(classify('[0001-x.plan.md](0001-x.plan.md)')).toEqual({
            kind: 'sibling',
            target: '0001-x.plan.md',
            text: '0001-x.plan.md',
        });
        expect(classify('[p](./0001-x.plan.md)')).toMatchObject({ kind: 'sibling', target: './0001-x.plan.md' });
    });

    it('AC-003: an archive link', () => {
        expect(classify('[0001-x.2026-09-19.plan.md](../plan-archive/0001-x.2026-09-19.plan.md)')).toEqual({
            kind: 'archive',
            target: '../plan-archive/0001-x.2026-09-19.plan.md',
            text: '0001-x.2026-09-19.plan.md',
        });
        expect(classify('[p](plan-archive/0001-x.2026-09-19-2.plan.md)')).toMatchObject({ kind: 'archive' });
    });

    it('AC-003: anything else is other with the raw text', () => {
        expect(classify('see the plan')).toEqual({ kind: 'other', raw: 'see the plan' });
        expect(classify('[x](https://example.com/a.plan.md)')).toEqual({
            kind: 'other',
            raw: '[x](https://example.com/a.plan.md)',
        });
        expect(classify('[x](../other/0001-x.plan.md)')).toEqual({
            kind: 'other',
            raw: '[x](../other/0001-x.plan.md)',
        });
        expect(classify('[x](notes.md)')).toMatchObject({ kind: 'other' });
        expect(classify('_none_ yet')).toMatchObject({ kind: 'other' });
    });

    it('the raw Plan value stays beside the classification', () => {
        const spec = parse('# T\n\n**Status:** Draft\n**Plan:** [a](a.plan.md)\n');
        expect(spec.plan.value).toEqual({ state: 'value', raw: '[a](a.plan.md)' });
    });
});

describe('parseSpec sections and plan history', () => {
    it('AC-003: splits the body at level-2 headings in order, keeping raw content', () => {
        const spec = parse(
            '# T\n\n**Status:** Draft\n\nIntro line\n\n## 1. First\n\nA\n\n### Sub\n\nB\n\n## Second\n\nC\n',
        );
        expect(spec.sections).toEqual([
            { heading: undefined, raw: 'Intro line', line: 5 },
            { heading: '1. First', raw: 'A\n\n### Sub\n\nB', line: 7 },
            { heading: 'Second', raw: 'C', line: 15 },
        ]);
    });

    it('AC-003: no pre-heading section when nothing stands before the first heading', () => {
        const spec = parse('# T\n\n**Status:** Draft\n\n## A\n\nx\n');
        expect(spec.sections.map((section) => section.heading)).toEqual(['A']);
    });

    it('AC-003: a heading with no content is a section with empty raw', () => {
        expect(parse('# T\n\n## A\n## B\ntext\n').sections).toEqual([
            { heading: 'A', raw: '', line: 3 },
            { heading: 'B', raw: 'text', line: 4 },
        ]);
    });

    it('AC-003: a level-2 heading inside a fenced code block does not split', () => {
        const spec = parse('# T\n\n## A\n\n```md\n## not a heading\n```\n\n~~~\n## nor this\n~~~\n');
        expect(spec.sections).toHaveLength(1);
        expect(spec.sections[0].raw).toContain('## not a heading');
        expect(spec.sections[0].raw).toContain('## nor this');
    });

    it('AC-003: a level-1 or level-3 heading is no section boundary', () => {
        const spec = parse('# T\n\n## A\n\n### B\n\n#### C\n');
        expect(spec.sections).toHaveLength(1);
    });

    it('AC-003: translated and numbered headings are kept as written', () => {
        const spec = parse('# T\n\n## 6. Akzeptanzkriterien\n\nx\n\n## Zusammenfassung\n\ny\n');
        expect(spec.sections.map((section) => section.heading)).toEqual(['6. Akzeptanzkriterien', 'Zusammenfassung']);
    });

    it('AC-009: returns the Plan history lines of the fixed heading', () => {
        const spec = parse(
            [
                '# T',
                '',
                '**Status:** Implemented',
                '',
                '## Plan history',
                '',
                '- 2026-09-19 — [a](../plan-archive/a.2026-09-19.plan.md) — completed',
                '- 2026-10-01 — [b](../plan-archive/b.2026-10-01.plan.md) — abandoned',
                '',
                '## Next',
                '- not history',
            ].join('\n'),
        );
        expect(spec.planHistory).toEqual([
            { raw: '- 2026-09-19 — [a](../plan-archive/a.2026-09-19.plan.md) — completed', line: 7 },
            { raw: '- 2026-10-01 — [b](../plan-archive/b.2026-10-01.plan.md) — abandoned', line: 8 },
        ]);
    });

    it('AC-009: the Plan history heading is matched by its fixed text only', () => {
        expect(parse('# T\n\n## 9. Plan history\n\n- x\n').planHistory).toEqual([]);
        expect(parse('# T\n\n## Plan History\n\n- x\n').planHistory).toEqual([]);
        expect(parse('# T\n\n## Plan history\n\n- x\n').planHistory).toEqual([{ raw: '- x', line: 5 }]);
    });

    it('AC-009: the Plan history section stays among the sections as well', () => {
        const spec = parse('# T\n\n## Plan history\n\n- x\n');
        expect(spec.sections).toEqual([{ heading: 'Plan history', raw: '- x', line: 3 }]);
    });

    it('AC-009: spec checkboxes are never steps or verification', () => {
        const spec = parse('# T\n\n## Definition of Done\n\n- [x] tests green\n- [ ] docs updated\n');
        expect(spec.sections).toEqual([
            { heading: 'Definition of Done', raw: '- [x] tests green\n- [ ] docs updated', line: 3 },
        ]);
        expect(spec.planHistory).toEqual([]);
        expect(Object.keys(spec).sort()).toEqual(
            [
                'clarified',
                'criteria',
                'diagnostics',
                'origin',
                'plan',
                'planClassification',
                'planHistory',
                'requirements',
                'sections',
                'status',
                'successor',
                'ticket',
                'title',
                'unsupportedHeaderLines',
                'validatedBy',
            ].sort(),
        );
    });

    it('AC-014: the body is free text, so unknown headings raise no diagnostic', () => {
        expect(parse('# T\n\n## Whatever I like\n\ntext\n').diagnostics).toEqual([]);
    });

    it('an empty file yields an all-absent model without a diagnostic', () => {
        const spec = parse('');
        expect(spec.title.value).toEqual({ state: 'absent' });
        expect(spec.sections).toEqual([]);
        expect(spec.diagnostics).toEqual([]);
    });
});

describe('parseSpec on fixture texts', () => {
    it('AC-003: TS110 (German, In Progress, sibling plan)', () => {
        const spec = parse(fixtureSpec('fs110-de-active-review', '.specs/active/0001-tip-splitter.md'));
        expect(spec.title.value).toEqual({ state: 'value', raw: 'Restaurant-Rechnung mit Trinkgeld aufteilen' });
        expect(spec.status.value).toEqual({ state: 'value', raw: 'In Progress' });
        expect(spec.planClassification).toMatchObject({ kind: 'sibling', target: '0001-tip-splitter.plan.md' });
        expect(spec.sections[0].heading).toBe('1. Ziel und Nutzen');
        expect(spec.diagnostics).toEqual([]);
    });

    it('AC-003 AC-009: TS180 (done, archive link, Plan history)', () => {
        const spec = parse(fixtureSpec('fs180-en-done-archived', '.specs/done/0001-split-bill-with-tip.md'));
        expect(spec.status.value).toEqual({ state: 'value', raw: 'Implemented' });
        expect(spec.planClassification).toMatchObject({
            kind: 'archive',
            target: '../plan-archive/0001-split-bill-with-tip.2026-09-19.plan.md',
        });
        expect(spec.planHistory).toHaveLength(1);
        expect(spec.planHistory[0].raw).toContain('2026-09-19');
        expect(spec.diagnostics).toEqual([]);
    });

    it('AC-003: HU180 baselines carry Origin and Validated by and a placeholder plan', () => {
        const spec = parse(
            fixtureSpec('fs180-de-baselines', '.specs/done/0001-einer-handsup-session-beitreten.md'),
        );
        expect(spec.status.value).toEqual({ state: 'value', raw: 'Baseline' });
        expect(spec.plan.value).toEqual({ state: 'placeholder', raw: '_none_' });
        expect(spec.origin.value).toEqual({ state: 'value', raw: 'Reverse — Brownfield' });
        expect(spec.validatedBy.value).toEqual({ state: 'value', raw: 'Gregor Biswanger · 2026-09-24' });
        expect(spec.clarified.value).toEqual({ state: 'absent' });
        expect(spec.sections[0].heading).toBe('Zusammenfassung');
        expect(spec.diagnostics).toEqual([]);
    });

    it('AC-003 AC-019: LS170 baseline with _none yet_ is a placeholder without a diagnostic', () => {
        const spec = parse(fixtureSpec('fs170-brownfield-mixed', '.specs/done/0001-baseline-orders.md'));
        expect(spec.status.value).toEqual({ state: 'value', raw: 'Baseline' });
        expect(spec.plan.value).toEqual({ state: 'placeholder', raw: '_none yet_' });
        expect(spec.diagnostics).toEqual([]);
    });

    it('AC-003: every LS170 spec parses with title, status and plan and no diagnostic', () => {
        const folders = ['active', 'backlog', 'done'];
        let count = 0;
        for (const folder of folders) {
            const dir = path.join(fixturePath('fs170-brownfield-mixed'), '.specs', folder);
            for (const name of readdirSync(dir).filter((n) => /^\d{4}-.+(?<!\.plan)\.md$/.test(n))) {
                const spec = parse(fixtureSpec('fs170-brownfield-mixed', `.specs/${folder}/${name}`));
                expect(spec.title.value.state, name).toBe('value');
                expect(spec.status.value.state, name).toBe('value');
                expect(spec.plan.value.state, name).not.toBe('absent');
                expect(spec.diagnostics, name).toEqual([]);
                count += 1;
            }
        }
        expect(count).toBe(9);
    });

    it('AC-003: all four HU180 specs and every TS fixture spec parse without a diagnostic', () => {
        const dir = path.join(fixturePath('fs180-de-baselines'), '.specs', 'done');
        for (const name of readdirSync(dir).filter((n) => /^\d{4}-.+\.md$/.test(n))) {
            const spec = parse(fixtureSpec('fs180-de-baselines', `.specs/done/${name}`));
            expect(spec.diagnostics, name).toEqual([]);
            expect(spec.sections.length, name).toBeGreaterThan(0);
        }
    });
});
