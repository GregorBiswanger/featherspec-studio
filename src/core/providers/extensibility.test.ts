import { describe, expect, it } from 'vitest';
import type { ProviderEvent } from '../ports/agentProvider';
import { createFakeRuntimeClock } from '../runtime/testing/fakes';
import { createProviderService } from './providerService';
import { createProviderRegistry } from './registry';
import { declaredAdapter } from './testing/adapters';

describe('extensibility', () => {
    it('AC-021: a third provider under a new ID is registered, listed and run to run.completed through the service', async () => {
        const registry = createProviderRegistry();
        const service = createProviderService({ registry, clock: createFakeRuntimeClock() });
        const events: ProviderEvent[] = [];
        service.onEvent((event) => events.push(event));
        const third = declaredAdapter('third-party', {
            displayName: 'Third party',
            start: (request, sink) => {
                sink.emit({ kind: 'session.started', source: 'provider', payload: { sessionRef: `third-${request.runId}` } });
                sink.emit({ kind: 'run.completed', source: 'provider', payload: {} });
                sink.close();
                return Promise.resolve();
            },
        });
        expect(registry.register(third)).toEqual({ kind: 'ok' });
        expect(registry.list().map((entry) => entry.id)).toEqual(['third-party']);
        expect(await service.start('third-party', { runId: 'run-1', workingDirectory: '/p', prompt: 'p' })).toEqual({ kind: 'ok' });
        expect(events.map((event) => [event.runId, event.kind])).toEqual([['run-1', 'session.started'], ['run-1', 'run.completed']]);
        expect(await service.checkAvailability('third-party')).toEqual({ kind: 'ok', result: 'available' });
    });
});
