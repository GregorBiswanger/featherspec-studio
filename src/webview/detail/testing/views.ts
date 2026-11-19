import type { DetailView, DiagnosticLine, HistorySection, NextStepView, SpecDetailView } from '../../../shared/protocol/detail';
import { PROTOCOL_VERSION, type Envelope } from '../../../shared/protocol/envelope';

export const SPEC_KEY = '.specs/active/0007-thing.md';
export const PLAN_KEY = '.specs/active/0007-thing.plan.md';

export function historySection(): HistorySection {
    return {
        statusHistory: [{ observedAt: '2026-11-16T09:00:00Z', old: 'Ready', new: 'Active', rule: 'S-ACTIVE', cause: { kind: 'files', paths: ['.specs/active/0001-a.plan.md'] }, flow: 'in flow' }],
        label: 'Only changes Studio saw while it was running.',
        notAvailable: undefined,
    };
}

export const NEXT_STEP: NextStepView = { rule: 'NS-6', lines: [{ text: `/sdd-plan ${SPEC_KEY}`, intent: 'Write the plan' }] };

export function detailView(extra: Partial<SpecDetailView> = {}, nextStep: NextStepView = NEXT_STEP, problems: DiagnosticLine[] = []): DetailView {
    const view: SpecDetailView = {
        kind: 'spec',
        key: SPEC_KEY,
        stem: '0007-thing',
        number: '0007',
        title: 'Thing 0007',
        state: 'Active',
        rule: 'S-ACTIVE',
        persistence: 'persisted',
        nextStep,
        problems,
        notes: [{ reason: 'Plan has no Verified line', open: { key: SPEC_KEY, line: 12 } }],
        progress: {
            needs: [],
            noPlan: false,
            steps: { kind: 'steps', done: 1, total: 3, next: { id: 'T-002', title: 'Second step', open: { key: PLAN_KEY, line: 30 } } },
            criteria: {
                kind: 'criteria',
                verified: 1,
                total: 2,
                open: [{ id: 'AC-002', text: 'The board shall sort.', built: false, open: { key: SPEC_KEY, line: 44 } }],
            },
        },
        files: [
            { label: 'Spec', name: '0007-thing.md', open: { key: SPEC_KEY, line: 1 } },
            { label: 'Plan', name: '0007-thing.plan.md', open: { key: PLAN_KEY, line: 1 } },
        ],
        history: historySection(),
        ...extra,
    };
    return view;
}

export function detailEvent(view: DetailView): Envelope {
    return { v: PROTOCOL_VERSION, kind: 'evt', type: 'detail', payload: { view } };
}

export function openFileResultEvent(key: string, text: string): Envelope {
    return { v: PROTOCOL_VERSION, kind: 'evt', type: 'openFileResult', payload: { key, text } };
}

export function copyResultEvent(ok: boolean, text: string): Envelope {
    return { v: PROTOCOL_VERSION, kind: 'evt', type: 'copyResult', payload: { ok, text } };
}

export function sendResultEvent(outcome: 'opened' | 'copied' | 'copyFailed', text: string, token: string): Envelope {
    return { v: PROTOCOL_VERSION, kind: 'evt', type: 'sendResult', payload: { outcome, text, token } };
}

