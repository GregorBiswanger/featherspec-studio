import { describe, expect, it } from 'vitest';
import { projectAttention } from './attention';
import { projectRuns } from './runFigures';
import type { RunsRead } from './runSource';
import { createSpecResolver } from './specRefs';
import { modelFor, type SpecInput } from './testing/projects';
import { makeRun, type RunInput } from './testing/runs';

async function attention(specs: SpecInput[], runs: RunInput[] | RunsRead = [], extraFiles: Record<string, string> = {}) {
    const model = await modelFor(specs, extraFiles);
    const resolver = createSpecResolver(model);
    const read: RunsRead = Array.isArray(runs) ? { available: true, runs: runs.map(makeRun) } : runs;
    const facts = projectRuns(read, model, (stem) => resolver.forStem(stem));
    return projectAttention(model, facts, resolver);
}

function rows(result: Awaited<ReturnType<typeof attention>>): [string, string[]][] {
    return result.rows.map((row) => [row.spec.number, row.reasons]);
}

describe('Needs attention', () => {
    it('AC-008: a Backlog spec without a plan is not listed, a Review spec is, with the reason "Review pending"', async () => {
        const result = await attention([
            { number: '0001', kind: 'Backlog' },
            { number: '0002', kind: 'Review' },
        ]);
        expect(rows(result)).toEqual([['0002', ['Review pending']]]);
        expect(result.runReasons).toEqual({ available: true });
    });

    it('AC-008: a Blocked spec with a failed latest run is one row with both reasons, in the order (a) to (e)', async () => {
        const result = await attention([{ number: '0001', kind: 'Blocked' }], [{ id: 'f', stem: '0001-thing', status: 'Failed' }]);
        expect(rows(result)).toEqual([['0001', ['Blocked', 'Run failed']]]);
    });

    it('AC-008: an Interrupted latest run gives "Run interrupted"; a waiting run gives "Waiting for you" (c)', async () => {
        const result = await attention(
            [
                { number: '0001', kind: 'Active' },
                { number: '0002', kind: 'Active' },
            ],
            [
                { id: 'i', stem: '0001-thing', status: 'Interrupted' },
                { id: 'w', stem: '0002-thing', status: 'WaitingForApproval' },
            ],
        );
        expect(rows(result)).toEqual([
            ['0001', ['Run interrupted']],
            ['0002', ['Waiting for you']],
        ]);
    });

    it('AC-008: a run whose stem matches no spec creates no row (PD-046)', async () => {
        const result = await attention([{ number: '0001', kind: 'Active' }], [{ id: 'f', stem: '0099-vanished', status: 'Failed' }]);
        expect(result.rows).toEqual([]);
    });

    it('AC-008: a Done spec with a failed run has no row (the highlight ended with Done), and a Cancelled run adds nothing (negative control)', async () => {
        const result = await attention(
            [
                { number: '0001', kind: 'Done' },
                { number: '0002', kind: 'Active' },
            ],
            [
                { id: 'f', stem: '0001-thing', status: 'Failed' },
                { id: 'c', stem: '0002-thing', status: 'Cancelled' },
            ],
        );
        expect(result.rows).toEqual([]);
    });

    it('OP-10: rows are ordered by ascending spec number whatever the order of the files', async () => {
        const result = await attention([
            { number: '0009', kind: 'Review' },
            { number: '0003', kind: 'Blocked' },
            { number: '0005', kind: 'Review' },
        ]);
        expect(result.rows.map((row) => row.spec.number)).toEqual(['0003', '0005', '0009']);
    });

    it('AC-009: a lifecycle contradiction counts as (d); an unknown-content diagnostic does not', async () => {
        const result = await attention([
            { number: '0001', kind: 'Unknown' },
            { number: '0002', kind: 'Contradicted' },
        ]);
        expect(rows(result)).toEqual([['0002', ['Diagnostic']]]);
    });

    it('AC-008: an unreadable spec file counts as (d)', async () => {
        const model = await modelFor([{ number: '0001', kind: 'Backlog' }]);
        const entry = model.lifecycle.entries[0]!;
        const broken = {
            ...model,
            lifecycle: { ...model.lifecycle, entries: [{ ...entry, diagnostics: [{ kind: 'unreadable-file' as const, scope: { file: entry.key }, reason: 'cannot read' }] }] },
        };
        const resolver = createSpecResolver(broken);
        const facts = projectRuns({ available: true, runs: [] }, broken, (stem) => resolver.forStem(stem));
        expect(projectAttention(broken, facts, resolver).rows.map((row) => row.reasons)).toEqual([['Diagnostic']]);
    });

    it('AC-018: with the runs unavailable the list keeps reasons (a), (d) and (e) and says why the run reasons are missing', async () => {
        const result = await attention(
            [
                { number: '0001', kind: 'Blocked' },
                { number: '0002', kind: 'Review' },
                { number: '0003', kind: 'Active' },
            ],
            { available: false, reason: 'disk is full' },
        );
        expect(rows(result)).toEqual([
            ['0001', ['Blocked']],
            ['0002', ['Review pending']],
        ]);
        expect(result.runReasons).toEqual({ available: false, reason: 'disk is full' });
    });

    it('a row of a duplicated stem names its path so that the request can pick the entry', async () => {
        const result = await attention([{ number: '0001', kind: 'Review' }], [], {
            '.specs/done/0001-thing.md': '# Dup\n\n**Status:** Implemented\n**Plan:** _none_\n',
        });
        const row = result.rows[0];
        expect(row?.spec.path).toBe('.specs/active/0001-thing.md');
    });
});
