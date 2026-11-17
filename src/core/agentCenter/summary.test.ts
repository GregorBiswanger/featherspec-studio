import { describe, expect, it } from 'vitest';
import { run } from '../board/testing/boardWorld';
import type { StoredEvent } from '../runtime/model';
import { fromProvider } from './testing/events';
import { capabilityNotes, currentActivity, emptySummary, errorDetails, openRequests, resultView, summarize } from './summary';

function summary(events: readonly StoredEvent[]) {
    return events.reduce(summarize, emptySummary());
}

const approval = (seq: number, id: string, text = `Edit ${id}`) =>
    fromProvider(seq, 'approval.requested', { requestId: id, actionKind: 'edit', summary: text, outsideProject: false });
const input = (seq: number, id: string, question = `Question ${id}?`) => fromProvider(seq, 'input.requested', { requestId: id, question });
const toolStarted = (seq: number, callId: string, toolName = 'edit') => fromProvider(seq, 'tool.started', { toolName, callId });
const toolCompleted = (seq: number, callId: string) => fromProvider(seq, 'tool.completed', { toolName: 'edit', callId, ok: true });

describe('AC-007: current activity', () => {
    it('an open approval request wins: "Waiting for approval: <summary>"', () => {
        const events = [toolStarted(1, 'c1'), approval(2, 'a1', 'Edit README.md')];
        expect(currentActivity(run('r1', '0007-x', { status: 'WaitingForApproval' }), summary(events))).toBe('Waiting for approval: Edit README.md');
    });

    it('precedence: of several requests the oldest approval, an approval before an older input, an input before a tool call', () => {
        const open = run('r1', '0007-x');
        expect(currentActivity(open, summary([approval(1, 'a1', 'first'), approval(2, 'a2', 'second')]))).toBe('Waiting for approval: first');
        expect(currentActivity(open, summary([input(1, 'i1'), approval(2, 'a1', 'later approval')]))).toBe('Waiting for approval: later approval');
        expect(currentActivity(open, summary([toolStarted(1, 'c1'), input(2, 'i1')]))).toBe('Waiting for input');
    });

    it('a tool.started without the tool.completed of its call ID: "Running tool <name>"; of several the newest', () => {
        const open = run('r1', '0007-x');
        expect(currentActivity(open, summary([toolStarted(1, 'c1', 'read'), toolStarted(2, 'c2', 'edit')]))).toBe('Running tool edit');
        expect(currentActivity(open, summary([toolStarted(1, 'c1', 'read'), toolStarted(2, 'c2', 'edit'), toolCompleted(3, 'c2')]))).toBe('Running tool read');
    });

    it('with neither an open request nor an open tool call: "not available"', () => {
        const open = run('r1', '0007-x');
        expect(currentActivity(open, summary([]))).toBe('not available');
        expect(currentActivity(open, summary([toolStarted(1, 'c1'), toolCompleted(2, 'c1'), approval(3, 'a1'), fromProvider(4, 'approval.resolved', { requestId: 'a1', decision: 'approve-once' })]))).toBe('not available');
    });

    it('a request closes on its .resolved event only: an input.resolved of another ID leaves it open', () => {
        const events = [input(1, 'i1'), fromProvider(2, 'input.resolved', { requestId: 'other' })];
        expect(summary(events).requests.map((request) => request.requestId)).toEqual(['i1']);
        expect(summary([...events, fromProvider(3, 'input.resolved', { requestId: 'i1' })]).requests).toEqual([]);
    });

    it('an ended run shows no activity and no open request, whatever the events say', () => {
        const events = [approval(1, 'a1'), toolStarted(2, 'c1')];
        for (const status of ['Completed', 'Failed', 'Cancelled', 'Interrupted'] as const) {
            const ended = run('r1', '0007-x', { status });
            expect(currentActivity(ended, summary(events)), status).toBeUndefined();
            expect(openRequests(ended, summary(events)), status).toEqual([]);
        }
        expect(openRequests(run('r1', '0007-x'), summary(events))).toHaveLength(1);
    });

    it('the deciding event may lie in the first of several read pages: a summary built page by page equals one built at once', () => {
        const all = Array.from({ length: 1200 }, (_, index) => fromProvider(index + 2, 'turn.completed', {}));
        const events = [approval(1, 'a1', 'Edit far away'), ...all];
        const paged = [events.slice(0, 500), events.slice(500, 1000), events.slice(1000)].reduce((state, page) => page.reduce(summarize, state), emptySummary());
        expect(currentActivity(run('r1', '0007-x'), paged)).toBe('Waiting for approval: Edit far away');
        expect(paged).toEqual(summary(events));
    });
});

