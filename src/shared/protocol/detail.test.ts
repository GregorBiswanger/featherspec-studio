import { describe, expect, it } from 'vitest';
import type { SpecDetailView } from './detail';
import { isDetailView } from './detail';

function valid(): SpecDetailView {
    const history = { statusHistory: undefined, label: 'Only changes Studio saw while it was running.', notAvailable: undefined };
    const view: SpecDetailView = {
        kind: 'spec',
        key: '.specs/active/0007-thing.md',
        stem: '0007-thing',
        number: '0007',
        title: 'Thing 0007',
        state: 'Active',
        rule: 'S-ACTIVE',
        persistence: 'persisted',
        nextStep: { rule: 'NS-6', lines: [{ text: '/sdd-plan .specs/active/0007-thing.md', intent: 'Write the plan' }] },
        problems: [{ sentence: 'A sentence', reason: 'a problem', open: { key: '.specs/active/0007-thing.md', line: 3 } }],
        notes: [{ reason: 'a note' }],
        progress: { needs: [], noPlan: false, steps: { kind: 'steps', done: 0, total: 1 }, criteria: { kind: 'criteria', verified: 0, total: 0, open: [] } },
        files: [{ label: 'Spec', name: '0007-thing.md', open: { key: '.specs/active/0007-thing.md', line: 1 } }],
        history,
    };
    return JSON.parse(JSON.stringify(view)) as SpecDetailView;
}

describe('0019 P-2: the guard of the situation picture', () => {
    it('0021 AC-009: accepts a next step with tips', () => {
        const view = valid();
        view.nextStep = { rule: 'NS-6', lines: [{ text: 'a', intent: 'b' }], tips: { coach: 'Tip: Use any chat with a fast model.', about: ['one', 'two', 'three', 'four'] } };
        expect(isDetailView(view)).toBe(true);
    });

    it('accepts the picture of a spec, with and without its optional parts', () => {
        expect(isDetailView({ kind: 'none' })).toBe(true);
        const view = valid();
        expect(isDetailView(view)).toBe(true);
        const bare = { ...view } as Partial<SpecDetailView>;
        delete bare.progress;
        delete bare.path;
        delete bare.successor;
        expect(isDetailView(bare)).toBe(true);
        expect(isDetailView({ ...view, path: '.specs/active/0007-thing.md', successor: 'Successor: none — behaviour removed' })).toBe(true);
    });

    it.each<[string, (view: Record<string, unknown>) => void]>([
        ['a missing state', (view) => delete view.state],
        ['a missing rule', (view) => delete view.rule],
        ['0021 AC-009: tips that are not a record', (view) => (view.nextStep = { rule: 'NS-6', lines: [{ text: 'a', intent: 'b' }], tips: 'x' })],
        ['0021 AC-009: tips with an extra key', (view) => (view.nextStep = { rule: 'NS-6', lines: [{ text: 'a', intent: 'b' }], tips: { coach: 'c', about: [], extra: 1 } })],
        ['0021 AC-009: tips whose paragraphs are not text', (view) => (view.nextStep = { rule: 'NS-6', lines: [{ text: 'a', intent: 'b' }], tips: { coach: 'c', about: [1] } })],
        ['0021 AC-001: a next-step line without its intent', (view) => (view.nextStep = { rule: 'NS-6', lines: [{ text: '/sdd-plan k' }] })],
        ['0021 AC-001: a next-step line that still carries a label instead of an intent', (view) => (view.nextStep = { rule: 'NS-6', lines: [{ text: '/sdd-plan k', label: 'Then:' }] })],
        ['an unknown persistence', (view) => (view.persistence = 'stored')],
        ['a path that is not text', (view) => (view.path = 4)],
        ['a successor that is not text', (view) => (view.successor = false)],
        ['notes that are not a list', (view) => (view.notes = 'none')],
        ['a problem whose sentence is not a string', (view) => (view.problems = [{ reason: 'r', sentence: 4 as unknown as string }])],
        ['a note without a reason', (view) => (view.notes = [{ open: { key: 'a.md', line: 1 } }])],
        ['a note that opens line 0', (view) => (view.notes = [{ reason: 'r', open: { key: 'a.md', line: 0 } }])],
        ['a problem that opens without a line', (view) => (view.problems = [{ reason: 'r', open: { key: 'a.md' } }])],
        ['a file row without a name', (view) => (view.files = [{ label: 'Spec', open: { key: 'a.md', line: 1 } }])],
        ['a file row that opens a fractional line', (view) => (view.files = [{ label: 'Spec', name: 'a.md', open: { key: 'a.md', line: 1.5 } }])],
        ['files that are not a list', (view) => (view.files = {})],
        ['a history without a label', (view) => (view.history = {})],
        ['progress that is not a record', (view) => (view.progress = 'x')],
        ['progress without needs', (view) => (view.progress = { noPlan: false })],
        ['steps of an unknown kind', (view) => (view.progress = { needs: [], noPlan: false, steps: { kind: 'x' } })],
        ['steps with a negative count', (view) => (view.progress = { needs: [], noPlan: false, steps: { kind: 'steps', done: -1, total: 1 } })],
        ['a next step that opens line 0', (view) => (view.progress = { needs: [], noPlan: false, steps: { kind: 'steps', done: 0, total: 1, next: { id: 'T-001', title: 't', open: { key: 'p.md', line: 0 } } } })],
        ['criteria of an unknown reason', (view) => (view.progress = { needs: [], noPlan: false, criteria: { kind: 'unavailable', reason: 'gone' } })],
        ['an open criterion without a link', (view) => (view.progress = { needs: [], noPlan: false, criteria: { kind: 'criteria', verified: 0, total: 1, open: [{ text: 't', built: false }] } })],
        ['a need without a rule', (view) => (view.progress = { needs: [{ text: 'needs a plan' }], noPlan: false })],
        ['a history that is missing', (view) => delete view.history],
    ])('refuses %s', (_name, damage) => {
        const view = valid() as unknown as Record<string, unknown>;
        damage(view);
        expect(isDetailView(view)).toBe(false);
    });

    it('accepts every kind of steps and criteria', () => {
        const base = valid();
        const progress = (steps: unknown, criteria: unknown) => ({ ...base, progress: { needs: [{ text: 'needs a plan', rule: 'R-3' }], noPlan: false, steps, criteria } });
        expect(isDetailView(progress({ kind: 'none' }, { kind: 'unavailable', reason: 'no-table' }))).toBe(true);
        expect(isDetailView(progress({ kind: 'unavailable' }, { kind: 'unavailable', reason: 'unreadable' }))).toBe(true);
        expect(isDetailView(progress({ kind: 'steps', done: 0, total: 1 }, { kind: 'criteria', verified: 0, total: 0, open: [] }))).toBe(true);
    });
});

