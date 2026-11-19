import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { startLine, stagePrompt, WAY_KEYS, WAYS } from '../../shared/protocol/planMapTexts';
import type { PlanStageView, PlanStepView, PlanView } from '../../shared/protocol/planMap';
import { nextStep, openStep } from '../board/nextStep';
import { modelOf } from '../board/testing/boardWorld';
import type { ShellModel } from '../ports/shell';
import { planOf } from './planMap';
import {
    type Edit,
    fixtureModel,
    GEN_PLAN,
    GEN_SPEC,
    generatedFiles,
    generatedModel,
    modelWithUnreadable,
    noteFile,
    PARALLEL_NOTE_3,
    PARALLEL_NOTE_4,
    PARALLEL_SPEC,
    parallelModel,
    setNote,
} from './testing/plans';

const SYMBOL: Record<string, string> = { done: '✓', next: '◐', open: '○', dropped: '×', returned: '↩', notFound: '?' };

function viewOf(model: ShellModel, key: string) {
    const entry = model.lifecycle.entries.find((candidate) => candidate.key === key)!;
    const spec = model.project.specs.find((candidate) => candidate.key === key)!;
    return planOf(model, entry, spec);
}

function planViewOf(model: ShellModel, key: string): PlanView {
    const view = viewOf(model, key);
    if (view === undefined || view.kind !== 'plan') {
        throw new Error(`no plan view: ${JSON.stringify(view)}`);
    }
    return view;
}

function stageLine(stage: PlanStageView): string {
    const parts = stage.groups.map((group, index) => `${index > 0 ? ` ${group.sep ?? ''} `.replace(/ {2}/, ' ') : ''}${group.steps.map((step) => step.id).join(' ‖ ')}`);
    return `${stage.number}: ${parts.join('')}`;
}

function states(stage: PlanStageView): string {
    return stage.groups.flatMap((group) => group.steps.map((step) => SYMBOL[step.state])).join(' ');
}

function stepsOf(view: PlanView): PlanStepView[] {
    return [...view.stages.flatMap((stage) => stage.groups.flatMap((group) => group.steps)), ...view.loose];
}

