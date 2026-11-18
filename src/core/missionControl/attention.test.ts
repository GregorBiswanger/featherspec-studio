import { describe, expect, it } from 'vitest';
import { projectAttention } from './attention';
import { createSpecResolver } from './specRefs';
import { modelFor, modelOfFixture, type SpecInput } from './testing/projects';

async function attention(specs: SpecInput[], extraFiles: Record<string, string> = {}) {
    const model = await modelFor(specs, extraFiles);
    return projectAttention(model, createSpecResolver(model));
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
    });

    it('0015 AC-010 (0016 T-04): the reasons are Blocked, Problem and Review pending only, in that order, and no run reason exists', async () => {
        const result = await attention([
            { number: '0001', kind: 'Blocked' },
            { number: '0002', kind: 'Contradicted' },
            { number: '0003', kind: 'Review' },
        ]);
        expect(rows(result)).toEqual([
            ['0001', ['Blocked']],
            ['0002', ['Problem']],
            ['0003', ['Review pending']],
        ]);
        expect(Object.keys(result)).toEqual(['rows']);
        expect(JSON.stringify(result)).not.toMatch(/Run failed|Run interrupted|Waiting for you|runReasons/);
    });

    it('OP-10: rows are ordered by ascending spec number whatever the order of the files', async () => {
        const result = await attention([
            { number: '0009', kind: 'Review' },
            { number: '0003', kind: 'Blocked' },
            { number: '0005', kind: 'Review' },
        ]);
        expect(result.rows.map((row) => row.spec.number)).toEqual(['0003', '0005', '0009']);
    });

    it('AC-009: a lifecycle contradiction counts as the reason Problem; an unknown header line (a format note) does not', async () => {
        const result = await attention([
            { number: '0001', kind: 'Unknown' },
            { number: '0002', kind: 'Contradicted' },
        ]);
        expect(rows(result)).toEqual([['0002', ['Problem']]]);
    });

    it('AC-008: an unreadable spec file counts as the reason Problem', async () => {
        const model = await modelFor([{ number: '0001', kind: 'Backlog' }]);
        const entry = model.lifecycle.entries[0]!;
        const broken = {
            ...model,
            lifecycle: { ...model.lifecycle, entries: [{ ...entry, diagnostics: [{ kind: 'unreadable-file' as const, tier: 'problem' as const, scope: { file: entry.key }, reason: 'cannot read' }] }] },
        };
        const resolver = createSpecResolver(broken);
        expect(projectAttention(broken, resolver).rows.map((row) => row.reasons)).toEqual([['Problem']]);
    });

    it('a row of a duplicated stem names its path so that the request can pick the entry', async () => {
        const result = await attention([{ number: '0001', kind: 'Review' }], {
            '.specs/done/0001-thing.md': '# Dup\n\n**Status:** Implemented\n**Plan:** _none_\n',
        });
        const row = result.rows[0];
        expect(row?.spec.path).toBe('.specs/active/0001-thing.md');
    });
});

describe('Needs attention: Problem (0016 AC-006, AC-007)', () => {
    it('AC-006: fs-broken lists 0002 (unreadable) and 0003 (contradiction) with the reason Problem', async () => {
        const model = await modelOfFixture('fs-broken');
        expect(rows(projectAttention(model, createSpecResolver(model)))).toEqual([
            ['0002', ['Problem']],
            ['0003', ['Problem']],
        ]);
    });

    it('AC-007: a spec with format notes only is not listed (fs170-brownfield-mixed: only the spec with a Problem)', async () => {
        const model = await modelOfFixture('fs170-brownfield-mixed');
        const result = rows(projectAttention(model, createSpecResolver(model)));
        expect(result.find(([number]) => number === '0006')).toEqual(['0006', ['Review pending']]);
        expect(result.filter(([, reasons]) => reasons.includes('Problem'))).toHaveLength(1);
    });
});
