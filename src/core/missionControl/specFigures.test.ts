import { describe, expect, it } from 'vitest';
import type { McSpecs, StateCount } from '../../shared/protocol/missionControl';
import { projectHeader, projectSpecFigures } from './specFigures';
import { AC001_FIXTURE, modelFor } from './testing/projects';

function counts(specs: McSpecs): StateCount[] {
    if (specs.kind !== 'counts') {
        throw new Error('expected counts');
    }
    return specs.states;
}

describe('spec figures', () => {
    it('AC-001: the AC-001 fixture counts every spec in one state and the six counts add up to the total', async () => {
        const specs = projectSpecFigures(await modelFor(AC001_FIXTURE));
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
        const states = counts(projectSpecFigures(await modelFor(AC001_FIXTURE)));
        expect(states.find((entry) => entry.state === 'Done')).toMatchObject({ count: 3, deprecated: 1 });
        expect(states.filter((entry) => entry.deprecated !== undefined).map((entry) => entry.state)).toEqual(['Done']);
    });

    it('AC-025: Ready, Review and Blocked carry their rule ID, the other states carry none', async () => {
        const states = counts(projectSpecFigures(await modelFor(AC001_FIXTURE)));
        expect(states.filter((entry) => entry.derivedRule !== undefined).map((entry) => [entry.state, entry.derivedRule])).toEqual([
            ['Ready', 'S-READY'],
            ['Review', 'S-REVIEW'],
            ['Blocked', 'S-BLOCKED'],
        ]);
    });

    it('AC-003: progress on the AC-001 fixture reads 25 % (2 of 8)', async () => {
        const specs = projectSpecFigures(await modelFor(AC001_FIXTURE));
        expect(specs).toMatchObject({ progress: { kind: 'value', percent: 25, done: 2, divisor: 8 } });
    });

    it('AC-003: the percentage is rounded down (1 of 3 reads 33, not 34)', async () => {
        const specs = projectSpecFigures(
            await modelFor([
                { number: '0001', kind: 'Done' },
                { number: '0002', kind: 'Backlog' },
                { number: '0003', kind: 'Active' },
            ]),
        );
        expect(specs).toMatchObject({ progress: { kind: 'value', percent: 33, done: 1, divisor: 3 } });
    });

    it('AC-003: a done/ spec with another status counts in the divisor only (PD-021)', async () => {
        const specs = projectSpecFigures(
            await modelFor([
                { number: '0001', kind: 'Done' },
                { number: '0002', kind: 'DoneOther' },
            ]),
        );
        expect(specs).toMatchObject({ progress: { kind: 'value', percent: 50, done: 1, divisor: 2 } });
        expect(counts(specs).find((entry) => entry.state === 'Done')?.count).toBe(2);
    });

    it('AC-004: when total minus Deprecated is 0 progress is "not available", not 0 %', async () => {
        const specs = projectSpecFigures(await modelFor([{ number: '0001', kind: 'Deprecated' }]));
        expect(specs).toMatchObject({ kind: 'counts', total: 1, progress: { kind: 'not available' } });
    });

    it('AC-020: a project with zero specs gives the empty form', async () => {
        expect(projectSpecFigures(await modelFor([]))).toEqual({ kind: 'empty' });
    });
});

describe('header', () => {
    it('AC-017: name, version as reported ("unknown" included), update time and the project-level diagnostic count', async () => {
        const model = await modelFor([{ number: '0001', kind: 'Backlog' }]);
        expect(projectHeader({ name: 'demo', version: '1.10.0' }, model, '2026-11-16T10:00:00.000Z')).toMatchObject({
            name: 'demo',
            version: '1.10.0',
            updatedAt: '2026-11-16T10:00:00.000Z',
            projectDiagnostics: 0,
        });
        expect(projectHeader({ name: 'demo', version: 'unknown' }, model, 'x').version).toBe('unknown');
    });

    it('AC-017: an orphan plan counts as a project-level diagnostic (attached to no spec)', async () => {
        const model = await modelFor([{ number: '0001', kind: 'Backlog' }], {
            '.specs/backlog/0042-lonely.plan.md': '# Plan\n\n**Spec:** [x](0042-lonely.md)\n**Status:** Not started\n',
        });
        expect(projectHeader({ name: 'demo', version: '1.10.0' }, model, 'x').projectDiagnostics).toBeGreaterThan(0);
    });

    it('A-012: diagnosticStems holds the specs that carry any diagnostic, sorted, and not a clean spec', async () => {
        const model = await modelFor([
            { number: '0001', kind: 'Backlog' },
            { number: '0002', kind: 'Unknown' },
            { number: '0003', kind: 'Contradicted' },
        ]);
        const header = projectHeader({ name: 'demo', version: '1.10.0' }, model, 'x');
        expect(header.diagnosticStems).toEqual(['0002-thing', '0003-thing']);
    });
});
