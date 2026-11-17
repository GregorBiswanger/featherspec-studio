import { describe, expect, it } from 'vitest';
import type { ProviderEvent } from '../../../core/ports/agentProvider';
import { createProviderService } from '../../../core/providers/providerService';
import { createProviderRegistry } from '../../../core/providers/registry';
import { createFakeRuntimeClock } from '../../../core/runtime/testing/fakes';
import { createFakeProvider, type FakeProviderOptions } from './fakeProvider';
import { createRecordingSink } from './testing/recordingSink';

const DAY = 24 * 3_600_000;

function start(options: Partial<FakeProviderOptions> = {}, runId = 'run-1') {
    const clock = createFakeRuntimeClock();
    const provider = createFakeProvider({ clock, ...options });
    const sink = createRecordingSink();
    void provider.start({ runId, workingDirectory: '/project', prompt: 'p' }, sink);
    clock.advance(1_000);
    return { clock, provider, sink };
}

function throughService(options: Partial<FakeProviderOptions> = {}) {
    const clock = createFakeRuntimeClock();
    const registry = createProviderRegistry();
    const provider = createFakeProvider({ clock, ...options });
    registry.register(provider);
    const service = createProviderService({ registry, clock });
    const events: ProviderEvent[] = [];
    service.onEvent((event) => events.push(event));
    return { clock, provider, service, events };
}

const kindsOf = (events: { kind: string }[]): string[] => events.map((event) => event.kind);

describe('fake approval scenario', () => {
    it('AC-016: waits at approval.requested, delivers nothing for 24 h and answers nothing itself', async () => {
        const { clock, provider, sink } = start({ scenario: 'approval' });
        expect(kindsOf(sink.events).slice(-2)).toEqual(['tool.started', 'approval.requested']);
        const before = sink.events.length;
        clock.advance(DAY);
        expect(sink.events).toHaveLength(before);
        expect(provider.calls().map((call) => call.operation)).toEqual(['start']);
        expect(sink.closed).toBe(0);
        expect(clock.pendingTimers()).toBe(0);
        expect(sink.events.at(-1)?.payload).toMatchObject({ requestId: 'fake-approval-1' });
    });

    it('AC-016: approve once delivers approval.resolved, tool.completed ok and run.completed', async () => {
        const { provider, sink } = start({ scenario: 'approval' });
        expect(await provider.respondToApproval('run-1', 'fake-approval-1', { decision: 'approve-once' })).toEqual({ ok: true });
        expect(kindsOf(sink.events).slice(-4)).toEqual(['approval.requested', 'approval.resolved', 'tool.completed', 'run.completed']);
        const resolved = sink.events.find((event) => event.kind === 'approval.resolved');
        expect(resolved?.payload).toEqual({ requestId: 'fake-approval-1', decision: 'approve-once' });
        expect(sink.events.find((event) => event.kind === 'tool.completed')?.payload).toMatchObject({ ok: true });
        expect(sink.closed).toBe(1);
    });

    it('AC-016: reject delivers approval.resolved, tool.completed not ok and run.completed', async () => {
        const { provider, sink } = start({ scenario: 'approval' });
        expect(await provider.respondToApproval('run-1', 'fake-approval-1', { decision: 'reject', reason: 'no' })).toEqual({ ok: true });
        expect(kindsOf(sink.events).slice(-4)).toEqual(['approval.requested', 'approval.resolved', 'tool.completed', 'run.completed']);
        expect(sink.events.find((event) => event.kind === 'approval.resolved')?.payload).toEqual({ requestId: 'fake-approval-1', decision: 'reject' });
        expect(sink.events.find((event) => event.kind === 'tool.completed')?.payload).toMatchObject({ ok: false });
    });

    it('AC-019: an answer for another request ID, of the wrong kind or after the answer is refused and changes nothing', async () => {
        const { provider, sink } = start({ scenario: 'approval' });
        expect(await provider.respondToApproval('run-1', 'other', { decision: 'reject' })).toMatchObject({ ok: false });
        expect(await provider.respondToInput('run-1', 'fake-approval-1', 'x')).toMatchObject({ ok: false });
        expect(await provider.respondToApproval('nope', 'fake-approval-1', { decision: 'reject' })).toMatchObject({ ok: false });
        const count = sink.events.length;
        await provider.respondToApproval('run-1', 'fake-approval-1', { decision: 'approve-once' });
        const after = sink.events.length;
        expect(after).toBeGreaterThan(count);
        expect(await provider.respondToApproval('run-1', 'fake-approval-1', { decision: 'reject' })).toMatchObject({ ok: false });
        expect(sink.events).toHaveLength(after);
    });

    it('AC-016: through the service a second answer is request not open and the approval kinds arrive in order', async () => {
        const { service, events, clock } = throughService({ scenario: 'approval' });
        await service.start('fake', { runId: 'run-1', workingDirectory: '/p', prompt: 'p' });
        clock.advance(1_000);
        expect(await service.respondToApproval('run-1', 'fake-approval-1', { decision: 'approve-once' })).toEqual({ kind: 'ok' });
        expect(await service.respondToApproval('run-1', 'fake-approval-1', { decision: 'reject' })).toEqual({ kind: 'request-not-open', runId: 'run-1', requestId: 'fake-approval-1' });
        expect(kindsOf(events).slice(-4)).toEqual(['approval.requested', 'approval.resolved', 'tool.completed', 'run.completed']);
    });

    it('AC-016: profile minimal has no approvals, it runs through to run.completed with the tool done', () => {
        const { sink } = start({ scenario: 'approval', profile: 'minimal' });
        expect(kindsOf(sink.events)).not.toContain('approval.requested');
        expect(kindsOf(sink.events)).not.toContain('approval.resolved');
        expect(kindsOf(sink.events)).toContain('tool.completed');
        expect(kindsOf(sink.events).at(-1)).toBe('run.completed');
    });
});

