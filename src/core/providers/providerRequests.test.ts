import { describe, expect, it } from 'vitest';
import type { ProviderEvent } from '../ports/agentProvider';
import { createFakeRuntimeClock } from '../runtime/testing/fakes';
import { createProviderService, type ProviderService } from './providerService';
import { createProviderRegistry } from './registry';
import { declarationWith } from './testing/adapters';
import { createControlledAdapter, type ControlledAdapter } from './testing/controlledAdapter';

interface World {
    service: ProviderService;
    events: ProviderEvent[];
    adapter: ControlledAdapter;
    answers: unknown[];
    clock: ReturnType<typeof createFakeRuntimeClock>;
}

async function world(overrides: Parameters<typeof createControlledAdapter>[1] = {}): Promise<World> {
    const answers: unknown[] = [];
    const adapter = createControlledAdapter('alpha', {
        respondToApproval: (runId, requestId, answer) => {
            answers.push(['approval', runId, requestId, answer]);
            return Promise.resolve({ ok: true });
        },
        respondToInput: (runId, requestId, text) => {
            answers.push(['input', runId, requestId, text]);
            return Promise.resolve({ ok: true });
        },
        ...overrides,
    });
    const registry = createProviderRegistry();
    registry.register(adapter.adapter);
    const clock = createFakeRuntimeClock();
    const service = createProviderService({ registry, clock });
    const events: ProviderEvent[] = [];
    service.onEvent((event) => events.push(event));
    await service.start('alpha', { runId: 'run-1', workingDirectory: '/p', prompt: 'p' });
    return { service, events, adapter, answers, clock };
}

const approvalRequested = { kind: 'approval.requested', source: 'provider', payload: { requestId: 'a-1', actionKind: 'shell', summary: 'ls', outsideProject: false } } as const;
const inputRequested = { kind: 'input.requested', source: 'provider', payload: { requestId: 'i-1', question: 'Which?' } } as const;