describe('0023 AC-001: the plan reads as stages with step states', () => {
    it('Given fs110-parallel-synthetic without notes and the plan In Progress, the rows are 1: T-001 → T-002, 2: T-003 ‖ T-004, 3: T-005 and the count 2 of 5', async () => {
        const view = planViewOf(await parallelModel(), PARALLEL_SPEC);
        expect(view.stages.map((stage) => [stageLine(stage), states(stage)])).toEqual([
            ['1: T-001 → T-002', '✓ ✓'],
            ['2: T-003 ‖ T-004', '◐ ○'],
            ['3: T-005', '○'],
        ]);
        expect(view.count).toEqual({ done: 2, total: 5 });
        expect(view.staged).toBe(true);
        expect(view.loose).toEqual([]);
        expect(view.plan).toEqual({ key: '.specs/active/0001-parallel-demo.plan.md', line: 1 });
        expect(view.stages.map((stage) => stage.description)).toEqual(['shared types, then the entry point', 'add and subtract: separate modules and tests', 'docs sync']);
        expect(view.stages.map((stage) => stage.current)).toEqual([false, true, false]);
    });

    it('each stage keeps its kind and whether it holds a ‖; a finished stage is marked finished', async () => {
        const view = planViewOf(await parallelModel(), PARALLEL_SPEC);
        expect(view.stages.map((stage) => [stage.kind, stage.parallel, stage.finished])).toEqual([
            ['sequential', false, true],
            ['parallel', true, false],
            ['single', false, false],
        ]);
    });

    it('a generated plan: the separators per pair, the groups, a continuation line in a description, a head without an ID left out', async () => {
        const view = planViewOf(await generatedModel(), GEN_SPEC);
        expect(view.stages.map(stageLine)).toEqual(['1: T-001', '2: T-002 → T-003', '3: T-004 ‖ T-005', '4: T-006 ‖ T-007 → T-008', '5: T-009 → T-010 ‖ T-011', '7: T-012 → T-099']);
        expect(view.stages[3]!.groups.map((group) => [group.sep ?? '', group.steps.map((step) => step.id)])).toEqual([
            ['', ['T-006', 'T-007']],
            ['→', ['T-008']],
        ]);
        expect(view.stages[4]!.groups.map((group) => [group.sep ?? '', group.steps.map((step) => step.id)])).toEqual([
            ['', ['T-009']],
            ['→', ['T-010', 'T-011']],
        ]);
        expect(view.stages[3]!.description).toBe('mixed, parallel before the arrow with a continuation line');
        expect(view.stages[3]!.kind).toBe('mixed');
        expect(view.stages.map((stage) => stage.kind)).toEqual(['single', 'sequential', 'parallel', 'mixed', 'mixed', 'sequential']);
    });

    it('where ‖ and → both stand between two IDs the pair is parallel (§5.1: ‖ first)', async () => {
        const model = await generatedModel({ stages: '1. T-004 → ‖ T-005 — arrow first\n2. T-006 ‖ → T-007 — bar first', steps: ['T-004:[ ]', 'T-005:[ ]', 'T-006:[ ]', 'T-007:[ ]'] });
        const view = planViewOf(model, GEN_SPEC);
        expect(view.stages.map((stage) => stage.groups.map((group) => [group.sep ?? '', group.steps.map((step) => step.id)]))).toEqual([
            [['', ['T-004', 'T-005']]],
            [['', ['T-006', 'T-007']]],
        ]);
    });

    it('IDs with no mark between them are not a parallel group: one group each, no separator, no ways', async () => {
        const model = await generatedModel({ stages: '1. T-004, T-005 — no mark between them', steps: ['T-004:[ ]', 'T-005:[ ]'] });
        const view = planViewOf(model, GEN_SPEC);
        expect(view.stages[0]!.groups.map((group) => [group.sep ?? '', group.steps.map((step) => step.id)])).toEqual([
            ['', ['T-004']],
            ['', ['T-005']],
        ]);
        expect(view.stages[0]!.ways).toBeUndefined();
    });

    it('a stage whose IDs the plan does not know is not finished: it has no step that could be done (P-26)', async () => {
        const model = await generatedModel({ stages: '1. T-004 — a step\n2. T-098 → T-099 — nothing of it is in the plan', steps: ['T-004:[ ]'] });
        const view = planViewOf(model, GEN_SPEC);
        expect(view.stages[1]!.groups.flatMap((group) => group.steps.map((step) => step.state))).toEqual(['notFound', 'notFound']);
        expect(view.stages[1]!.finished).toBe(false);
        expect(view.stages[1]!.returned).toBeUndefined();
    });

    it('a struck step is dropped and not counted; an unknown ID is not found, a chip only, and not counted', async () => {
        const view = planViewOf(await generatedModel(), GEN_SPEC);
        const third = view.stages[1]!.groups[1]!.steps[0]!;
        expect(third).toMatchObject({ id: 'T-003', state: 'dropped' });
        const unknown = view.stages[5]!.groups[1]!.steps[0]!;
        expect(unknown).toMatchObject({ id: 'T-099', state: 'notFound', title: '', files: [], covers: [] });
        expect(unknown.open).toBeUndefined();
        expect(view.count).toEqual({ done: 2, total: 12 });
        expect(view.stages[5]!.finished).toBe(false);
    });

    it('a step in no stage line is listed after the stages', async () => {
        const view = planViewOf(await generatedModel(), GEN_SPEC);
        expect(view.loose.map((step) => [step.id, step.state])).toEqual([['T-013', 'open']]);
    });

    it('an ID twice in the stage lines is one chip each, with the step state; the first occurrence sets the current stage', async () => {
        const model = await generatedModel({ stages: '1. T-001 — a\n2. T-004 → T-001 — b\n3. T-004 — c' });
        const view = planViewOf(model, GEN_SPEC);
        expect(view.stages.map(stageLine)).toEqual(['1: T-001', '2: T-004 → T-001', '3: T-004']);
        expect(view.stages[1]!.groups[1]!.steps[0]!.state).toBe('done');
        expect(view.stages.map((stage) => stage.current)).toEqual([false, true, false]);
    });

    it('the step view carries its title, plan line, files, covers with spec lines, and short Do and Verify', async () => {
        const model = await generatedModel();
        const view = planViewOf(model, GEN_SPEC);
        const step = view.stages[2]!.groups[0]!.steps[0]!;
        const line = model.project.plans.find((plan) => plan.key === GEN_PLAN)!.parsed!.steps.find((candidate) => candidate.id === 'T-004')!.line;
        expect(step).toMatchObject({
            id: 'T-004',
            title: 'Step T-004',
            open: { key: GEN_PLAN, line },
            files: ['src/a.ts', 'src/a.test.ts'],
            doText: 'Do T-004 with code and a link.',
            verify: 'Verify T-004.',
        });
        expect(step.covers.map((cover) => cover.id)).toEqual(['AC-001', 'AC-009']);
        expect(step.covers.every((cover) => cover.open !== undefined && cover.open.key === GEN_SPEC && cover.open.line > 1)).toBe(true);
        const other = view.stages[0]!.groups[0]!.steps[0]!;
        expect(other.files).toEqual([]);
    });

    it('a covered ID the spec does not define has no link', async () => {
        const files = generatedFiles();
        files[GEN_SPEC] = files[GEN_SPEC]!.replace('**AC-009** The system shall also work.', '');
        const view = planViewOf(await modelOf(files), GEN_SPEC);
        const covers = view.stages[0]!.groups[0]!.steps[0]!.covers;
        expect(covers.map((cover) => [cover.id, cover.open !== undefined])).toEqual([
            ['AC-001', true],
            ['AC-009', false],
        ]);
    });

    it('a plan without stages shows all its steps in plan order and no stage', async () => {
        const model = await fixtureModel('fs170-brownfield-mixed');
        const key = '.specs/active/0006-outbox-batch-size.md';
        const view = planViewOf(model, key);
        const ids = model.project.plans.find((plan) => plan.key === '.specs/active/0006-outbox-batch-size.plan.md')!.parsed!.steps.map((step) => step.id);
        expect(view.staged).toBe(false);
        expect(view.stages).toEqual([]);
        expect(view.loose.map((step) => step.id)).toEqual(ids);
        expect(ids.length).toBeGreaterThan(1);
    });

    it('the closing line is kept as written with its prefix and its continuation lines joined by a space; none without a closing', async () => {
        const german = planViewOf(await fixtureModel('fs110-de-active-review'), '.specs/active/0001-tip-splitter.md');
        expect(german.closing?.text.startsWith('No parallel stage: T-002 und T-003 ändern dieselbe Validierungsdatei')).toBe(true);
        expect(german.closing?.text.endsWith('Parallelität spart hier nichts.')).toBe(true);
        expect(german.closing?.text).not.toContain('\n');
        expect(german.closing?.full).toBe(german.closing?.text);
        expect(german.closing!.short.length).toBeLessThanOrEqual(80);
        expect(german.closing!.short.endsWith('…')).toBe(true);
        const generated = planViewOf(await generatedModel(), GEN_SPEC);
        expect(generated.closing).toEqual({
            text: 'Parallel: stage 3 (separate files) and stage 4. Second line of the closing.',
            short: 'Parallel: stage 3 (separate files) and stage 4. Second line of the closing.',
            full: 'Parallel: stage 3 (separate files) and stage 4. Second line of the closing.',
        });
        const none = planViewOf(await generatedModel({ closing: null }), GEN_SPEC);
        expect(none.closing).toBeUndefined();
    });

    it('the closing keeps Markdown in its text and drops it in short and full', async () => {
        const view = planViewOf(await generatedModel({ closing: 'Parallel: stage 3 — **separate** `files`.' }), GEN_SPEC);
        expect(view.closing).toEqual({ text: 'Parallel: stage 3 — **separate** `files`.', short: 'Parallel: stage 3 — separate files.', full: 'Parallel: stage 3 — separate files.' });
    });

    it('a plan whose stage lines hold no ID counts as a plan without stages', async () => {
        const view = planViewOf(await generatedModel({ stages: '1. nothing here\n2. nor here' }), GEN_SPEC);
        expect(view.staged).toBe(false);
        expect(view.stages).toEqual([]);
        expect(view.loose).toHaveLength(13);
    });

    it('a plan without a countable step has no count', async () => {
        const view = planViewOf(await generatedModel({ steps: [], stages: '1. T-001 — a' }), GEN_SPEC);
        expect(view.count).toBeUndefined();
        expect(view.stages[0]!.groups[0]!.steps[0]!.state).toBe('notFound');
    });

    it('planOf is undefined for a Done spec and for a spec without a sibling plan, and unreadable for an unreadable plan', async () => {
        const done = await fixtureModel('fs110-ready-synthetic');
        expect(viewOf(done, '.specs/done/0002-old-feature.md')).toBeUndefined();
        const backlog = await modelOf({ '.specs/backlog/0004-no-plan.md': '# Spec\n\n**Status:** Draft\n\n## 13. Acceptance criteria\n\n**AC-001** It works.\n' });
        expect(viewOf(backlog, '.specs/backlog/0004-no-plan.md')).toBeUndefined();
        const unreadable = await modelWithUnreadable(generatedFiles(), [GEN_PLAN]);
        expect(viewOf(unreadable, GEN_SPEC)).toEqual({ kind: 'unreadable' });
    });
});

