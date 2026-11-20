import { describe, expect, it } from 'vitest';
import { projectNow } from '../overview/rows';
import { createSpecResolver } from '../overview/specRefs';
import { fixtureModel, PARALLEL_SPEC, setNote } from '../planMap/testing/plans';
import type { LifecycleEntry } from '../lifecycle/model';
import type { ShellModel } from '../ports/shell';
import { buildDetail } from './detail';

const NO_HISTORY = { available: true as const, label: '', entries: [] };
const PARTIAL = '.specs/active/0001-fixture-demo.md';

function detailQuiet(model: ShellModel, key: string): unknown {
    const entry = model.lifecycle.entries.find((candidate: LifecycleEntry) => candidate.key === key)!;
    const view = buildDetail({ selection: { stem: entry.stem, path: key }, model, history: NO_HISTORY });
    if (view.kind !== 'spec' || !('lines' in view.nextStep)) {
        throw new Error('expected next step lines');
    }
    return (view.nextStep as { quiet?: boolean }).quiet;
}

function rowQuiet(model: ShellModel, key: string): unknown {
    const rows = projectNow(model, createSpecResolver(model)).rows;
    return (rows.find((row) => row.spec.path === key || row.spec.stem === key.slice(key.lastIndexOf('/') + 1, -3)) as { quiet?: boolean } | undefined)?.quiet;
}

describe('0025 AC-026: Integrate is quiet while someone is out', () => {
    it('0025 AC-026: fs-partial-return (U-08) is quiet in the detail view and in the Now row', async () => {
        const model = await fixtureModel('fs-partial-return');
        expect(detailQuiet(model, PARTIAL)).toBe(true);
        expect(rowQuiet(model, PARTIAL)).toBe(true);
    });

    it('0025 AC-026: both notes (U-05, NS-4) are not quiet', async () => {
        const model = await fixtureModel('fs110-parallel-synthetic');
        expect(detailQuiet(model, PARALLEL_SPEC)).toBeUndefined();
        expect(rowQuiet(model, PARALLEL_SPEC)).toBeUndefined();
    });

    it('0025 AC-026: every member returned, so U-05 and the Integrate line is primary again', async () => {
        const model = await fixtureModel('fs-partial-return', setNote('.memory-bank/activeContext.0001-T-004.md', '# Return note — 0001 · T-004\n\n- **Status:** DONE\n- **Files:** —\n- **Verified:** —\n- **Notes:** —\n'));
        expect(detailQuiet(model, PARTIAL)).toBeUndefined();
        expect(rowQuiet(model, PARTIAL)).toBeUndefined();
    });
});
