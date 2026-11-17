import { describe, expect, it } from 'vitest';
import { EVENT_KINDS } from '../providers/vocabulary';
import { RUN_STATUSES, type JsonValue, type RunStatus } from '../runtime/model';
import { applyEvent, canTransition, createTrack, transition, type RunTrack, type TrackEvent } from './runTrack';

const ALLOWED: readonly (readonly [RunStatus, RunStatus])[] = [
    ['Starting', 'Running'],
    ['Starting', 'Failed'],
    ['Starting', 'Cancelled'],
    ['Running', 'WaitingForApproval'],
    ['Running', 'WaitingForInput'],
    ['Running', 'Completed'],
    ['Running', 'Failed'],
    ['Running', 'Cancelled'],
    ['WaitingForApproval', 'WaitingForInput'],
    ['WaitingForInput', 'WaitingForApproval'],
    ['WaitingForApproval', 'Running'],
    ['WaitingForApproval', 'Completed'],
    ['WaitingForApproval', 'Failed'],
    ['WaitingForApproval', 'Cancelled'],
    ['WaitingForInput', 'Running'],
    ['WaitingForInput', 'Completed'],
    ['WaitingForInput', 'Failed'],
    ['WaitingForInput', 'Cancelled'],
];

const event = (kind: string, payload: JsonValue = {}, source: 'provider' | 'derived' = 'provider'): TrackEvent => ({ kind, payload, source });
const started = (): TrackEvent => event('session.started', { sessionRef: 'ref-1', model: 'm-1' });
const approval = (id: string): TrackEvent => event('approval.requested', { requestId: id, actionKind: 'edit', summary: 's', outsideProject: false });
const input = (id: string): TrackEvent => event('input.requested', { requestId: id, question: 'q' });

function run(events: readonly TrackEvent[], from: RunTrack = createTrack()): { track: RunTrack; statuses: RunStatus[] } {
    let track = from;
    const statuses: RunStatus[] = [];
    for (const next of events) {
        const applied = applyEvent(track, next);
        track = applied.track;
        statuses.push(...applied.steps.map((step) => step.status));
    }
    return { track, statuses };
}

function trackIn(status: RunStatus): RunTrack {
    return { ...createTrack(), status, sessionStarted: status !== 'Starting' };
}

describe('transition table', () => {
    it('AC-004: exactly the 18 listed steps are allowed, the other 46 of the 64 ordered pairs are not', () => {
        let allowed = 0;
        for (const from of RUN_STATUSES) {
            for (const to of RUN_STATUSES) {
                const listed = ALLOWED.some(([a, b]) => a === from && b === to);
                expect(canTransition(from, to), `${from} -> ${to}`).toBe(listed);
                allowed += listed ? 1 : 0;
            }
        }
        expect(RUN_STATUSES.length * RUN_STATUSES.length).toBe(64);
        expect(allowed).toBe(18);
    });

    it('AC-004: a forced transition follows the table and leaves the track alone otherwise', () => {
        const running = trackIn('Running');
        expect(transition(running, 'Cancelled')?.status).toBe('Cancelled');
        expect(transition(running, 'Starting')).toBeUndefined();
        expect(transition(trackIn('Completed'), 'Failed')).toBeUndefined();
        expect(transition(trackIn('Interrupted'), 'Running')).toBeUndefined();
    });

    it('AC-004: no event kind in any status produces a step the table does not list', () => {
        for (const from of RUN_STATUSES) {
            for (const kind of EVENT_KINDS) {
                let previous: RunStatus = from;
                const { steps } = applyEvent(trackIn(from), event(kind, { requestId: 'r', actionKind: 'a', summary: 's', outsideProject: false, question: 'q', sessionRef: 's', category: 'auth', text: 't', decision: 'reject' }));
                for (const step of steps) {
                    expect(canTransition(previous, step.status), `${from} --${kind}--> ${step.status}`).toBe(true);
                    previous = step.status;
                }
            }
        }
    });
});

describe('start and waiting', () => {
    it('AC-001: session.started moves Starting to Running and carries the session reference and model', () => {
        const applied = applyEvent(createTrack(), started());
        expect(applied.steps).toEqual([{ status: 'Running', sessionRef: 'ref-1', model: 'm-1' }]);
        expect(applied.track.status).toBe('Running');
    });

    it('AC-006: an approval request holds WaitingForApproval, an input request alone WaitingForInput, the last resolved one sets Running', () => {
        const { statuses, track } = run([started(), input('i1'), approval('a1'), event('approval.resolved', { requestId: 'a1', decision: 'approve-once' }), event('input.resolved', { requestId: 'i1' })]);
        expect(statuses).toEqual(['Running', 'WaitingForInput', 'WaitingForApproval', 'WaitingForInput', 'Running']);
        expect(track.status).toBe('Running');
    });

    it('AC-006: approval wins over input and a second request of the same type adds no status', () => {
        const { statuses } = run([started(), approval('a1'), approval('a2'), input('i1'), event('approval.resolved', { requestId: 'a1', decision: 'reject' })]);
        expect(statuses).toEqual(['Running', 'WaitingForApproval']);
    });

    it('AC-006: a request that opened before session.started counts from that event on', () => {
        const before = run([approval('a1')]);
        expect(before.statuses).toEqual([]);
        expect(before.track.status).toBe('Starting');
        const after = applyEvent(before.track, started());
        expect(after.steps.map((step) => step.status)).toEqual(['Running', 'WaitingForApproval']);
        expect(after.steps[0]).toMatchObject({ sessionRef: 'ref-1' });
    });

    it('AC-006: a resolved event for a request that is not open is ignored', () => {
        const { statuses } = run([started(), event('approval.resolved', { requestId: 'nope', decision: 'reject' }), event('input.resolved', { requestId: 'nope' })]);
        expect(statuses).toEqual(['Running']);
        const opened = run([started(), input('x')]);
        expect(applyEvent(opened.track, event('approval.resolved', { requestId: 'x', decision: 'reject' })).steps).toEqual([]);
        expect(opened.track.status).toBe('WaitingForInput');
    });

    it('AC-006: an end kind ends the run from either waiting status', () => {
        for (const waiting of [approval('a'), input('i')]) {
            for (const [kind, status] of [['run.completed', 'Completed'], ['run.failed', 'Failed'], ['run.cancelled', 'Cancelled']] as const) {
                const { statuses } = run([started(), waiting, event(kind, { category: 'auth', text: 't' })]);
                expect(statuses.at(-1)).toBe(status);
            }
        }
    });
});

