import { describe, expect, it } from 'vitest';
import { NEXT_STEP_DONE_TEXT, NEXT_STEP_THEN_AFTER_READY_LABEL, NEXT_STEP_THEN_LABEL, NEXT_STEP_UNREADABLE_TEXT, nextStepNumberUsedText } from '../../shared/protocol/nextStepTexts';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import { planText, readMemory, ROOT, specText, VERSION } from '../lifecycle/testing/projects';
import { createMemorySpecSource } from '../specs/testing/memorySpecSource';
import { readProject } from '../specs/readProject';
import type { ShellModel } from '../ports/shell';
import { modelOf } from './testing/boardWorld';
import { nextStep } from './nextStep';

const BACKLOG = '.specs/backlog/0007-x.md';
const BACKLOG_PLAN = '.specs/backlog/0007-x.plan.md';
const LINK = '[0007-x.plan.md](0007-x.plan.md)';
const ARCHIVE = '[0007-x.2026-11-01.plan.md](../plan-archive/0007-x.2026-11-01.plan.md)';

function plan(steps: Array<[string, string]>, status = 'Not started'): string {
    const body = steps.map(([id, mark]) => `### ${id} — Step\n\n- ${mark} **Verified (${id}):** —\n`).join('\n');
    return `${planText({ status })}\n## Steps\n\n${body}`;
}

async function model(files: Record<string, string>): Promise<ShellModel> {
    return modelOf(files);
}

