import { describe, expect, it } from 'vitest';
import { NEXT_STEP_DONE_TEXT, NEXT_STEP_UNREADABLE_TEXT, nextStepNumberUsedText, STEP_GUIDES, stepShortForm } from '../../shared/protocol/nextStepTexts';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import { planText, readMemory, ROOT, specText, VERSION } from '../lifecycle/testing/projects';
import { createMemorySpecSource } from '../specs/testing/memorySpecSource';
import { readProject } from '../specs/readProject';
import type { ShellModel } from '../ports/shell';
import { modelOf } from './testing/boardWorld';
import { nextStep, shortForm, stepView } from './nextStep';

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
        expect(nextStep(m, BACKLOG)).toMatchObject({ rule: 'NS-7', lines: [{ text: 'Start T-001 of .specs/backlog/0007-x.plan.md' }] });
    });

    it('NS-7: ticked and struck steps are skipped; an undetermined tick counts as not ticked', async () => {
        const skipped = await model({
            [BACKLOG]: specText({ plan: LINK }),
            [BACKLOG_PLAN]: `${planText()}\n## Steps\n\n### T-001 — A\n\n- [x] **Verified (T-001):** done\n\n### ~~T-002 — B~~\n\n- [ ] **Verified (T-002):** —\n\n### T-003 — C\n\n- [ ] **Verified (T-003):** —\n`,
        });
        expect(nextStep(skipped, BACKLOG)).toMatchObject({ rule: 'NS-7', lines: [{ text: 'Start T-003 of .specs/backlog/0007-x.plan.md' }] });
        const undetermined = await model({
            [BACKLOG]: specText({ plan: LINK }),
            [BACKLOG_PLAN]: `${planText()}\n## Steps\n\n### T-001 — A\n\n- [x] **Verified (T-001):** done\n\n### T-002 — B\n\nplain text, no tick line\n`,
        });
        expect(nextStep(undetermined, BACKLOG)).toMatchObject({ rule: 'NS-7', lines: [{ text: 'Start T-002 of .specs/backlog/0007-x.plan.md' }] });
    });

    it('NS-7 negative control: a Ready spec without an open step reads Implement <plan path>', async () => {
        const m = await model({ [BACKLOG]: specText({ plan: LINK }), [BACKLOG_PLAN]: plan([['T-001', '[x]']]) });
        expect(deriveLifecycle(m.project).entries[0].state).toBe('Ready');
        expect(nextStep(m, BACKLOG)).toMatchObject({ rule: 'NS-7', lines: [{ text: 'Implement .specs/backlog/0007-x.plan.md' }] });
    });

    it('NS-8: a backlog spec without a criterion needs /sdd-specify', async () => {
        const m = await model({ [BACKLOG]: specText({ criteria: false }) });
        expect(nextStep(m, BACKLOG)).toMatchObject({ rule: 'NS-8', lines: [{ text: `/sdd-specify ${BACKLOG}` }] });
    });

    it('NS-9: a backlog spec with criteria and no plan needs /sdd-clarify, then /sdd-plan', async () => {
        const m = await model({ [BACKLOG]: specText() });
        expect(nextStep(m, BACKLOG)).toMatchObject({
            rule: 'NS-9',
            lines: [{ text: `/sdd-clarify ${BACKLOG}` }, { text: `/sdd-plan ${BACKLOG}` }],
        });
    });

    it('NS-10: any other backlog spec needs /sdd-plan', async () => {
        const m = await model({ [BACKLOG]: specText({ plan: LINK }), [BACKLOG_PLAN]: planText({ status: 'In Progress' }) });
        expect(deriveLifecycle(m.project).entries[0].state).toBe('Backlog');
        expect(nextStep(m, BACKLOG)).toMatchObject({ rule: 'NS-10', lines: [{ text: `/sdd-plan ${BACKLOG}` }] });
    });

    it('NS-5: a Review spec needs /sdd-compile, then /sdd-lifecycle after a READY verdict', async () => {
        const key = '.specs/active/0007-x.md';
        const m = await model({ [key]: specText({ status: 'In Progress', plan: LINK }), '.specs/active/0007-x.plan.md': planText({ status: 'Done' }) });
        expect(deriveLifecycle(m.project).entries[0].state).toBe('Review');
        expect(nextStep(m, key)).toMatchObject({
            rule: 'NS-5',
            lines: [{ text: `/sdd-compile ${key}` }, { text: `/sdd-lifecycle ${key}` }],
        });
    });

    it('NS-4: a Blocked spec with a sibling plan needs /sdd-plan; without one /sdd-overview', async () => {
        const key = '.specs/active/0007-x.md';
        const withPlan = await model({ [key]: specText({ status: 'In Progress', plan: LINK }), '.specs/active/0007-x.plan.md': planText({ status: 'Blocked' }) });
        expect(deriveLifecycle(withPlan.project).entries[0].state).toBe('Blocked');
        expect(nextStep(withPlan, key)).toMatchObject({ rule: 'NS-4', lines: [{ text: `/sdd-plan ${key}` }] });
        const withNote = await model({
            [BACKLOG]: specText(),
            '.memory-bank/activeContext.0007-T-002.md': '# Return note\n\n- **Status:** BLOCKED\n- **Files:** —\n- **Verified:** —\n- **Notes:** —\n',
        });
        const entry = deriveLifecycle(withNote.project).entries[0];
        expect(entry.state).toBe('Blocked');
        expect(nextStep(withNote, BACKLOG)).toMatchObject({ rule: 'NS-4', lines: [{ text: '/sdd-overview' }] });
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
        expect(nextStep(m, key)).toMatchObject({ rule: 'NS-2', lines: [{ text: `/sdd-lifecycle ${key}` }] });
    });

    it('NS-2: the same reference in two folders needs /sdd-lifecycle, for both files', async () => {
        const m = await model({ [BACKLOG]: specText({ plan: LINK }), '.specs/active/0007-x.md': specText({ status: 'In Progress' }) });
        expect(nextStep(m, BACKLOG)).toMatchObject({ rule: 'NS-2' });
        expect(nextStep(m, '.specs/active/0007-x.md')).toMatchObject({ rule: 'NS-2', lines: [{ text: '/sdd-lifecycle .specs/active/0007-x.md' }] });
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
        expect(done).toMatchObject({ rule: 'NS-2', lines: [{ text: '/sdd-lifecycle .specs/done/0007-x.md' }] });
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

describe('0017 AC-001, AC-003: the step view', () => {
    it('AC-001: the short form of the first line of every rule, and line is the detail\'s first line with its path', async () => {
        const cases: Array<[string, Record<string, string>, string, string, string]> = [
            ['NS-7', { [BACKLOG]: specText({ plan: LINK }), [BACKLOG_PLAN]: plan([['T-003', '[ ]']]) }, BACKLOG, 'Start T-003', 'Start T-003 of .specs/backlog/0007-x.plan.md'],
            ['NS-7', { [BACKLOG]: specText({ plan: LINK }), [BACKLOG_PLAN]: plan([['T-001', '[x]']]) }, BACKLOG, 'Implement', 'Implement .specs/backlog/0007-x.plan.md'],
            ['NS-8', { [BACKLOG]: specText({ criteria: false }) }, BACKLOG, '/sdd-specify', `/sdd-specify ${BACKLOG}`],
            ['NS-9', { [BACKLOG]: specText() }, BACKLOG, '/sdd-clarify', `/sdd-clarify ${BACKLOG}`],
            ['NS-10', { [BACKLOG]: specText({ plan: LINK }), [BACKLOG_PLAN]: planText({ status: 'In Progress' }) }, BACKLOG, '/sdd-plan', `/sdd-plan ${BACKLOG}`],
            ['NS-6', { '.specs/active/0007-x.md': specText({ status: 'In Progress', plan: LINK }), '.specs/active/0007-x.plan.md': planText({ status: 'In Progress' }) }, '.specs/active/0007-x.md', '/sdd-plan', '/sdd-plan .specs/active/0007-x.md'],
            ['NS-5', { '.specs/active/0007-x.md': specText({ status: 'In Progress', plan: LINK }), '.specs/active/0007-x.plan.md': planText({ status: 'Done' }) }, '.specs/active/0007-x.md', '/sdd-compile', '/sdd-compile .specs/active/0007-x.md'],
            ['NS-4', { '.specs/active/0007-x.md': specText({ status: 'In Progress', plan: LINK }), '.specs/active/0007-x.plan.md': planText({ status: 'Blocked' }) }, '.specs/active/0007-x.md', '/sdd-plan', '/sdd-plan .specs/active/0007-x.md'],
            ['NS-2', { '.specs/active/0007-x.md': specText({ status: 'Draft', plan: LINK }), '.specs/active/0007-x.plan.md': planText({ status: 'In Progress' }) }, '.specs/active/0007-x.md', '/sdd-lifecycle', '/sdd-lifecycle .specs/active/0007-x.md'],
        ];
        for (const [rule, files, key, short, line] of cases) {
            const m = await model(files);
            const next = nextStep(m, key);
            expect(next).toMatchObject({ rule });
            const view = stepView(m, key);
            expect(view?.short, rule).toBe(short);
            expect(view?.line, rule).toBe(line);
            expect(view?.lines[0]?.text, rule).toBe((next as { lines: Array<{ text: string }> }).lines[0]?.text);
        }
    });

    it('AC-001: a spec without a step (NS-1, NS-3, NS-11) and an unknown key have no step view', async () => {
        const done = await model({ '.specs/done/0007-x.md': specText({ status: 'Implemented', plan: ARCHIVE }) });
        expect(stepView(done, '.specs/done/0007-x.md')).toBeUndefined();
        const twins = await model({ [BACKLOG]: specText(), '.specs/backlog/0007-y.md': specText() });
        expect(stepView(twins, BACKLOG)).toBeUndefined();
        const source = createMemorySpecSource();
        source.setFile(ROOT, BACKLOG, new Uint8Array([0xff, 0xfe, 0x00, 0xc3, 0x28]));
        const project = await readProject(source, ROOT, VERSION);
        expect(stepView({ project, lifecycle: deriveLifecycle(project) }, BACKLOG)).toBeUndefined();
        expect(stepView(done, '.specs/done/0099-none.md')).toBeUndefined();
    });

    it('AC-003: equal snapshots give equal views, also when read again', async () => {
        const files = { [BACKLOG]: specText(), '.specs/active/0008-z.md': specText({ status: 'In Progress', plan: '[0008-z.plan.md](0008-z.plan.md)' }), '.specs/active/0008-z.plan.md': planText({ status: 'In Progress' }) };
        const first = await model(files);
        const second = await model(files);
        for (const entry of first.lifecycle.entries) {
            expect(stepView(first, entry.key)).toEqual(stepView(second, entry.key));
        }
    });
});

function titled(steps: Array<[string, string, string]>, status = 'In Progress'): string {
    return `${planText({ status })}\n## Steps\n\n${steps.map(([id, title, mark]) => `### ${id} — ${title}\n\n- ${mark} **Verified (${id}):** —\n`).join('\n')}`;
}

const ACTIVE = '.specs/active/0007-x.md';
const ACTIVE_PLAN = '.specs/active/0007-x.plan.md';
const ACTIVE_LINK = '[0007-x.plan.md](0007-x.plan.md)';

describe('0021 AC-001: every next step line carries its intent, one fixture per row of §6.1 and §6.2', () => {
    const noPlan = { [ACTIVE]: specText({ status: 'In Progress', plan: ARCHIVE }) };
    const rows: Array<[string, Record<string, string>, string, string, Array<[string, string]>]> = [
        ['NS-2', { [ACTIVE]: specText({ status: 'Draft', plan: ACTIVE_LINK }), [ACTIVE_PLAN]: planText({ status: 'In Progress' }) }, ACTIVE, 'NS-2', [['Put folder and status back in line', `/sdd-lifecycle ${ACTIVE}`]]],
        ['NS-4 plan', { [ACTIVE]: specText({ status: 'In Progress', plan: ACTIVE_LINK }), [ACTIVE_PLAN]: planText({ status: 'Blocked' }) }, ACTIVE, 'NS-4-plan', [['Find out what blocks', `/sdd-plan ${ACTIVE}`]]],
        [
            'NS-4 no plan',
            { [BACKLOG]: specText(), '.memory-bank/activeContext.0007-T-002.md': '# Return note\n\n- **Status:** BLOCKED\n- **Files:** —\n- **Verified:** —\n- **Notes:** —\n' },
            BACKLOG,
            'NS-4',
            [['Find out what blocks', '/sdd-overview']],
        ],
        [
            'NS-5',
            { [ACTIVE]: specText({ status: 'In Progress', plan: ACTIVE_LINK }), [ACTIVE_PLAN]: planText({ status: 'Done' }) },
            ACTIVE,
            'NS-5',
            [['Have the result verified', `/sdd-compile ${ACTIVE}`], ['Then, after a READY verdict: close the spec', `/sdd-lifecycle ${ACTIVE}`]],
        ],
        [
            'NS-6 open',
            { [ACTIVE]: specText({ status: 'In Progress', plan: ACTIVE_LINK }), [ACTIVE_PLAN]: titled([['T-001', 'Done one', '[x]'], ['T-002', 'Reject money values', '[ ]']]) },
            ACTIVE,
            'NS-6-open',
            [['Continue with T-002 Reject money values', `Implement T-002 of ${ACTIVE_PLAN}`], ['Not sure where it stands? Let the agent report first', `/sdd-plan ${ACTIVE}`]],
        ],
        [
            'NS-6 resume',
            { [ACTIVE]: specText({ status: 'In Progress', plan: ACTIVE_LINK }), [ACTIVE_PLAN]: titled([['T-001', 'Done one', '[x]']]) },
            ACTIVE,
            'NS-6-resume',
            [['Let the agent report where the plan stands', `/sdd-plan ${ACTIVE}`]],
        ],
        ['NS-6 plan', noPlan, ACTIVE, 'NS-6-plan', [['Write the plan', `/sdd-plan ${ACTIVE}`]]],
        [
            'NS-7 step',
            { [BACKLOG]: specText({ plan: LINK }), [BACKLOG_PLAN]: plan([['T-001', '[ ]']]) },
            BACKLOG,
            'NS-7',
            [['Start implementing: T-001 Step', `Start T-001 of ${BACKLOG_PLAN}`]],
        ],
        ['NS-7 no step', { [BACKLOG]: specText({ plan: LINK }), [BACKLOG_PLAN]: plan([['T-001', '[x]']]) }, BACKLOG, 'NS-7', [['Start implementing the plan', `Implement ${BACKLOG_PLAN}`]]],
        ['NS-8', { [BACKLOG]: specText({ criteria: false }) }, BACKLOG, 'NS-8', [['Add acceptance criteria', `/sdd-specify ${BACKLOG}`]]],
        [
            'NS-9',
            { [BACKLOG]: specText() },
            BACKLOG,
            'NS-9',
            [['Have the spec challenged, then plan it', `/sdd-clarify ${BACKLOG}`], ['Then: write the plan', `/sdd-plan ${BACKLOG}`]],
        ],
        ['NS-10', { [BACKLOG]: specText({ plan: LINK }), [BACKLOG_PLAN]: planText({ status: 'In Progress' }) }, BACKLOG, 'NS-10', [['Write the plan', `/sdd-plan ${BACKLOG}`]]],
    ];

    it.each(rows)('%s: case, intent and prompt of every line, literally', async (_name, files, key, expectedCase, lines) => {
        const m = await model(files);
        const next = nextStep(m, key);
        expect(next).toEqual({ rule: expect.stringMatching(/^NS-\d+$/), case: expectedCase, lines: lines.map(([intent, text]) => ({ intent, text })) });
    });

    it('the guide of each case: short intent, session, model, effect and then-sentence literally (§6.1, §6.2)', () => {
        expect(STEP_GUIDES).toEqual({
            'NS-2': { short: 'Fix status', session: 'any', model: 'fast', effect: 'The agent compares folder, status and plan (or both copies of the spec) and proposes the move that brings them in line.', then: 'You confirm the move; the Studio follows the files.' },
            'NS-4': { short: 'Unblock', session: 'any', model: 'fast', effect: 'The agent shows the workflow and where every spec stands.', then: 'Once the block is solved, the spec shows its next step again.' },
            'NS-4-plan': { short: 'Unblock', session: 'any', model: 'strong', effect: 'The agent takes in returned work, checks the plan against the code and reports what blocks.', then: 'Once the block is solved, the spec shows its next step again.' },
            'NS-5': { short: 'Verify', session: 'new', model: 'strongOtherFamily', effect: 'A fresh reviewer checks every acceptance criterion against evidence and gives a verdict.', then: 'Only after a READY verdict, close the spec with the second prompt.' },
            'NS-6-open': { short: 'Continue', session: 'sameOrNew', model: 'fast', effect: 'The agent builds this one step, runs its check, ticks it and stops.', then: 'When it stops, the Studio shows the next step; a working agreement such as a test review may stop it earlier.' },
            'NS-6-resume': { short: 'Resume', session: 'any', model: 'fast', effect: 'The agent checks the plan against the code; with every step ticked it closes the plan and recommends the review.', then: 'The spec then shows Verify.' },
            'NS-6-returned': { short: 'Integrate', session: 'sameOrNew', model: 'fast', effect: 'The agent checks each returned step against its files, runs its check and the quality gates, then ticks the steps and removes the return notes.', then: 'Paste it once every worker you started is back.' },
            'NS-6-plan': { short: 'Plan', session: 'any', model: 'strongWebSearch', effect: 'The agent researches and writes the plan; for a reactivated spec, a fresh plan for the change.', then: 'You read the plan before anything is built.' },
            'NS-7': { short: 'Build', session: 'any', model: 'fast', effect: 'The agent moves the spec to active, builds one step, runs its check, ticks it and stops.', then: 'When it stops, the Studio shows the next step; a working agreement such as a test review may stop it earlier.' },
            'NS-8': { short: 'Add criteria', session: 'any', model: 'strong', effect: 'The agent goes through the spec with you and adds testable acceptance criteria.', then: 'Then the spec is challenged and planned.' },
            'NS-9': { short: 'Challenge', session: 'new', model: 'strong', effect: 'A fresh reader looks for gaps, contradictions and untestable criteria.', then: 'Then write the plan with the second prompt, in any chat.' },
            'NS-10': { short: 'Plan', session: 'any', model: 'strongWebSearch', effect: 'The agent researches and writes the plan as small, verifiable steps.', then: 'You read the plan before anything is built.' },
        });
    });

    it('NS-1, NS-3 and NS-11 keep their text and carry no case, intent or line', async () => {
        const done = await model({ '.specs/done/0007-x.md': specText({ status: 'Implemented', plan: ARCHIVE }) });
        expect(nextStep(done, '.specs/done/0007-x.md')).toEqual({ rule: 'NS-3', text: NEXT_STEP_DONE_TEXT });
        const twins = await model({ [BACKLOG]: specText(), '.specs/backlog/0007-y.md': specText() });
        expect(nextStep(twins, BACKLOG)).toEqual({ rule: 'NS-11', text: nextStepNumberUsedText('0007') });
    });
});

describe('0021 AC-002: the prompts of every rule but NS-6 are those of the baseline', () => {
    const cases: Array<[string, Record<string, string>, string, string[]]> = [
        ['NS-7', { [BACKLOG]: specText({ plan: LINK }), [BACKLOG_PLAN]: plan([['T-001', '[ ]']]) }, BACKLOG, [`Start T-001 of ${BACKLOG_PLAN}`]],
        ['NS-7', { [BACKLOG]: specText({ plan: LINK }), [BACKLOG_PLAN]: plan([['T-001', '[x]']]) }, BACKLOG, [`Implement ${BACKLOG_PLAN}`]],
        ['NS-8', { [BACKLOG]: specText({ criteria: false }) }, BACKLOG, [`/sdd-specify ${BACKLOG}`]],
        ['NS-9', { [BACKLOG]: specText() }, BACKLOG, [`/sdd-clarify ${BACKLOG}`, `/sdd-plan ${BACKLOG}`]],
        ['NS-10', { [BACKLOG]: specText({ plan: LINK }), [BACKLOG_PLAN]: planText({ status: 'In Progress' }) }, BACKLOG, [`/sdd-plan ${BACKLOG}`]],
        ['NS-5', { [ACTIVE]: specText({ status: 'In Progress', plan: ACTIVE_LINK }), [ACTIVE_PLAN]: planText({ status: 'Done' }) }, ACTIVE, [`/sdd-compile ${ACTIVE}`, `/sdd-lifecycle ${ACTIVE}`]],
        ['NS-4', { [ACTIVE]: specText({ status: 'In Progress', plan: ACTIVE_LINK }), [ACTIVE_PLAN]: planText({ status: 'Blocked' }) }, ACTIVE, [`/sdd-plan ${ACTIVE}`]],
        ['NS-4', { [BACKLOG]: specText(), '.memory-bank/activeContext.0007-T-002.md': '# Return note\n\n- **Status:** BLOCKED\n- **Files:** —\n- **Verified:** —\n- **Notes:** —\n' }, BACKLOG, ['/sdd-overview']],
        ['NS-2', { [ACTIVE]: specText({ status: 'Draft', plan: ACTIVE_LINK }), [ACTIVE_PLAN]: planText({ status: 'In Progress' }) }, ACTIVE, [`/sdd-lifecycle ${ACTIVE}`]],
    ];

    it.each(cases)('%s: rule and prompt literals', async (rule, files, key, prompts) => {
        const next = nextStep(await model(files), key);
        expect(next).toMatchObject({ rule });
        expect((next as { lines: Array<{ text: string }> }).lines.map((line) => line.text)).toEqual(prompts);
    });
});

describe('0021 AC-003: an Active spec leads with the single-step prompt of its open step', () => {
    const A = '.specs/active/0001-a.md';
    const B = '.specs/active/0002-b.md';
    const link = (stem: string) => `[${stem}.plan.md](${stem}.plan.md)`;
    const ticked = `${planText({ status: 'In Progress' })}\n## Steps\n\n### T-001 — A\n\n- [x] **Verified (T-001):** done\n`;
    const open = `${planText({ status: 'In Progress' })}\n## Steps\n\n### T-001 — A\n\n- [ ] **Verified (T-001):** —\n`;

    it('T-003 "Reject money values" is built by Implement T-003 of <plan>, then /sdd-plan <spec> under its own intent', async () => {
        const key = '.specs/active/0001-tip-splitter.md';
        const m = await model({
            [key]: specText({ status: 'In Progress', plan: link('0001-tip-splitter') }),
            '.specs/active/0001-tip-splitter.plan.md': titled([['T-001', 'One', '[x]'], ['T-002', 'Two', '[x]'], ['T-003', 'Reject money values', '[ ]']]),
        });
        expect(nextStep(m, key)).toEqual({
            rule: 'NS-6',
            case: 'NS-6-open',
            lines: [
                { intent: 'Continue with T-003 Reject money values', text: 'Implement T-003 of .specs/active/0001-tip-splitter.plan.md' },
                { intent: 'Not sure where it stands? Let the agent report first', text: `/sdd-plan ${key}` },
            ],
        });
    });

    it('with two Active specs the one with an open step leads with Implement, the other with the report, in either order', async () => {
        for (const [planA, planB] of [[ticked, open], [open, ticked]] as const) {
            const m = await model({
                [A]: specText({ status: 'In Progress', plan: link('0001-a') }),
                '.specs/active/0001-a.plan.md': planA,
                [B]: specText({ status: 'In Progress', plan: link('0002-b') }),
                '.specs/active/0002-b.plan.md': planB,
            });
            const firsts = (key: string) => (nextStep(m, key) as { lines: Array<{ text: string }> }).lines.map((line) => line.text);
            expect(firsts(A)).toEqual(planA === open ? ['Implement T-001 of .specs/active/0001-a.plan.md', `/sdd-plan ${A}`] : [`/sdd-plan ${A}`]);
            expect(firsts(B)).toEqual(planB === open ? ['Implement T-001 of .specs/active/0002-b.plan.md', `/sdd-plan ${B}`] : [`/sdd-plan ${B}`]);
        }
    });
});

describe('0021 AC-005: an Active spec without an open step reports, one without a sibling plan writes it', () => {
    it('no step list, all steps ticked or struck, and an unreadable plan read as Resume', async () => {
        const noList = await model({ [ACTIVE]: specText({ status: 'In Progress', plan: ACTIVE_LINK }), [ACTIVE_PLAN]: planText({ status: 'In Progress' }) });
        const allDone = await model({
            [ACTIVE]: specText({ status: 'In Progress', plan: ACTIVE_LINK }),
            [ACTIVE_PLAN]: `${planText({ status: 'In Progress' })}\n## Steps\n\n### T-001 — A\n\n- [x] **Verified (T-001):** done\n\n### ~~T-002 — B~~\n\n- [ ] **Verified (T-002):** —\n`,
        });
        const unreadable = createMemorySpecSource();
        unreadable.setFile(ROOT, ACTIVE, specText({ status: 'In Progress', plan: ACTIVE_LINK }));
        unreadable.setFile(ROOT, ACTIVE_PLAN, planText({ status: 'In Progress' }));
        unreadable.setUnreadable(ROOT, ACTIVE_PLAN, 'EACCES');
        const binary = createMemorySpecSource();
        binary.setFile(ROOT, ACTIVE, specText({ status: 'In Progress', plan: ACTIVE_LINK }));
        binary.setFile(ROOT, ACTIVE_PLAN, new Uint8Array([0xff, 0xfe, 0x00, 0xc3, 0x28]));
        const broken: ShellModel[] = [];
        for (const source of [unreadable, binary]) {
            const project = await readProject(source, ROOT, VERSION);
            broken.push({ project, lifecycle: deriveLifecycle(project) });
        }
        for (const m of [noList, allDone, ...broken]) {
            expect(m.lifecycle.entries.find((entry) => entry.key === ACTIVE)?.plan).toBe(ACTIVE_PLAN);
            expect(nextStep(m, ACTIVE)).toEqual({ rule: 'NS-6', case: 'NS-6-resume', lines: [{ intent: 'Let the agent report where the plan stands', text: `/sdd-plan ${ACTIVE}` }] });
        }
    });

    it('a spec without a sibling plan writes the plan under the same prompt', async () => {
        const m = await model({ [ACTIVE]: specText({ status: 'In Progress', plan: ARCHIVE }) });
        expect(nextStep(m, ACTIVE)).toEqual({ rule: 'NS-6', case: 'NS-6-plan', lines: [{ intent: 'Write the plan', text: `/sdd-plan ${ACTIVE}` }] });
    });
});

describe('0021 AC-019: the title of an open step in an intent', () => {
    const open = (title: string) => model({ [ACTIVE]: specText({ status: 'In Progress', plan: ACTIVE_LINK }), [ACTIVE_PLAN]: titled([['T-004', title, '[ ]']]) });
    const first = (next: ReturnType<typeof nextStep>) => (next as { lines: Array<{ intent: string }> }).lines[0]!.intent;

    it('no title gives the ID alone, no trailing space, in NS-6 and NS-7', async () => {
        expect(first(nextStep(await open(''), ACTIVE))).toBe('Continue with T-004');
        const ready = await model({ [BACKLOG]: specText({ plan: LINK }), [BACKLOG_PLAN]: titled([['T-004', '', '[ ]']], 'Not started') });
        expect(first(nextStep(ready, BACKLOG))).toBe('Start implementing: T-004');
    });

    it('Markdown and a link are shown as plain text; over 80 characters the title is cut at a word with an ellipsis', async () => {
        expect(first(nextStep(await open('**Reject** [money](x.md) `values`'), ACTIVE))).toBe('Continue with T-004 Reject money values');
        const long = `${'word '.repeat(30)}end`;
        const shown = first(nextStep(await open(long), ACTIVE));
        expect(shown.startsWith('Continue with T-004 word word')).toBe(true);
        expect(shown.endsWith('…')).toBe(true);
        expect(shown.length - 'Continue with T-004 '.length).toBeLessThanOrEqual(80);
    });

    it('negative control: a plain short title is shown whole', async () => {
        expect(first(nextStep(await open('Reject money values'), ACTIVE))).toBe('Continue with T-004 Reject money values');
    });
});

describe('0021 AC-006: the step short form of every case', () => {
    const reviewing = { [ACTIVE]: specText({ status: 'In Progress', plan: ACTIVE_LINK }), [ACTIVE_PLAN]: planText({ status: 'Done' }) };
    const cases: Array<[string, Record<string, string>, string, string, string, string]> = [
        ['NS-5', reviewing, ACTIVE, 'Verify', '/sdd-compile', 'Verify · /sdd-compile'],
        ['NS-6 open', { [ACTIVE]: specText({ status: 'In Progress', plan: ACTIVE_LINK }), [ACTIVE_PLAN]: titled([['T-003', 'Reject money values', '[ ]']]) }, ACTIVE, 'Continue', 'Implement T-003', 'Continue · Implement T-003'],
        ['NS-6 resume', { [ACTIVE]: specText({ status: 'In Progress', plan: ACTIVE_LINK }), [ACTIVE_PLAN]: titled([['T-003', 'Done', '[x]']]) }, ACTIVE, 'Resume', '/sdd-plan', 'Resume · /sdd-plan'],
        ['NS-6 plan', { [ACTIVE]: specText({ status: 'In Progress', plan: ARCHIVE }) }, ACTIVE, 'Plan', '/sdd-plan', 'Plan · /sdd-plan'],
        ['NS-7 step', { [BACKLOG]: specText({ plan: LINK }), [BACKLOG_PLAN]: plan([['T-001', '[ ]']]) }, BACKLOG, 'Build', 'Start T-001', 'Build · Start T-001'],
        ['NS-7 plan', { [BACKLOG]: specText({ plan: LINK }), [BACKLOG_PLAN]: plan([['T-001', '[x]']]) }, BACKLOG, 'Build', 'Implement', 'Build · Implement'],
        ['NS-8', { [BACKLOG]: specText({ criteria: false }) }, BACKLOG, 'Add criteria', '/sdd-specify', 'Add criteria · /sdd-specify'],
        ['NS-9', { [BACKLOG]: specText() }, BACKLOG, 'Challenge', '/sdd-clarify', 'Challenge · /sdd-clarify'],
        ['NS-10', { [BACKLOG]: specText({ plan: LINK }), [BACKLOG_PLAN]: planText({ status: 'In Progress' }) }, BACKLOG, 'Plan', '/sdd-plan', 'Plan · /sdd-plan'],
        ['NS-2', { [ACTIVE]: specText({ status: 'Draft', plan: ACTIVE_LINK }), [ACTIVE_PLAN]: planText({ status: 'In Progress' }) }, ACTIVE, 'Fix status', '/sdd-lifecycle', 'Fix status · /sdd-lifecycle'],
    ];

    it.each(cases)('%s: short intent, command short form and the joined step short form', async (_name, files, key, intent, short, joined) => {
        const view = stepView(await model(files), key)!;
        expect(view.intent).toBe(intent);
        expect(view.short).toBe(short);
        expect(stepShortForm(view)).toBe(joined);
    });

    it('shortForm cuts a command at its name, a start at its id, an implement of a step at its id, a plan implement at its verb (control: other text stays)', () => {
        expect(shortForm('/sdd-plan .specs/active/0007-x.md')).toBe('/sdd-plan');
        expect(shortForm('/sdd-overview')).toBe('/sdd-overview');
        expect(shortForm('Start T-003 of .specs/backlog/0007-x.plan.md')).toBe('Start T-003');
        expect(shortForm('Implement T-003 of .specs/active/0007-x.plan.md')).toBe('Implement T-003');
        expect(shortForm('Implement .specs/backlog/0007-x.plan.md')).toBe('Implement');
        expect(shortForm('continue')).toBe('continue');
    });

    it('equal snapshots give equal step views, also when read again', async () => {
        const files = { [ACTIVE]: specText({ status: 'In Progress', plan: ACTIVE_LINK }), [ACTIVE_PLAN]: titled([['T-003', 'X', '[ ]']]) };
        expect(stepView(await model(files), ACTIVE)).toEqual(stepView(await model(files), ACTIVE));
    });
});

describe('0023 AC-013: returned work is the first case of an Active spec', () => {
    const noteLines = (status: string, extra = '') => `# Return note\n\n- **Status:** ${status}\n- **Files:** —\n- **Verified:** —\n- **Notes:** —\n${extra}`;
    const base = { [ACTIVE]: specText({ status: 'In Progress', plan: ACTIVE_LINK }), [ACTIVE_PLAN]: titled([['T-001', 'One', '[x]'], ['T-002', 'Two', '[ ]']]) };
    const integrate = { rule: 'NS-6', case: 'NS-6-returned', lines: [{ intent: 'Integrate the returned steps', text: `/sdd-plan ${ACTIVE}` }] };

    it.each([
        ['a DONE note of an open step', { '.memory-bank/activeContext.0007-T-002.md': noteLines('DONE') }],
        ['a DONE note of a ticked step', { '.memory-bank/activeContext.0007-T-001.md': noteLines('DONE') }],
        ['a note for an ID the plan lacks', { '.memory-bank/activeContext.0007-T-099.md': noteLines('DONE') }],
        ['a note of another status', { '.memory-bank/activeContext.0007-T-002.md': noteLines('WIP') }],
    ])('%s: one line, /sdd-plan <spec>, the intent Integrate the returned steps', async (_name, note) => {
        const m = await model({ ...base, ...note });
        expect(nextStep(m, ACTIVE)).toEqual(integrate);
        expect(stepView(m, ACTIVE)).toEqual({
            intent: 'Integrate',
            short: '/sdd-plan',
            line: `/sdd-plan ${ACTIVE}`,
            lines: [{ intent: 'Integrate the returned steps', text: `/sdd-plan ${ACTIVE}` }],
        });
        expect(stepShortForm(stepView(m, ACTIVE)!)).toBe('Integrate · /sdd-plan');
    });

    it('an unreadable note counts as a return note', async () => {
        const source = createMemorySpecSource();
        source.setFile(ROOT, ACTIVE, base[ACTIVE]);
        source.setFile(ROOT, ACTIVE_PLAN, base[ACTIVE_PLAN]);
        source.setUnreadable(ROOT, '.memory-bank/activeContext.0007-T-002.md', 'EACCES');
        const project = await readProject(source, ROOT, VERSION);
        expect(nextStep({ project, lifecycle: deriveLifecycle(project) }, ACTIVE)).toEqual(integrate);
    });

    it('the note of another spec does not integrate this one', async () => {
        const m = await model({ ...base, '.memory-bank/activeContext.0008-T-002.md': noteLines('DONE') });
        expect(nextStep(m, ACTIVE)).toMatchObject({ case: 'NS-6-open', lines: [{ text: `Implement T-002 of ${ACTIVE_PLAN}` }, { text: `/sdd-plan ${ACTIVE}` }] });
    });

    it('without a note NS-6 is as 0021 AC-003 and AC-005 say: open, resume, plan', async () => {
        expect(nextStep(await model(base), ACTIVE)).toMatchObject({ case: 'NS-6-open' });
        expect(nextStep(await model({ ...base, [ACTIVE_PLAN]: titled([['T-001', 'One', '[x]']]) }), ACTIVE)).toMatchObject({ case: 'NS-6-resume' });
        expect(nextStep(await model({ [ACTIVE]: specText({ status: 'In Progress', plan: ARCHIVE }) }), ACTIVE)).toMatchObject({ case: 'NS-6-plan' });
    });

    it('a BLOCKED note still gives NS-4, and a plan Done with a note still gives NS-5', async () => {
        const blocked = await model({ ...base, '.memory-bank/activeContext.0007-T-002.md': noteLines('BLOCKED', '- **Blocked on:** a question.\n') });
        expect(nextStep(blocked, ACTIVE)).toMatchObject({ rule: 'NS-4', case: 'NS-4-plan' });
        const review = await model({ [ACTIVE]: base[ACTIVE], [ACTIVE_PLAN]: planText({ status: 'Done' }), '.memory-bank/activeContext.0007-T-002.md': noteLines('DONE') });
        expect(nextStep(review, ACTIVE)).toMatchObject({ rule: 'NS-5', case: 'NS-5' });
    });

    it('a Ready or Backlog spec with a note is not an Active case: NS-7 keeps its line', async () => {
        const ready = await model({
            [BACKLOG]: specText({ plan: LINK }),
            [BACKLOG_PLAN]: plan([['T-001', '[ ]']]),
            '.memory-bank/activeContext.0007-T-001.md': noteLines('DONE'),
        });
        expect(nextStep(ready, BACKLOG)).toMatchObject({ rule: 'NS-7', case: 'NS-7' });
    });
});