describe('0023 AC-002: the next marker is the next open step, and none while a return note lies', () => {
    it('without a note exactly one step is next, and it is the next open step of 0019', async () => {
        const model = await parallelModel();
        const view = planViewOf(model, PARALLEL_SPEC);
        const entry = model.lifecycle.entries[0]!;
        expect(stepsOf(view).filter((step) => step.state === 'next').map((step) => step.id)).toEqual([openStep(model, entry)!.id]);
    });

    it('with a return note lying no step is marked next', async () => {
        const model = await parallelModel(setNote(PARALLEL_NOTE_3, '# Return note — 0001 · T-003\n\n- **Status:** DONE\n- **Files:** —\n- **Verified:** —\n- **Notes:** —\n'));
        expect(stepsOf(planViewOf(model, PARALLEL_SPEC)).some((step) => step.state === 'next')).toBe(false);
    });

    it('a note for another step leaves the open step open too: no step is next while any note of the spec lies', async () => {
        const model = await generatedModel({}, noteFile('T-006', 'DONE'));
        const view = planViewOf(model, GEN_SPEC);
        const steps = stepsOf(view);
        expect(steps.find((step) => step.id === 'T-006')?.state).toBe('returned');
        expect(steps.find((step) => step.id === 'T-004')?.state).toBe('open');
        expect(steps.some((step) => step.state === 'next')).toBe(false);
        expect(stepsOf(planViewOf(await generatedModel(), GEN_SPEC)).find((step) => step.id === 'T-004')?.state).toBe('next');
    });

    it('an undetermined tick is not done: the first one is next, a later one is open', async () => {
        const model = await generatedModel({
            stages: '1. T-001 → T-002 → T-003 — a',
            steps: ['T-001:[x]', 'T-002:[?]', 'T-003:[?]'],
        });
        const states = planViewOf(model, GEN_SPEC).stages[0]!.groups.flatMap((group) => group.steps.map((step) => step.state));
        expect(states).toEqual(['done', 'next', 'open']);
    });

    it('the current stage is the first stage line that holds the next open step; none when no stage holds it', async () => {
        const first = planViewOf(await generatedModel(), GEN_SPEC);
        expect(first.stages.map((stage) => stage.current)).toEqual([false, false, true, false, false, false]);
        const none = planViewOf(await generatedModel({ stages: '1. T-001 — a\n2. T-002 — b' }), GEN_SPEC);
        expect(none.stages.some((stage) => stage.current)).toBe(false);
    });
});

