import { promises as fs } from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { fixturePath } from '../discovery/testing/fixtures';
import { parsePlan } from './parsePlan';
import { normalizeText } from './text';

const FILE = '.specs/active/0001-x.plan.md';

async function fixtureText(...segments: string[]): Promise<string> {
    const bytes = await fs.readFile(path.join(fixturePath(segments[0]), ...segments.slice(1)), 'utf8');
    return normalizeText(bytes);
}

const TS110 = ['fs110-de-active-review', '.specs', 'active', '0001-tip-splitter.plan.md'];
const TS180 = ['fs180-en-done-archived', '.specs', 'plan-archive', '0001-split-bill-with-tip.2026-09-19.plan.md'];
const LS170 = ['fs170-brownfield-mixed', '.specs', 'active', '0006-outbox-batch-size.plan.md'];
const PARALLEL = ['fs110-parallel-synthetic', '.specs', 'active', '0001-parallel-demo.plan.md'];
const READY = ['fs110-ready-synthetic', '.specs', 'backlog', '0001-ready-feature.plan.md'];
const ARCHIVE_2 = ['fs110-ready-synthetic', '.specs', 'plan-archive', '0002-old-feature.2026-11-01-2.plan.md'];

function plan(...lines: string[]): string {
    return lines.join('\n');
}

const HEADER = ['# Plan — T', '', '**Spec:** [a](a.md)', '**Status:** In Progress', '**Last updated:** 2026-11-16', '**Current step:** T-001', ''];
const TABLE_HEAD = ['| Acceptance criterion | Steps | Code / files | Test | State |', '| --- | --- | --- | --- | --- |'];

