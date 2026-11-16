import { describe, expect, it } from 'vitest';
import { deriveLifecycle } from './deriveLifecycle';
import type { LifecycleEntry } from './model';
import { planText, readFixture, readMemory, row, specText } from './testing/projects';
import { COMPILE_VERDICT_TEXT } from './verification';

const LINKED = '[0001-a.plan.md](0001-a.plan.md)';
const ARCHIVE = '[0001-a.2026-11-01.plan.md](../plan-archive/0001-a.2026-11-01.plan.md)';

async function verificationOf(files: Record<string, string>, key = '.specs/active/0001-a.md'): Promise<LifecycleEntry['verification']> {
    const entry = deriveLifecycle(await readMemory(files)).entries.find((candidate) => candidate.key === key);
    if (entry === undefined) {
        throw new Error('entry missing');
    }
    return entry.verification;
}

const ACTIVE = { '.specs/active/0001-a.md': specText({ status: 'In Progress', plan: LINKED }) };

describe('verification status', () => {
    it('AC-018: rows are counted per State value and unknown values count as other', async () => {
        const status = await verificationOf({
            ...ACTIVE,
            '.specs/active/0001-a.plan.md': planText({ status: 'In Progress', rows: [row('AC-001', 'open'), row('AC-002', 'built'), row('AC-003', 'verified'), row('AC-004', 'verified'), row('AC-005', 'wip')] }),
        });
        expect(status.counts).toEqual({ open: 1, built: 1, verified: 2, other: 1 });
        expect(status.summary).toBe('pending');
        expect(status.source).toBe('.specs/active/0001-a.plan.md');
    });

    it('AC-018: all rows verified gives all verified', async () => {
        const status = await verificationOf({ ...ACTIVE, '.specs/active/0001-a.plan.md': planText({ rows: [row('AC-001', 'verified'), row('AC-002', 'verified')] }) });
        expect(status.summary).toBe('all verified');
    });

    it('AC-018: no plan, no table or a table without rows gives not available', async () => {
        const none = await verificationOf(ACTIVE);
        expect([none.summary, none.source, none.counts]).toEqual(['not available', undefined, { open: 0, built: 0, verified: 0, other: 0 }]);
        const noTable = await verificationOf({ ...ACTIVE, '.specs/active/0001-a.plan.md': planText() });
        expect(noTable.summary).toBe('not available');
        const empty = await verificationOf({ ...ACTIVE, '.specs/active/0001-a.plan.md': planText({ rows: [] }) });
        expect(empty.summary).toBe('not available');
    });

    it('AC-018: the /sdd-compile verdict is not available', async () => {
        const status = await verificationOf(ACTIVE);
        expect(status.compileVerdict).toBe('not available');
        expect(status.compileVerdictText).toBe(COMPILE_VERDICT_TEXT);
    });

    it('AC-018: a done/ spec reads the archived plan its Plan line links, not a legacy sibling plan', async () => {
        const files = {
            '.specs/done/0001-a.md': specText({ status: 'Implemented', plan: ARCHIVE }),
            '.specs/done/0001-a.plan.md': planText({ status: 'Done', rows: [row('AC-001', 'open')] }),
            '.specs/plan-archive/0001-a.2026-11-01.plan.md': planText({ status: 'Done', rows: [row('AC-001', 'verified')] }),
        };
        const status = await verificationOf(files, '.specs/done/0001-a.md');
        expect([status.summary, status.source]).toEqual(['all verified', '.specs/plan-archive/0001-a.2026-11-01.plan.md']);
    });

    it('AC-018: a done/ spec without an archive link reads its legacy sibling plan', async () => {
        const status = await verificationOf(
            { '.specs/done/0001-a.md': specText({ status: 'Implemented', plan: LINKED }), '.specs/done/0001-a.plan.md': planText({ status: 'Done', rows: [row('AC-001', 'built')] }) },
            '.specs/done/0001-a.md',
        );
        expect([status.summary, status.source]).toEqual(['pending', '.specs/done/0001-a.plan.md']);
    });

    it('AC-018: a linked archive file that is missing gives not available, even beside a legacy sibling plan', async () => {
        const status = await verificationOf(
            { '.specs/done/0001-a.md': specText({ status: 'Implemented', plan: ARCHIVE }), '.specs/done/0001-a.plan.md': planText({ status: 'Done', rows: [row('AC-001', 'verified')] }) },
            '.specs/done/0001-a.md',
        );
        expect([status.summary, status.source]).toEqual(['not available', undefined]);
    });

    it('AC-018: a Baseline without a plan is not available', async () => {
        const status = await verificationOf({ '.specs/done/0001-a.md': specText({ status: 'Baseline', plan: '_none_' }) }, '.specs/done/0001-a.md');
        expect(status.summary).toBe('not available');
    });

    it('AC-018: the archived fixture plan reports its rows', async () => {
        const model = deriveLifecycle(await readFixture('fs180-en-done-archived'));
        expect(model.entries[0].verification.source).toBe('.specs/plan-archive/0001-split-bill-with-tip.2026-09-19.plan.md');
        expect(model.entries[0].verification.counts.other).toBe(0);
    });

    it('AC-007: a Review spec stays Review when every traceability row is verified', async () => {
        const model = deriveLifecycle(
            await readMemory({ ...ACTIVE, '.specs/active/0001-a.plan.md': planText({ status: 'Done', rows: [row('AC-001', 'verified')] }) }),
        );
        expect(model.entries[0].state).toBe('Review');
        expect(model.entries[0].verification.summary).toBe('all verified');
    });

    it('AC-007: only a spec in done/ is Done (negative control: active/ never is)', async () => {
        const model = deriveLifecycle(
            await readMemory({ ...ACTIVE, '.specs/active/0001-a.plan.md': planText({ status: 'Done', rows: [row('AC-001', 'verified')] }) }),
        );
        expect(model.entries.some((entry) => entry.state === 'Done')).toBe(false);
    });
});