describe('fake input scenario', () => {
    it('AC-016: waits at input.requested for 24 h, then the answer gives input.resolved without the text, message.completed and run.completed', async () => {
        const { clock, provider, sink } = start({ scenario: 'input' });
        expect(sink.events.at(-1)?.kind).toBe('input.requested');
        const count = sink.events.length;
        clock.advance(DAY);
        expect(sink.events).toHaveLength(count);
        expect(await provider.respondToInput('run-1', 'fake-input-1', 'the secret blue answer')).toEqual({ ok: true });
        expect(kindsOf(sink.events).slice(-4)).toEqual(['input.requested', 'input.resolved', 'message.completed', 'run.completed']);
        expect(sink.events.find((event) => event.kind === 'input.resolved')?.payload).toEqual({ requestId: 'fake-input-1' });
        expect(JSON.stringify(sink.events)).not.toContain('blue answer');
        expect(sink.closed).toBe(1);
    });

    it('AC-016: profile minimal has no input request and ends with run.completed', () => {
        const { sink } = start({ scenario: 'input', profile: 'minimal' });
        expect(kindsOf(sink.events)).not.toContain('input.requested');
        expect(kindsOf(sink.events).at(-1)).toBe('run.completed');
    });
});

describe('fake long run, cancel and end of session', () => {
    it('AC-015: long run delivers a message.delta every 1 000 ms and run.cancelled as its last event after cancel', async () => {
        const { clock, provider, sink } = start({ scenario: 'long-run' });
        clock.advance(1_500);
        expect(kindsOf(sink.events).filter((kind) => kind === 'message.delta')).toHaveLength(2);
        expect(await provider.cancel('run-1')).toEqual({ ok: true });
        expect(sink.events.at(-1)?.kind).toBe('run.cancelled');
        expect(sink.closed).toBe(1);
        const count = sink.events.length;
        clock.advance(10_000);
        expect(sink.events).toHaveLength(count);
        expect(clock.pendingTimers()).toBe(0);
    });

    it('AC-015: through the service a cancel ends the run, a second cancel is already ended', async () => {
        const { service, events, clock } = throughService({ scenario: 'long-run' });
        await service.start('fake', { runId: 'run-1', workingDirectory: '/p', prompt: 'p' });
        clock.advance(2_000);
        expect(await service.cancel('run-1')).toEqual({ kind: 'ok' });
        expect(events.at(-1)?.kind).toBe('run.cancelled');
        expect(await service.cancel('run-1')).toEqual({ kind: 'already-ended', runId: 'run-1' });
    });

    it('AC-016: a cancel with a request open ends run and request with run.cancelled, no other event follows', async () => {
        const { service, events, clock } = throughService({ scenario: 'approval' });
        await service.start('fake', { runId: 'run-1', workingDirectory: '/p', prompt: 'p' });
        clock.advance(1_000);
        expect(await service.cancel('run-1')).toEqual({ kind: 'ok' });
        expect(events.at(-1)?.kind).toBe('run.cancelled');
        expect(await service.respondToApproval('run-1', 'fake-approval-1', { decision: 'approve-once' })).toMatchObject({ kind: 'request-not-open' });
        clock.advance(DAY);
        expect(events.at(-1)?.kind).toBe('run.cancelled');
    });

    it('AC-015: after endSession through the service no further event of the run passes and the fake stops its timers', async () => {
        const { service, events, clock } = throughService({ scenario: 'long-run' });
        await service.start('fake', { runId: 'run-1', workingDirectory: '/p', prompt: 'p' });
        clock.advance(1_000);
        const count = events.length;
        expect(service.endSession('run-1')).toEqual({ kind: 'ok' });
        clock.advance(10_000);
        expect(events).toHaveLength(count);
        expect(clock.pendingTimers()).toBe(0);
    });

    it('AC-015: a script that ignores cancel keeps running, the cancel is accepted and no event comes', async () => {
        const { clock, provider, sink } = start({
            script: [
                { type: 'emit', event: { kind: 'turn.started', payload: {} } },
                { type: 'ignoreCancel' },
                { type: 'wait', ms: 5_000 },
                { type: 'emit', event: { kind: 'run.completed', payload: {} } },
                { type: 'close' },
            ],
        });
        expect(await provider.cancel('run-1')).toEqual({ ok: true });
        expect(kindsOf(sink.events)).toEqual(['turn.started']);
        clock.advance(5_000);
        expect(kindsOf(sink.events)).toEqual(['turn.started', 'run.completed']);
    });

    it('AC-015: a cancel for a finished or unknown run is refused by the fake itself', async () => {
        const { provider } = start();
        expect(await provider.cancel('run-1')).toMatchObject({ ok: false });
        expect(await provider.cancel('nope')).toMatchObject({ ok: false });
    });
});

