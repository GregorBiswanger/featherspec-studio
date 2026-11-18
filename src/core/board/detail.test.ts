import { describe, expect, it } from 'vitest';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import type { HistoryView } from '../lifecycle/statusHistory';
import { noteText, planText, readFixture, readMemory, row, specText } from '../lifecycle/testing/projects';
import { buildCards } from './cards';
import { nextStepNumberUsedText } from '../../shared/protocol/nextStepTexts';
import { buildDetail } from './detail';
import { nextStep } from './nextStep';

const NO_HISTORY: HistoryView = { available: true, label: 'Observed by Studio while it was running — not a reconstruction', entries: [] };

async function modelOf(files: Record<string, string>) {
    const project = await readMemory(files);
    return { project, lifecycle: deriveLifecycle(project) };
}

const SPEC_TEXT = [
    '# Board',
    '',
    '**Status:** In Progress',
    '**Plan:** [0001-a.plan.md](0001-a.plan.md)',
    '',
    '## 7. Functional requirements',
    '',
    '| ID | Requirement | Criteria |',
    '| --- | --- | --- |',
    '| FR-01 | Show a board | AC-001 |',
    '',
    '## 13. Acceptance criteria',
    '',
    '**AC-001** The board shall show cards.',
    '',
    '> **Given** a spec **When** it renders **Then** a card shows.',
    '',
    '**[Uncertain] AC-002** The board shall sort.',
    '',
    '**~~AC-003~~** Struck criterion.',
    '',
].join('\n');

const FILES = {
    '.specs/active/0001-a.md': SPEC_TEXT,
    '.specs/active/0001-a.plan.md': `${planText({ status: 'In Progress', rows: [row('AC-001', 'verified'), row('AC-002', 'open')] })}\n## Steps\n\n### T-001 — First\n\n- [x] **Verified (T-001):** 2026-11-16 · green\n\n### ~~T-002 — Dropped~~\n\n- [ ] **Verified (T-002):** —\n`,
    '.memory-bank/activeContext.0001-T-001.md': noteText('DONE'),
};

async function detailOf(files: Record<string, string>, selection: { stem: string; path?: string } | undefined, history = NO_HISTORY) {
    return buildDetail({ selection, model: await modelOf(files), history });
}

function spec(view: Awaited<ReturnType<typeof detailOf>>) {
    if (view.kind !== 'spec') {
        throw new Error('expected a spec detail');
    }
    return view;
}

