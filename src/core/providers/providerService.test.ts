import { describe, expect, it, vi } from 'vitest';
import type { ProviderEvent } from '../ports/agentProvider';
import { createFakeRuntimeClock } from '../runtime/testing/fakes';
import { createProviderService, type ProviderService } from './providerService';
import { createProviderRegistry } from './registry';
import { declarationWith } from './testing/adapters';
import { createControlledAdapter, type ControlledAdapter } from './testing/controlledAdapter';
import { ERROR_CATEGORY_TEXTS, STOPPED_WITHOUT_END_REASON } from './vocabulary';

interface World {
    service: ProviderService;
    events: ProviderEvent[];
    adapter: ControlledAdapter;
}

function world(overrides: Parameters<typeof createControlledAdapter>[1] = {}): World {
    const registry = createProviderRegistry();
    const adapter = createControlledAdapter('alpha', overrides);
    registry.register(adapter.adapter);
    const service = createProviderService({ registry, clock: createFakeRuntimeClock() });
    const events: ProviderEvent[] = [];
    service.onEvent((event) => events.push(event));
    return { service, events, adapter };
}

const START = { runId: 'run-1', workingDirectory: '/project', prompt: 'do it' };

async function started(overrides: Parameters<typeof createControlledAdapter>[1] = {}): Promise<World> {
    const w = world(overrides);
    expect(await w.service.start('alpha', START)).toEqual({ kind: 'ok' });
    return w;
}

describe('provider service: routing and normalisation', () => {
    it('AC-007: passes the request to the adapter unchanged and the events on in order with run ID, kind and source', async () => {
        const { adapter, events } = await started();
        expect(adapter.started).toEqual([START]);
        const sink = adapter.sink('run-1');
        sink.emit({ kind: 'session.started', source: 'provider', providerEventId: 'e1', occurredAt: '2026-11-16T08:00:00.000Z', payload: { sessionRef: 's-1' } });
        sink.emit({ kind: 'message.delta', source: 'provider', payload: { text: 'a' } });
        sink.emit({ kind: 'file.changed', source: 'derived', payload: { path: 'x', operation: 'add', confidence: 'derived', outsideProject: false } });
        expect(events).toEqual([
            { runId: 'run-1', kind: 'session.started', source: 'provider', providerEventId: 'e1', occurredAt: '2026-11-16T08:00:00.000Z', payload: { sessionRef: 's-1' } },
            { runId: 'run-1', kind: 'message.delta', source: 'provider', payload: { text: 'a' } },
            { runId: 'run-1', kind: 'file.changed', source: 'derived', payload: { path: 'x', operation: 'add', confidence: 'derived', outsideProject: false } },
        ]);
    });

    it('AC-007: routes by provider ID and run ID, each run keeps its adapter', async () => {
        const registry = createProviderRegistry();
        const alpha = createControlledAdapter('alpha');
        const beta = createControlledAdapter('beta');
        registry.register(alpha.adapter);
        registry.register(beta.adapter);
        const service = createProviderService({ registry, clock: createFakeRuntimeClock() });
        const events: ProviderEvent[] = [];
        service.onEvent((event) => events.push(event));
        await service.start('alpha', { ...START, runId: 'a-1' });
        await service.start('beta', { ...START, runId: 'b-1' });
        beta.sink('b-1').emit({ kind: 'warning', source: 'provider', payload: { text: 'b' } });
        alpha.sink('a-1').emit({ kind: 'warning', source: 'provider', payload: { text: 'a' } });
        expect(events.map((event) => [event.runId, event.payload])).toEqual([['b-1', { text: 'b' }], ['a-1', { text: 'a' }]]);
        await service.cancel('b-1');
        expect(beta.calls).toContain('cancel:b-1');
        expect(alpha.calls).not.toContain('cancel:b-1');
    });

    it('AC-006: start and resume on an ID that is not registered answer not registered and pass no event', async () => {
        const { service, events } = world();
        expect(await service.start('ghost', START)).toEqual({ kind: 'not-registered', providerId: 'ghost' });
        expect(await service.resume('ghost', { runId: 'r', workingDirectory: '/p', sessionRef: 's', continuationText: 'c' })).toEqual({
            kind: 'not-registered',
            providerId: 'ghost',
        });
        expect(await service.listModels('ghost')).toEqual({ kind: 'not-registered', providerId: 'ghost' });
        expect(events).toEqual([]);
    });

    it('AC-007: a kind outside the closed list becomes provider.unknown with that kind as type name and field names only', async () => {
        const { adapter, events } = await started();
        adapter.sink('run-1').emit({ kind: 'vendor.mystery', source: 'provider', providerEventId: 'p-9', payload: { secret: 'value-1', nested: { a: 1 } } });
        adapter.sink('run-1').emit({ kind: 'vendor.scalar', source: 'provider', payload: 'plain value' });
        expect(events).toEqual([
            { runId: 'run-1', kind: 'provider.unknown', source: 'derived', providerEventId: 'p-9', payload: { typeName: 'vendor.mystery', fieldNames: ['secret', 'nested'] } },
            { runId: 'run-1', kind: 'provider.unknown', source: 'derived', payload: { typeName: 'vendor.scalar', fieldNames: [] } },
        ]);
        expect(JSON.stringify(events)).not.toContain('value-1');
    });

    it('AC-011: run.failed gets the generic text of its category, a delivered cancelled category becomes unknown', async () => {
        const { adapter, events } = await started();
        adapter.sink('run-1').emit({ kind: 'run.failed', source: 'provider', payload: { category: 'auth', providerMessage: 'denied', hint: 'sign in' } });
        adapter.sink('run-1').emit({ kind: 'run.failed', source: 'provider', payload: { category: 'cancelled' } });
        adapter.sink('run-1').emit({ kind: 'run.failed', source: 'provider', payload: { category: 'bogus' } });
        expect(events.map((event) => event.payload)).toEqual([
            { category: 'auth', text: ERROR_CATEGORY_TEXTS.auth, providerMessage: 'denied', hint: 'sign in' },
            { category: 'unknown', text: ERROR_CATEGORY_TEXTS.unknown },
            { category: 'unknown', text: ERROR_CATEGORY_TEXTS.unknown },
        ]);
    });

    it('AC-007: a listener that throws does not stop the other listeners', async () => {
        const { adapter, service, events } = await started();
        service.onEvent(() => {
            throw new Error('boom');
        });
        const later = vi.fn();
        const subscription = service.onEvent(later);
        adapter.sink('run-1').emit({ kind: 'warning', source: 'provider', payload: { text: 'w' } });
        expect(events).toHaveLength(1);
        expect(later).toHaveBeenCalledTimes(1);
        subscription.dispose();
        adapter.sink('run-1').emit({ kind: 'warning', source: 'provider', payload: { text: 'w' } });
        expect(later).toHaveBeenCalledTimes(1);
    });

    it('AC-007: resume passes its request to the adapter and the events carry the new run ID', async () => {
        const { service, adapter, events } = world();
        const request = { runId: 'run-2', workingDirectory: '/project', sessionRef: 'ref-1', continuationText: 'go on' };
        expect(await service.resume('alpha', request)).toEqual({ kind: 'ok' });
        expect(adapter.resumed).toEqual([request]);
        adapter.sink('run-2').emit({ kind: 'session.started', source: 'provider', payload: { sessionRef: 'ref-1' } });
        expect(events[0]?.runId).toBe('run-2');
    });
});

