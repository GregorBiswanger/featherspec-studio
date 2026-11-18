import { describe, expect, it } from 'vitest';
import { isPlanSpecView, isPlanUnreadableView, isPlanView, type PlanView } from './planMap';
import { planSample, stage, step } from './testing/planSample';

function clone(view: PlanView): Record<string, unknown> {
    return JSON.parse(JSON.stringify(view)) as Record<string, unknown>;
}

describe('0023 AC-003: the plan view and the plan spec list are guarded exactly', () => {
    it('the sample is accepted, also with returned steps, a blocked reason and loose steps', () => {
        expect(isPlanView(planSample())).toBe(true);
        const returned = planSample({
            loose: [step('T-009', 'returned', { returned: { status: 'blocked', reason: 'a question', reasonFull: 'a question' } })],
            stages: [stage(1, [{ steps: [step('T-001', 'returned', { returned: { status: 'done' } }), step('T-002', 'notFound', { open: undefined, title: '' })] }], { returned: { n: 1, m: 1 } })],
        });
        expect(isPlanView(returned)).toBe(true);
        expect(isPlanView(planSample({ staged: false, stages: [], loose: [step('T-001', 'open')] }))).toBe(true);
        expect(isPlanView({ ...planSample(), count: undefined, closing: undefined })).toBe(true);
    });

    it('an extra key, a missing key or a wrong type is refused at the plan, a stage, a group, a step and the ways', () => {
        const base = clone(planSample());
        expect(isPlanView({ ...base, extra: 1 })).toBe(false);
        const { staged: _staged, ...withoutStaged } = base;
        expect(isPlanView(withoutStaged)).toBe(false);
        const edit = (change: (view: Record<string, any>) => void) => {
            const view = clone(planSample()) as Record<string, any>;
            change(view);
            return isPlanView(view);
        };
        expect(edit((view) => (view.stages[0].extra = 1))).toBe(false);
        expect(edit((view) => (view.stages[0].number = '1'))).toBe(false);
        expect(edit((view) => (view.stages[0].kind = 'wide'))).toBe(false);
        expect(edit((view) => (view.stages[0].groups[1].sep = '‖'))).toBe(false);
        expect(edit((view) => (view.stages[0].groups[0].steps = []))).toBe(false);
        expect(edit((view) => (view.stages[0].groups[0].steps[0].state = 'struck'))).toBe(false);
        expect(edit((view) => (view.stages[0].groups[0].steps[0].extra = 1))).toBe(false);
        expect(edit((view) => (view.stages[0].groups[0].steps[0].open = { key: '', line: 1 }))).toBe(false);
        expect(edit((view) => (view.stages[0].groups[0].steps[0].open = { key: 'a', line: 0 }))).toBe(false);
        expect(edit((view) => (view.stages[0].groups[0].steps[0].files = [1]))).toBe(false);
        expect(edit((view) => (view.stages[0].groups[0].steps[0].covers = [{ id: 1 }]))).toBe(false);
        expect(edit((view) => (view.stages[1].ways.prompts = ['a', 'b']))).toBe(false);
        expect(edit((view) => (view.stages[1].ways.startLines = [1]))).toBe(false);
        expect(edit((view) => (view.stages[1].ways.stage = '2'))).toBe(false);
        expect(edit((view) => (view.stages[0].returned = { n: 1 }))).toBe(false);
        expect(edit((view) => (view.stages[0].groups[0].steps[0].returned = { status: 'maybe' }))).toBe(false);
        expect(edit((view) => (view.closing = { text: 'a' }))).toBe(false);
        expect(edit((view) => (view.count = { done: -1, total: 2 }))).toBe(false);
        expect(edit((view) => (view.plan = { key: 'a' }))).toBe(false);
        expect(edit((view) => (view.loose = [{}]))).toBe(false);
        expect(edit(() => undefined)).toBe(true);
    });

    it('the unreadable view is exactly { kind: unreadable }', () => {
        expect(isPlanUnreadableView({ kind: 'unreadable' })).toBe(true);
        expect(isPlanUnreadableView({ kind: 'unreadable', extra: 1 })).toBe(false);
        expect(isPlanUnreadableView({ kind: 'plan' })).toBe(false);
        expect(isPlanView({ kind: 'unreadable' })).toBe(false);
    });

    it('a plan spec has a stem, a number, a title, its problems with sentence and reason, and an optional path', () => {
        expect(isPlanSpecView({ stem: '0001-a', number: '0001', title: 'A', problems: [] })).toBe(true);
        expect(isPlanSpecView({ stem: '0001-a', path: '.specs/active/0001-a.md', number: '0001', title: 'A', problems: [{ sentence: 's', reason: 'r' }] })).toBe(true);
        expect(isPlanSpecView({ stem: '0001-a', number: '0001', title: 'A', problems: [{ sentence: 's' }] })).toBe(false);
        expect(isPlanSpecView({ stem: '0001-a', number: '0001', title: 'A' })).toBe(false);
        expect(isPlanSpecView({ stem: '0001-a', number: '0001', title: 'A', problems: [], extra: 1 })).toBe(false);
        expect(isPlanSpecView({ stem: '0001-a', path: 1, number: '0001', title: 'A', problems: [] })).toBe(false);
    });
});
