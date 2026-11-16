import type { LifecycleState } from './model';

export const FLOW_MARKERS = ['in flow', 'outside the FeatherSpec flow', 'not checked'] as const;
export type FlowMarker = (typeof FLOW_MARKERS)[number];

const STEPS: readonly (readonly [LifecycleState, LifecycleState])[] = [
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
    ['Ready', 'Blocked'],
    ['Active', 'Blocked'],
    ['Review', 'Blocked'],
    ['Blocked', 'Backlog'],
    ['Blocked', 'Ready'],
    ['Blocked', 'Active'],
    ['Blocked', 'Review'],
    ['Blocked', 'Done'],
];

function successors(state: LifecycleState): LifecycleState[] {
    return STEPS.filter(([from]) => from === state).map(([, to]) => to);
}

export function classifyFlow(from: LifecycleState, to: LifecycleState): FlowMarker {
    const seen = new Set<LifecycleState>([from]);
    const queue: LifecycleState[] = [from];
    for (let head = 0; head < queue.length; head += 1) {
        for (const next of successors(queue[head])) {
            if (next === to) {
                return 'in flow';
            }
            if (next !== 'Blocked' && !seen.has(next)) {
                seen.add(next);
                queue.push(next);
            }
        }
    }
    return from === to ? 'in flow' : 'outside the FeatherSpec flow';
}