describe('provider service: end of run', () => {
    it('AC-009: the first end kind ends the run, everything after it passes unchanged and the service adds none', async () => {
        const { adapter, events } = await started();
        const sink = adapter.sink('run-1');
        sink.emit({ kind: 'run.completed', source: 'provider', payload: {} });
        sink.emit({ kind: 'warning', source: 'provider', payload: { text: 'late' } });
        sink.emit({ kind: 'run.completed', source: 'provider', payload: { finalMessage: 'again' } });
        sink.close();
        sink.fail('too late');
        expect(events.map((event) => event.kind)).toEqual(['run.completed', 'warning', 'run.completed']);
        expect(events[2]?.payload).toEqual({ finalMessage: 'again' });
    });

    it.each([
        ['close', (sink: { close(): void; fail(reason: string): void }) => sink.close()],
        ['fail', (sink: { close(): void; fail(reason: string): void }) => sink.fail('connection lost')],
    ])('AC-009: a stream that ends by %s without an end kind gets exactly one derived run.failed unknown', async (_name, end) => {
        const { adapter, events } = await started();
        const sink = adapter.sink('run-1');
        sink.emit({ kind: 'turn.started', source: 'provider', payload: {} });
        end(sink);
        end(sink);
        sink.close();
        expect(events.map((event) => event.kind)).toEqual(['turn.started', 'run.failed']);
        const failed = events[1];
        expect(failed?.source).toBe('derived');
        expect(failed?.runId).toBe('run-1');
        expect(failed?.payload).toMatchObject({ category: 'unknown', text: ERROR_CATEGORY_TEXTS.unknown, providerMessage: STOPPED_WITHOUT_END_REASON });
    });

    it('AC-009: a rejected start and a start that throws count as fail, also before a session exists', async () => {
        const rejecting = await started({ start: () => Promise.reject(new Error('spawn failed')) });
        await Promise.resolve();
        await Promise.resolve();
        expect(rejecting.events.map((event) => [event.kind, event.source])).toEqual([['run.failed', 'derived']]);
        const throwing = await started({
            start: () => {
                throw new Error('sync failure');
            },
        });
        expect(throwing.events.map((event) => event.kind)).toEqual(['run.failed']);
    });

    it('AC-009: a rejected start after an end kind adds nothing', async () => {
        let reject: (error: Error) => void = () => undefined;
        const w = await started({
            start: (request, sink) => {
                sink.emit({ kind: 'run.failed', source: 'provider', payload: { category: 'auth' } });
                return new Promise<void>((_, rejectStart) => {
                    reject = rejectStart;
                    void request;
                });
            },
        });
        reject(new Error('later'));
        await Promise.resolve();
        await Promise.resolve();
        expect(w.events.map((event) => event.kind)).toEqual(['run.failed']);
    });

    it('AC-015: after endSession no event of that run passes, not even the derived failure, and the adapter is told', async () => {
        const { adapter, service, events } = await started();
        const sink = adapter.sink('run-1');
        sink.emit({ kind: 'turn.started', source: 'provider', payload: {} });
        expect(service.endSession('run-1')).toEqual({ kind: 'ok' });
        sink.emit({ kind: 'message.delta', source: 'provider', payload: { text: 'x' } });
        sink.emit({ kind: 'run.completed', source: 'provider', payload: {} });
        sink.close();
        expect(events.map((event) => event.kind)).toEqual(['turn.started']);
        expect(adapter.calls).toContain('endSession:run-1');
        expect(service.endSession('run-1')).toEqual({ kind: 'ok' });
    });

    it('AC-015: other runs keep delivering after one run ended its session', async () => {
        const { adapter, service, events } = await started();
        await service.start('alpha', { ...START, runId: 'run-2' });
        service.endSession('run-1');
        adapter.sink('run-2').emit({ kind: 'warning', source: 'provider', payload: { text: 'still' } });
        expect(events.map((event) => event.runId)).toEqual(['run-2']);
    });
});