describe('parsePlan header', () => {
    it('AC-007: returns title, Spec, Status, Last updated and Current step as written, with lines', async () => {
        const parsed = parsePlan(await fixtureText(...TS110), FILE);
        expect(parsed.title).toEqual({ value: { state: 'value', raw: 'Plan — Restaurant-Rechnung mit Trinkgeld aufteilen' }, line: 1 });
        expect(parsed.spec).toEqual({ value: { state: 'value', raw: '[0001-tip-splitter.md](0001-tip-splitter.md)' }, line: 3 });
        expect(parsed.status).toEqual({ value: { state: 'value', raw: 'Done' }, line: 4 });
        expect(parsed.lastUpdated).toEqual({ value: { state: 'value', raw: '2026-11-15' }, line: 5 });
        expect(parsed.currentStep.value).toEqual({
            state: 'value',
            raw: 'T-005 abgeschlossen; `/sdd-compile` READY; Lifecycle-Move nicht freigegeben',
        });
    });

    it('AC-007: every documented Status value is returned without a diagnostic', () => {
        for (const status of ['Not started', 'In Progress', 'Blocked', 'Done']) {
            const parsed = parsePlan(plan('# Plan', '', `**Status:** ${status}`, '', '## Approach'), FILE);
            expect(parsed.status.value).toEqual({ state: 'value', raw: status });
            expect(parsed.diagnostics).toEqual([]);
        }
    });

    it('AC-014: an unknown Status value is returned as written with a diagnostic at its line', () => {
        const parsed = parsePlan(plan('# Plan', '', '**Status:** Paused', '', '## Approach'), FILE);
        expect(parsed.status).toEqual({ value: { state: 'value', raw: 'Paused' }, line: 3 });
        expect(parsed.diagnostics).toHaveLength(1);
        expect(parsed.diagnostics[0]).toMatchObject({ kind: 'unknown-content', scope: { file: FILE, line: 3 } });
        expect(parsed.diagnostics[0].reason).toContain('Paused');
    });

    it('AC-014: Status is case-sensitive: "done" is unknown', () => {
        const parsed = parsePlan(plan('# Plan', '', '**Status:** done'), FILE);
        expect(parsed.diagnostics).toHaveLength(1);
    });

    it('AC-007: missing header lines are absent, an empty one is empty, and neither raises a diagnostic', () => {
        const parsed = parsePlan(plan('# Plan', '', '**Status:**', '', '## Approach'), FILE);
        expect(parsed.status.value).toEqual({ state: 'empty', raw: '' });
        expect(parsed.spec).toEqual({ value: { state: 'absent' } });
        expect(parsed.lastUpdated.value).toEqual({ state: 'absent' });
        expect(parsed.currentStep.value).toEqual({ state: 'absent' });
        expect(parsed.diagnostics).toEqual([]);
    });

    it('AC-007: empty text returns an all-absent plan without throwing', () => {
        const parsed = parsePlan('', FILE);
        expect(parsed.title.value).toEqual({ state: 'absent' });
        expect(parsed.steps).toEqual([]);
        expect(parsed.traceability).toEqual([]);
        expect(parsed.stages).toEqual({ present: false, stages: [], closing: undefined });
        expect(parsed.handoff.baseline.value).toEqual({ state: 'absent' });
        expect(parsed.unsupported).toEqual([]);
        expect(parsed.diagnostics).toEqual([]);
    });

    it('AC-014: an extra bold header line stays as unsupported content with its continuation lines and a diagnostic', async () => {
        const parsed = parsePlan(await fixtureText(...LS170), FILE);
        const header = parsed.unsupported.filter((item) => item.place === 'header');
        expect(header).toHaveLength(1);
        expect(header[0].label).toBe('Working mode for this run (user-granted one-off exception, 2026-09-19)');
        expect(header[0].line).toBe(8);
        expect(header[0].raw.startsWith('the user confirmed\n')).toBe(true);
        expect(header[0].raw.endsWith('One commit per completed step is pre-approved.')).toBe(true);
        expect(parsed.status.value).toEqual({ state: 'value', raw: 'Done' });
        expect(parsed.currentStep.value).toEqual({ state: 'value', raw: '— all four steps ticked and verified' });
        expect(parsed.diagnostics.filter((d) => typeof d.scope === 'object' && d.scope.line === 8)).toHaveLength(1);
    });

    it('AC-014: a repeated known header label keeps the first and returns the repeat as unsupported', () => {
        const parsed = parsePlan(plan('# Plan', '', '**Status:** Done', '**Status:** Blocked', '', '## Approach'), FILE);
        expect(parsed.status.value).toEqual({ state: 'value', raw: 'Done' });
        expect(parsed.unsupported).toEqual([{ place: 'header', label: 'Status', raw: 'Blocked', line: 4 }]);
        expect(parsed.diagnostics).toHaveLength(1);
    });

    it('AC-007: bold lines after the first section heading are not header lines', () => {
        const parsed = parsePlan(plan('# Plan', '', '## Approach', '', '**Status:** Paused', '**Quality gates:** `npm test`'), FILE);
        expect(parsed.status.value).toEqual({ state: 'absent' });
        expect(parsed.unsupported).toEqual([]);
        expect(parsed.diagnostics).toEqual([]);
    });
});

describe('parsePlan sections', () => {
    it('AC-014: an unknown level-2 section is unsupported with heading, raw text up to the next step heading, and a diagnostic', async () => {
        const parsed = parsePlan(await fixtureText(...LS170), FILE);
        const sections = parsed.unsupported.filter((item) => item.place === 'section');
        expect(sections).toHaveLength(1);
        expect(sections[0].label).toBe("Blocker — the repository's run command could not load its own source · RESOLVED 2026-09-19");
        expect(sections[0].line).toBe(88);
        expect(sections[0].raw).toContain('Found while running');
        expect(sections[0].raw).not.toContain('### T-002');
        expect(parsed.steps.map((step) => step.id)).toEqual(['T-001', 'T-002', 'T-003', 'T-004']);
        expect(parsed.diagnostics).toHaveLength(2);
    });

    it('AC-014: the six documented sections and a level-3 subsection raise nothing', async () => {
        for (const file of [TS110, TS180, PARALLEL, READY, ARCHIVE_2]) {
            const parsed = parsePlan(await fixtureText(...file), FILE);
            expect(parsed.unsupported).toEqual([]);
            expect(parsed.diagnostics).toEqual([]);
        }
    });

    it('AC-014: a heading inside a code fence is not a section', () => {
        const parsed = parsePlan(plan('# Plan', '', '## Approach', '', '```md', '## Not a section', '```', ''), FILE);
        expect(parsed.unsupported).toEqual([]);
    });

    it('AC-014: section headings match exactly and case-sensitively', () => {
        const parsed = parsePlan(plan('# Plan', '', '## approach', '', 'text', '', '## Session Handoff', '', 'text'), FILE);
        expect(parsed.unsupported.map((item) => item.label)).toEqual(['approach', 'Session Handoff']);
        expect(parsed.diagnostics).toHaveLength(2);
    });
});

