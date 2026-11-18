import type { OverviewView } from '../overview';

export function sampleView(): OverviewView {
    return {
        now: [],
        upNext: { rows: [], more: 0, stems: [] },
        problems: {
            rows: [{ spec: { stem: '0002-x', number: '0002', title: 'Beta', found: true }, state: 'Backlog', status: 'unreadable file', problems: 1 }],
            lines: [],
        },
        figures: {
            kind: 'counts',
            total: 2,
            states: [
                { state: 'Backlog', count: 1 },
                { state: 'Ready', count: 0 },
                { state: 'Active', count: 0 },
                { state: 'Review', count: 0 },
                { state: 'Done', count: 1, deprecated: 0 },
                { state: 'Blocked', count: 0 },
            ],
            progress: { kind: 'value', percent: 50, done: 1, divisor: 2 },
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

export function bigView(specCount: number, perSpec: number): OverviewView {
    const stateWords = ['Backlog', 'Ready', 'Active', 'Review', 'Done', 'Blocked'] as const;
    const refs = Array.from({ length: specCount }, (_, index) => ({
        stem: `${String(index + 1).padStart(4, '0')}-thing`,
        number: String(index + 1).padStart(4, '0'),
        title: `Thing ${index + 1}`,
        found: true,
    }));
    return {
        now: refs.map((spec) => ({ spec, state: 'Active' as const, status: 'Active', problems: 0 })),
        upNext: { rows: [], more: 0, stems: [] },
        problems: { rows: refs.slice(0, 3).map((spec) => ({ spec, state: 'Active' as const, status: 'unreadable file', problems: 1 })), lines: [] },
        figures: {
            kind: 'counts',
            total: specCount,
            states: stateWords.map((state) => ({ state, count: Math.floor(specCount / stateWords.length) })),
            progress: { kind: 'value', percent: 16, done: 33, divisor: specCount },
        },
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
