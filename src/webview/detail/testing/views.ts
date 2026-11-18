import type { DetailSections, DetailView, DiagnosticLine, NextStepView } from '../../../shared/protocol/detail';
import { PROTOCOL_VERSION, type Envelope } from '../../../shared/protocol/envelope';

export const SPEC_KEY = '.specs/active/0007-thing.md';
export const PLAN_KEY = '.specs/active/0007-thing.plan.md';

export function sections(overrides: Partial<DetailSections> = {}): DetailSections {
    return {
        overview: {
            open: { key: SPEC_KEY },
            headerLines: [
                { label: 'Status', value: 'In Progress' },
                { label: 'Plan', value: '0007-thing.plan.md' },
            ],
            state: 'Active',
            rule: 'S-ACTIVE',
            persistence: 'persisted',
            deprecated: false,
            successor: undefined,
            readiness: undefined,
            notes: [{ reason: 'Plan has no Verified line', open: { key: SPEC_KEY, line: 12 } }],
        },
        requirements: { open: { key: SPEC_KEY }, items: [{ id: 'FR-01', text: 'Show the board', open: { key: SPEC_KEY, line: 30 } }] },
        criteria: {
            open: { key: SPEC_KEY },
            items: [
                { id: 'AC-001', text: 'The board shall render.', illustration: 'Given a project, when opened, then six columns', uncertain: false, struck: false, open: { key: SPEC_KEY, line: 40 } },
                { id: 'AC-002', text: 'The board shall sort.', illustration: undefined, uncertain: true, struck: true, open: { key: SPEC_KEY, line: 44 } },
            ],
        },
        plan: {
            open: { key: PLAN_KEY },
            stages: ['1. T-001 → T-002'],
            steps: [
                { id: 'T-001', title: 'First step', ticked: true, struck: false, verified: 'tests green' },
                { id: 'T-002', title: 'Second step', ticked: false, struck: false, verified: undefined },
                { id: 'T-003', title: 'Third step', ticked: 'undetermined', struck: true, verified: undefined },
            ],
        },
        verification: { open: { key: PLAN_KEY }, openRows: 1, built: 2, verified: 3, other: 0, summary: '3 of 6 rows verified', criteria: { done: 3, total: 6 }, compileVerdict: 'No compile verdict yet' },
        related: [{ label: '0007-thing.plan.md', open: { key: PLAN_KEY } }],
        history: {
            statusHistory: [{ observedAt: '2026-11-16T09:00:00Z', old: 'Ready', new: 'Active', rule: 'S-ACTIVE', cause: 'Observed', flow: 'moved' }],
            label: 'Observed by Studio while it was running — not a reconstruction',
            notAvailable: undefined,
        },
        ...overrides,
    };
}

export const NEXT_STEP: NextStepView = { rule: 'NS-6', lines: [{ text: `/sdd-plan ${SPEC_KEY}` }] };

export function detailView(overrides: Partial<DetailSections> = {}, nextStep: NextStepView = NEXT_STEP, problems: DiagnosticLine[] = []): DetailView {
    return { kind: 'spec', key: SPEC_KEY, stem: '0007-thing', number: '0007', title: 'Thing 0007', nextStep, problems, sections: sections(overrides) };
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