describe('spec detail', () => {
    it('AC-028: no selection, or a stem that is not in the project, gives no spec content', async () => {
        expect(await detailOf(FILES, undefined)).toEqual({ kind: 'none' });
        expect(await detailOf(FILES, { stem: '0099-gone' })).toEqual({ kind: 'none' });
        expect(buildDetail({ selection: { stem: '0001-a' }, model: undefined, history: NO_HISTORY })).toEqual({ kind: 'none' });
    });

    it('AC-009: every criterion with its full text, illustration, uncertain and struck flags, at its line', async () => {
        const view = spec(await detailOf(FILES, { stem: '0001-a' }));
        const items = view.sections.criteria.items;
        expect(items.map((item) => item.id)).toEqual(['AC-001', 'AC-002', 'AC-003']);
        expect(items[0]?.illustration).toContain('Given');
        expect(items.map((item) => [item.uncertain, item.struck])).toEqual([[false, false], [true, false], [false, true]]);
        expect(items[0]?.open).toEqual({ key: '.specs/active/0001-a.md', line: expect.any(Number) });
        expect(view.sections.criteria.open).toEqual({ key: '.specs/active/0001-a.md' });
    });

    it('AC-009: every FR- requirement; none gives an empty list and "Open file" stays on the spec', async () => {
        const view = spec(await detailOf(FILES, { stem: '0001-a' }));
        expect(view.sections.requirements.items.map((item) => item.id)).toEqual(['FR-01']);
        const bare = spec(await detailOf({ '.specs/backlog/0002-b.md': specText() }, { stem: '0002-b' }));
        expect(bare.sections.requirements.items).toEqual([]);
        expect(bare.sections.requirements.open).toEqual({ key: '.specs/backlog/0002-b.md' });
    });

    it('AC-009: each ID appears once in a requirement, a criterion and a stage; the rest of the delivered text is kept', async () => {
        const files = {
            ...FILES,
            '.specs/active/0001-a.plan.md': `${FILES['.specs/active/0001-a.plan.md']}\n## Stages\n\n1. T-001 — First\n2. T-002 — Second\n`,
        };
        const view = spec(await detailOf(files, { stem: '0001-a' }));
        expect(view.sections.requirements.items[0]?.text).toBe('Show a board | AC-001');
        expect(view.sections.criteria.items.map((item) => item.text)).toEqual(['The board shall show cards.', 'The board shall sort.', 'Struck criterion.']);
        expect(view.sections.plan.stages).toEqual(['T-001 — First', 'T-002 — Second']);
        for (const item of [...view.sections.requirements.items, ...view.sections.criteria.items]) {
            expect(item.text.split(item.id).length - 1).toBe(0);
        }
    });

    it('AC-010: Overview, Plan, Verification and Related carry their open targets; runs and history carry none', async () => {
        const view = spec(await detailOf(FILES, { stem: '0001-a' }));
        expect(view.sections.overview.open).toEqual({ key: '.specs/active/0001-a.md' });
        expect(view.sections.plan.open).toEqual({ key: '.specs/active/0001-a.plan.md' });
        expect(view.sections.verification.open).toEqual({ key: '.specs/active/0001-a.plan.md' });
        expect(view.sections.related.map((item) => item.open.key)).toEqual(['.specs/active/0001-a.plan.md', '.memory-bank/activeContext.0001-T-001.md']);
        expect(JSON.stringify(view.sections.history)).not.toContain('"open"');
    });

    it('AC-010: no plan gives no plan target and no steps ("No plan yet"), and no verification target', async () => {
        const view = spec(await detailOf({ '.specs/backlog/0002-b.md': specText() }, { stem: '0002-b' }));
        expect(view.sections.plan).toEqual({ open: undefined, stages: [], steps: [] });
        expect(view.sections.verification.open).toBeUndefined();
        expect(view.sections.related).toEqual([]);
    });

    it('AC-010: plan steps carry tick, struck mark and their Verified text', async () => {
        const view = spec(await detailOf(FILES, { stem: '0001-a' }));
        expect(view.sections.plan.steps.map((step) => [step.id, step.ticked, step.struck])).toEqual([['T-001', true, false], ['T-002', false, true]]);
        expect(view.sections.plan.steps[0]?.verified).toContain('green');
    });

    it('AC-006: the Verification section shows the same criteria numbers as the card', async () => {
        const model = await modelOf(FILES);
        const card = buildCards(model.project, model.lifecycle)[0]!;
        const view = spec(buildDetail({ selection: { stem: '0001-a' }, model, history: NO_HISTORY }));
        expect(view.sections.verification.criteria).toEqual(card.criteria);
        expect(view.sections.verification.criteria).toEqual({ done: 1, total: 2 });
        expect(Object.keys(view.sections.verification)).not.toContain('compileVerdict');
    });

    it('AC-013: the detail carries no priority, verdict, readiness checklist or dependency line', async () => {
        const view = spec(await detailOf(FILES, { stem: '0001-a' }));
        expect(JSON.stringify(view)).not.toMatch(/priorit|verdict|Inter-spec|readiness/i);
    });

    it('AC-014: needs appear for a backlog/ entry only, each with its rule; the successor of a Deprecated spec as 0003 reports it', async () => {
        const backlog = spec(await detailOf({ '.specs/backlog/0002-b.md': specText({ criteria: false }) }, { stem: '0002-b' }));
        expect(backlog.sections.overview.needs).toEqual([
            { text: 'needs acceptance criteria', rule: 'R-2' },
            { text: 'needs a plan', rule: 'R-3' },
        ]);
        const active = spec(await detailOf(FILES, { stem: '0001-a' }));
        expect(active.sections.overview.needs).toEqual([]);
        const deprecated = spec(await detailOf({ '.specs/done/0003-c.md': `${specText({ status: 'Deprecated' })}\nsuccessor: none — behaviour removed\n` }, { stem: '0003-c' }));
        expect(deprecated.sections.overview.deprecated).toBe(true);
        expect(deprecated.sections.overview.successor).toBe('Successor: none — behaviour removed');
    });

    it('AC-002: the successor of a Deprecated spec shows once, as the successor line, with no Successor header line and no diagnostic', async () => {
        const view = spec(
            await detailOf(
                { '.specs/done/0003-c.md': specText({ status: 'Deprecated', extraHeader: '**Successor:** [0009-b.md](../active/0009-b.md)' }) },
                { stem: '0003-c' },
            ),
        );
        expect(view.sections.overview.successor).toBe('Successor: 0009-b.md');
        expect(view.sections.overview.headerLines.filter((line) => line.label === 'Successor')).toEqual([]);
        expect(JSON.stringify(view.sections.overview.headerLines)).not.toContain('0009-b.md');
        expect([...view.problems, ...view.sections.overview.notes].filter((line) => line.reason.includes('Successor'))).toEqual([]);
    });

    it('AC-006: a Problem carries its reason and opens at its line in its file; the format notes stay out of the Problems', async () => {
        const project = await readFixture('fs-broken');
        const model = { project, lifecycle: deriveLifecycle(project) };
        const broken = model.lifecycle.entries.find((entry) => entry.diagnostics.length > 0)!;
        const view = spec(buildDetail({ selection: { stem: broken.stem, path: broken.key }, model, history: NO_HISTORY }));
        expect(view.problems.length).toBe(broken.diagnostics.filter((diagnostic) => diagnostic.tier === 'problem').length);
        expect(view.problems.length).toBeGreaterThan(0);
        view.problems.forEach((line) => expect(line.reason.length).toBeGreaterThan(0));
        expect(view.sections.overview.notes).toEqual([]);
    });

    it('AC-006: the detail of 0003 of fs-broken shows the contradiction reason as its Problem', async () => {
        const project = await readFixture('fs-broken');
        const model = { project, lifecycle: deriveLifecycle(project) };
        const view = spec(buildDetail({ selection: { stem: '0003-also-valid' }, model, history: NO_HISTORY }));
        expect(view.problems).toHaveLength(1);
        expect(view.problems[0]?.reason.length).toBeGreaterThan(0);
        expect(view.problems[0]?.open).toEqual({ key: '.specs/done/0003-also-valid.md' });
    });

    it('AC-007: format notes alone give no Problem and the notes with their reasons in the overview', async () => {
        const project = await readFixture('fs170-brownfield-mixed');
        const model = { project, lifecycle: deriveLifecycle(project) };
        const view = spec(buildDetail({ selection: { stem: '0006-outbox-batch-size' }, model, history: NO_HISTORY }));
        expect(view.problems).toEqual([]);
        expect(view.sections.overview.notes).toHaveLength(2);
        view.sections.overview.notes.forEach((line) => expect(line.reason.length).toBeGreaterThan(0));
    });

    it('AC-016: AC-001 of 0003 in fs170-brownfield-mixed keeps its bold title and loses the ID and the stray marker', async () => {
        const project = await readFixture('fs170-brownfield-mixed');
        const model = { project, lifecycle: deriveLifecycle(project) };
        const view = spec(buildDetail({ selection: { stem: '0003-direct-broker-publication' }, model, history: NO_HISTORY }));
        const first = view.sections.criteria.items[0]!;
        expect(first.id).toBe('AC-001');
        expect(first.text.startsWith('**Events reach the broker without an intermediate table**')).toBe(true);
        expect(first.text).toContain('When an order event occurs');
        expect(first.text).not.toContain('AC-001');
    });

    it('0015 AC-012: the status history of the stem under its label, no run list', async () => {
        const history: HistoryView = {
            available: true,
            label: NO_HISTORY.available ? NO_HISTORY.label : '',
            entries: [
                { observedAt: 't1', stem: '0001-a', old: 'Active', new: 'Review', rule: 'S-REVIEW', cause: { kind: 'files', paths: ['.specs/active/0001-a.plan.md'] }, flow: 'in flow' },
                { observedAt: 't2', stem: '0002-other', old: null, new: 'Backlog', rule: 'S-BACKLOG', cause: { kind: 'first-observed' }, flow: 'not checked' },
            ],
        };
        const view = spec(await detailOf(FILES, { stem: '0001-a' }, history));
        expect(view.sections.history.statusHistory).toHaveLength(1);
        expect(view.sections.history.statusHistory?.[0]).toMatchObject({ old: 'Active', new: 'Review', cause: '.specs/active/0001-a.plan.md' });
        expect(view.sections.history.label).toBe('Observed by Studio while it was running — not a reconstruction');
        expect(view.sections.history.notAvailable).toBeUndefined();
        expect(Object.keys(view.sections.history).sort()).toEqual(['label', 'notAvailable', 'statusHistory']);
    });

    it('0015 AC-012: with the history not available the section says so with the reason', async () => {
        const text = "Status history not available: Another VS Code window holds the write lock for this project's status history.";
        const view = spec(await detailOf(FILES, { stem: '0001-a' }, { available: false, text }));
        expect(view.sections.history.statusHistory).toBeUndefined();
        expect(view.sections.history.notAvailable).toBe(text);
    });

    it('AC-028: after a folder move the same stem still gives the detail', async () => {
        const before = spec(await detailOf({ '.specs/backlog/0002-b.md': specText() }, { stem: '0002-b' }));
        const after = spec(await detailOf({ '.specs/active/0002-b.md': specText({ status: 'In Progress' }) }, { stem: '0002-b' }));
        expect([before.stem, after.stem]).toEqual(['0002-b', '0002-b']);
        expect(after.sections.overview.state).toBe('Active');
    });

    it('a duplicated stem is found by its path', async () => {
        const files = { '.specs/backlog/0004-x.md': specText(), '.specs/active/0004-x.md': specText({ status: 'In Progress' }) };
        const view = spec(await detailOf(files, { stem: '0004-x', path: '.specs/backlog/0004-x.md' }));
        expect(view.key).toBe('.specs/backlog/0004-x.md');
    });
});