describe('AC-004: the next step is derived from the model, one fixture per rule', () => {
    it('NS-7: a Ready spec starts the first step that is neither ticked nor struck', async () => {
        const m = await model({ [BACKLOG]: specText({ plan: LINK }), [BACKLOG_PLAN]: plan([['T-001', '[ ]'], ['T-002', '[ ]']]) });
        expect(deriveLifecycle(m.project).entries[0].state).toBe('Ready');
        expect(nextStep(m, BACKLOG)).toEqual({ rule: 'NS-7', lines: [{ text: 'Start T-001 of .specs/backlog/0007-x.plan.md' }] });
    });

    it('NS-7: ticked and struck steps are skipped; an undetermined tick counts as not ticked', async () => {
        const skipped = await model({
            [BACKLOG]: specText({ plan: LINK }),
            [BACKLOG_PLAN]: `${planText()}\n## Steps\n\n### T-001 — A\n\n- [x] **Verified (T-001):** done\n\n### ~~T-002 — B~~\n\n- [ ] **Verified (T-002):** —\n\n### T-003 — C\n\n- [ ] **Verified (T-003):** —\n`,
        });
        expect(nextStep(skipped, BACKLOG)).toEqual({ rule: 'NS-7', lines: [{ text: 'Start T-003 of .specs/backlog/0007-x.plan.md' }] });
        const undetermined = await model({
            [BACKLOG]: specText({ plan: LINK }),
            [BACKLOG_PLAN]: `${planText()}\n## Steps\n\n### T-001 — A\n\n- [x] **Verified (T-001):** done\n\n### T-002 — B\n\nplain text, no tick line\n`,
        });
        expect(nextStep(undetermined, BACKLOG)).toEqual({ rule: 'NS-7', lines: [{ text: 'Start T-002 of .specs/backlog/0007-x.plan.md' }] });
    });

    it('NS-7 negative control: a Ready spec without an open step reads Implement <plan path>', async () => {
        const m = await model({ [BACKLOG]: specText({ plan: LINK }), [BACKLOG_PLAN]: plan([['T-001', '[x]']]) });
        expect(deriveLifecycle(m.project).entries[0].state).toBe('Ready');
        expect(nextStep(m, BACKLOG)).toEqual({ rule: 'NS-7', lines: [{ text: 'Implement .specs/backlog/0007-x.plan.md' }] });
    });

    it('NS-8: a backlog spec without a criterion needs /sdd-specify', async () => {
        const m = await model({ [BACKLOG]: specText({ criteria: false }) });
        expect(nextStep(m, BACKLOG)).toEqual({ rule: 'NS-8', lines: [{ text: `/sdd-specify ${BACKLOG}` }] });
    });

    it('NS-9: a backlog spec with criteria and no plan needs /sdd-clarify, then /sdd-plan', async () => {
        const m = await model({ [BACKLOG]: specText() });
        expect(nextStep(m, BACKLOG)).toEqual({
            rule: 'NS-9',
            lines: [{ text: `/sdd-clarify ${BACKLOG}` }, { text: `/sdd-plan ${BACKLOG}`, label: NEXT_STEP_THEN_LABEL }],
        });
    });

    it('NS-10: any other backlog spec needs /sdd-plan', async () => {
        const m = await model({ [BACKLOG]: specText({ plan: LINK }), [BACKLOG_PLAN]: planText({ status: 'In Progress' }) });
        expect(deriveLifecycle(m.project).entries[0].state).toBe('Backlog');
        expect(nextStep(m, BACKLOG)).toEqual({ rule: 'NS-10', lines: [{ text: `/sdd-plan ${BACKLOG}` }] });
    });

    it('NS-6: an Active spec needs /sdd-plan', async () => {
        const key = '.specs/active/0007-x.md';
        const m = await model({ [key]: specText({ status: 'In Progress', plan: LINK }), '.specs/active/0007-x.plan.md': planText({ status: 'In Progress' }) });
        expect(nextStep(m, key)).toEqual({ rule: 'NS-6', lines: [{ text: `/sdd-plan ${key}` }] });
    });

    it('NS-5: a Review spec needs /sdd-compile, then /sdd-lifecycle after a READY verdict', async () => {
        const key = '.specs/active/0007-x.md';
        const m = await model({ [key]: specText({ status: 'In Progress', plan: LINK }), '.specs/active/0007-x.plan.md': planText({ status: 'Done' }) });
        expect(deriveLifecycle(m.project).entries[0].state).toBe('Review');
        expect(nextStep(m, key)).toEqual({
            rule: 'NS-5',
            lines: [{ text: `/sdd-compile ${key}` }, { text: `/sdd-lifecycle ${key}`, label: NEXT_STEP_THEN_AFTER_READY_LABEL }],
        });
    });

    it('NS-4: a Blocked spec with a sibling plan needs /sdd-plan; without one /sdd-overview', async () => {
        const key = '.specs/active/0007-x.md';
        const withPlan = await model({ [key]: specText({ status: 'In Progress', plan: LINK }), '.specs/active/0007-x.plan.md': planText({ status: 'Blocked' }) });
        expect(deriveLifecycle(withPlan.project).entries[0].state).toBe('Blocked');
        expect(nextStep(withPlan, key)).toEqual({ rule: 'NS-4', lines: [{ text: `/sdd-plan ${key}` }] });
        const withNote = await model({
            [BACKLOG]: specText(),
            '.memory-bank/activeContext.0007-T-002.md': '# Return note\n\n- **Status:** BLOCKED\n- **Files:** —\n- **Verified:** —\n- **Notes:** —\n',
        });
        const entry = deriveLifecycle(withNote.project).entries[0];
        expect(entry.state).toBe('Blocked');
        expect(nextStep(withNote, BACKLOG)).toEqual({ rule: 'NS-4', lines: [{ text: '/sdd-overview' }] });
    });

    it('NS-3: a Done spec has no step left, Deprecated and Baseline included', async () => {
        for (const status of ['Implemented', 'Deprecated', 'Baseline']) {
            const key = '.specs/done/0007-x.md';
            const m = await model({ [key]: specText({ status, plan: status === 'Baseline' ? '_none_' : ARCHIVE, origin: status === 'Baseline' ? 'Reverse — Brownfield' : undefined }) });
            expect(deriveLifecycle(m.project).entries[0].state).toBe('Done');
            expect(nextStep(m, key)).toEqual({ rule: 'NS-3', text: NEXT_STEP_DONE_TEXT });
        }
    });

    it('NS-1: an unreadable spec file names no line', async () => {
        const source = createMemorySpecSource();
        const key = '.specs/backlog/0007-x.md';
        source.setFile(ROOT, key, new Uint8Array([0xff, 0xfe, 0x00, 0xc3, 0x28]));
        const project = await readProject(source, ROOT, VERSION);
        expect(nextStep({ project, lifecycle: deriveLifecycle(project) }, key)).toEqual({ rule: 'NS-1', text: NEXT_STEP_UNREADABLE_TEXT });
    });

    it('NS-2: a lifecycle contradiction needs /sdd-lifecycle', async () => {
        const key = '.specs/active/0007-x.md';
        const m = await model({ [key]: specText({ status: 'Draft', plan: LINK }), '.specs/active/0007-x.plan.md': planText({ status: 'In Progress' }) });
        expect(nextStep(m, key)).toEqual({ rule: 'NS-2', lines: [{ text: `/sdd-lifecycle ${key}` }] });
    });

    it('NS-2: the same reference in two folders needs /sdd-lifecycle, for both files', async () => {
        const m = await model({ [BACKLOG]: specText({ plan: LINK }), '.specs/active/0007-x.md': specText({ status: 'In Progress' }) });
        expect(nextStep(m, BACKLOG)).toMatchObject({ rule: 'NS-2' });
        expect(nextStep(m, '.specs/active/0007-x.md')).toEqual({ rule: 'NS-2', lines: [{ text: '/sdd-lifecycle .specs/active/0007-x.md' }] });
    });

    it('NS-11: a number used by another slug names no command', async () => {
        const m = await model({ [BACKLOG]: specText(), '.specs/backlog/0007-y.md': specText() });
        expect(nextStep(m, BACKLOG)).toEqual({ rule: 'NS-11', text: nextStepNumberUsedText('0007') });
        expect(nextStep(m, '.specs/backlog/0007-y.md')).toEqual({ rule: 'NS-11', text: nextStepNumberUsedText('0007') });
    });

    it('NS-2 comes before NS-3 and NS-11: a Done spec with a duplicate in another folder needs /sdd-lifecycle (order, negative control)', async () => {
        const m = await model({ '.specs/done/0007-x.md': specText({ status: 'Implemented', plan: ARCHIVE }), [BACKLOG]: specText() });
        expect(m.project.specs.length).toBe(2);
        const done = nextStep(m, '.specs/done/0007-x.md');
        expect(done).toEqual({ rule: 'NS-2', lines: [{ text: '/sdd-lifecycle .specs/done/0007-x.md' }] });
    });

    it('NS-11 comes after NS-2 for the same file: both facts at once give NS-2', async () => {
        const m = await model({ [BACKLOG]: specText(), '.specs/active/0007-x.md': specText({ status: 'In Progress' }), '.specs/backlog/0007-y.md': specText() });
        expect(nextStep(m, '.specs/active/0007-x.md')).toMatchObject({ rule: 'NS-2' });
    });
});

describe('AC-004: determinism and unknown keys', () => {
    it('the same snapshot gives equal output twice', async () => {
        const m = await model({ [BACKLOG]: specText(), '.specs/active/0008-z.md': specText({ status: 'In Progress', plan: '[0008-z.plan.md](0008-z.plan.md)' }), '.specs/active/0008-z.plan.md': planText({ status: 'Done' }) });
        for (const entry of m.lifecycle.entries) {
            expect(nextStep(m, entry.key)).toEqual(nextStep(m, entry.key));
        }
        const again = await readMemory({ [BACKLOG]: specText() });
        expect(nextStep({ project: again, lifecycle: deriveLifecycle(again) }, BACKLOG)).toEqual(nextStep(m, BACKLOG));
    });

    it('a key that is not in the model has no next step', async () => {
        const m = await model({ [BACKLOG]: specText() });
        expect(nextStep(m, '.specs/backlog/0099-none.md')).toBeUndefined();
    });
});