describe('provider service: operation results', () => {
    it('AC-006: resume, cancel and listModels on a capability declared none answer not supported with the provider ID', async () => {
        const w = world({ capabilities: declarationWith({ resume: 'none', cancel: 'none', modelList: 'none' }) });
        await w.service.start('alpha', START);
        expect(await w.service.resume('alpha', { runId: 'r2', workingDirectory: '/p', sessionRef: 's', continuationText: 'c' })).toEqual({
            kind: 'not-supported',
            providerId: 'alpha',
        });
        expect(await w.service.cancel('run-1')).toEqual({ kind: 'not-supported', providerId: 'alpha' });
        expect(await w.service.listModels('alpha')).toEqual({ kind: 'not-supported', providerId: 'alpha' });
        expect(w.adapter.calls).toEqual(['start:run-1']);
        expect(w.events).toEqual([]);
    });

    it('AC-006: an operation for a run the service does not know answers unknown run', async () => {
        const { service, events } = world();
        expect(await service.cancel('nope')).toEqual({ kind: 'unknown-run', runId: 'nope' });
        expect(service.endSession('nope')).toEqual({ kind: 'unknown-run', runId: 'nope' });
        expect(events).toEqual([]);
    });

    it('AC-015: a cancel after the end kind answers already ended and never reaches the adapter', async () => {
        const { service, adapter, events } = await started();
        adapter.sink('run-1').emit({ kind: 'run.completed', source: 'provider', payload: {} });
        expect(await service.cancel('run-1')).toEqual({ kind: 'already-ended', runId: 'run-1' });
        expect(adapter.calls).toEqual(['start:run-1']);
        expect(events).toHaveLength(1);
    });

    it('AC-006: a cancel that the adapter answers with ok false or that throws is failed with the reason, no event', async () => {
        const refusing = await started({ cancel: () => Promise.resolve({ ok: false, reason: 'cannot now' }) });
        expect(await refusing.service.cancel('run-1')).toEqual({ kind: 'failed', reason: 'cannot now' });
        expect(refusing.events).toEqual([]);
        const throwing = await started({
            cancel: () => {
                throw new Error('exploded');
            },
        });
        expect(await throwing.service.cancel('run-1')).toEqual({ kind: 'failed', reason: 'exploded' });
        const rejecting = await started({ cancel: () => Promise.reject(new Error('rejected')) });
        expect(await rejecting.service.cancel('run-1')).toEqual({ kind: 'failed', reason: 'rejected' });
    });

    it('AC-006: a successful cancel is ok and the end comes as the adapter delivers run.cancelled', async () => {
        const { service, adapter, events } = await started();
        expect(await service.cancel('run-1')).toEqual({ kind: 'ok' });
        expect(events).toEqual([]);
        adapter.sink('run-1').emit({ kind: 'run.cancelled', source: 'provider', payload: {} });
        expect(await service.cancel('run-1')).toEqual({ kind: 'already-ended', runId: 'run-1' });
    });

    it('AC-006: listModels returns the models, a failing query is failed', async () => {
        const ok = world({ listModels: () => Promise.resolve(['m1', 'm2']) });
        expect(await ok.service.listModels('alpha')).toEqual({ kind: 'ok', models: ['m1', 'm2'] });
        const broken = world({ listModels: () => Promise.reject(new Error('offline')) });
        expect(await broken.service.listModels('alpha')).toEqual({ kind: 'failed', reason: 'offline' });
    });

    it('AC-006: starting a run ID the service already knows is failed and does not reach the adapter again', async () => {
        const { service, adapter } = await started();
        expect(await service.start('alpha', START)).toEqual({ kind: 'failed', reason: 'run ID already started' });
        expect(adapter.started).toHaveLength(1);
    });
});
