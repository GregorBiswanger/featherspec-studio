import type { MissionControlView } from '../missionControl';

export function sampleView(): MissionControlView {
    return {
        header: { name: 'demo', version: '1.10.0', updatedAt: '2026-11-16T10:00:00.000Z', projectDiagnostics: 1, diagnosticStems: ['0002-x'] },
        specs: {
            kind: 'counts',
            total: 2,
            states: [
                { state: 'Backlog', count: 1 },
                { state: 'Ready', count: 0, derivedRule: 'S-READY' },
                { state: 'Active', count: 0 },
                { state: 'Review', count: 0, derivedRule: 'S-REVIEW' },
                { state: 'Done', count: 1, deprecated: 0 },
                { state: 'Blocked', count: 0, derivedRule: 'S-BLOCKED' },
            ],
            progress: { kind: 'value', percent: 50, done: 1, divisor: 2 },
        },
        attention: {
            rows: [{ spec: { stem: '0001-a', number: '0001', title: null, path: '.specs/active/0001-a.md', found: true }, reasons: ['Blocked', 'Diagnostic'] }],
        },
        activity: {
            available: true,
            entries: [
                { at: '2026-11-16T09:00:00.000Z', spec: { stem: '0001-a', number: '0001', title: 'A', found: true }, change: { kind: 'state', old: 'Backlog', new: 'Ready', whileClosed: false } },
                { at: '2026-11-16T08:00:00.000Z', spec: { stem: '0009-gone', number: '0009', title: null, found: false }, change: { kind: 'gone', old: 'Done' } },
            ],
        },
    };
}

export function bigView(specCount: number, perSpec: number): MissionControlView {
    const stateWords = ['Backlog', 'Ready', 'Active', 'Review', 'Done', 'Blocked'] as const;
    const refs = Array.from({ length: specCount }, (_, index) => ({
        stem: `${String(index + 1).padStart(4, '0')}-thing`,
        number: String(index + 1).padStart(4, '0'),
        title: `Thing ${index + 1}`,
        found: true,
    }));
    return {
        header: { name: 'big', version: '1.10.0', updatedAt: '2026-11-16T10:00:00.000Z', projectDiagnostics: 3, diagnosticStems: refs.slice(0, 3).map((ref) => ref.stem) },
        specs: {
            kind: 'counts',
            total: specCount,
            states: stateWords.map((state) => ({ state, count: Math.floor(specCount / stateWords.length) })),
            progress: { kind: 'value', percent: 16, done: 33, divisor: specCount },
        },
        attention: { rows: refs.map((spec) => ({ spec, reasons: ['Blocked', 'Diagnostic', 'Review pending'] })) },
        activity: {
            available: true,
            entries: refs.slice(0, 10).map((spec, index) => ({
                at: `2026-11-16T09:${String(index).padStart(2, '0')}:00.000Z`,
                spec,
                change: { kind: 'state', old: 'Backlog', new: 'Ready', whileClosed: false },
            })),
        },
    };
}