describe('parsePlan stages', () => {
    it('AC-007: returns parallel and sequential stages with their step IDs, raw line and closing line', async () => {
        const parsed = parsePlan(await fixtureText(...PARALLEL), FILE);
        expect(parsed.stages.present).toBe(true);
        expect(parsed.stages.stages).toEqual([
            { number: 1, raw: '1. T-001 → T-002 — shared types, then the entry point', line: 20, stepIds: ['T-001', 'T-002'], kind: 'sequential' },
            { number: 2, raw: '2. T-003 ‖ T-004 — add and subtract: separate modules and tests', line: 21, stepIds: ['T-003', 'T-004'], kind: 'parallel' },
            { number: 3, raw: '3. T-005 — docs sync', line: 22, stepIds: ['T-005'], kind: 'single' },
        ]);
        expect(parsed.stages.closing).toEqual({ raw: 'Parallel: stage 2 (add vs. subtract: separate files).', line: 24, parallel: true });
    });

    it('AC-007: a "No parallel stage" closing line over two lines is kept whole and is not parallel', async () => {
        const parsed = parsePlan(await fixtureText(...TS110), FILE);
        expect(parsed.stages.stages.map((stage) => stage.kind)).toEqual(['single', 'sequential', 'single']);
        expect(parsed.stages.stages[1].stepIds).toEqual(['T-002', 'T-003', 'T-004']);
        expect(parsed.stages.closing?.parallel).toBe(false);
        expect(parsed.stages.closing?.raw.startsWith('No parallel stage: T-002')).toBe(true);
        expect(parsed.stages.closing?.raw).toContain('\nVertrag, und alle Schritte sind klein');
        expect(parsed.diagnostics).toEqual([]);
    });

    it('AC-007: a plan without ## Stages (before 1.10.0) has no stages and no diagnostic', async () => {
        for (const file of [TS180, LS170]) {
            const parsed = parsePlan(await fixtureText(...file), FILE);
            expect(parsed.stages).toEqual({ present: false, stages: [], closing: undefined });
        }
    });

    it('AC-007: step IDs come only from the part before the dash, so the deliverable text is not read as steps', () => {
        const parsed = parsePlan(plan('## Stages', '', '1. T-001 → T-002 — after T-009 is done', '2. T-003 - plain hyphen, see T-001', ''), FILE);
        expect(parsed.stages.stages.map((stage) => stage.stepIds)).toEqual([['T-001', 'T-002'], ['T-003']]);
    });

    it('AC-007: a line mixing → and ‖ is kind mixed', () => {
        const parsed = parsePlan(plan('## Stages', '', '1. T-001 → T-002 ‖ T-003 — mixed'), FILE);
        expect(parsed.stages.stages[0]).toMatchObject({ kind: 'mixed', stepIds: ['T-001', 'T-002', 'T-003'] });
    });

    it('AC-007: a stage line wrapped onto the next line stays one stage', () => {
        const parsed = parsePlan(plan('## Stages', '', '1. T-001 — a long deliverable that', '   continues here', '2. T-002 — next', ''), FILE);
        expect(parsed.stages.stages).toHaveLength(2);
        expect(parsed.stages.stages[0].raw).toBe('1. T-001 — a long deliverable that\n   continues here');
        expect(parsed.unsupported).toEqual([]);
    });

    it('AC-014: other text in the Stages section is unsupported with a diagnostic', () => {
        const parsed = parsePlan(plan('## Stages', '', '1. T-001 — a', '', 'Some free remark.', '', 'No parallel stage: small.'), FILE);
        expect(parsed.unsupported).toEqual([{ place: 'stages', label: '', raw: 'Some free remark.', line: 5 }]);
        expect(parsed.stages.closing).toMatchObject({ raw: 'No parallel stage: small.', parallel: false });
        expect(parsed.diagnostics).toHaveLength(1);
    });
});

