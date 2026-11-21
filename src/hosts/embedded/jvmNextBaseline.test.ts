import { existsSync, readFileSync, readdirSync } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { readBaseline, snapshotFile, type SpecSnapshot } from '../../core/board/testing/nextStepSnapshot';
import { EXCEPTIONS } from '../../core/board/nextStepBaseline.test';
import { WEAK_INPUTS } from './testing/conformanceInput';

const actualDir = process.env['FEATHERSPEC_JVM_ACTUAL'];

function masked(snapshot: string, key: string, value: SpecSnapshot): Partial<SpecSnapshot> {
    const rule = EXCEPTIONS.find((candidate) => candidate.snapshot === snapshot && candidate.key === key);
    const copy: Partial<SpecSnapshot> = { ...value };
    rule?.fields.forEach((field) => delete copy[field]);
    if ((value.nextStep as { case?: string } | null)?.case === 'NS-6-resume') {
        delete copy.tips;
    }
    return copy;
}

function comparable(): string[] {
    if (actualDir === undefined) {
        return [];
    }
    return readdirSync(actualDir)
        .filter((file) => file.endsWith('.json') && file !== 'setup-actual.json')
        .map((file) => file.replace(/\.json$/, ''))
        .filter((name) => !WEAK_INPUTS.includes(name) && existsSync(snapshotFile(name)))
        .sort();
}

describe.skipIf(actualDir === undefined)('0034 AC-004: the next step the JVM host computed equals the Baseline apart from the EXCEPTIONS of 0028', () => {
    it('every fixture project with a Baseline keeps state, rule and next step', () => {
        const names = comparable();
        expect(names.length).toBeGreaterThan(10);
        for (const name of names) {
            const output = JSON.parse(readFileSync(path.join(actualDir as string, `${name}.json`), 'utf8')) as { next: Record<string, SpecSnapshot> };
            const expected = readBaseline(name);
            expect(Object.keys(output.next).sort(), name).toEqual(Object.keys(expected).sort());
            for (const key of Object.keys(expected)) {
                expect(masked(name, key, output.next[key]!), `${name} ${key}`).toEqual(masked(name, key, expected[key]!));
            }
        }
    });

    it('negative control: a changed state is found', () => {
        const name = comparable()[0]!;
        const output = JSON.parse(readFileSync(path.join(actualDir as string, `${name}.json`), 'utf8')) as { next: Record<string, SpecSnapshot> };
        const key = Object.keys(output.next)[0]!;
        const edited = { ...output.next[key]!, state: 'edited' };
        expect(masked(name, key, edited)).not.toEqual(masked(name, key, readBaseline(name)[key]!));
    });
});