describe('0023 AC-012: returned work shows its state and the stage counts', () => {
    it('a DONE note makes its step returned done, a BLOCKED note returned blocked with its reason in short and full form', async () => {
        const model = await fixtureModel('fs110-parallel-synthetic');
        const view = planViewOf(model, PARALLEL_SPEC);
        const [three, four] = view.stages[1]!.groups[0]!.steps;
        expect(three).toMatchObject({ id: 'T-003', state: 'returned', returned: { status: 'done' } });
        expect(four).toMatchObject({ id: 'T-004', state: 'returned', returned: { status: 'blocked', reason: 'needs a new dependency (Ask first).', reasonFull: 'needs a new dependency (Ask first).' } });
        expect(view.stages[1]!.returned).toBe('2 returned, T-004 blocked: the next step finds out what blocks.');
    });

    it('a long reason is cut in its short form and whole in its full form', async () => {
        const reason = 'needs a decision about the storage format of the cache and the way it is invalidated when the schema changes under it';
        const model = await generatedModel({}, noteFile('T-004', 'BLOCKED', reason));
        const step = planViewOf(model, GEN_SPEC).stages[2]!.groups[0]!.steps[0]!;
        expect(step.returned?.reasonFull).toBe(reason);
        expect(step.returned?.reason!.length).toBeLessThanOrEqual(80);
        expect(step.returned?.reason!.endsWith('…')).toBe(true);
    });

    it('a placeholder reason, WIP and an unreadable note: no reason, and unknown', async () => {
        const placeholder = await generatedModel({}, noteFile('T-004', 'BLOCKED', '—'));
        expect(planViewOf(placeholder, GEN_SPEC).stages[2]!.groups[0]!.steps[0]!.returned).toEqual({ status: 'blocked' });
        const wip = await generatedModel({}, noteFile('T-004', 'WIP'));
        expect(planViewOf(wip, GEN_SPEC).stages[2]!.groups[0]!.steps[0]!.returned).toEqual({ status: 'unknown' });
        const note = '.memory-bank/activeContext.0007-T-004.md';
        const bad = await modelWithUnreadable({ ...generatedFiles(), ...noteFile('T-004', 'DONE') }, [note]);
        expect(planViewOf(bad, GEN_SPEC).stages[2]!.groups[0]!.steps[0]!.returned).toEqual({ status: 'unknown' });
    });

    it('a ticked step with a note is returned, not done', async () => {
        const model = await generatedModel({}, noteFile('T-001', 'DONE'));
        const view = planViewOf(model, GEN_SPEC);
        expect(view.stages[0]!.groups[0]!.steps[0]!.state).toBe('returned');
        expect(view.count).toEqual({ done: 2, total: 12 });
    });

    it('a note for an ID the plan lacks leaves that chip not found, and a dropped step with a note stays dropped', async () => {
        const model = await generatedModel({}, { ...noteFile('T-099', 'DONE'), ...noteFile('T-003', 'DONE') });
        const view = planViewOf(model, GEN_SPEC);
        expect(view.stages[5]!.groups[1]!.steps[0]!.state).toBe('notFound');
        expect(view.stages[1]!.groups[1]!.steps[0]!.state).toBe('dropped');
    });

    it('m counts the returned and the unfinished steps of the stage, not its done or dropped ones', async () => {
        const model = await generatedModel({ stages: '1. T-004 ‖ T-005 ‖ T-006 ‖ T-007 — one done, one dropped', steps: ['T-004:[x]', 'T-005:[ ]', 'T-006:[ ]', 'T-007:~~'] }, noteFile('T-005', 'DONE'));
        const view = planViewOf(model, GEN_SPEC);
        expect(stepsOf(view).map((step) => [step.id, step.state])).toEqual([
            ['T-004', 'done'],
            ['T-005', 'returned'],
            ['T-006', 'open'],
            ['T-007', 'dropped'],
        ]);
        expect(view.stages[0]!.returned).toBe('1 of 3 returned · T-006 not back yet');
    });

    it('only the notes of this spec count: a note of another spec for the same step ID changes nothing', async () => {
        const other = '# Return note — 0008 · T-004\n\n- **Status:** DONE\n- **Files:** —\n- **Verified:** —\n- **Notes:** —\n';
        const model = await generatedModel({}, { '.memory-bank/activeContext.0008-T-004.md': other });
        expect(model.project.returnNotes.map((note) => note.key)).toEqual(['.memory-bank/activeContext.0008-T-004.md']);
        const view = planViewOf(model, GEN_SPEC);
        expect(stepsOf(view).find((step) => step.id === 'T-004')?.state).toBe('next');
        expect(stepsOf(view).some((step) => step.state === 'returned')).toBe(false);
        expect(view.stages.every((stage) => stage.returned === undefined)).toBe(true);
    });

    it('a stage counts its returned steps against the returned and unfinished ones: n of m', async () => {
        const one = await parallelModel(setNote(PARALLEL_NOTE_3, '# Return note — 0001 · T-003\n\n- **Status:** DONE\n- **Files:** —\n- **Verified:** —\n- **Notes:** —\n'));
        const view = planViewOf(one, PARALLEL_SPEC);
        expect(view.stages[1]!.returned).toBe('1 of 2 returned · T-004 not back yet');
        expect(view.stages[0]!.returned).toBeUndefined();
        expect(view.stages[2]!.returned).toBeUndefined();
        const both = planViewOf(await fixtureModel('fs110-parallel-synthetic'), PARALLEL_SPEC);
        expect(both.stages[1]!.returned).toBe('2 returned, T-004 blocked: the next step finds out what blocks.');
        expect(PARALLEL_NOTE_4).toContain('T-004');
    });
});

