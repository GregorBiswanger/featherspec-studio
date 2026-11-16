import { describe, expect, it } from 'vitest';
import { classifyFlow } from './flow';
import { LIFECYCLE_STATES } from './model';
import type { LifecycleState } from './model';

const IN_FLOW: [LifecycleState, LifecycleState][] = [
    ['Backlog', 'Ready'],
    ['Ready', 'Backlog'],
    ['Backlog', 'Active'],
    ['Ready', 'Active'],
    ['Active', 'Review'],
    ['Review', 'Active'],
    ['Review', 'Done'],
    ['Active', 'Done'],
    ['Done', 'Active'],
    ['Backlog', 'Blocked'],
    ['Blocked', 'Backlog'],
    ['Active', 'Blocked'],
    ['Blocked', 'Active'],
    ['Blocked', 'Done'],
];

describe('classifyFlow', () => {
    it.each(IN_FLOW)('AC-009: %s -> %s is in flow', (from, to) => {
        expect(classifyFlow(from, to)).toBe('in flow');
    });

    it('AC-009: a collapsed jump Backlog -> Review is in flow (Backlog -> Active -> Review)', () => {
        expect(classifyFlow('Backlog', 'Review')).toBe('in flow');
        expect(classifyFlow('Ready', 'Done')).toBe('in flow');
        expect(classifyFlow('Done', 'Review')).toBe('in flow');
    });

    it('AC-009: Active -> Backlog, Active -> Ready, Review -> Backlog and Done -> Ready are outside the flow', () => {
        expect(classifyFlow('Active', 'Backlog')).toBe('outside the FeatherSpec flow');
        expect(classifyFlow('Active', 'Ready')).toBe('outside the FeatherSpec flow');
        expect(classifyFlow('Review', 'Backlog')).toBe('outside the FeatherSpec flow');
        expect(classifyFlow('Done', 'Ready')).toBe('outside the FeatherSpec flow');
        expect(classifyFlow('Done', 'Backlog')).toBe('outside the FeatherSpec flow');
    });

    it('AC-009: Blocked is allowed as the old or the new state but never as an intermediate state', () => {
        expect(classifyFlow('Blocked', 'Review')).toBe('in flow');
        expect(classifyFlow('Review', 'Blocked')).toBe('in flow');
        expect(classifyFlow('Done', 'Blocked')).toBe('in flow');
        expect(classifyFlow('Blocked', 'Ready')).toBe('in flow');
    });

    it('AC-009: the chain rule — a path that needs Blocked in the middle does not count', () => {
        expect(classifyFlow('Active', 'Ready')).toBe('outside the FeatherSpec flow');
        expect(classifyFlow('Review', 'Ready')).toBe('outside the FeatherSpec flow');
    });

    it('AC-009: every pair of the six states gets one of the two markers', () => {
        for (const from of LIFECYCLE_STATES) {
            for (const to of LIFECYCLE_STATES) {
                expect(['in flow', 'outside the FeatherSpec flow']).toContain(classifyFlow(from, to));
            }
        }
    });
});
