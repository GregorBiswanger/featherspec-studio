import { describe, expect, it } from 'vitest';
import { NOW_LIMIT, projectNow } from './rows';
import { createSpecResolver } from './specRefs';
import { modelFor, type SpecInput } from './testing/projects';

async function nowOf(specs: SpecInput[]) {
    const model = await modelFor(specs);
    for (const entry of [...model.project.specs, ...model.project.plans]) {
        (entry as { modifiedMs: number | undefined }).modifiedMs = undefined;
    }
    return projectNow(model, createSpecResolver(model));
}

const EIGHT: SpecInput[] = [
    { number: '0009', kind: 'Blocked' },
    { number: '0004', kind: 'Blocked' },
    { number: '0003', kind: 'Review', updated: '2026-11-10' },
    { number: '0007', kind: 'Review', updated: '2026-11-02' },
    { number: '0005', kind: 'Review' },
    { number: '0001', kind: 'Active' },
    { number: '0002', kind: 'Active' },
    { number: '0006', kind: 'Active' },
];

describe('0026 AC-007: Now lists the first five entries in the order of 0026 §6.5', () => {
    it('Given Blocked 0009, 0004; Review 0003 (2026-11-10), 0007 (2026-11-02), 0005 (no day); Active 0001, 0002, 0006: rows 0004, 0009, 0007, 0003, 0005, then 3 more; the set holds all eight stems', async () => {
        const now = await nowOf(EIGHT);
        expect(now.rows.map((row) => row.spec.number)).toEqual(['0004', '0009', '0007', '0003', '0005']);
        expect(now.more).toBe(3);
        expect(now.stems).toHaveLength(8);
        expect([...now.stems].sort()).toEqual(EIGHT.map((spec) => `${spec.number}-thing`).sort());
    });

    it('the limit is five', () => {
        expect(NOW_LIMIT).toBe(5);
    });

    it('Review is oldest first, entries without a day last, ties by number', async () => {
        const now = await nowOf([
            { number: '0008', kind: 'Review', updated: '2026-11-05' },
            { number: '0002', kind: 'Review' },
            { number: '0006', kind: 'Review', updated: '2026-11-05' },
            { number: '0001', kind: 'Review', updated: '2026-11-18' },
            { number: '0003', kind: 'Review' },
        ]);
        expect(now.rows.map((row) => row.spec.number)).toEqual(['0006', '0008', '0001', '0002', '0003']);
    });

    it('negative control: sorting Review by number alone would give another order', async () => {
        const now = await nowOf([
            { number: '0001', kind: 'Review', updated: '2026-11-18' },
            { number: '0002', kind: 'Review', updated: '2026-11-01' },
        ]);
        expect(now.rows.map((row) => row.spec.number)).not.toEqual(['0001', '0002']);
    });
});

describe('0026 AC-008 (core): five entries show no more, six one more, none nothing', () => {
    const active = (count: number): SpecInput[] => Array.from({ length: count }, (_, index) => ({ number: String(index + 1).padStart(4, '0'), kind: 'Active' as const }));

    it('with exactly five entries more is 0, with six it is 1, with none the rows are empty', async () => {
        expect((await nowOf(active(5))).more).toBe(0);
        expect((await nowOf(active(5))).rows).toHaveLength(5);
        const six = await nowOf(active(6));
        expect(six.more).toBe(1);
        expect(six.rows).toHaveLength(5);
        expect(six.stems).toHaveLength(6);
        expect(await nowOf([])).toEqual({ rows: [], more: 0, stems: [] });
    });

    it('only the first row can carry the coach line and the split button inputs; the rest are plain rows', async () => {
        const model = await modelFor(active(3));
        const now = projectNow(model, createSpecResolver(model), { show: true, hints: {} } as never);
        expect(now.rows.filter((row) => 'tips' in row)).toHaveLength(1);
        expect('tips' in now.rows[0]!).toBe(true);
    });
});