describe('provider service: approvals', () => {
    it('AC-019: approve once and reject (with reason) reach the adapter unchanged, one answer per open request', async () => {
        const w = await world();
        w.adapter.sink('run-1').emit(approvalRequested);
        w.adapter.sink('run-1').emit({ ...approvalRequested, payload: { ...approvalRequested.payload, requestId: 'a-2' } });
        expect(await w.service.respondToApproval('run-1', 'a-1', { decision: 'approve-once' })).toEqual({ kind: 'ok' });
        expect(await w.service.respondToApproval('run-1', 'a-2', { decision: 'reject', reason: 'no thanks' })).toEqual({ kind: 'ok' });
        expect(w.answers).toEqual([
            ['approval', 'run-1', 'a-1', { decision: 'approve-once' }],
            ['approval', 'run-1', 'a-2', { decision: 'reject', reason: 'no thanks' }],
        ]);
    });

    it('AC-019: a second answer to the same request is request not open and never reaches the adapter', async () => {
        const w = await world();
        w.adapter.sink('run-1').emit(approvalRequested);
        await w.service.respondToApproval('run-1', 'a-1', { decision: 'reject' });
        expect(await w.service.respondToApproval('run-1', 'a-1', { decision: 'approve-once' })).toEqual({ kind: 'request-not-open', runId: 'run-1', requestId: 'a-1' });
        expect(w.answers).toHaveLength(1);
    });

    it('AC-019: an answer for a request that was never requested, or after its .resolved, is request not open', async () => {
        const w = await world();
        expect(await w.service.respondToApproval('run-1', 'ghost', { decision: 'reject' })).toEqual({ kind: 'request-not-open', runId: 'run-1', requestId: 'ghost' });
        w.adapter.sink('run-1').emit(approvalRequested);
        w.adapter.sink('run-1').emit({ kind: 'approval.resolved', source: 'derived', payload: { requestId: 'a-1', decision: 'reject' } });
        expect(await w.service.respondToApproval('run-1', 'a-1', { decision: 'reject' })).toEqual({ kind: 'request-not-open', runId: 'run-1', requestId: 'a-1' });
        expect(w.answers).toEqual([]);
    });

    it('AC-019: another value (always, session, a third decision) is invalid answer, the request stays open and the run continues', async () => {
        const w = await world();
        w.adapter.sink('run-1').emit(approvalRequested);
        for (const answer of [{ decision: 'approve-always' }, { decision: 'approve-session' }, {}, { decision: 'reject', reason: 5 }, null, 'approve-once']) {
            const result = await w.service.respondToApproval('run-1', 'a-1', answer as never);
            expect(result.kind).toBe('invalid-answer');
        }
        expect(w.answers).toEqual([]);
        expect(await w.service.respondToApproval('run-1', 'a-1', { decision: 'approve-once' })).toEqual({ kind: 'ok' });
        w.adapter.sink('run-1').emit({ kind: 'message.delta', source: 'provider', payload: { text: 'go on' } });
        expect(w.events.at(-1)?.kind).toBe('message.delta');
    });

    it('AC-019: an answer to an input request through the approval operation is request not open', async () => {
        const w = await world();
        w.adapter.sink('run-1').emit(inputRequested);
        expect(await w.service.respondToApproval('run-1', 'i-1', { decision: 'approve-once' })).toEqual({ kind: 'request-not-open', runId: 'run-1', requestId: 'i-1' });
        expect(await w.service.respondToInput('run-1', 'a-1', 'x')).toEqual({ kind: 'request-not-open', runId: 'run-1', requestId: 'a-1' });
    });

    it('AC-019: the run ending closes every open request', async () => {
        const w = await world();
        w.adapter.sink('run-1').emit(approvalRequested);
        w.adapter.sink('run-1').emit({ kind: 'run.cancelled', source: 'provider', payload: {} });
        expect(await w.service.respondToApproval('run-1', 'a-1', { decision: 'reject' })).toEqual({ kind: 'request-not-open', runId: 'run-1', requestId: 'a-1' });
    });

    it('AC-019: after 24 h of clock time an unanswered request is still open and the service delivered no .resolved', async () => {
        const w = await world();
        w.adapter.sink('run-1').emit(approvalRequested);
        w.clock.advance(24 * 3_600_000);
        expect(w.events.map((event) => event.kind)).toEqual(['approval.requested']);
        expect(await w.service.respondToApproval('run-1', 'a-1', { decision: 'approve-once' })).toEqual({ kind: 'ok' });
        expect(w.events.map((event) => event.kind)).toEqual(['approval.requested']);
    });

    it('AC-010: unknown run, a capability declared none and an adapter failure give their results and pass no event', async () => {
        const w = await world();
        expect(await w.service.respondToApproval('nope', 'a', { decision: 'reject' })).toEqual({ kind: 'unknown-run', runId: 'nope' });
        expect(await w.service.respondToInput('nope', 'a', 'x')).toEqual({ kind: 'unknown-run', runId: 'nope' });
        const none = await world({ capabilities: declarationWith({ approvals: 'none', userInput: 'none' }) });
        expect(await none.service.respondToApproval('run-1', 'a', { decision: 'reject' })).toEqual({ kind: 'not-supported', providerId: 'alpha' });
        expect(await none.service.respondToInput('run-1', 'a', 'x')).toEqual({ kind: 'not-supported', providerId: 'alpha' });
        const failing = await world({ respondToApproval: () => Promise.resolve({ ok: false, reason: 'gone' }) });
        failing.adapter.sink('run-1').emit(approvalRequested);
        expect(await failing.service.respondToApproval('run-1', 'a-1', { decision: 'reject' })).toEqual({ kind: 'failed', reason: 'gone' });
        expect(failing.events.map((event) => event.kind)).toEqual(['approval.requested']);
        const throwing = await world({ respondToApproval: () => Promise.reject(new Error('bang')) });
        throwing.adapter.sink('run-1').emit(approvalRequested);
        expect(await throwing.service.respondToApproval('run-1', 'a-1', { decision: 'reject' })).toEqual({ kind: 'failed', reason: 'bang' });
    });

    it('AC-019: a failed answer leaves the request open for another try', async () => {
        let first = true;
        const w = await world({
            respondToApproval: () => {
                const failed = first;
                first = false;
                return Promise.resolve(failed ? { ok: false, reason: 'try again' } : { ok: true });
            },
        });
        w.adapter.sink('run-1').emit(approvalRequested);
        expect((await w.service.respondToApproval('run-1', 'a-1', { decision: 'reject' })).kind).toBe('failed');
        expect(await w.service.respondToApproval('run-1', 'a-1', { decision: 'reject' })).toEqual({ kind: 'ok' });
    });
});

describe('provider service: input', () => {
    it('AC-019: free text reaches the adapter unchanged, once', async () => {
        const w = await world();
        w.adapter.sink('run-1').emit(inputRequested);
        const text = '  Use the second option\n';
        expect(await w.service.respondToInput('run-1', 'i-1', text)).toEqual({ kind: 'ok' });
        expect(w.answers).toEqual([['input', 'run-1', 'i-1', text]]);
        expect(await w.service.respondToInput('run-1', 'i-1', 'again')).toEqual({ kind: 'request-not-open', runId: 'run-1', requestId: 'i-1' });
    });

    it('AC-019: an answer that is not a string is invalid answer and the request stays open', async () => {
        const w = await world();
        w.adapter.sink('run-1').emit(inputRequested);
        for (const answer of [5, null, undefined, { text: 'x' }, ['x']]) {
            expect((await w.service.respondToInput('run-1', 'i-1', answer as never)).kind).toBe('invalid-answer');
        }
        expect(w.answers).toEqual([]);
        expect(await w.service.respondToInput('run-1', 'i-1', '')).toEqual({ kind: 'ok' });
    });

    it('AC-019: after 24 h of clock time an unanswered input request is still open', async () => {
        const w = await world();
        w.adapter.sink('run-1').emit(inputRequested);
        w.clock.advance(24 * 3_600_000);
        expect(w.events.map((event) => event.kind)).toEqual(['input.requested']);
        expect(await w.service.respondToInput('run-1', 'i-1', 'yes')).toEqual({ kind: 'ok' });
    });
});
