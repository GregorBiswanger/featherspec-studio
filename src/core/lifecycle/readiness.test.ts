import { describe, expect, it } from 'vitest';
import { deriveLifecycle } from './deriveLifecycle';
import type { LifecycleEntry, ReadinessId } from './model';
import { planText, readFixture, readMemory, specText } from './testing/projects';

const LINKED = '[0001-a.plan.md](0001-a.plan.md)';

async function entryOf(files: Record<string, string>, key = '.specs/backlog/0001-a.md'): Promise<LifecycleEntry> {
    const entry = deriveLifecycle(await readMemory(files)).entries.find((candidate) => candidate.key === key);
    if (entry === undefined) {
        throw new Error('entry missing');
    }
    return entry;
}

function failing(entry: LifecycleEntry): ReadinessId[] {
    return entry.readiness.checks.filter((check) => check.result === 'fail').map((check) => check.id);
}

describe('readiness', () => {
    it('AC-003: a spec that passes R-1 to R-6 is Ready and R-7 is not available', async () => {
        const entry = await entryOf({
            '.specs/backlog/0001-a.md': specText({ plan: LINKED }),
            '.specs/backlog/0001-a.plan.md': planText(),
        });
        expect(entry.state).toBe('Ready');
        expect(entry.readiness.ready).toBe(true);
        expect(entry.readiness.checks.map((check) => [check.id, check.result])).toEqual([
            ['R-1', 'pass'],
            ['R-2', 'pass'],
            ['R-3', 'pass'],
            ['R-4', 'pass'],
            ['R-5', 'pass'],
            ['R-6', 'pass'],
            ['R-7', 'not available'],
        ]);
    });

    it('AC-003: the Ready fixture passes every precondition', async () => {
        const model = deriveLifecycle(await readFixture('fs110-ready-synthetic'));
        expect(model.entries.find((entry) => entry.stem === '0001-ready-feature')?.readiness.failing).toEqual([]);
    });

    it('AC-004: without a sibling plan the spec is not Ready and R-3 and R-4 fail', async () => {
        const entry = await entryOf({ '.specs/backlog/0001-a.md': specText({ plan: '_none yet_' }) });
        expect(entry.state).toBe('Backlog');
        expect(entry.readiness.ready).toBe(false);
        expect(failing(entry)).toEqual(['R-3', 'R-4']);
        expect(entry.readiness.failing).toEqual(['R-3', 'R-4']);
    });

    it('AC-004: a plan that the Plan line does not link fails R-3 only', async () => {
        const entry = await entryOf({
            '.specs/backlog/0001-a.md': specText({ plan: '_none yet_' }),
            '.specs/backlog/0001-a.plan.md': planText(),
        });
        expect(entry.state).toBe('Backlog');
        expect(failing(entry)).toEqual(['R-3']);
    });

    it('AC-004: a plan whose status is not Not started fails R-4 only', async () => {
        const entry = await entryOf({
            '.specs/backlog/0001-a.md': specText({ plan: LINKED }),
            '.specs/backlog/0001-a.plan.md': planText({ status: 'In Progress' }),
        });
        expect(entry.state).toBe('Backlog');
        expect(failing(entry)).toEqual(['R-4']);
    });

    it('AC-004: a Plan line that links another file than the sibling plan fails R-3', async () => {
        const entry = await entryOf({
            '.specs/backlog/0001-a.md': specText({ plan: '[x](0002-other.plan.md)' }),
            '.specs/backlog/0001-a.plan.md': planText(),
            '.specs/backlog/0002-other.plan.md': planText(),
        });
        expect(failing(entry)).toEqual(['R-3']);
    });

    it('AC-003: R-2 fails without an acceptance criterion; R-1 fails for another folder or status', async () => {
        const noCriteria = await entryOf({
            '.specs/backlog/0001-a.md': specText({ plan: LINKED, criteria: false }),
            '.specs/backlog/0001-a.plan.md': planText(),
        });
        expect(failing(noCriteria)).toEqual(['R-2']);
        expect(noCriteria.state).toBe('Backlog');
        const clarified = await entryOf({
            '.specs/backlog/0001-a.md': specText({ status: 'Implemented', plan: LINKED }),
            '.specs/backlog/0001-a.plan.md': planText(),
        });
        expect(failing(clarified)).toContain('R-1');
        const active = await entryOf(
            { '.specs/active/0001-a.md': specText({ status: 'In Progress', plan: LINKED }), '.specs/active/0001-a.plan.md': planText() },
            '.specs/active/0001-a.md',
        );
        expect(failing(active)).toContain('R-1');
        expect(active.state).toBe('Active');
    });

    it('AC-005: every fail and every not available result carries a reason; pass carries none; R-7 never fails the check', async () => {
        const entry = await entryOf({ '.specs/backlog/0001-a.md': specText({ plan: '_none yet_', criteria: false }) });
        expect(entry.readiness.checks).toHaveLength(7);
        for (const check of entry.readiness.checks) {
            if (check.result === 'pass') {
                expect('reason' in check).toBe(false);
            } else {
                expect((check as { reason: string }).reason.length).toBeGreaterThan(0);
            }
        }
        const r7 = entry.readiness.checks[6];
        expect([r7.id, r7.result]).toEqual(['R-7', 'not available']);
        expect(entry.readiness.checks.map((check) => check.result)).toEqual(['pass', 'fail', 'fail', 'fail', 'pass', 'pass', 'not available']);
        expect(entry.readiness.ready).toBe(false);
    });

    it('AC-005: the reasons use the plan texts X-6', async () => {
        const entry = await entryOf({ '.specs/backlog/0001-a.md': specText({ plan: '_none yet_' }) });
        const reasons = Object.fromEntries(entry.readiness.checks.map((check) => [check.id, 'reason' in check ? check.reason : undefined]));
        expect(reasons['R-3']).toBe('No sibling plan, or the Plan line does not link it.');
        expect(reasons['R-4']).toBe('The sibling plan is missing or not "Not started".');
        expect(reasons['R-7']).toBe('Inter-spec dependencies: not available — FeatherSpec has no dependency field.');
    });
});
