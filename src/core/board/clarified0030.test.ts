import { describe, expect, it } from 'vitest';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import { planText, specText } from '../lifecycle/testing/projects';
import type { HandOverEntry, ShellModel } from '../ports/shell';
import { clarifiedOf } from './clarified';
import { nextStep } from './nextStep';
import { modelOf } from './testing/boardWorld';

const BACKLOG = '.specs/backlog/0007-x.md';
const BACKLOG_PLAN = '.specs/backlog/0007-x.plan.md';

async function backlog(files: Record<string, string> = { [BACKLOG]: specText() }): Promise<ShellModel> {
    return modelOf(files);
}

function withMemory(model: ShellModel, handOvers: Record<string, unknown>): ShellModel {
    return { ...model, handOvers: handOvers as Record<string, HandOverEntry> };
}

function currentOf(model: ShellModel): { modifiedMs: number | undefined; size: number | undefined } {
    const spec = model.project.specs.find((candidate) => candidate.key === BACKLOG)!;
    return { modifiedMs: spec.modifiedMs, size: spec.size };
}

const WRITE_PLAN = { rule: 'NS-9', case: 'NS-10', lines: [{ intent: 'Write the plan', text: `/sdd-plan ${BACKLOG}` }] };

describe('0030 AC-002: a clarified Backlog spec offers only the plan', () => {
    it('0030 AC-002 a changed modification time returns the one line NS-9 / NS-10', async () => {
        const base = await backlog();
        const { modifiedMs, size } = currentOf(base);
        const model = withMemory(base, { [BACKLOG]: { modifiedMs: (modifiedMs ?? 0) - 1000, size } });
        expect(clarifiedOf(model, BACKLOG)).toBe(true);
        expect(nextStep(model, BACKLOG)).toEqual(WRITE_PLAN);
    });

    it('0030 AC-002 a changed size returns the one line NS-9 / NS-10', async () => {
        const base = await backlog();
        const { modifiedMs, size } = currentOf(base);
        const model = withMemory(base, { [BACKLOG]: { modifiedMs, size: (size ?? 0) + 1 } });
        expect(nextStep(model, BACKLOG)).toEqual(WRITE_PLAN);
    });
});

describe('0030 AC-003: without a differing entry the step is today\'s NS-9', () => {
    it('0030 AC-003 no entry: deep-equal to the baseline NS-9', async () => {
        const base = await backlog();
        expect(nextStep(base, BACKLOG)).toMatchObject({ rule: 'NS-9', case: 'NS-9' });
        expect(nextStep(withMemory(base, {}), BACKLOG)).toEqual(nextStep(base, BACKLOG));
    });

    it('0030 AC-003 an entry equal to the current time and size: NS-9 with the challenge line', async () => {
        const base = await backlog();
        const model = withMemory(base, { [BACKLOG]: currentOf(base) });
        expect(clarifiedOf(model, BACKLOG)).toBe(false);
        expect(nextStep(model, BACKLOG)).toEqual(nextStep(base, BACKLOG));
        expect(JSON.stringify(nextStep(model, BACKLOG))).toContain('/sdd-clarify');
    });
});

describe('0030 AC-004: every other case returns today\'s step', () => {
    it('0030 AC-004 the entry of another key has no effect', async () => {
        const base = await backlog();
        const model = withMemory(base, { '.specs/backlog/0008-y.md': { modifiedMs: 1, size: 1 } });
        expect(nextStep(model, BACKLOG)).toEqual(nextStep(base, BACKLOG));
    });

    it('0030 AC-004 once a plan exists, the plan rules decide', async () => {
        const files = { [BACKLOG]: specText({ plan: '[0007-x.plan.md](0007-x.plan.md)' }), [BACKLOG_PLAN]: `${planText()}\n## Steps\n\n### T-001 — Step\n\n- [ ] **Verified (T-001):** —\n` };
        const base = await backlog(files);
        const model = withMemory(base, { [BACKLOG]: { modifiedMs: 1, size: 1 } });
        expect(nextStep(model, BACKLOG)).toEqual(nextStep(base, BACKLOG));
        expect(nextStep(model, BACKLOG)).toMatchObject({ rule: 'NS-7' });
    });

    it('0030 AC-004 a spec without criteria stays NS-8', async () => {
        const base = await backlog({ [BACKLOG]: specText({ criteria: false }) });
        const model = withMemory(base, { [BACKLOG]: { modifiedMs: 1, size: 1 } });
        expect(nextStep(model, BACKLOG)).toMatchObject({ rule: 'NS-8' });
        expect(deriveLifecycle(model.project).entries[0].state).toBe('Backlog');
    });

    it('0030 AC-004 malformed entries read as empty', async () => {
        const base = await backlog();
        for (const entry of ['x', 7, null, [], { modifiedMs: 'a' }, { size: Number.NaN }]) {
            const model = withMemory(base, { [BACKLOG]: entry });
            expect(clarifiedOf(model, BACKLOG)).toBe(false);
            expect(nextStep(model, BACKLOG)).toEqual(nextStep(base, BACKLOG));
        }
        expect(nextStep({ ...base, handOvers: 'broken' as never }, BACKLOG)).toEqual(nextStep(base, BACKLOG));
    });
});
