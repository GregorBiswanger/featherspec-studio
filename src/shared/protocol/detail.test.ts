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
        nextStep: { rule: 'NS-6', lines: [{ text: '/sdd-plan .specs/active/0007-thing.md' }] },
        problems: [{ reason: 'a problem', open: { key: '.specs/active/0007-thing.md', line: 3 } }],
        notes: [{ reason: 'a note' }],
        progress: { needs: [], noPlan: false, steps: { kind: 'steps', done: 0, total: 1 }, criteria: { kind: 'criteria', verified: 0, total: 0, open: [] } },
        files: [{ label: 'Spec', name: '0007-thing.md', open: { key: '.specs/active/0007-thing.md', line: 1 } }],
        history,
        sections: {} as SpecDetailView['sections'],
    };
    view.sections = {
        overview: { open: { key: view.key }, headerLines: [], state: 'Active', rule: 'S-ACTIVE', persistence: 'persisted', deprecated: false, successor: undefined, needs: [], notes: [] },
        requirements: { open: { key: view.key }, items: [] },
        criteria: { open: { key: view.key }, items: [] },
        plan: { open: undefined, stages: [], steps: [] },
        verification: { open: undefined, openRows: 0, built: 0, verified: 0, other: 0, summary: 'not available', criteria: undefined },
        related: [],
        history,
    };
    return JSON.parse(JSON.stringify(view)) as SpecDetailView;
}

describe('0019 P-2: the guard of the situation picture', () => {
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
        ['an unknown persistence', (view) => (view.persistence = 'stored')],
        ['a path that is not text', (view) => (view.path = 4)],
        ['a successor that is not text', (view) => (view.successor = false)],
        ['notes that are not a list', (view) => (view.notes = 'none')],
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
        ['the old sections missing', (view) => delete view.sections],
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
