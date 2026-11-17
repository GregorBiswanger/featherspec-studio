import type { ProjectRead } from '../readProject';

export const BASELINE_FIXTURES: ReadonlyArray<{ name: string; version: string }> = [
    { name: 'fs-broken', version: '1.10.0' },
    { name: 'fs-legacy-unstamped', version: 'unknown' },
    { name: 'fs110-de-active-review', version: '1.10.0' },
    { name: 'fs110-parallel-synthetic', version: '1.10.0' },
    { name: 'fs110-ready-synthetic', version: '1.10.0' },
    { name: 'fs170-brownfield-mixed', version: '1.7.0' },
    { name: 'fs180-de-baselines', version: '1.8.0' },
    { name: 'fs180-en-done-archived', version: '1.8.0' },
    { name: 'studio-0002', version: '1.10.0' },
];

function stripFacts<T extends object>(entry: T): Omit<T, 'modifiedMs' | 'size'> {
    const { modifiedMs: _modifiedMs, size: _size, ...rest } = entry as T & { modifiedMs?: unknown; size?: unknown };
    return rest as Omit<T, 'modifiedMs' | 'size'>;
}

export function readSnapshot(read: ProjectRead): unknown {
    return {
        version: read.version,
        specs: read.specs.map(stripFacts),
        plans: read.plans.map(stripFacts),
        returnNotes: read.returnNotes.map(stripFacts),
        diagnostics: read.diagnostics,
    };
}