describe('parsePlan traceability', () => {
    it('AC-007: returns every row with the five cells as written and the known states', async () => {
        const parsed = parsePlan(await fixtureText(...PARALLEL), FILE);
        expect(parsed.traceability).toEqual([
            {
                criterion: 'AC-001',
                steps: { state: 'value', raw: 'T-001, T-003' },
                code: { state: 'value', raw: '`src/add.ts`' },
                test: { state: 'value', raw: '`src/add.test.ts` — adds' },
                manual: false,
                state: 'built',
                stateKnown: true,
                line: 74,
            },
            {
                criterion: 'AC-002',
                steps: { state: 'value', raw: 'T-002, T-004' },
                code: { state: 'placeholder', raw: '—' },
                test: { state: 'placeholder', raw: '—' },
                manual: false,
                state: 'open',
                stateKnown: true,
                line: 75,
            },
            {
                criterion: 'AC-003',
                steps: { state: 'value', raw: 'T-005' },
                code: { state: 'value', raw: '`README.md`' },
                test: { state: 'value', raw: 'manual: read by the product owner, 2026-11-10' },
                manual: true,
                state: 'verified',
                stateKnown: true,
                line: 76,
            },
        ]);
        expect(parsed.diagnostics).toEqual([]);
    });

    it('AC-009: the manual: flag is set where the test cell holds a manual check, also after other text', async () => {
        const parsed = parsePlan(await fixtureText(...TS110), FILE);
        const manual = parsed.traceability.filter((row) => row.manual).map((row) => row.criterion);
        expect(manual).toEqual(['AC-010']);
        expect(parsed.traceability).toHaveLength(14);
        expect(parsed.traceability.find((row) => row.criterion === 'AC-009')?.state).toBe('open');
    });

    it('AC-009: an empty test cell is empty, not absent, and not manual', () => {
        const parsed = parsePlan(plan('## Traceability', '', ...TABLE_HEAD, '| AC-001 | T-001 | `a.ts` |  | built |'), FILE);
        expect(parsed.traceability[0].test).toEqual({ state: 'empty', raw: '' });
        expect(parsed.traceability[0].manual).toBe(false);
    });

    it('AC-014: a state outside open, built and verified is returned as written with a diagnostic at the row', () => {
        const parsed = parsePlan(plan('## Traceability', '', ...TABLE_HEAD, '| AC-001 | T-001 | a | b | done |', '| AC-002 | T-001 | a | b | Verified |'), FILE);
        expect(parsed.traceability.map((row) => [row.state, row.stateKnown])).toEqual([['done', false], ['Verified', false]]);
        expect(parsed.diagnostics).toHaveLength(2);
        expect(parsed.diagnostics[0]).toMatchObject({ kind: 'unknown-content', scope: { file: FILE, line: 5 } });
        expect(parsed.diagnostics[0].reason).toContain('done');
    });

    it('AC-014: a table whose columns differ from the format is unsupported content, no rows, with a diagnostic', () => {
        const other = plan('## Traceability', '', '| Criterion | Steps | Code | Test | State | Owner |', '| --- | --- | --- | --- | --- | --- |', '| AC-001 | T-001 | a | b | open | me |');
        const parsed = parsePlan(other, FILE);
        expect(parsed.traceability).toEqual([]);
        expect(parsed.unsupported).toHaveLength(1);
        expect(parsed.unsupported[0]).toMatchObject({ place: 'traceability', line: 3 });
        expect(parsed.unsupported[0].raw).toContain('| Owner |');
        expect(parsed.unsupported[0].raw).toContain('| AC-001 | T-001 | a | b | open | me |');
        expect(parsed.diagnostics).toHaveLength(1);
    });

    it('AC-014: renamed columns with the same count are unsupported too', () => {
        const parsed = parsePlan(plan('## Traceability', '', '| Kriterium | Schritte | Code | Test | Zustand |', '| --- | --- | --- | --- | --- |', '| AC-001 | T-001 | a | b | open |'), FILE);
        expect(parsed.traceability).toEqual([]);
        expect(parsed.unsupported).toHaveLength(1);
    });

    it('AC-014: a row with the wrong number of cells is unsupported, the other rows stay', () => {
        const parsed = parsePlan(plan('## Traceability', '', ...TABLE_HEAD, '| AC-001 | T-001 | a | b | open |', '| AC-002 | T-001 | a | open |', '| AC-003 | T-001 | a | b | built |'), FILE);
        expect(parsed.traceability.map((row) => row.criterion)).toEqual(['AC-001', 'AC-003']);
        expect(parsed.unsupported).toEqual([{ place: 'traceability', label: '', raw: '| AC-002 | T-001 | a | open |', line: 6 }]);
        expect(parsed.diagnostics).toHaveLength(1);
    });

    it('AC-007: an escaped pipe and a pipe inside a code span do not split a cell', () => {
        const parsed = parsePlan(plan('## Traceability', '', ...TABLE_HEAD, '| AC-001 | T-001 | `a|b.ts` | x \\| y | open |'), FILE);
        expect(parsed.traceability).toHaveLength(1);
        expect(parsed.traceability[0].code).toEqual({ state: 'value', raw: '`a|b.ts`' });
        expect(parsed.traceability[0].test).toEqual({ state: 'value', raw: 'x | y' });
    });

    it('AC-007: a table row inside a code fence is not a row', () => {
        const parsed = parsePlan(plan('## Traceability', '', '```', ...TABLE_HEAD, '| AC-001 | T-001 | a | b | open |', '```'), FILE);
        expect(parsed.traceability).toEqual([]);
        expect(parsed.diagnostics).toEqual([]);
    });

    it('AC-007: a traceability table outside the Traceability section is not read', () => {
        const parsed = parsePlan(plan('## Approach', '', ...TABLE_HEAD, '| AC-001 | T-001 | a | b | open |'), FILE);
        expect(parsed.traceability).toEqual([]);
        expect(parsed.diagnostics).toEqual([]);
    });
});

