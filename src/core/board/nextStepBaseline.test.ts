import * as fs from 'fs';
import { describe, expect, it } from 'vitest';
import { allBaselineNames, modelOfBaseline, snapshotFile, snapshotOf, type ProjectSnapshot, type SpecSnapshot } from './testing/nextStepSnapshot';

type Field = keyof SpecSnapshot;

interface Exception {
    snapshot: string;
    key: string;
    fields: Field[];
    why: string;
}


export const EXCEPTIONS: readonly Exception[] = [];

function read(name: string): ProjectSnapshot {
    return JSON.parse(fs.readFileSync(snapshotFile(name), 'utf8')) as ProjectSnapshot;
}

function masked(snapshot: string, key: string, value: SpecSnapshot): Partial<SpecSnapshot> {
    const rule = EXCEPTIONS.find((candidate) => candidate.snapshot === snapshot && candidate.key === key);
    if (rule === undefined) {
        return value;
    }
    const copy: Partial<SpecSnapshot> = { ...value };
    rule.fields.forEach((field) => delete copy[field]);
    return copy;
}

describe('0028 AC-010: every spec of every fixture project and of this repository keeps state, rule and next step', () => {
    it('each snapshot written on the Baseline equals the head, apart from the named exceptions', async () => {
        const names = await allBaselineNames();
        expect(names.length).toBeGreaterThan(30);
        for (const entry of names) {
            const name = entry.kind === 'case' ? `case-${entry.name}` : entry.name;
            const expected = read(name);
            const actual = snapshotOf(await modelOfBaseline(entry));
            expect(Object.keys(actual).sort(), name).toEqual(Object.keys(expected).sort());
            for (const key of Object.keys(expected)) {
                expect(masked(name, key, actual[key]!), `${name} ${key}`).toEqual(masked(name, key, expected[key]!));
            }
        }
    });

    it('negative control: one snapshot value edited by hand is found', async () => {
        const entry = (await allBaselineNames()).find((candidate) => candidate.name === 'ac004-report-first')!;
        const expected = read(`case-${entry.name}`);
        const key = Object.keys(expected)[0]!;
        const edited = { ...expected[key]!, state: 'Review' };
        const actual = snapshotOf(await modelOfBaseline(entry));
        expect(actual[key]).not.toEqual(edited);
    });

    it('every exception names a spec that differs at the head (no stale exception)', async () => {
        const names = await allBaselineNames();
        for (const exception of EXCEPTIONS) {
            const entry = names.find((candidate) => (candidate.kind === 'case' ? `case-${candidate.name}` : candidate.name) === exception.snapshot)!;
            const actual = snapshotOf(await modelOfBaseline(entry))[exception.key]!;
            const expected = read(exception.snapshot)[exception.key]!;
            expect(exception.fields.some((field) => JSON.stringify(actual[field]) !== JSON.stringify(expected[field])), `${exception.snapshot} ${exception.key}: ${exception.why}`).toBe(true);
        }
    });

    it('every snapshot file belongs to a fixture project or case', async () => {
        const names = new Set((await allBaselineNames()).map((entry) => (entry.kind === 'case' ? `case-${entry.name}` : entry.name)));
        const files = fs.readdirSync(snapshotFile('x').replace(/x\.json$/, '')).map((file) => file.replace(/\.json$/, ''));
        expect([...names].sort()).toEqual(files.sort());
    });
});

