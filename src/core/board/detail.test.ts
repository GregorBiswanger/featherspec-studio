import { describe, expect, it } from 'vitest';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import type { HistoryView } from '../lifecycle/statusHistory';
import { noteText, planText, readFixture, readMemory, row, specText } from '../lifecycle/testing/projects';
import type { ReadResult, RunView } from '../runtime/model';
import { buildCards } from './cards';
import { buildDetail } from './detail';
import { run } from './testing/boardWorld';

const NO_HISTORY: HistoryView = { available: true, label: 'Observed by Studio while it was running — not a reconstruction', entries: [] };
const NO_RUNS: ReadResult<RunView[]> = { available: true, value: [] };

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

async function detailOf(files: Record<string, string>, selection: { stem: string; path?: string } | undefined, runs = NO_RUNS, history = NO_HISTORY) {
    return buildDetail({ selection, model: await modelOf(files), runs, history });
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
        expect(buildDetail({ selection: { stem: '0001-a' }, model: undefined, runs: NO_RUNS, history: NO_HISTORY })).toEqual({ kind: 'none' });
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
        const view = spec(buildDetail({ selection: { stem: '0001-a' }, model, runs: NO_RUNS, history: NO_HISTORY }));
        expect(view.sections.verification.criteria).toEqual(card.criteria);
        expect(view.sections.verification.criteria).toEqual({ done: 1, total: 2 });
        expect(view.sections.verification.compileVerdict).toContain('not available');
    });

    it('AC-005: the Overview says "Priority: not available" through the model and carries no priority field', async () => {
        const view = spec(await detailOf(FILES, { stem: '0001-a' }));
        expect(JSON.stringify(view)).not.toMatch(/priorit/i);
    });

    it('AC-024: readiness checks appear for a backlog/ entry only; the successor of a Deprecated spec as 0003 reports it', async () => {
        const backlog = spec(await detailOf({ '.specs/backlog/0002-b.md': specText() }, { stem: '0002-b' }));
        expect(backlog.sections.overview.readiness?.map((check) => check.id)).toEqual(['R-1', 'R-2', 'R-3', 'R-4', 'R-5', 'R-6', 'R-7']);
        const active = spec(await detailOf(FILES, { stem: '0001-a' }));
        expect(active.sections.overview.readiness).toBeUndefined();
        const deprecated = spec(await detailOf({ '.specs/done/0003-c.md': `${specText({ status: 'Deprecated' })}\nsuccessor: none — behaviour removed\n` }, { stem: '0003-c' }));
        expect(deprecated.sections.overview.deprecated).toBe(true);
        expect(deprecated.sections.overview.successor).toBe('Successor: none — behaviour removed');
    });

    it('AC-010: a diagnostic carries its reason and opens at its line in its file', async () => {
        const project = await readFixture('fs-broken');
        const model = { project, lifecycle: deriveLifecycle(project) };
        const broken = model.lifecycle.entries.find((entry) => entry.diagnostics.length > 0)!;
        const view = spec(buildDetail({ selection: { stem: broken.stem, path: broken.key }, model, runs: NO_RUNS, history: NO_HISTORY }));
        expect(view.sections.overview.diagnostics.length).toBe(broken.diagnostics.length);
        view.sections.overview.diagnostics.forEach((line) => expect(line.reason.length).toBeGreaterThan(0));
    });

    it('AC-027: runs of the stem, newest created first, with flags and no events; the status history of the stem under its label', async () => {
        const runs: ReadResult<RunView[]> = {
            available: true,
            value: [run('r2', '0001-a', { created: '2026-11-16T12:00:00.000Z', status: 'Failed', historyIncomplete: true }), run('r1', '0001-a'), run('r9', '0002-other')],
        };
        const history: HistoryView = {
            available: true,
            label: NO_HISTORY.available ? NO_HISTORY.label : '',
            entries: [
                { observedAt: 't1', stem: '0001-a', old: 'Active', new: 'Review', rule: 'S-REVIEW', cause: { kind: 'files', paths: ['.specs/active/0001-a.plan.md'] }, flow: 'in flow' },
                { observedAt: 't2', stem: '0002-other', old: null, new: 'Backlog', rule: 'S-BACKLOG', cause: { kind: 'first-observed' }, flow: 'not checked' },
            ],
        };
        const view = spec(await detailOf(FILES, { stem: '0001-a' }, runs, history));
        expect(view.sections.history.runs?.map((item) => [item.runId, item.historyIncomplete])).toEqual([['r2', true], ['r1', false]]);
        expect(view.sections.history.statusHistory).toHaveLength(1);
        expect(view.sections.history.statusHistory?.[0]).toMatchObject({ old: 'Active', new: 'Review', cause: '.specs/active/0001-a.plan.md' });
        expect(view.sections.history.label).toBe('Observed by Studio while it was running — not a reconstruction');
    });

    it('AC-027: with the store unavailable both are not available', async () => {
        const view = spec(await detailOf(FILES, { stem: '0001-a' }, { available: false, reason: 'no storage' }, { available: false, text: 'Status history not available: no storage' }));
        expect(view.sections.history.runs).toBeUndefined();
        expect(view.sections.history.statusHistory).toBeUndefined();
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
