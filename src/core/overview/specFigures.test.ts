import { describe, expect, it } from 'vitest';
import type { McSpecs, StateCount } from '../../shared/protocol/overview';
import { projectHeader, projectSpecFigures } from './specFigures';
import { AC001_FIXTURE, modelFor, modelOfFixture } from './testing/projects';

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
    it('AC-017: name, version as reported ("unknown" included), update time and no Problem', async () => {
        const model = await modelFor([{ number: '0001', kind: 'Backlog' }]);
        expect(projectHeader({ name: 'demo', version: '1.10.0' }, model, '2026-11-16T10:00:00.000Z')).toMatchObject({
            name: 'demo',
            version: '1.10.0',
            updatedAt: '2026-11-16T10:00:00.000Z',
            problems: 0,
            problemStems: [],
        });
        expect(projectHeader({ name: 'demo', version: 'unknown' }, model, 'x').version).toBe('unknown');
    });

    it('AC-008 (0016): a project-level format note (an archived orphan plan) is no Problem and the header counts none', async () => {
        const model = await modelFor([{ number: '0001', kind: 'Backlog' }], {
            '.specs/plan-archive/0042-lonely.2026-09-19.plan.md': '# Plan\n\n**Spec:** [x](0042-lonely.md)\n**Status:** Not started\n',
        });
        expect(projectHeader({ name: 'demo', version: '1.10.0' }, model, 'x')).toMatchObject({ problems: 0, problemStems: [] });
    });

    it('AC-008: problemStems holds the specs that carry a Problem, sorted, and not a spec with an unknown header line (a note)', async () => {
        const model = await modelFor([
            { number: '0001', kind: 'Backlog' },
            { number: '0002', kind: 'Unknown' },
            { number: '0003', kind: 'Contradicted' },
        ]);
        const header = projectHeader({ name: 'demo', version: '1.10.0' }, model, 'x');
        expect(header.problemStems).toEqual(['0003-thing']);
        expect(header.problems).toBe(1);
    });

    it('AC-008: problems counts the Problems on specs plus those at project level (fs-broken: 2; an orphan return note adds one)', async () => {
        expect(projectHeader({ name: 'demo', version: '1.10.0' }, await modelOfFixture('fs-broken'), 'x')).toMatchObject({
            problems: 2,
            problemStems: ['0002-invalid-utf8', '0003-also-valid'],
        });
        const model = await modelFor([{ number: '0001', kind: 'Backlog' }], { '.memory-bank/activeContext.0099-T-001.md': '**Status:** DONE\n' });
        expect(projectHeader({ name: 'demo', version: '1.10.0' }, model, 'x')).toMatchObject({ problems: 1, problemStems: [] });
    });

    it('AC-008 control: format notes on a spec count for nothing (fs170 0006)', async () => {
        const header = projectHeader({ name: 'demo', version: '1.7.0' }, await modelOfFixture('fs170-brownfield-mixed'), 'x');
        expect(header.problems).toBe(1);
        expect(header.problemStems).toHaveLength(1);
    });

    it('AC-008: one spec with several Problems (an unknown status, a dangling plan link and the folder contradiction) counts each, because the header counts Problems and not specs', async () => {
        const model = await modelFor([], {
            '.specs/backlog/0001-two.md': '# Two\n\n**Status:** Half done\n**Plan:** [p](0001-two.plan.md)\n\n## 9. Acceptance criteria\n\n- **AC-001** The system shall work.\n',
        });
        const header = projectHeader({ name: 'demo', version: '1.10.0' }, model, 'x');
        expect(header.problemStems).toEqual(['0001-two']);
        expect(header.problems).toBe(3);
    });
});