const PLAN_PATH = '.specs/active/0001-parallel-demo.plan.md';

function waysOf(view: PlanView): Array<[number, string[], string[]]> {
    return view.stages.flatMap((stage) => (stage.ways === undefined ? [] : [[stage.number, [...stage.ways.prompts], stage.ways.startLines] as [number, string[], string[]]]));
}

const READY_SPEC = '.specs/backlog/0001-ready-feature.md';

function readyParallelModel(...edits: Edit[]): Promise<ShellModel> {
    return fixtureModel(
        'fs110-ready-synthetic',
        (found) => {
            const plan = '.specs/backlog/0001-ready-feature.plan.md';
            found[plan] = found[plan]!.replace('1. T-001 — the feature', '1. T-001 ‖ T-002 — the feature').replace('### T-001', '### T-002 — second\n\n- **Covers:** AC-001\n- **Do:** x\n- **Verify:** y\n- [ ] **Verified (T-002):** —\n- **Notes:** —\n\n### T-001');
        },
        ...edits,
    );
}

describe('0023 AC-009: the current stage offers its ways, and the next step its start lines', () => {
    it('Given fs110-parallel-synthetic without notes and the plan In Progress, stage 2 offers the three prompts and the start lines of T-003 and T-004; stages 1 and 3 offer none', async () => {
        const view = planViewOf(await parallelModel(), PARALLEL_SPEC);
        expect(waysOf(view)).toEqual([
            [
                2,
                [
                    `Implement the whole stage 2 of ${PLAN_PATH} in sequence`,
                    `Implement the whole stage 2 of ${PLAN_PATH} with subagents`,
                    `Implement the whole stage 2 of ${PLAN_PATH} with other agents`,
                ],
                [`Implement T-003 of ${PLAN_PATH} as a parallel worker.`, `Implement T-004 of ${PLAN_PATH} as a parallel worker.`],
            ],
        ]);
        expect(view.stages[1]!.ways).toMatchObject({ stage: 2 });
        expect(view.stages[0]!.ways).toBeUndefined();
        expect(view.stages[2]!.ways).toBeUndefined();
    });

    it('Given a stage T-002 → T-003 ‖ T-004 with T-002 next, the ways show and no start line', async () => {
        const model = await generatedModel({ stages: '1. T-001 — a\n2. T-004 → T-005 ‖ T-006 — b', steps: ['T-001:[x]', 'T-004:[ ]', 'T-005:[ ]', 'T-006:[ ]'] });
        const ways = planViewOf(model, GEN_SPEC).stages[1]!.ways;
        expect(ways?.stage).toBe(2);
        expect(ways?.startLines).toEqual([]);
    });

    it('a stage T-002 ‖ T-003 → T-004 with T-002 next: start lines for the two of the group only', async () => {
        const model = await generatedModel({ stages: '1. T-001 — a\n2. T-004 ‖ T-005 → T-006 — b', steps: ['T-001:[x]', 'T-004:[ ]', 'T-005:[ ]', 'T-006:[ ]'] });
        const ways = planViewOf(model, GEN_SPEC).stages[1]!.ways;
        expect(ways?.startLines).toEqual([`Implement T-004 of ${GEN_PLAN} as a parallel worker.`, `Implement T-005 of ${GEN_PLAN} as a parallel worker.`]);
    });

    it('a ‖ partner already done leaves one unfinished step: no ways; a returned or dropped partner too', async () => {
        const doneOne = await generatedModel({ stages: '1. T-004 ‖ T-005 — a', steps: ['T-004:[x]', 'T-005:[ ]'] });
        expect(planViewOf(doneOne, GEN_SPEC).stages[0]!.ways).toBeUndefined();
        const dropped = await generatedModel({ stages: '1. T-004 ‖ T-005 — a', steps: ['T-004:~~', 'T-005:[ ]'] });
        expect(planViewOf(dropped, GEN_SPEC).stages[0]!.ways).toBeUndefined();
    });

    it('a sequential stage, a single step and a plan without stages carry no way', async () => {
        const view = planViewOf(await generatedModel(), GEN_SPEC);
        expect(waysOf(view).map(([stage]) => stage)).toEqual([3]);
        const flat = planViewOf(await generatedModel({ stages: '' }), GEN_SPEC);
        expect(waysOf(flat)).toEqual([]);
    });

    it('a Ready spec offers the ways and no start line', async () => {
        const model = await readyParallelModel();
        const view = planViewOf(model, READY_SPEC);
        expect(model.lifecycle.entries.find((entry) => entry.key === READY_SPEC)?.state).toBe('Ready');
        expect(waysOf(view)).toHaveLength(1);
        expect(view.stages[0]!.ways?.startLines).toEqual([]);
        expect(view.stages[0]!.ways?.prompts[0]).toBe('Implement the whole stage 1 of .specs/backlog/0001-ready-feature.plan.md in sequence');
    });

    it('a Ready spec with a return note offers no way, as an Active one does not (§5.4)', async () => {
        const note = '# Return note — 0001 · T-009\n\n- **Status:** DONE\n- **Files:** —\n- **Verified:** —\n- **Notes:** —\n';
        const model = await readyParallelModel(setNote('.memory-bank/activeContext.0001-T-009.md', note));
        const entry = model.lifecycle.entries.find((candidate) => candidate.key === READY_SPEC)!;
        const spec = model.project.specs.find((candidate) => candidate.key === READY_SPEC)!;
        expect(entry.state).toBe('Ready');
        expect(spec.returnNoteKeys).toEqual(['.memory-bank/activeContext.0001-T-009.md']);
        expect(waysOf(planViewOf(model, READY_SPEC))).toEqual([]);
        expect(waysOf(planViewOf(await readyParallelModel(), READY_SPEC))).toHaveLength(1);
    });

    it('Blocked, Review, a lying note and the Resume case offer none', async () => {
        const blocked = await fixtureModel('fs110-parallel-synthetic');
        expect(waysOf(planViewOf(blocked, PARALLEL_SPEC))).toEqual([]);
        const review = await fixtureModel('studio-0015');
        const reviewKey = review.lifecycle.entries[0]!.key;
        expect(review.lifecycle.entries[0]!.state).toBe('Review');
        expect(waysOf(planViewOf(review, reviewKey))).toEqual([]);
        const noted = await generatedModel({}, noteFile('T-001', 'DONE'));
        expect(waysOf(planViewOf(noted, GEN_SPEC))).toEqual([]);
        const resume = await generatedModel({ stages: '1. T-004 ‖ T-005 — a', steps: ['T-004:[x]', 'T-005:[x]'] });
        expect(waysOf(planViewOf(resume, GEN_SPEC))).toEqual([]);
    });

    it('the start line is the wording of parallel-work.md, byte for byte', async () => {
        const rule = await readFile(path.resolve(process.cwd(), '.claude', 'rules', 'parallel-work.md'), 'utf8');
        expect(rule).toContain(`\`${startLine('T-00x', '<plan path>')}\``);
        expect(startLine('T-004', 'a/b.plan.md')).toBe('Implement T-004 of a/b.plan.md as a parallel worker.');
    });

    it('the three prompts name the way in the words of plans.md: in sequence, with subagents, with other agents', () => {
        expect(WAY_KEYS.map((way) => stagePrompt(way, 3, 'p.plan.md'))).toEqual([
            'Implement the whole stage 3 of p.plan.md in sequence',
            'Implement the whole stage 3 of p.plan.md with subagents',
            'Implement the whole stage 3 of p.plan.md with other agents',
        ]);
        expect(WAY_KEYS.map((way) => WAYS[way].name)).toEqual(['In sequence', 'Subagents', 'Other agents']);
        expect(WAYS.sequence.effect).toBe('One chat builds the steps one after another and stops at the stage end and at every test review on the way.');
        expect(WAYS.subagents.effect).toBe(
            'Where a working agreement asks for a test review, the chat first writes the stage\'s tests and stops for it; then it hands each step to a subagent. Subagents cannot ask you; there is no steering in between.',
        );
        expect(WAYS.otherAgents.effect).toBe(
            'Each step runs from its own start line in another chat, tool or worktree and leaves a return note; a worktree holds committed files only, so commit first. Until start lines show here, the stage prompt has the chat propose that commit and print them. Once every worker is back, the next step integrates the returned steps.',
        );
    });
});