describe('0024 AC-003: the send view of the next step', () => {
    const SEND = { assistant: 'copilot', target: 'new', targets: ['new', 'current'] };

    it('0025 AC-026: a next step may carry quiet: true and nothing else', () => {
        const view = valid();
        const lines = [{ text: 'a', intent: 'b' }];
        view.nextStep = { rule: 'NS-6', lines, quiet: true } as never;
        expect(isDetailView(view)).toBe(true);
        for (const quiet of [false, 1, 'yes', null]) {
            view.nextStep = { rule: 'NS-6', lines, quiet } as never;
            expect(isDetailView(view), String(quiet)).toBe(false);
        }
    });

    it('0025 AC-016/AC-027: a next step takes a parallel stage and a step link on a line, and refuses a bad one', () => {
        const view = valid();
        const link = { id: 'T-003', open: { key: 'p', line: 4 } };
        view.nextStep = { rule: 'NS-6', lines: [{ text: 'a', intent: 'b T-003', step: link }], parallel: { stage: 2 } } as never;
        expect(isDetailView(view)).toBe(true);
        for (const parallel of [{ stage: 0 }, { stage: '2' }, { stage: 2, extra: 1 }, 2]) {
            view.nextStep = { rule: 'NS-6', lines: [{ text: 'a', intent: 'b' }], parallel } as never;
            expect(isDetailView(view), JSON.stringify(parallel)).toBe(false);
        }
        view.nextStep = { rule: 'NS-6', lines: [{ text: 'a', intent: 'b', step: { id: 'T-003' } }] } as never;
        expect(isDetailView(view)).toBe(false);
    });

    it('accepts a next step with a send view and refuses a bad one', () => {
        const view = valid();
        const lines = [{ text: 'a', intent: 'b' }];
        view.nextStep = { rule: 'NS-9', lines, send: SEND } as never;
        expect(isDetailView(view)).toBe(true);
        view.nextStep = { rule: 'NS-9', lines, send: { assistant: 'claudeCode', target: 'new', targets: ['new'] } } as never;
        expect(isDetailView(view)).toBe(true);
        for (const send of [{ ...SEND, extra: 1 }, { ...SEND, assistant: 'codex' }, { assistant: 'claudeCode', target: 'current', targets: ['new'] }, { ...SEND, targets: ['new'] }, 'copilot', null]) {
            view.nextStep = { rule: 'NS-9', lines, send } as never;
            expect(isDetailView(view), JSON.stringify(send)).toBe(false);
        }
    });
});