describe('fake resume', () => {
    it('AC-018: a session reference of the fake form, from this or an earlier activation, gives session.started with it under the new run ID and run.completed', async () => {
        for (const sessionRef of ['fake-session-run-1', 'fake-session-from-yesterday']) {
            const clock = createFakeRuntimeClock();
            const provider = createFakeProvider({ clock });
            const sink = createRecordingSink();
            await provider.resume({ runId: 'run-2', workingDirectory: '/p', sessionRef, continuationText: 'go on' }, sink);
            clock.advance(1_000);
            expect(sink.events[0]).toMatchObject({ kind: 'session.started', payload: { sessionRef } });
            expect(kindsOf(sink.events).at(-1)).toBe('run.completed');
            expect(sink.closed).toBe(1);
            expect(provider.calls()).toEqual([{ operation: 'resume', runId: 'run-2' }]);
        }
    });

    it('AC-018: any other session reference ends with run.failed unknown and no run.completed', async () => {
        for (const sessionRef of ['', 'copilot-123', 'fake-session-', 'FAKE-SESSION-x']) {
            const clock = createFakeRuntimeClock();
            const provider = createFakeProvider({ clock });
            const sink = createRecordingSink();
            await provider.resume({ runId: 'run-2', workingDirectory: '/p', sessionRef, continuationText: 'go on' }, sink);
            clock.advance(1_000);
            expect(kindsOf(sink.events)).toEqual(['run.failed']);
            expect(sink.events[0]?.payload).toMatchObject({ category: 'unknown' });
            expect(sink.closed).toBe(1);
        }
    });

    it('AC-018: through the service resume in profile full works and in profile minimal is not supported', async () => {
        const full = throughService();
        expect(await full.service.resume('fake', { runId: 'run-2', workingDirectory: '/p', sessionRef: 'fake-session-run-1', continuationText: 'c' })).toEqual({ kind: 'ok' });
        full.clock.advance(1_000);
        expect(full.events[0]).toMatchObject({ runId: 'run-2', kind: 'session.started', payload: { sessionRef: 'fake-session-run-1' } });
        const minimal = throughService({ profile: 'minimal' });
        expect(await minimal.service.resume('fake', { runId: 'run-2', workingDirectory: '/p', sessionRef: 'fake-session-run-1', continuationText: 'c' })).toEqual({
            kind: 'not-supported',
            providerId: 'fake',
        });
    });
});