describe('parsePlan session handoff', () => {
    it('AC-007: returns the five handoff fields raw, with continuation lines and placeholders', async () => {
        const parsed = parsePlan(await fixtureText(...TS110), FILE);
        expect(parsed.handoff.doneSoFar.value.state).toBe('value');
        expect(parsed.handoff.doneSoFar.value).toMatchObject({ raw: expect.stringContaining('T-001 bis T-005 abgeschlossen; HTTP-Service,\nFehlerbehandlung') });
        expect(parsed.handoff.doneSoFar.line).toBe(239);
        expect(parsed.handoff.nextAction.value).toMatchObject({ state: 'value', raw: expect.stringContaining('Auf ausdrückliche Freigabe') });
        expect(parsed.handoff.openDecisions.value).toEqual({ state: 'placeholder', raw: '—' });
        expect(parsed.handoff.environment.value).toMatchObject({ raw: expect.stringContaining('Node v26.13.0') });
        expect(parsed.diagnostics).toEqual([]);
    });

    it('AC-019: the skeleton Baseline text `_(…)_` is a placeholder, raw kept (format §10 #14)', async () => {
        const parsed = parsePlan(await fixtureText(...READY), FILE);
        expect(parsed.handoff.baseline.value).toEqual({
            state: 'placeholder',
            raw: '_(commit hash before the first step commit; set when work starts)_',
        });
        expect(parsed.handoff.doneSoFar.value).toEqual({ state: 'placeholder', raw: '—' });
        expect(parsed.handoff.nextAction.value).toEqual({ state: 'value', raw: 'T-001' });
    });

    it('AC-014: an unknown handoff field is unsupported with a diagnostic, and a missing one is absent', () => {
        const parsed = parsePlan(plan('## Session handoff', '', '- **Done so far:** x', '- **Risks:** many', '  and more'), FILE);
        expect(parsed.handoff.doneSoFar.value).toEqual({ state: 'value', raw: 'x' });
        expect(parsed.handoff.baseline.value).toEqual({ state: 'absent' });
        expect(parsed.unsupported).toEqual([{ place: 'handoff', label: 'Risks', raw: 'many\nand more', line: 4 }]);
        expect(parsed.diagnostics).toHaveLength(1);
    });

    it('AC-014: text before the first handoff field is unsupported, a repeated field keeps the first', () => {
        const parsed = parsePlan(plan('## Session handoff', '', 'Loose text.', '', '- **Baseline:** abc', '- **Baseline:** def'), FILE);
        expect(parsed.handoff.baseline.value).toEqual({ state: 'value', raw: 'abc' });
        expect(parsed.unsupported.map((item) => [item.label, item.raw])).toEqual([['', 'Loose text.'], ['Baseline', 'def']]);
        expect(parsed.diagnostics).toHaveLength(2);
    });

    it('AC-007: handoff fields without the list dash are read too', () => {
        const parsed = parsePlan(plan('## Session handoff', '', '**Next action:** T-002'), FILE);
        expect(parsed.handoff.nextAction.value).toEqual({ state: 'value', raw: 'T-002' });
    });
});

