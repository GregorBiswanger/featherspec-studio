import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { createNodeSpecSource } from '../../adapters/node/nodeSpecSource';
import { fixturePath } from '../discovery/testing/fixtures';
import { readProject } from './readProject';
import { BASELINE_FIXTURES, readSnapshot } from './testing/readSnapshot';

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const SUCCESSOR_FIXTURE = 'fs110-ready-synthetic';

function isDiagnostic(value: { [key: string]: Json }): boolean {
    return 'kind' in value && 'scope' in value && 'reason' in value;
}

function isSuccessorDiagnostic(value: Json): boolean {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        isDiagnostic(value) &&
        typeof value.reason === 'string' &&
        value.reason === 'unknown header line "Successor"'
    );
}

function isSuccessorHeaderLine(value: Json): boolean {
    return typeof value === 'object' && value !== null && !Array.isArray(value) && value.label === 'Successor';
}

function normalize(value: Json, fixture: string): Json {
    if (Array.isArray(value)) {
        const dropSuccessor = fixture === SUCCESSOR_FIXTURE;
        return value
            .filter((item) => !(dropSuccessor && (isSuccessorDiagnostic(item) || isSuccessorHeaderLine(item))))
            .map((item) => normalize(item, fixture));
    }
    if (typeof value === 'object' && value !== null) {
        const result: { [key: string]: Json } = {};
        for (const [key, item] of Object.entries(value)) {
            if (key === 'tier' && isDiagnostic(value)) {
                continue;
            }
            if (key === 'successor' && (fixture === SUCCESSOR_FIXTURE || isAbsentField(item))) {
                continue;
            }
            result[key] = normalize(item, fixture);
        }
        return result;
    }
    return value;
}

function isAbsentField(item: Json): boolean {
    return (
        typeof item === 'object' &&
        item !== null &&
        !Array.isArray(item) &&
        typeof item.value === 'object' &&
        item.value !== null &&
        !Array.isArray(item.value) &&
        item.value.state === 'absent'
    );
}

function baselineOf(name: string): Json {
    return JSON.parse(fs.readFileSync(path.join(fixturePath('read-baseline'), `${name}.json`), 'utf8')) as Json;
}

async function currentOf(name: string, version: string): Promise<Json> {
    const read = await readProject(createNodeSpecSource(), fixturePath(name), version);
    return JSON.parse(JSON.stringify(readSnapshot(read))) as Json;
}

describe('read baseline (0016 AC-003)', () => {
    it.each(BASELINE_FIXTURES)(
        'AC-003: the read of $name equals the snapshot taken at the Baseline, apart from the tier and the Successor line',
        async ({ name, version }) => {
            const current = normalize(await currentOf(name, version), name);
            const expected = normalize(baselineOf(name), name);
            expect(current).toEqual(expected);
        },
    );

    it('AC-003 negative control: one changed reason makes the comparison fail', async () => {
        const name = 'fs-broken';
        const current = normalize(await currentOf(name, '1.10.0'), name);
        const original = JSON.stringify(normalize(baselineOf(name), name));
        const reason = /"reason":"([^"]+)"/.exec(original)?.[1] ?? '';
        expect(reason).not.toBe('');
        const changed = JSON.parse(original.replace(reason, `${reason} changed`)) as Json;
        expect(current).toEqual(JSON.parse(original) as Json);
        expect(current).not.toEqual(changed);
    });
});