describe('ends', () => {
    it('AC-005: after an end state no event changes the status, whatever arrives', () => {
        const ended = run([started(), event('run.cancelled', {})]);
        expect(ended.track.status).toBe('Cancelled');
        for (const kind of EVENT_KINDS) {
            expect(applyEvent(ended.track, event(kind, { requestId: 'r', sessionRef: 's', category: 'auth', text: 't' })).steps, kind).toEqual([]);
        }
        expect(run([event('run.completed', {})], ended.track).track.status).toBe('Cancelled');
    });

    it('AC-005: run.cancelled then run.completed leaves Cancelled', () => {
        expect(run([started(), event('run.cancelled', {}), event('run.completed', { finalMessage: 'x' })]).statuses).toEqual(['Running', 'Cancelled']);
    });

    it('AC-004: run.completed before session.started is not applied; run.failed and run.cancelled are', () => {
        expect(run([event('run.completed', { finalMessage: 'x' })]).statuses).toEqual([]);
        expect(run([event('run.failed', { category: 'auth', text: 't' })]).statuses).toEqual(['Failed']);
        expect(run([event('run.cancelled', {})]).statuses).toEqual(['Cancelled']);
    });

    it('AC-007: a tool.completed that is not ok changes nothing', () => {
        const before = run([started()]).track;
        const applied = applyEvent(before, event('tool.completed', { toolName: 't', callId: 'c', ok: false, errorText: 'x' }));
        expect(applied.steps).toEqual([]);
        expect(applied.track.status).toBe('Running');
    });

    it('AC-007: run.failed carries class and text; derived is provider_exited, an unknown category is unknown', () => {
        const failed = (payload: JsonValue, source: 'provider' | 'derived' = 'provider') => run([started(), event('run.failed', payload, source)]);
        expect(failed({ category: 'quota_or_rate_limit', text: 'Quota.' }).track.status).toBe('Failed');
        expect(applyEvent(run([started()]).track, event('run.failed', { category: 'quota_or_rate_limit', text: 'Quota.' })).steps).toEqual([
            { status: 'Failed', failure: { errorClass: 'quota_or_rate_limit', errorMessage: 'Quota.' } },
        ]);
        expect(applyEvent(run([started()]).track, event('run.failed', { category: 'unknown', text: 'x' }, 'derived')).steps[0]?.failure?.errorClass).toBe('provider_exited');
        expect(applyEvent(run([started()]).track, event('run.failed', { category: 'tool_failure', text: 'x' })).steps[0]?.failure?.errorClass).toBe('unknown');
    });
});

describe('result material', () => {
    it('AC-018: the final message is the one run.completed delivers, else the last message.completed', () => {
        const withEnd = run([started(), event('message.completed', { text: 'one' }), event('message.completed', { text: 'two' }), event('run.completed', { finalMessage: 'Done' })]).track;
        expect(withEnd.finalMessage).toBe('Done');
        expect(withEnd.lastMessage).toBe('two');
        const without = run([started(), event('message.completed', { text: 'one' }), event('message.completed', { text: 'two' }), event('run.completed', {})]).track;
        expect(without.finalMessage).toBeUndefined();
        expect(without.lastMessage).toBe('two');
    });

    it('AC-018: usage keeps the latest totals; changed files keep the last operation per path', () => {
        const { track } = run([
            started(),
            event('usage', { totals: { inputTokens: 1 } }),
            event('usage', { totals: { inputTokens: 5, outputTokens: 2 } }),
            event('file.changed', { path: 'a.ts', operation: 'add', confidence: 'reported', outsideProject: false }),
            event('file.changed', { path: 'b.ts', operation: 'update', confidence: 'reported', outsideProject: false }),
            event('file.changed', { path: 'a.ts', operation: 'delete', confidence: 'reported', outsideProject: false }),
        ]);
        expect(track.usage).toEqual({ inputTokens: 5, outputTokens: 2 });
        expect(track.changedFiles).toEqual([
            { path: 'a.ts', operation: 'delete' },
            { path: 'b.ts', operation: 'update' },
        ]);
    });

    it('AC-018: malformed material is ignored', () => {
        const { track } = run([started(), event('usage', { totals: 'x' }), event('file.changed', { path: 5 }), event('message.completed', { text: 7 })]);
        expect(track.usage).toBeUndefined();
        expect(track.changedFiles).toEqual([]);
        expect(track.lastMessage).toBeUndefined();
    });
});