describe('parsePlan steps and fixtures', () => {
    it('AC-007: returns the steps of both dialects and Files, Blocked and the Not started plan', async () => {
        const parallel = parsePlan(await fixtureText(...PARALLEL), FILE);
        expect(parallel.status.value).toEqual({ state: 'value', raw: 'Blocked' });
        expect(parallel.steps.map((step) => [step.id, step.ticked])).toEqual([['T-001', true], ['T-002', true], ['T-003', false], ['T-004', false], ['T-005', false]]);
        expect(parallel.steps[2].files).toEqual({ state: 'value', raw: '`src/add.ts`, `src/add.test.ts`' });
        const ready = parsePlan(await fixtureText(...READY), FILE);
        expect(ready.status.value).toEqual({ state: 'value', raw: 'Not started' });
        const archived = parsePlan(await fixtureText(...ARCHIVE_2), FILE);
        expect(archived.steps[0]).toMatchObject({ dialect: 'covers-line', ticked: true });
        expect(archived.spec.value).toEqual({ state: 'value', raw: '[0002-old-feature.md](../done/0002-old-feature.md)' });
    });

    it('AC-009: per step the ticked state and Verified text are carried through', async () => {
        const parsed = parsePlan(await fixtureText(...TS110), FILE);
        expect(parsed.steps).toHaveLength(5);
        expect(parsed.steps.every((step) => step.ticked === true && step.verified.state === 'value')).toBe(true);
    });

    it('AC-007: step diagnostics (no checkbox) appear in the plan diagnostics', () => {
        const parsed = parsePlan(plan('## Steps', '', '### T-001 — a', '', '- **Covers:** AC-001', '- **Notes:** —'), FILE);
        expect(parsed.steps[0].dialect).toBe('undetermined');
        expect(parsed.diagnostics).toHaveLength(1);
        expect(parsed.diagnostics[0].scope).toEqual({ file: FILE, line: 3 });
    });

    it('AC-014: the older plans (TS180, LS170) read without a table, stage or handoff diagnostic', async () => {
        const archived = parsePlan(await fixtureText(...TS180), FILE);
        expect(archived.diagnostics).toEqual([]);
        expect(archived.traceability.length).toBeGreaterThan(0);
        expect(archived.traceability.every((row) => row.stateKnown)).toBe(true);
        const brownfield = parsePlan(await fixtureText(...LS170), FILE);
        expect(brownfield.traceability.map((row) => row.criterion)).toEqual(['AC-001', 'AC-002', 'AC-003']);
        expect(brownfield.handoff.nextAction.value.state).not.toBe('absent');
    });
});
