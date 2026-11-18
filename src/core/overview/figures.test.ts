import { describe, expect, it } from 'vitest';
import type { OverviewFigures, StateCount } from '../../shared/protocol/overview';
import { projectFigures } from './figures';
import { AC001_FIXTURE, modelFor } from './testing/projects';

function counts(specs: OverviewFigures): StateCount[] {
    if (specs.kind !== 'counts') {
        throw new Error('expected counts');
    }
    return specs.states;
}

describe('spec figures', () => {
    it('AC-001: the AC-001 fixture counts every spec in one state and the six counts add up to the total', async () => {
        const specs = projectFigures(await modelFor(AC001_FIXTURE));
        expect(specs.kind).toBe('counts');
        if (specs.kind !== 'counts') {
            return;
        }
        expect(specs.total).toBe(9);
        expect(specs.states.map((entry) => [entry.state, entry.count])).toEqual([
            ['Backlog', 2],
            ['Ready', 1],
            ['Active', 1],
            ['Review', 1],
            ['Done', 3],
            ['Blocked', 1],
        ]);
        expect(specs.states.reduce((sum, entry) => sum + entry.count, 0)).toBe(specs.total);
    });

    it('AC-002: Done reads 3 of which Deprecated 1; only Done carries a deprecated number', async () => {
        const states = counts(projectFigures(await modelFor(AC001_FIXTURE)));
        expect(states.find((entry) => entry.state === 'Done')).toMatchObject({ count: 3, deprecated: 1 });
        expect(states.filter((entry) => entry.deprecated !== undefined).map((entry) => entry.state)).toEqual(['Done']);
    });

    it('0018 AC-003: the figures name no rule: no state count carries a rule ID', async () => {
        const states = counts(projectFigures(await modelFor(AC001_FIXTURE)));
        expect(states.every((entry) => !('derivedRule' in entry))).toBe(true);
        expect(JSON.stringify(states)).not.toMatch(/S-READY|S-REVIEW|S-BLOCKED/);
    });

    it('AC-003: progress on the AC-001 fixture reads 25 % (2 of 8)', async () => {
        const specs = projectFigures(await modelFor(AC001_FIXTURE));
        expect(specs).toMatchObject({ progress: { kind: 'value', percent: 25, done: 2, divisor: 8 } });
    });

    it('AC-003: the percentage is rounded down (1 of 3 reads 33, not 34)', async () => {
        const specs = projectFigures(
            await modelFor([
                { number: '0001', kind: 'Done' },
                { number: '0002', kind: 'Backlog' },
                { number: '0003', kind: 'Active' },
            ]),
        );
        expect(specs).toMatchObject({ progress: { kind: 'value', percent: 33, done: 1, divisor: 3 } });
    });

    it('AC-003: a done/ spec with another status counts in the divisor only (PD-021)', async () => {
        const specs = projectFigures(
            await modelFor([
                { number: '0001', kind: 'Done' },
                { number: '0002', kind: 'DoneOther' },
            ]),
        );
        expect(specs).toMatchObject({ progress: { kind: 'value', percent: 50, done: 1, divisor: 2 } });
        expect(counts(specs).find((entry) => entry.state === 'Done')?.count).toBe(2);
    });

    it('AC-004: when total minus Deprecated is 0 progress is "not available", not 0 %', async () => {
        const specs = projectFigures(await modelFor([{ number: '0001', kind: 'Deprecated' }]));
        expect(specs).toMatchObject({ kind: 'counts', total: 1, progress: { kind: 'not available' } });
    });

    it('AC-020: a project with zero specs gives the empty form', async () => {
        expect(projectFigures(await modelFor([]))).toEqual({ kind: 'empty' });
    });
});
