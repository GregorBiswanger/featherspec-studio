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
        runs: {
            available: true,
            running: 1,
            singleRunId: 'run-1',
            highlighted: [{ runId: 'run-2', status: 'Failed', spec: { stem: '0001-a', number: '0001', title: 'A', found: true } }],
            unreadable: 0,
        },
        attention: {
            rows: [{ spec: { stem: '0001-a', number: '0001', title: null, path: '.specs/active/0001-a.md', found: true }, reasons: ['Blocked', 'Run failed'] }],
            runReasons: { available: true },
        },
        activity: {
            available: true,
            entries: [
                { at: '2026-11-16T09:00:00.000Z', spec: { stem: '0001-a', number: '0001', title: 'A', found: true }, change: { kind: 'state', old: 'Backlog', new: 'Ready', whileClosed: false } },
                { at: '2026-11-16T08:00:00.000Z', spec: { stem: '0009-gone', number: '0009', title: null, found: false }, change: { kind: 'gone', old: 'Done' } },
                { at: '2026-11-16T07:00:00.000Z', spec: { stem: '0001-a', number: '0001', title: 'A', found: true }, change: { kind: 'run', status: 'WaitingForInput', runId: 'run-1' } },
            ],
        },
    };
}