describe('AC-015: file changes only from file.changed events', () => {
    it('lists every file.changed event with path, operation and basis, also those outside the newest page', () => {
        const events = [
            fromProvider(1, 'file.changed', { path: 'a.md', operation: 'add', confidence: 'reported', outsideProject: false }),
            fromProvider(2, 'turn.completed', {}),
            fromProvider(3, 'file.changed', { path: 'b.md', operation: 'delete', confidence: 'derived', outsideProject: true }),
        ];
        expect(summary(events).files).toEqual([
            { path: 'a.md', operation: 'added', basis: 'reported by provider', outsideProject: false },
            { path: 'b.md', operation: 'deleted', basis: 'derived from tool input', outsideProject: true },
        ]);
    });

    it('a file that changed without an event is never listed: tool rows, messages and results name files but attribute none', () => {
        const events = [
            toolStarted(1, 'c1'),
            fromProvider(2, 'message.completed', { text: 'I changed secret.md' }),
            fromProvider(3, 'run.completed', { finalMessage: 'changed other.md' }),
        ];
        expect(summary(events).files).toEqual([]);
    });

    it('a file.changed event without a path is not listed', () => {
        expect(summary([fromProvider(1, 'file.changed', { operation: 'add', confidence: 'reported' })]).files).toEqual([]);
    });

    it('capability notes: toolEvents none and fileChanges none give the two notes; native or derived give none; an unregistered provider gives none', () => {
        const declared = (toolEvents: 'native' | 'none', fileChanges: 'derived' | 'none') =>
            ({ displayName: 'Copilot', capabilities: { toolEvents: { value: toolEvents }, fileChanges: { value: fileChanges } } }) as unknown as Parameters<typeof capabilityNotes>[0];
        expect(capabilityNotes(declared('none', 'none'))).toEqual(['Tool calls: not delivered by Copilot', 'File changes: not delivered by Copilot']);
        expect(capabilityNotes(declared('native', 'none'))).toEqual(['File changes: not delivered by Copilot']);
        expect(capabilityNotes(declared('native', 'derived'))).toEqual([]);
        expect(capabilityNotes(undefined)).toEqual([]);
    });
});

describe('AC-019: error details', () => {
    const failedRun = (overrides = {}) =>
        run('r1', '0007-x', {
            status: 'Failed',
            errorClass: 'quota_or_rate_limit',
            errorMessage: 'Rate limit reached. Try later.',
            statusHistory: [
                { status: 'Starting', at: '2026-11-17T10:00:00.000Z' },
                { status: 'WaitingForApproval', at: '2026-11-17T10:01:00.000Z' },
                { status: 'Failed', at: '2026-11-17T10:02:00.000Z' },
            ],
            ...overrides,
        });
    const events = [
        fromProvider(1, 'turn.started', {}),
        fromProvider(2, 'tool.completed', { toolName: 'edit', callId: 'c', ok: false }),
        fromProvider(3, 'run.failed', { category: 'quota_or_rate_limit', text: 'x' }),
        fromProvider(4, 'run.failed', { category: 'unknown', text: 'second failure is not the first' }),
    ];

    it('shows the class in words, the stored message, the failure time, the last status before Failed and the last event before the failing one', () => {
        expect(errorDetails(failedRun(), summary(events))).toEqual({
            errorClass: 'Quota or rate limit reached',
            message: 'Rate limit reached. Try later.',
            failedAt: '2026-11-17T10:02:00.000Z',
            lastStatus: 'Waiting for approval',
            lastEvent: 'Tool completed',
        });
    });

    it('"Unknown error" for unknown, for a value outside the known classes and for none stored', () => {
        for (const errorClass of ['unknown', 'martian', undefined]) {
            expect(errorDetails(failedRun({ errorClass }), summary(events))?.errorClass, String(errorClass)).toBe('Unknown error');
        }
    });

    it('values the store does not hold read "not available"; with no run.failed event the last event is the one before the failure', () => {
        const bare = run('r1', '0007-x', { status: 'Failed' });
        expect(errorDetails(bare, summary([fromProvider(1, 'turn.started', {})]))).toEqual({
            errorClass: 'Unknown error',
            message: 'not available',
            failedAt: 'not available',
            lastStatus: 'not available',
            lastEvent: 'Turn started',
        });
        expect(errorDetails(bare, summary([]))?.lastEvent).toBe('not available');
    });

    it('only a Failed run has error details', () => {
        expect(errorDetails(run('r1', '0007-x', { status: 'Completed' }), summary(events))).toBeUndefined();
        expect(errorDetails(run('r1', '0007-x', { status: 'Interrupted' }), summary(events))).toBeUndefined();
    });
});

describe('AC-020: result', () => {
    it('a Completed run shows the final message of its stored result and the not-done text', () => {
        const completed = run('r1', '0007-x', { status: 'Completed', result: { finalMessage: 'All done.', usage: 'not available', changedFiles: 'not available' } });
        expect(resultView(completed)).toEqual({ text: 'All done.', notDone: 'The spec is not done until FeatherSpec verifies it.' });
    });

    it('"No result delivered" for a stored not available, a missing result and a result of the wrong shape', () => {
        for (const result of [{ finalMessage: 'not available' }, undefined, 'plain', { finalMessage: 3 }]) {
            expect(resultView(run('r1', '0007-x', { status: 'Completed', result: result as never }))?.text).toBe('No result delivered');
        }
    });

    it('other statuses have no result block', () => {
        for (const status of ['Failed', 'Cancelled', 'Interrupted', 'Running'] as const) {
            expect(resultView(run('r1', '0007-x', { status, result: { finalMessage: 'x' } })), status).toBeUndefined();
        }
    });
});