describe('0015 AC-003, AC-004, AC-008: the next step in the detail view', () => {
    it('AC-003: the view carries the rule and lines of nextStep for the selected spec', async () => {
        const model = await modelOf(FILES);
        const view = spec(buildDetail({ selection: { stem: '0001-a' }, model, history: NO_HISTORY }));
        expect(view.nextStep).toEqual(nextStep(model, '.specs/active/0001-a.md'));
        expect(view.nextStep).toEqual({ rule: 'NS-6', lines: [{ text: '/sdd-plan .specs/active/0001-a.md' }] });
    });

    it('AC-003: a rule without a line gives its text', async () => {
        const view = spec(await detailOf({ '.specs/backlog/0002-b.md': specText(), '.specs/backlog/0002-c.md': specText() }, { stem: '0002-b' }));
        expect(view.nextStep).toEqual({ rule: 'NS-11', text: nextStepNumberUsedText('0002') });
    });

    it('AC-008: the view needs no trust or writer input; two builds from one snapshot are equal', async () => {
        const model = await modelOf(FILES);
        const first = buildDetail({ selection: { stem: '0001-a' }, model, history: NO_HISTORY });
        const second = buildDetail({ selection: { stem: '0001-a' }, model, history: NO_HISTORY });
        expect(second).toEqual(first);
    });
});
