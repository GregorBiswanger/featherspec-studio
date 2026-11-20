import { describe, expect, it } from 'vitest';
import type { ShellModel } from '../ports/shell';
import type { SetupRun } from '../discovery/setupSign';
import { buildOverviewView } from './overviewView';
import { modelFor, type SpecInput } from './testing/projects';

const HISTORY = { available: true as const, label: 'Observed', entries: [] };

async function view(setupRun: SetupRun | undefined, specs: SpecInput[]) {
    const base = await modelFor(specs);
    const model: ShellModel = { ...base, project: { ...base.project, ...(setupRun === undefined ? {} : { setupRun }) } };
    return buildOverviewView({ model, history: HISTORY });
}

describe('0029 AC-007: Up next without rows says to set up first while setup has not run and specs exist', () => {
    it('0029 AC-007 with only a Done spec and setup not run, Up next is empty and carries the setup flag, no welcome', async () => {
        const result = await view('not run', [{ number: '0001', kind: 'Done' }]);
        expect(result.upNext.rows).toEqual([]);
        expect(result.upNext.setup).toBe(true);
        expect('welcome' in result).toBe(false);
    });

    it('0029 AC-007 negative control: with an Up next row the flag is absent and the rows are as before', async () => {
        const result = await view('not run', [{ number: '0001', kind: 'Backlog' }]);
        expect(result.upNext.rows).toHaveLength(1);
        expect('setup' in result.upNext).toBe(false);
    });

    it('0029 AC-006 negative control: setup run or unknown, or without the sign, carries no flag', async () => {
        for (const sign of ['run or unknown', undefined] as const) {
            expect('setup' in (await view(sign, [{ number: '0001', kind: 'Done' }])).upNext).toBe(false);
        }
    });

    it('0029 AC-007 Now is unchanged by the sign', async () => {
        const plain = await view(undefined, [{ number: '0001', kind: 'Active' }]);
        const notRun = await view('not run', [{ number: '0001', kind: 'Active' }]);
        expect(notRun.now).toEqual(plain.now);
        expect(notRun.figures).toEqual(plain.figures);
    });
});
