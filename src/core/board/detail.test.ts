import { describe, expect, it } from 'vitest';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import type { HistoryView } from '../lifecycle/statusHistory';
import { noteText, planText, readFixture, readMemory, row, specText } from '../lifecycle/testing/projects';
import { buildCards } from './cards';
import { nextStepNumberUsedText } from '../../shared/protocol/nextStepTexts';
import { buildDetail } from './detail';
import { parseStepTipSettings } from '../settings/stepTipSettings';
import { stepTips } from './stepTips';
import { nextStep, openStep } from './nextStep';
import { planOf } from '../planMap/planMap';
import { fixtureModel, GEN_PLAN, GEN_SPEC, generatedFiles, modelWithUnreadable, PARALLEL_SPEC } from '../planMap/testing/plans';

const NO_HISTORY: HistoryView = { available: true, label: 'Only changes Studio saw while it was running.', entries: [] };

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
    '.specs/active/0001-a.plan.md': `${planText({ status: 'In Progress', rows: [row('AC-001', 'verified'), row('AC-002', 'open')] })}\n## Steps\n\n### T-001 — First\n\n- [x] **Verified (T-001):** 2026-11-16 · green\n\n### ~~T-002 — Dropped~~\n\n- [ ] **Verified (T-002):** —\n\n### T-003 — Third\n\n- [ ] **Verified (T-003):** —\n`,
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

    it('AC-006 (0019 AC-012): the Criteria row shows the same numbers as the card', async () => {
        const model = await modelOf(FILES);
        const card = buildCards(model.project, model.lifecycle)[0]!;
        const view = spec(buildDetail({ selection: { stem: '0001-a' }, model, history: NO_HISTORY }));
        const criteria = view.progress?.criteria;
        expect(criteria).toMatchObject({ kind: 'criteria', verified: card.criteria?.done, total: card.criteria?.total });
        expect(criteria).toMatchObject({ verified: 1, total: 2 });
        expect(JSON.stringify(view)).not.toContain('compileVerdict');
    });

    it('AC-013: the detail carries no priority, verdict, readiness checklist or dependency line', async () => {
        const view = spec(await detailOf(FILES, { stem: '0001-a' }));
        expect(JSON.stringify(view)).not.toMatch(/priorit|verdict|Inter-spec|readiness/i);
    });

    it('AC-014: needs appear for a backlog/ entry only, each with its rule; the successor of a Deprecated spec as 0003 reports it', async () => {
        const backlog = spec(await detailOf({ '.specs/backlog/0002-b.md': specText({ criteria: false }) }, { stem: '0002-b' }));
        expect(backlog.progress?.needs).toEqual([
            { text: 'needs acceptance criteria', rule: 'R-2' },
            { text: 'needs a plan', rule: 'R-3' },
        ]);
        const active = spec(await detailOf(FILES, { stem: '0001-a' }));
        expect(active.progress?.needs).toEqual([]);
        const deprecated = spec(await detailOf({ '.specs/done/0003-c.md': `${specText({ status: 'Deprecated' })}\nsuccessor: none — behaviour removed\n` }, { stem: '0003-c' }));
        expect(deprecated.successor).toBe('Successor: none — behaviour removed');
    });

    it('AC-002: the successor of a Deprecated spec shows once, as the successor line, with no Successor header line and no diagnostic', async () => {
        const view = spec(
            await detailOf(
                { '.specs/done/0003-c.md': specText({ status: 'Deprecated', extraHeader: '**Successor:** [0009-b.md](../active/0009-b.md)' }) },
                { stem: '0003-c' },
            ),
        );
        expect(view.successor).toBe('Successor: 0009-b.md');
        expect([...view.problems, ...view.notes].filter((line) => line.reason.includes('Successor'))).toEqual([]);
    });

    it('AC-006, 0022 AC-013: a Problem carries its sentence and its reason and opens at its line in its file; the format notes stay out of the Problems', async () => {
        const project = await readFixture('fs-broken');
        const model = { project, lifecycle: deriveLifecycle(project) };
        const broken = model.lifecycle.entries.find((entry) => entry.diagnostics.length > 0)!;
        const view = spec(buildDetail({ selection: { stem: broken.stem, path: broken.key }, model, history: NO_HISTORY }));
        expect(view.problems.length).toBe(broken.diagnostics.filter((diagnostic) => diagnostic.tier === 'problem').length);
        expect(view.problems.length).toBeGreaterThan(0);
        view.problems.forEach((line) => {
            expect(line.reason.length).toBeGreaterThan(0);
            expect(line.sentence?.length).toBeGreaterThan(0);
            expect(line.sentence).not.toBe(line.reason);
        });
        expect(view.notes).toEqual([]);
    });

    it('AC-006, 0022 AC-013: the detail of 0003 of fs-broken shows the contradiction sentence as its Problem, the reason beside it', async () => {
        const project = await readFixture('fs-broken');
        const model = { project, lifecycle: deriveLifecycle(project) };
        const view = spec(buildDetail({ selection: { stem: '0003-also-valid' }, model, history: NO_HISTORY }));
        expect(view.problems).toHaveLength(1);
        expect(view.problems[0]?.reason.length).toBeGreaterThan(0);
        expect(view.problems[0]?.sentence).toBe('In the done folder, but its status is "Draft"');
        expect(view.problems[0]?.open).toEqual({ key: '.specs/done/0003-also-valid.md', line: 1 });
    });

    it('AC-007: format notes alone give no Problem and the notes with their reasons in the overview', async () => {
        const project = await readFixture('fs170-brownfield-mixed');
        const model = { project, lifecycle: deriveLifecycle(project) };
        const view = spec(buildDetail({ selection: { stem: '0006-outbox-batch-size' }, model, history: NO_HISTORY }));
        expect(view.problems).toEqual([]);
        expect(view.notes).toHaveLength(2);
        view.notes.forEach((line) => {
            expect(line.reason.length).toBeGreaterThan(0);
            expect(line).not.toHaveProperty('sentence');
        });
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
        expect(view.history.statusHistory).toHaveLength(1);
        expect(view.history.statusHistory?.[0]).toMatchObject({ old: 'Active', new: 'Review', cause: { kind: 'files', paths: ['.specs/active/0001-a.plan.md'] } });
        expect(view.history.label).toBe('Only changes Studio saw while it was running.');
        expect(view.history.notAvailable).toBeUndefined();
        expect(Object.keys(view.history).sort()).toEqual(['label', 'notAvailable', 'statusHistory']);
    });

    it('0015 AC-012: with the history not available the section says so with the reason', async () => {
        const text = "Status history not available: Another VS Code window holds the write lock for this project's status history.";
        const view = spec(await detailOf(FILES, { stem: '0001-a' }, { available: false, text }));
        expect(view.history.statusHistory).toBeUndefined();
        expect(view.history.notAvailable).toBe(text);
    });

    it('AC-028: after a folder move the same stem still gives the detail', async () => {
        const before = spec(await detailOf({ '.specs/backlog/0002-b.md': specText() }, { stem: '0002-b' }));
        const after = spec(await detailOf({ '.specs/active/0002-b.md': specText({ status: 'In Progress' }) }, { stem: '0002-b' }));
        expect([before.stem, after.stem]).toEqual(['0002-b', '0002-b']);
        expect(after.state).toBe('Active');
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
        const next = nextStep(model, '.specs/active/0001-a.md') as { rule: string; lines: unknown[] };
        expect(view.nextStep).toEqual({ rule: next.rule, lines: next.lines });
        expect(view.nextStep).toEqual({ rule: 'NS-6', lines: [{ text: '/sdd-plan .specs/active/0001-a.md', intent: 'Integrate the returned steps' }] });
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

describe('0019: the situation picture', () => {
    async function fixtureDetail(name: string, stem: string, path?: string) {
        const project = await readFixture(name);
        const model = { project, lifecycle: deriveLifecycle(project) };
        return { model, view: spec(buildDetail({ selection: path === undefined ? { stem } : { stem, path }, model, history: NO_HISTORY })) };
    }

    const READY = '.specs/backlog/0001-ready-feature.md';
    const READY_PLAN = '.specs/backlog/0001-ready-feature.plan.md';
    const OUTBOX = '.specs/active/0006-outbox-batch-size.md';
    const OUTBOX_PLAN = '.specs/active/0006-outbox-batch-size.plan.md';

    it('AC-009: the header facts are state, rule and persistence; a path only for a duplicated stem', async () => {
        const { view } = await fixtureDetail('fs110-ready-synthetic', '0001-ready-feature');
        expect([view.state, view.rule, view.persistence]).toEqual(['Ready', 'S-READY', 'derived']);
        expect(view.path).toBeUndefined();
        expect(view.successor).toBeUndefined();
        const files = { '.specs/backlog/0004-x.md': specText(), '.specs/active/0004-x.md': specText({ status: 'In Progress' }) };
        const duplicated = spec(await detailOf(files, { stem: '0004-x', path: '.specs/backlog/0004-x.md' }));
        expect(duplicated.path).toBe('.specs/backlog/0004-x.md');
        const other = spec(await detailOf(files, { stem: '0004-x', path: '.specs/active/0004-x.md' }));
        expect(other.path).toBe('.specs/active/0004-x.md');
    });

    it('AC-009: a Deprecated spec carries the successor text, others none', async () => {
        const deprecated = spec(await detailOf({ '.specs/done/0003-c.md': `${specText({ status: 'Deprecated' })}\nsuccessor: none — behaviour removed\n` }, { stem: '0003-c' }));
        expect(deprecated.successor).toBe('Successor: none — behaviour removed');
        expect(spec(await detailOf(FILES, { stem: '0001-a' })).successor).toBeUndefined();
    });

    it('AC-009: the format notes are delivered as notes with their reasons and lines, the Problems stay apart', async () => {
        const { view } = await fixtureDetail('fs170-brownfield-mixed', '0006-outbox-batch-size');
        expect(view.notes).toHaveLength(2);
        view.notes.forEach((note) => {
            expect(note.reason.length).toBeGreaterThan(0);
            expect(note.open?.line).toBeGreaterThanOrEqual(1);
        });
        expect(view.problems).toEqual([]);
    });

    it('AC-011: fs110-ready-synthetic 0001 has 0 of 1 steps done and T-001 "The feature" as next open step at plan line 24', async () => {
        const { view } = await fixtureDetail('fs110-ready-synthetic', '0001-ready-feature');
        expect(view.progress).toEqual({
            needs: [],
            noPlan: false,
            steps: { kind: 'steps', done: 0, total: 1, next: { id: 'T-001', title: 'The feature', open: { key: READY_PLAN, line: 24 } } },
            criteria: expect.anything(),
        });
    });

    it('AC-011: fs170-brownfield-mixed 0006 has 4 of 4 steps done and no next open step', async () => {
        const { view } = await fixtureDetail('fs170-brownfield-mixed', '0006-outbox-batch-size');
        expect(view.progress?.steps).toEqual({ kind: 'steps', done: 4, total: 4 });
    });

    it('AC-011: 0003 of fs170-brownfield-mixed shows the need "needs a plan" only, no Steps and no Criteria', async () => {
        const { view } = await fixtureDetail('fs170-brownfield-mixed', '0003-direct-broker-publication');
        expect(view.progress).toEqual({ needs: [{ text: 'needs a plan', rule: 'R-3' }], noPlan: false });
    });

    it('AC-011: a Done spec without a plan has no Progress, a spec of another state without a plan says so', async () => {
        const { view } = await fixtureDetail('fs180-de-baselines', '0001-einer-handsup-session-beitreten');
        expect(view.state).toBe('Done');
        expect(view.progress).toBeUndefined();
        const active = spec(await detailOf({ '.specs/active/0005-e.md': specText({ status: 'In Progress' }) }, { stem: '0005-e' }));
        expect(active.progress).toEqual({ needs: [], noPlan: true });
    });

    it('AC-011: a plan whose steps are all struck gives "none"; control: one open step gives a next open step', async () => {
        const struck = {
            '.specs/active/0001-a.md': SPEC_TEXT,
            '.specs/active/0001-a.plan.md': `${planText({ status: 'In Progress', rows: [row('AC-001', 'open')] })}\n## Steps\n\n### ~~T-001 — Dropped~~\n\n- [ ] **Verified (T-001):** —\n`,
        };
        expect(spec(await detailOf(struck, { stem: '0001-a' })).progress?.steps).toEqual({ kind: 'none' });
        const unticked = { ...struck, '.specs/active/0001-a.plan.md': struck['.specs/active/0001-a.plan.md'].replace('### ~~T-001 — Dropped~~', '### T-001 — First step') };
        const open = spec(await detailOf(unticked, { stem: '0001-a' }));
        expect(open.progress?.steps).toMatchObject({ kind: 'steps', done: 0, total: 1, next: { id: 'T-001', title: 'First step' } });
    });

    it('AC-011: a plan that cannot be read gives "unavailable" for both rows', async () => {
        const { model } = await fixtureDetail('fs110-ready-synthetic', '0001-ready-feature');
        const broken = { ...model, project: { ...model.project, plans: model.project.plans.map((plan) => (plan.key === READY_PLAN ? { ...plan, parsed: undefined } : plan)) } };
        const view = spec(buildDetail({ selection: { stem: '0001-ready-feature' }, model: broken, history: NO_HISTORY }));
        expect(view.progress?.steps).toEqual({ kind: 'unavailable' });
        expect(view.progress?.criteria).toEqual({ kind: 'unavailable', reason: 'unreadable' });
    });

    it('AC-011: for every fixture spec with a plan the next open step is the one NS-7 uses', async () => {
        let compared = 0;
        for (const name of ['fs110-ready-synthetic', 'fs110-parallel-synthetic', 'fs170-brownfield-mixed', 'fs180-en-done-archived', 'fs110-de-active-review', 'studio-0002', 'studio-0015', 'repo-8052f9a']) {
            const project = await readFixture(name);
            const model = { project, lifecycle: deriveLifecycle(project) };
            for (const entry of model.lifecycle.entries.filter((candidate) => candidate.plan !== undefined)) {
                const view = spec(buildDetail({ selection: { stem: entry.stem, path: entry.key }, model, history: NO_HISTORY }));
                const steps = view.progress?.steps?.kind === 'steps' ? view.progress.steps : undefined;
                expect(steps?.next?.id, `${name} ${entry.key}`).toBe(steps?.returned === undefined ? openStep(model, entry)?.id : undefined);
                compared += 1;
            }
        }
        expect(compared).toBeGreaterThanOrEqual(8);
    });

    it('AC-012: fs110-ready-synthetic 0001 has 0 of 1 verified and lists AC-001 with its short title at spec line 9', async () => {
        const { view } = await fixtureDetail('fs110-ready-synthetic', '0001-ready-feature');
        expect(view.progress?.criteria).toEqual({
            kind: 'criteria',
            verified: 0,
            total: 1,
            open: [{ id: 'AC-001', text: 'The system shall be ready.', built: false, open: { key: READY, line: 9 } }],
        });
    });

    it('AC-012: fs170-brownfield-mixed 0006 has 3 of 3 verified and no list', async () => {
        const { view } = await fixtureDetail('fs170-brownfield-mixed', '0006-outbox-batch-size');
        expect(view.progress?.criteria).toEqual({ kind: 'criteria', verified: 3, total: 3, open: [] });
    });

    it('AC-012: a plan with no traceability rows gives "no-table"', async () => {
        const files = { '.specs/active/0001-a.md': SPEC_TEXT, '.specs/active/0001-a.plan.md': planText({ status: 'In Progress' }) };
        expect(spec(await detailOf(files, { stem: '0001-a' })).progress?.criteria).toEqual({ kind: 'unavailable', reason: 'no-table' });
    });

    it('AC-012: studio-0015 has 28 of 30 verified and lists exactly AC-027 and AC-030, unmarked', async () => {
        const { view } = await fixtureDetail('studio-0015', '0015-focus-on-visibility');
        const criteria = view.progress?.criteria;
        expect(criteria).toMatchObject({ kind: 'criteria', verified: 28, total: 30 });
        const open = criteria?.kind === 'criteria' ? criteria.open : [];
        expect(open.map((item) => [item.id, item.built])).toEqual([['AC-027', false], ['AC-030', false]]);
        open.forEach((item) => expect(item.open.key).toBe('.specs/active/0015-focus-on-visibility.md'));
    });

    it('AC-012: a built row is marked built, a cell with several IDs shows its text and links to its plan row; an undefined ID too', async () => {
        const spec1 = `${SPEC_TEXT}\n**AC-009** The ninth shall hold. More text.\n`;
        const plan = `${planText({ status: 'In Progress', rows: [row('AC-001', 'built'), row('M-01, M-02', 'open'), row('AC-077', 'open'), row('AC-009', 'verified')] })}`;
        const view = spec(await detailOf({ '.specs/active/0001-a.md': spec1, '.specs/active/0001-a.plan.md': plan }, { stem: '0001-a' }));
        const criteria = view.progress?.criteria;
        expect(criteria).toMatchObject({ kind: 'criteria', verified: 1, total: 4 });
        const open = criteria?.kind === 'criteria' ? criteria.open : [];
        expect(open.map((item) => [item.id, item.text, item.built])).toEqual([
            ['AC-001', 'The board shall show cards.', true],
            [undefined, 'M-01, M-02', false],
            [undefined, 'AC-077', false],
        ]);
        expect(open[0]?.open.key).toBe('.specs/active/0001-a.md');
        expect(open[1]?.open.key).toBe('.specs/active/0001-a.plan.md');
        expect(open[2]?.open.key).toBe('.specs/active/0001-a.plan.md');
        expect(open[1]?.open.line).toBeGreaterThan(1);
    });

    it('AC-012: a row state is compared exactly: "verified " with other text is listed, a state of "verified" is not', async () => {
        const plan = planText({ status: 'In Progress', rows: [row('AC-001', 'verified'), row('AC-002', 'verified here; pending')] });
        const view = spec(await detailOf({ '.specs/active/0001-a.md': SPEC_TEXT, '.specs/active/0001-a.plan.md': plan }, { stem: '0001-a' }));
        const open = view.progress?.criteria?.kind === 'criteria' ? view.progress.criteria.open : [];
        expect(open.map((item) => item.id)).toEqual(['AC-002']);
    });

    it('AC-014: fs180-en-done-archived 0001 lists Spec and one Archived plan and no Plan', async () => {
        const { view } = await fixtureDetail('fs180-en-done-archived', '0001-split-bill-with-tip');
        expect(view.files.map((file) => [file.label, file.name])).toEqual([
            ['Spec', '0001-split-bill-with-tip.md'],
            ['Archived plan', '0001-split-bill-with-tip.2026-09-19.plan.md'],
        ]);
        view.files.forEach((file) => expect(file.open.line).toBe(1));
    });

    it('AC-014: a spec with a sibling plan and a return note lists Spec, Plan and Return note in that order; no plan, no row', async () => {
        const view = spec(await detailOf(FILES, { stem: '0001-a' }));
        expect(view.files.map((file) => [file.label, file.name, file.open.key])).toEqual([
            ['Spec', '0001-a.md', '.specs/active/0001-a.md'],
            ['Plan', '0001-a.plan.md', '.specs/active/0001-a.plan.md'],
            ['Return note', 'activeContext.0001-T-001.md', '.memory-bank/activeContext.0001-T-001.md'],
        ]);
        const bare = spec(await detailOf({ '.specs/backlog/0002-b.md': specText() }, { stem: '0002-b' }));
        expect(bare.files.map((file) => file.label)).toEqual(['Spec']);
    });

    it('0019 D2, AC-014: with a duplicated stem each entry lists only the plan beside its own spec', async () => {
        const files = {
            '.specs/active/0005-e.md': specText({ status: 'In Progress', plan: '[0005-e.plan.md](0005-e.plan.md)' }),
            '.specs/active/0005-e.plan.md': planText({ status: 'In Progress' }),
            '.specs/backlog/0005-e.md': specText(),
        };
        const labels = (view: ReturnType<typeof spec>) => view.files.map((file) => [file.label, file.open.key]);
        const active = spec(await detailOf(files, { stem: '0005-e', path: '.specs/active/0005-e.md' }));
        expect(labels(active)).toEqual([['Spec', '.specs/active/0005-e.md'], ['Plan', '.specs/active/0005-e.plan.md']]);
        const backlog = spec(await detailOf(files, { stem: '0005-e', path: '.specs/backlog/0005-e.md' }));
        expect(labels(backlog)).toEqual([['Spec', '.specs/backlog/0005-e.md']]);
        expect(backlog.progress?.steps).toBeUndefined();
    });

    it('AC-016: the model delivers the lines of fs110-ready-synthetic: AC-001 spec line 9, T-001 plan line 24, its row plan line 36', async () => {
        const { model, view } = await fixtureDetail('fs110-ready-synthetic', '0001-ready-feature');
        const spec1 = model.project.specs.find((candidate) => candidate.key === READY);
        const plan = model.project.plans.find((candidate) => candidate.key === READY_PLAN);
        expect(spec1?.parsed?.criteria.find((item) => item.id === 'AC-001')?.line).toBe(9);
        expect(plan?.parsed?.steps.find((step) => step.id === 'T-001')?.line).toBe(24);
        expect(plan?.parsed?.traceability[0]?.line).toBe(36);
        expect(view.progress?.steps).toMatchObject({ next: { open: { key: READY_PLAN, line: 24 } } });
    });

    it('AC-016: 0006 of fs170-brownfield-mixed has AC-001, AC-002, AC-003 at spec lines 13, 17, 21 and T-001, T-004 at plan lines 70 and 169', async () => {
        const { model } = await fixtureDetail('fs170-brownfield-mixed', '0006-outbox-batch-size');
        const spec1 = model.project.specs.find((candidate) => candidate.key === OUTBOX);
        const plan = model.project.plans.find((candidate) => candidate.key === OUTBOX_PLAN);
        expect(spec1?.parsed?.criteria.map((item) => [item.id, item.line])).toEqual([['AC-001', 13], ['AC-002', 17], ['AC-003', 21]]);
        expect(plan?.parsed?.steps.filter((step) => step.id === 'T-001' || step.id === 'T-004').map((step) => [step.id, step.line])).toEqual([['T-001', 70], ['T-004', 169]]);
    });

    it('AC-016: a criterion defined twice links to the line of its first definition', async () => {
        const text = `${SPEC_TEXT}\n**AC-001** Defined a second time.\n`;
        const plan = planText({ status: 'In Progress', rows: [row('AC-001', 'open')] });
        const view = spec(await detailOf({ '.specs/active/0001-a.md': text, '.specs/active/0001-a.plan.md': plan }, { stem: '0001-a' }));
        const open = view.progress?.criteria?.kind === 'criteria' ? view.progress.criteria.open : [];
        expect(open).toHaveLength(1);
        expect(open[0]?.open.line).toBe(text.split('\n').findIndex((line) => line.startsWith('**AC-001**')) + 1);
        expect(open[0]?.text).toBe('The board shall show cards.');
    });

    it('AC-017: every Problem and format note without a line opens at line 1 of its file', async () => {
        const project = await readFixture('fs-broken');
        const model = { project, lifecycle: deriveLifecycle(project) };
        const view = spec(buildDetail({ selection: { stem: '0003-also-valid' }, model, history: NO_HISTORY }));
        expect(view.problems[0]?.open).toEqual({ key: '.specs/done/0003-also-valid.md', line: 1 });
    });
});

describe('0021 AC-009, AC-010: the tips of the detail', () => {
    const SHOW = parseStepTipSettings(true, {});
    const HIDE = parseStepTipSettings(false, { strong: 'X' });
    const BACKLOG_FILES = { '.specs/backlog/0002-b.md': specText() };

    async function nextOf(files: Record<string, string>, stem: string, tips?: ReturnType<typeof parseStepTipSettings>) {
        const model = await modelOf(files);
        const view = spec(buildDetail({ selection: { stem }, model, history: NO_HISTORY, ...(tips === undefined ? {} : { tips }) }));
        return view.nextStep as { rule: string; lines?: Array<{ text: string; intent: string }>; tips?: { coach: string; about: string[] }; text?: string };
    }

    it('a step with lines carries the coach line and the four paragraphs of its case, from the one table', async () => {
        const next = await nextOf(BACKLOG_FILES, '0002-b', SHOW);
        expect(next.rule).toBe('NS-9');
        expect(next.tips).toEqual(stepTips('NS-9', SHOW));
        expect(next.tips?.coach).toBe('Tip: Use a new chat with a strong model.');
        expect(next.tips?.about).toHaveLength(4);
    });

    it('a hint reaches the coach line of the case', async () => {
        const next = await nextOf(BACKLOG_FILES, '0002-b', parseStepTipSettings(true, { strong: 'X' }));
        expect(next.tips?.coach).toBe('Tip: Use a new chat with a strong model (X).');
    });

    it('without a tips input, and with show false, the view has no tips key and the lines are the same', async () => {
        const without = await nextOf(BACKLOG_FILES, '0002-b');
        const hidden = await nextOf(BACKLOG_FILES, '0002-b', HIDE);
        const shown = await nextOf(BACKLOG_FILES, '0002-b', SHOW);
        expect('tips' in without).toBe(false);
        expect('tips' in hidden).toBe(false);
        expect(hidden).toEqual(without);
        expect(shown.lines).toEqual(without.lines);
        expect(shown.rule).toBe(without.rule);
    });

    it('NS-1, NS-3 and NS-11 carry no tips even while they are on', async () => {
        const twins = await nextOf({ '.specs/backlog/0002-b.md': specText(), '.specs/backlog/0002-c.md': specText() }, '0002-b', SHOW);
        expect(twins.rule).toBe('NS-11');
        expect('tips' in twins).toBe(false);
        const done = await nextOf({ '.specs/done/0003-d.md': specText({ status: 'Implemented', plan: '[0003-d.2026-11-01.plan.md](../plan-archive/0003-d.2026-11-01.plan.md)' }) }, '0003-d', SHOW);
        expect(done.rule).toBe('NS-3');
        expect('tips' in done).toBe(false);
    });

    it('NS-6 coach and paragraphs come from the case of the open step', async () => {
        const next = await nextOf(FILES, '0001-a', SHOW);
        expect(next.rule).toBe('NS-6');
        expect(next.tips).toEqual(stepTips('NS-6-returned', SHOW));
    });
});

describe('0023 AC-003: the detail carries the plan view of a spec that has a readable sibling plan', () => {
    const detail = async (model: Awaited<ReturnType<typeof modelOf>>, key: string) => {
        const entry = model.lifecycle.entries.find((candidate) => candidate.key === key)!;
        return spec(buildDetail({ selection: { stem: entry.stem }, model, history: NO_HISTORY }));
    };

    it('an Active spec with a Blocked plan, a Review spec and a Ready spec each carry a plan view', async () => {
        const blocked = await fixtureModel('fs110-parallel-synthetic');
        const view = (await detail(blocked, PARALLEL_SPEC)).plan;
        expect(view).toMatchObject({ kind: 'plan', staged: true, plan: { key: '.specs/active/0001-parallel-demo.plan.md', line: 1 } });
        const review = await fixtureModel('studio-0015');
        const reviewKey = review.lifecycle.entries[0]!.key;
        expect(review.lifecycle.entries[0]!.state).toBe('Review');
        expect((await detail(review, reviewKey)).plan).toMatchObject({ kind: 'plan', staged: true });
        const ready = await fixtureModel('fs110-ready-synthetic');
        expect((await detail(ready, '.specs/backlog/0001-ready-feature.md')).plan).toMatchObject({ kind: 'plan' });
    });

    it('the plan view of the detail is the one planOf gives', async () => {
        const model = await fixtureModel('fs110-parallel-synthetic');
        const entry = model.lifecycle.entries[0]!;
        expect((await detail(model, entry.key)).plan).toEqual(planOf(model, entry, model.project.specs[0]!));
    });

    it('a Done spec, a spec without a plan and a reactivated spec with an archive link carry none', async () => {
        const done = await fixtureModel('fs110-ready-synthetic');
        expect('plan' in (await detail(done, '.specs/done/0002-old-feature.md'))).toBe(false);
        const none = await modelOf({ '.specs/backlog/0004-a.md': specText() });
        expect('plan' in (await detail(none, '.specs/backlog/0004-a.md'))).toBe(false);
        const archive = '[0007-x.2026-11-01.plan.md](../plan-archive/0007-x.2026-11-01.plan.md)';
        const reactivated = await modelOf({ '.specs/active/0007-x.md': specText({ status: 'In Progress', plan: archive }), '.specs/plan-archive/0007-x.2026-11-01.plan.md': planText({ status: 'Done' }) });
        expect('plan' in (await detail(reactivated, '.specs/active/0007-x.md'))).toBe(false);
    });

    it('an unreadable plan gives the unreadable view', async () => {
        const model = await modelWithUnreadable(generatedFiles(), [GEN_PLAN]);
        expect((await detail(model, GEN_SPEC)).plan).toEqual({ kind: 'unreadable' });
    });
});

describe('0024 AC-003, AC-004: the send view of the next step', () => {
    const SHOW = parseStepTipSettings(true, {});
    const OFFER_A = { assistant: 'copilot' } as const;
    const OFFER_B = { assistant: 'claudeCode' } as const;

    async function nextOf(model: Awaited<ReturnType<typeof modelOf>>, key: string, extra: { offer?: typeof OFFER_A | typeof OFFER_B; tips?: typeof SHOW } = {}) {
        const entry = model.lifecycle.entries.find((candidate) => candidate.key === key)!;
        const view = spec(buildDetail({ selection: { stem: entry.stem }, model, history: NO_HISTORY, ...extra }));
        return view.nextStep as { rule: string; lines?: unknown[]; send?: unknown; tips?: { about: string[] }; text?: string };
    }

    it('NS-9 (a backlog spec): Copilot sends to a new chat, Claude Code to a new chat', async () => {
        const model = await modelOf({ '.specs/backlog/0002-b.md': specText() });
        const key = '.specs/backlog/0002-b.md';
        expect((await nextOf(model, key, { offer: OFFER_A })).send).toEqual({ assistant: 'copilot', attach: { name: '0002-b.md', path: '.specs/backlog/0002-b.md' }, target: 'new', targets: ['new', 'current'] });
        expect((await nextOf(model, key, { offer: OFFER_B })).send).toEqual({ assistant: 'claudeCode', attach: { name: '0002-b.md', path: '.specs/backlog/0002-b.md' }, target: 'new', targets: ['new'] });
    });

    it('0026 AC-001: NS-5, NS-7 and NS-6 are all a new chat for Copilot (0024 AC-004 retargeted)', async () => {
        const review = await fixtureModel('studio-0015');
        const reviewNext = await nextOf(review, review.lifecycle.entries[0]!.key, { offer: OFFER_A });
        expect(reviewNext.rule).toBe('NS-5');
        expect(reviewNext.send).toEqual({ assistant: 'copilot', attach: { name: '0015-focus-on-visibility.md', path: '.specs/active/0015-focus-on-visibility.md' }, target: 'new', targets: ['new', 'current'] });
        const ready = await fixtureModel('fs110-ready-synthetic');
        const readyNext = await nextOf(ready, '.specs/backlog/0001-ready-feature.md', { offer: OFFER_A });
        expect(readyNext.rule).toBe('NS-7');
        expect(readyNext.send).toEqual({ assistant: 'copilot', attach: { name: '0001-ready-feature.md', path: '.specs/backlog/0001-ready-feature.md' }, target: 'new', targets: ['new', 'current'] });
        const active = await modelOf(FILES);
        const activeNext = await nextOf(active, '.specs/active/0001-a.md', { offer: OFFER_A });
        expect(activeNext.rule).toBe('NS-6');
        expect(activeNext.send).toEqual({ assistant: 'copilot', attach: { name: '0001-a.md', path: '.specs/active/0001-a.md' }, target: 'new', targets: ['new', 'current'] });
        expect((await nextOf(active, '.specs/active/0001-a.md', { offer: OFFER_B })).send).toEqual({ assistant: 'claudeCode', attach: { name: '0001-a.md', path: '.specs/active/0001-a.md' }, target: 'new', targets: ['new'] });
    });

    it('no offer: no send key and the view equals the view without the input; with tips off the send view stays', async () => {
        const model = await modelOf({ '.specs/backlog/0002-b.md': specText() });
        const key = '.specs/backlog/0002-b.md';
        const plain = await nextOf(model, key);
        expect('send' in plain).toBe(false);
        const withTipsOff = await nextOf(model, key, { offer: OFFER_A, tips: parseStepTipSettings(false, {}) });
        expect(withTipsOff.send).toBeDefined();
        expect('tips' in withTipsOff).toBe(false);
        // 0031 §6.1: a follow-up line carries its own send view; it is the one difference besides the view-level send.
        const bare = (view: typeof plain) => ({ ...view, send: undefined, lines: view.lines?.map((line) => ({ ...(line as object), send: undefined })) });
        expect(bare(withTipsOff)).toEqual(bare(plain));
    });

    it('a text-only next step (NS-1, NS-3, NS-11) carries no send view even with an offer', async () => {
        const twins = await modelOf({ '.specs/backlog/0002-b.md': specText(), '.specs/backlog/0002-c.md': specText() });
        const next = await nextOf(twins, '.specs/backlog/0002-b.md', { offer: OFFER_A });
        expect(next.rule).toBe('NS-11');
        expect('send' in next).toBe(false);
        const done = await modelOf({ '.specs/done/0003-d.md': specText({ status: 'Implemented', plan: '[0003-d.2026-11-01.plan.md](../plan-archive/0003-d.2026-11-01.plan.md)' }) });
        const doneNext = await nextOf(done, '.specs/done/0003-d.md', { offer: OFFER_B });
        expect(doneNext.rule).toBe('NS-3');
        expect('send' in doneNext).toBe(false);
    });

    it('the toggletip closing pair follows the offer: Send sentence third, settings sentence fourth; without it 0021\'s third', async () => {
        const model = await modelOf({ '.specs/backlog/0002-b.md': specText() });
        const key = '.specs/backlog/0002-b.md';
        const offered = await nextOf(model, key, { offer: OFFER_B, tips: SHOW });
        expect(offered.tips?.about[2]).toBe('Send to Claude Code puts the prompt into its chat and sends nothing: choose the model there, check the prompt, then send it.');
        expect(offered.tips?.about[3]).toBe("Settings (gear in the Specs view): Show Step Tips hides these tips; Model Hints names your models; Assistant opens your AI assistant's chat with the prompt.");
        const plain = await nextOf(model, key, { tips: SHOW });
        expect(plain.tips?.about[2]).toBe('Choose the chat and the model in your AI assistant before you paste.');
        expect(plain.tips?.about[3]).toBe(offered.tips?.about[3]);
    });
});


describe('0026 AC-021: the detail says Send, not Paste, when a Send is offered', () => {
    async function aboutOf(offer: { assistant: 'copilot' | 'claudeCode' } | undefined): Promise<string[]> {
        const model = await modelOf(FILES);
        const view = spec(buildDetail({ selection: { stem: '0001-a' }, model, history: NO_HISTORY, tips: parseStepTipSettings(true, {}), ...(offer === undefined ? {} : { offer }) }));
        return view.nextStep !== undefined && 'tips' in view.nextStep ? (view.nextStep.tips?.about ?? []) : [];
    }

    it('returned work: with Copilot or Claude Code the then-sentence is Send it once …, with none it stays Paste it once …', async () => {
        for (const offer of [{ assistant: 'copilot' as const }, { assistant: 'claudeCode' as const }]) {
            const about = await aboutOf(offer);
            expect(about[0], offer.assistant).toMatch(/ Send it once every worker you started is back\.$/);
            expect(about[0]).not.toMatch(/Paste/);
        }
        expect((await aboutOf(undefined))[0]).toMatch(/ Paste it once every worker you started is back\.$/);
    });
});
