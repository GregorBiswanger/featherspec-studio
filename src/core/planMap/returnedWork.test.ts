import { describe, expect, it } from 'vitest';
import type { ShellModel } from '../ports/shell';
import { returnedWorkOf } from './returnedWork';
import { fixtureFiles, fixtureModel, GEN_SPEC, generatedModel, noteFile, PARALLEL_NOTE_4, PARALLEL_SPEC, setNote, dropNotes } from './testing/plans';
import { planOf } from './planMap';
import { modelOf } from '../board/testing/boardWorld';

function statement(model: ShellModel, key: string): string | undefined {
    const entry = model.lifecycle.entries.find((candidate) => candidate.key === key)!;
    const spec = model.project.specs.find((candidate) => candidate.key === key)!;
    return returnedWorkOf(model, entry, spec);
}

function planView(model: ShellModel, key: string) {
    const entry = model.lifecycle.entries.find((candidate) => candidate.key === key)!;
    const spec = model.project.specs.find((candidate) => candidate.key === key)!;
    const view = planOf(model, entry, spec);
    if (view === undefined || view.kind !== 'plan') {
        throw new Error('no plan view');
    }
    return view;
}

const PARTIAL = '.specs/active/0001-fixture-demo.md';
const NOTE_5 = '.memory-bank/activeContext.0001-T-005.md';
const note = (id: string, status: string, blocked?: string) => `# Return note — 0001 · ${id}\n\n- **Status:** ${status}\n- **Files:** —\n- **Verified:** —\n- **Notes:** —\n${blocked === undefined ? '' : `- **Blocked on:** ${blocked}\n`}`;

describe('0025 AC-015 returnedWorkOf: U-05', () => {
    it('0025 AC-015: both notes (Blocked, NS-4) read `2 returned, T-004 blocked: the next step finds out what blocks.`', async () => {
        const model = await fixtureModel('fs110-parallel-synthetic');
        expect(statement(model, PARALLEL_SPEC)).toBe('2 returned, T-004 blocked: the next step finds out what blocks.');
    });

    it('0025 AC-015: the DONE note only (NS-6 returned work) reads `1 returned, waiting to be integrated: the next step integrates them.` where no group member is out', async () => {
        const model = await generatedModel({}, noteFile('T-001', 'DONE'));
        expect(statement(model, GEN_SPEC)).toBe('1 returned, waiting to be integrated: the next step integrates them.');
    });

    it('0025 AC-025 over AC-015: the DONE note only on fs110-parallel-synthetic leaves T-004 of the group out, so U-08 stands (the newer criterion)', async () => {
        const model = await fixtureModel('fs110-parallel-synthetic', (files) => delete files[PARALLEL_NOTE_4]);
        expect(statement(model, PARALLEL_SPEC)).toBe('1 of 2 returned · T-004 not back yet');
    });

    it('0025 AC-015: no note, no statement', async () => {
        const model = await fixtureModel('fs110-parallel-synthetic', dropNotes);
        expect(statement(model, PARALLEL_SPEC)).toBeUndefined();
        expect(planView(model, PARALLEL_SPEC).returned).toBeUndefined();
    });

    it('0025 AC-015: an unknown status counts as returned, not blocked; an ID the plan lacks counts in n and names no stage', async () => {
        const unknown = await generatedModel({}, { ...noteFile('T-004', 'WIP'), ...noteFile('T-005', 'DONE'), ...noteFile('T-099', 'DONE') });
        const view = planView(unknown, GEN_SPEC);
        expect(view.returned).toBe('3 returned, waiting to be integrated: the next step integrates them.');
        expect(view.stages.flatMap((stage) => (stage.returned === undefined ? [] : [stage.number]))).toEqual([3]);
        expect(statement(unknown, GEN_SPEC)).toBe(view.returned);
    });

    it('0025 AC-015: blocked IDs come in plan order', async () => {
        const model = await generatedModel({}, { ...noteFile('T-005', 'BLOCKED', 'a'), ...noteFile('T-004', 'BLOCKED', 'b') });
        expect(statement(model, GEN_SPEC)).toMatch(/^2 returned, T-004, T-005 blocked/);
    });

    it('0025 AC-015: PlanView and each stage row holding a returned step carry the identical sentence', async () => {
        const model = await fixtureModel('fs110-parallel-synthetic');
        const view = planView(model, PARALLEL_SPEC);
        const sentence = '2 returned, T-004 blocked: the next step finds out what blocks.';
        expect(view.returned).toBe(sentence);
        expect(view.stages.map((stage) => stage.returned)).toEqual([undefined, sentence, undefined]);
    });
});

describe('0025 AC-025 returnedWorkOf: U-08, the group view', () => {
    it('0025 AC-025: fs-partial-return (T-004 ‖ T-005, only T-005 returned) reads `1 of 2 returned · T-004 not back yet`', async () => {
        const model = await fixtureModel('fs-partial-return');
        expect(statement(model, PARTIAL)).toBe('1 of 2 returned · T-004 not back yet');
        const view = planView(model, PARTIAL);
        expect(view.returned).toBe('1 of 2 returned · T-004 not back yet');
        expect(view.stages.map((stage) => stage.returned)).toEqual([undefined, '1 of 2 returned · T-004 not back yet', undefined]);
    });

    it('0025 AC-025: a BLOCKED note for T-005 reads `1 of 2 returned, T-005 blocked · T-004 not back yet`', async () => {
        const model = await fixtureModel('fs-partial-return', setNote(NOTE_5, note('T-005', 'BLOCKED', 'a question')));
        expect(statement(model, PARTIAL)).toBe('1 of 2 returned, T-005 blocked · T-004 not back yet');
    });

    it('0025 AC-025: once every member is returned, ticked or struck, U-05 again', async () => {
        const both = await fixtureModel('fs-partial-return', setNote('.memory-bank/activeContext.0001-T-004.md', note('T-004', 'DONE')));
        expect(statement(both, PARTIAL)).toBe('2 returned, waiting to be integrated: the next step integrates them.');
        const files = fixtureFiles('fs-partial-return');
        const plan = '.specs/active/0001-fixture-demo.plan.md';
        files[plan] = files[plan]!.replace('- [ ] **Verified (T-004):** —', '- [x] **Verified (T-004):** 2026-11-19 · npm test green');
        const ticked = await modelOf(files);
        expect(statement(ticked, PARTIAL)).toBe('1 returned, waiting to be integrated: the next step integrates them.');
    });
});
