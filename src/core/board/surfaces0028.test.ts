import { afterEach, describe, expect, it } from 'vitest';
import { stepShortForm } from '../../shared/protocol/nextStepTexts';
import { createEntryWorld, type EntryWorld } from '../copyNextStep/testing/entryWorld';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import { buildOverviewView } from '../overview/overviewView';
import type { ShellModel } from '../ports/shell';
import { parseStepTipSettings } from '../settings/stepTipSettings';
import { buildSpecTree, type SpecRowModel } from '../shell/specTree';
import { buildCards } from './cards';
import { buildDetail } from './detail';
import { arrangeBoard } from './filters';
import { modelOf } from './testing/boardWorld';
import { CASE_FIXTURES, SPLITTER_SPEC } from './testing/caseFixtures';
import { specText, planText } from '../lifecycle/testing/projects';

const OLD_TEXT = 'Let the agent report where the plan stands';
const HISTORY = { available: true as const, label: 'Observed', entries: [] };
const OTHER = {
    '.specs/active/0002-other.md': specText({ status: 'In Progress', plan: '[0002-other.plan.md](0002-other.plan.md)' }),
    '.specs/active/0002-other.plan.md': `${planText({ status: 'In Progress' })}\n## Steps\n\n### T-001 — Open\n\n- [ ] **Verified (T-001):** —\n`,
};

async function world(name: string, extra: Record<string, string> = OTHER): Promise<ShellModel> {
    return modelOf({ ...CASE_FIXTURES[name]!, ...extra });
}

function surfacesOf(model: ShellModel): string {
    const cards = buildCards(model.project, model.lifecycle);
    const columns = arrangeBoard(cards, {}, 'number');
    const overview = buildOverviewView({ model, history: HISTORY, tips: parseStepTipSettings(true, {}) });
    const details = model.lifecycle.entries.map((entry) => buildDetail({ selection: { stem: entry.stem, path: entry.key }, model, history: HISTORY, tips: parseStepTipSettings(true, {}) }));
    const tree = buildSpecTree({ projectActive: true, projectName: 'demo', projectCount: 1, state: undefined, model });
    return JSON.stringify({ columns, overview, details, tree });
}

function rowsOf(model: ShellModel): SpecRowModel[] {
    const tree = buildSpecTree({ projectActive: true, projectName: 'demo', projectCount: 1, state: undefined, model });
    return tree.items.flatMap((item) => (item.kind === 'group' ? item.children : []));
}

let entryWorld: EntryWorld | undefined;

afterEach(() => entryWorld?.dispose());

describe('0028 AC-006: a finished plan is Review on every surface, a plan with the sign shows Report first', () => {
    it.each(['ac001-plan-in-progress', 'ac001-plan-not-started', 'ac001-plan-no-status', 'ac001-in-progress-with-done-note'])(
        '%s: detail, Board card and column, Now row and order, tree row, badge, status bar and quick pick show Review and /sdd-compile',
        async (name) => {
            const model = await world(name);
            const entry = model.lifecycle.entries.find((candidate) => candidate.key === SPLITTER_SPEC)!;
            expect(entry.state).toBe('Review');
            const detail = buildDetail({ selection: { stem: entry.stem, path: entry.key }, model, history: HISTORY });
            expect(detail).toMatchObject({ kind: 'spec', state: 'Review', nextStep: { rule: 'NS-5', lines: [{ text: `/sdd-compile ${SPLITTER_SPEC}` }, { text: `/sdd-lifecycle ${SPLITTER_SPEC}` }] } });
            const cards = buildCards(model.project, model.lifecycle);
            expect(cards.find((card) => card.key === SPLITTER_SPEC)).toMatchObject({ state: 'Review', step: { intent: 'Verify', short: '/sdd-compile' } });
            const columns = arrangeBoard(cards, {}, 'number');
            expect(columns.find((column) => column.state === 'Review')!.cards.map((card) => card.key)).toEqual([SPLITTER_SPEC]);
            expect(columns.find((column) => column.state === 'Active')!.cards.map((card) => card.key)).toEqual(['.specs/active/0002-other.md']);
            const overview = buildOverviewView({ model, history: HISTORY });
            expect(overview.now.rows.map((row) => [row.state, row.step?.short])).toEqual([['Review', '/sdd-compile'], ['Active', 'Implement T-001']]);
            const row = rowsOf(model).find((candidate) => candidate.specKey === SPLITTER_SPEC)!;
            expect(row.state).toBe('Review');
            expect(row.description).toBe('/sdd-compile');
            expect(row.tooltip).toContain('/sdd-compile');
            const tree = buildSpecTree({ projectActive: true, projectName: 'demo', projectCount: 1, state: undefined, model });
            expect(tree.badge).toMatchObject({ value: 1 });
            entryWorld = createEntryWorld();
            entryWorld.setModel(model);
            entryWorld.setProjects([{ name: 'proj', root: model.project.root }], 'proj');
            expect(entryWorld.text()).toBe('$(checklist) 0001 · Review · /sdd-compile');
            const shown = entryWorld.last();
            expect(shown !== undefined && shown !== 'hidden' && JSON.stringify(shown.tooltip)).toContain('**0001 · Review** Spec\\n\\nHave the result verified');
            const steps = entryWorld.entry.situation();
            expect(steps.kind === 'current' ? steps.steps.map((step) => `${step.state} · ${stepShortForm(step.step)}`) : []).toEqual(['Review · Verify · /sdd-compile', 'Active · Continue · Implement T-001']);
            expect(surfacesOf(model)).not.toContain(OLD_TEXT);
        },
    );

    it('AC-004 fixture below 1.11.0: the detail, card, Now row, tree row and status bar show Report first, the state is Active', async () => {
        const model = await world('ac004-report-first', {});
        const entry = model.lifecycle.entries[0]!;
        expect(entry.state).toBe('Active');
        const detail = buildDetail({ selection: { stem: entry.stem, path: entry.key }, model, history: HISTORY });
        expect(detail).toMatchObject({ nextStep: { lines: [{ text: `/sdd-plan ${SPLITTER_SPEC}` }, { text: expect.stringContaining('Implement T-003 of') }] } });
        expect(buildCards(model.project, model.lifecycle)[0]!.step).toMatchObject({ intent: 'Report', short: '/sdd-plan' });
        expect(buildOverviewView({ model, history: HISTORY }).now.rows[0]).toMatchObject({ state: 'Active', step: { intent: 'Report', short: '/sdd-plan' } });
        expect(rowsOf(model)[0]!.description).toBe('/sdd-plan');
        entryWorld = createEntryWorld();
        entryWorld.setModel(model);
        entryWorld.setProjects([{ name: 'proj', root: model.project.root }], 'proj');
        expect(entryWorld.text()).toBe('$(checklist) 0001 · Active · /sdd-plan');
        expect(surfacesOf(model)).not.toContain(OLD_TEXT);
    });

    it('negative control: a plan Not started with an open step is Active with Continue, not Review', async () => {
        const model = await modelOf(OTHER);
        expect(model.lifecycle.entries[0]).toMatchObject({ state: 'Active' });
        expect(buildCards(model.project, model.lifecycle)[0]!.step).toMatchObject({ intent: 'Continue', short: 'Implement T-001' });
        expect(deriveLifecycle(model.project).entries[0]!.state).toBe('Active');
    });

    it('negative control: the old text is found where a plan really has no open step (all steps struck)', async () => {
        const model = await world('ac002-struck-only', {});
        expect(surfacesOf(model)).toContain(OLD_TEXT);
    });
});
