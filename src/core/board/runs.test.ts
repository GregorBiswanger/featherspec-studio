import { describe, expect, it } from 'vitest';
import type { ReadResult, RunView } from '../runtime/model';
import { cardRun, indexRuns } from './runs';

function run(runId: string, stem: string, overrides: Partial<RunView> = {}): RunView {
    return {
        runId,
        providerId: 'copilot',
        model: 'not available',
        spec: { stem, path: `.specs/active/${stem}.md` },
        sessionRef: undefined,
        status: 'Running',
        statusHistory: [],
        created: '2026-11-16T10:00:00.000Z',
        started: undefined,
        ended: undefined,
        errorClass: undefined,
        errorMessage: undefined,
        result: undefined,
        historyIncomplete: false,
        historyUnreadable: false,
        newerVersion: false,
        ...overrides,
    };
}

const ok = (runs: RunView[]): ReadResult<RunView[]> => ({ available: true, value: runs });

describe('latest run on the card', () => {
    it('AC-007: the newest run of the stem is shown with its provider and status (the store lists newest created first)', () => {
        const index = indexRuns(ok([run('r3', '0001-a', { status: 'Failed', providerId: 'fake' }), run('r2', '0001-a'), run('r1', '0002-b')]));
        expect(cardRun(index, '0001-a')).toEqual({ kind: 'run', provider: 'fake', status: 'Failed' });
        expect(cardRun(index, '0002-b')).toEqual({ kind: 'run', provider: 'copilot', status: 'Running' });
    });

    it('AC-007: a stem with no run shows "No run"', () => {
        expect(cardRun(indexRuns(ok([run('r1', '0002-b')])), '0001-a')).toEqual({ kind: 'none' });
        expect(cardRun(indexRuns(ok([])), '0001-a')).toEqual({ kind: 'none' });
    });

    it('AC-007: runs not available (store unavailable) show "Runs: not available" for every stem', () => {
        const index = indexRuns({ available: false, reason: 'no storage' });
        expect(cardRun(index, '0001-a')).toEqual({ kind: 'unavailable' });
    });

    it('AC-007: a latest run whose history is unreadable shows that text in place of the status', () => {
        const index = indexRuns(ok([run('r1', '0001-a', { historyUnreadable: true, status: 'Starting' })]));
        expect(cardRun(index, '0001-a')).toEqual({ kind: 'unreadable', provider: 'copilot' });
    });

    it('AC-007: a duplicated stem gives the same run to every entry (the join is by stem)', () => {
        const index = indexRuns(ok([run('r1', '0004-x')]));
        expect(cardRun(index, '0004-x')).toEqual(cardRun(index, '0004-x'));
        expect(cardRun(index, '0004-x').kind).toBe('run');
    });
});
