import { describe, expect, it } from 'vitest';
import { deriveLifecycle } from './deriveLifecycle';
import type { LifecycleModel } from './model';
import { judgeTransition } from './transitions';
import { planText, readMemory, specText } from './testing/projects';

const READY = '.specs/backlog/0001-a.md';
const BACKLOG = '.specs/backlog/0002-b.md';
const ACTIVE = '.specs/active/0003-c.md';
const REVIEW = '.specs/active/0004-d.md';
const BLOCKED = '.specs/active/0005-e.md';
const DONE = '.specs/done/0006-f.md';

async function build(): Promise<LifecycleModel> {
    return deriveLifecycle(
        await readMemory({
            [READY]: specText({ plan: '[0001-a.plan.md](0001-a.plan.md)' }),
            '.specs/backlog/0001-a.plan.md': planText(),
            [BACKLOG]: specText({ plan: '_none yet_' }),
            [ACTIVE]: specText({ status: 'In Progress', plan: '[0003-c.plan.md](0003-c.plan.md)' }),
            '.specs/active/0003-c.plan.md': planText({ status: 'In Progress' }),
            [REVIEW]: specText({ status: 'In Progress', plan: '[0004-d.plan.md](0004-d.plan.md)' }),
            '.specs/active/0004-d.plan.md': planText({ status: 'Done' }),
            [BLOCKED]: specText({ status: 'In Progress', plan: '[0005-e.plan.md](0005-e.plan.md)' }),
            '.specs/active/0005-e.plan.md': planText({ status: 'Blocked' }),
            [DONE]: specText({ status: 'Baseline', plan: '_none_' }),
        }),
    );
}

describe('judgeTransition', () => {
    it('AC-008: Ready -> Active is accepted and changes no state', async () => {
        const model = await build();
        const before = structuredClone(model);
        const verdict = judgeTransition(model, READY, 'Active');
        expect(verdict).toEqual({ accepted: true, key: READY, target: 'Active' });
        expect(model).toEqual(before);
        expect(model.entries.find((entry) => entry.key === READY)?.state).toBe('Ready');
    });

    it('AC-008: an entry that is not in the snapshot is refused as not observed, for every target', async () => {
        const model = await build();
        for (const target of ['Active', 'Ready', 'Done', 'Backlog'] as const) {
            const verdict = judgeTransition(model, '.specs/backlog/9999-gone.md', target);
            expect(verdict.accepted).toBe(false);
            expect(!verdict.accepted && verdict.refusal).toEqual({ kind: 'not-observed' });
        }
    });

    it('AC-008: Ready, Review and Blocked are derived targets and name their rule', async () => {
        const model = await build();
        const refusals = (['Ready', 'Review', 'Blocked'] as const).map((target) => {
            const verdict = judgeTransition(model, ACTIVE, target);
            return !verdict.accepted && verdict.refusal;
        });
        expect(refusals).toEqual([
            { kind: 'derived-target', target: 'Ready', rule: 'S-READY' },
            { kind: 'derived-target', target: 'Review', rule: 'S-REVIEW' },
            { kind: 'derived-target', target: 'Blocked', rule: 'S-BLOCKED' },
        ]);
    });

    it('AC-008: Done needs evidence, whatever the entry state', async () => {
        const model = await build();
        for (const key of [READY, ACTIVE, REVIEW, DONE]) {
            const verdict = judgeTransition(model, key, 'Done');
            expect(!verdict.accepted && verdict.refusal).toEqual({ kind: 'needs-evidence' });
        }
    });

    it('AC-008: Active for a Backlog entry names the failing readiness preconditions', async () => {
        const model = await build();
        const verdict = judgeTransition(model, BACKLOG, 'Active');
        expect(!verdict.accepted && verdict.refusal).toEqual({ kind: 'not-ready', failing: ['R-3', 'R-4'] });
    });

    it('AC-008: every other request is a lifecycle move and is refused', async () => {
        const model = await build();
        const cases: [string, 'Backlog' | 'Active'][] = [
            [READY, 'Backlog'],
            [ACTIVE, 'Active'],
            [REVIEW, 'Active'],
            [BLOCKED, 'Active'],
            [DONE, 'Active'],
            [DONE, 'Backlog'],
            [ACTIVE, 'Backlog'],
        ];
        for (const [key, target] of cases) {
            const verdict = judgeTransition(model, key, target);
            expect(!verdict.accepted && verdict.refusal).toEqual({ kind: 'lifecycle-move' });
        }
    });

    it('AC-008: the first matching row applies — derived target beats not ready, not observed beats all', async () => {
        const model = await build();
        const derived = judgeTransition(model, BACKLOG, 'Ready');
        expect(!derived.accepted && derived.refusal.kind).toBe('derived-target');
        const evidence = judgeTransition(model, BACKLOG, 'Done');
        expect(!evidence.accepted && evidence.refusal.kind).toBe('needs-evidence');
    });

    it('AC-008: the refusal texts follow X-1 to X-5', async () => {
        const model = await build();
        const text = (key: string, target: Parameters<typeof judgeTransition>[2]): string => {
            const verdict = judgeTransition(model, key, target);
            return verdict.accepted ? '' : verdict.text;
        };
        expect(text('.specs/backlog/9999-gone.md', 'Active')).toBe('This spec is no longer in the project.');
        expect(text(ACTIVE, 'Review')).toBe('Review is derived from the files (rule S-REVIEW); it cannot be set on the board.');
        expect(text(ACTIVE, 'Done')).toBe('Done needs /sdd-compile evidence and the /sdd-lifecycle move; Studio does not move specs.');
        expect(text(BACKLOG, 'Active')).toBe(
            'The spec is not Ready: R-3 No sibling plan, or the Plan line does not link it; R-4 The sibling plan is missing or not "Not started".',
        );
        expect(text(ACTIVE, 'Backlog')).toBe('Studio does not move specs; lifecycle moves belong to /sdd-lifecycle.');
    });
});