describe('0023 AC-002: the marked step is the one the next step names', () => {
    it('for every fixture and variant whose case is NS-6-open or NS-7 with an ID, the next marker equals the ID of its first line', async () => {
        const models: Array<[string, ShellModel]> = [
            ['parallel without notes', await parallelModel()],
            ['ready', await fixtureModel('fs110-ready-synthetic')],
            ['generated', await generatedModel()],
            ['generated, first two stages done', await generatedModel({ steps: ['T-001:[x]', 'T-002:[x]', 'T-003:[x]', 'T-004:[x]', 'T-005:[ ]', 'T-006:[ ]'] })],
        ];
        let checked = 0;
        for (const [name, model] of models) {
            for (const entry of model.lifecycle.entries) {
                const next = nextStep(model, entry.key);
                const spec = model.project.specs.find((candidate) => candidate.key === entry.key)!;
                const view = planOf(model, entry, spec);
                if (next === undefined || !('lines' in next) || view === undefined || view.kind !== 'plan' || (next.case !== 'NS-6-open' && next.case !== 'NS-7')) {
                    continue;
                }
                const id = /\b(T-\d+)\b/.exec(next.lines[0]!.text)?.[1];
                if (id === undefined) {
                    continue;
                }
                checked += 1;
                expect(stepsOf(view).filter((step) => step.state === 'next').map((step) => step.id), name).toEqual([id]);
            }
        }
        expect(checked).toBeGreaterThanOrEqual(4);
    });
});

describe('0023 AC-014: the projection needs neither trust nor a writer', () => {
    it('the planMap files and the plan texts name no trust, writer, Restricted Mode or reader window', async () => {
        for (const file of ['src/core/planMap/planMap.ts', 'src/core/planMap/planSpecs.ts', 'src/shared/protocol/planMap.ts', 'src/shared/protocol/planMapTexts.ts']) {
            const source = await readFile(path.resolve(process.cwd(), ...file.split('/')), 'utf8');
            expect(source, file).not.toMatch(/trust|writer|restricted|\breader\b/i);
        }
        expect('const restricted = true;').toMatch(/trust|writer|restricted|\breader\b/i);
    });

    it('the same model gives equal views however often and wherever it is built', async () => {
        const first = planViewOf(await parallelModel(), PARALLEL_SPEC);
        const second = planViewOf(await parallelModel(), PARALLEL_SPEC);
        expect(second).toEqual(first);
        expect(JSON.stringify(planViewOf(await generatedModel(), GEN_SPEC))).toBe(JSON.stringify(planViewOf(await generatedModel(), GEN_SPEC)));
    });
});
