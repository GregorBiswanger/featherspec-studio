import { describe, expect, it } from 'vitest';
import { projectProblems } from './problems';
import { createSpecResolver } from './specRefs';
import { modelFor, modelOfFixture, type SpecInput } from './testing/projects';

async function problems(specs: SpecInput[], extraFiles: Record<string, string> = {}) {
    const model = await modelFor(specs, extraFiles);
    return projectProblems(model, createSpecResolver(model));
}

describe('0018 AC-007: Problems', () => {
    it('fs-broken gives the rows 0002 (unreadable) and 0003 (contradiction), each with its own reason as the state text', async () => {
        const model = await modelOfFixture('fs-broken');
        const result = projectProblems(model, createSpecResolver(model));
        expect(result.rows.map((row) => row.spec.number)).toEqual(['0002', '0003']);
        expect(result.lines).toEqual([]);
        const reasons = model.lifecycle.entries.flatMap((entry) => entry.diagnostics.filter((diagnostic) => diagnostic.tier === 'problem').map((diagnostic) => [entry.number, diagnostic.reason]));
        expect(result.rows.map((row) => [row.spec.number, row.status])).toEqual(reasons.map(([number, reason]) => [number, reason]));
        expect(result.rows.every((row) => row.problems === 1)).toBe(true);
    });

    it('a Review entry without a Problem has no row (0016 AC-006 retargeted)', async () => {
        const result = await problems([
            { number: '0001', kind: 'Review' },
            { number: '0002', kind: 'Blocked' },
            { number: '0003', kind: 'Contradicted' },
        ]);
        expect(result.rows.map((row) => row.spec.number)).toEqual(['0003']);
        expect(result.rows[0]?.state).toBe('Active');
    });

    it('rows go by number, whatever the order of the files', async () => {
        const result = await problems([
            { number: '0009', kind: 'Contradicted' },
            { number: '0003', kind: 'Contradicted' },
            { number: '0005', kind: 'Contradicted' },
        ]);
        expect(result.rows.map((row) => row.spec.number)).toEqual(['0003', '0005', '0009']);
    });

    it('several Problems of one spec give one row, the reasons joined by " · " and the count of the Problems', async () => {
        const result = await problems([], {
            '.specs/backlog/0001-two.md': '# Two\n\n**Status:** Half done\n**Plan:** [p](0001-two.plan.md)\n\n## 9. Acceptance criteria\n\n- **AC-001** The system shall work.\n',
        });
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0]?.problems).toBe(3);
        expect(result.rows[0]?.status.split(' · ').length).toBeGreaterThanOrEqual(2);
    });

    it('format notes give no row and no line (fs170-brownfield-mixed: only the spec with a Problem, 0016 AC-007)', async () => {
        const model = await modelOfFixture('fs170-brownfield-mixed');
        const result = projectProblems(model, createSpecResolver(model));
        expect(result.rows).toHaveLength(1);
        expect(result.lines).toEqual([]);
    });

    it('a spec with an unknown header line (a format note) has no row', async () => {
        const result = await problems([
            { number: '0001', kind: 'Unknown' },
            { number: '0002', kind: 'Backlog' },
        ]);
        expect(result).toEqual({ rows: [], lines: [] });
    });

    it('an orphan return note gives a line "where" and "reason" and no row', async () => {
        const result = await problems([{ number: '0001', kind: 'Backlog' }], { '.memory-bank/activeContext.0099-T-001.md': '**Status:** DONE\n' });
        expect(result.rows).toEqual([]);
        expect(result.lines).toHaveLength(1);
        expect(result.lines[0]?.reason).toMatch(/\S/);
        expect(result.lines[0]?.where).toMatch(/\S/);
    });

    it('a project-level format note (an archived orphan plan) is no line', async () => {
        const result = await problems([{ number: '0001', kind: 'Backlog' }], {
            '.specs/plan-archive/0042-lonely.2026-09-19.plan.md': '# Plan\n\n**Spec:** [x](0042-lonely.md)\n**Status:** Not started\n',
        });
        expect(result.lines).toEqual([]);
    });

    it('a row of a duplicated stem names its path; the row carries its next step (0017 AC-012)', async () => {
        const model = await modelFor([{ number: '0001', kind: 'Contradicted' }], { '.specs/done/0001-thing.md': '# Dup\n\n**Status:** Implemented\n**Plan:** _none_\n' });
        const result = projectProblems(model, createSpecResolver(model));
        expect(result.rows.find((row) => row.spec.path !== undefined)?.spec.path).toBe('.specs/active/0001-thing.md');
        expect(result.rows.find((row) => row.spec.path === '.specs/active/0001-thing.md')?.step?.line).toMatch(/\S/);
    });
});
