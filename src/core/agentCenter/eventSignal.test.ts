import { describe, expect, it } from 'vitest';
import { createCenterWorld } from './testing/centerWorld';
import { withEventSignal } from './eventSignal';
import { openMemoryStore } from '../missionControl/testing/runtimeWorld';

describe('AC-012: the store wrapper signals stored events', () => {
    it('emits run ID, sequence number and type after an event is stored, and nothing else (no payload reaches the signal)', async () => {
        const { store } = await openMemoryStore();
        const signalled = withEventSignal(store);
        const seen: unknown[] = [];
        signalled.onDidStoreEvent((event) => seen.push(event));
        const run = await signalled.createRun({ providerId: 'fake', spec: { stem: '0007-board', path: '.specs/active/0007-board.md' } });
        await signalled.reportStatus(run.runId, 'Running');
        await signalled.appendEvent(run.runId, { type: 'message.completed', payload: { text: 'secret-ish', source: 'provider' } });
        await signalled.appendEvent(run.runId, { type: 'turn.completed', payload: { source: 'provider' } });
        expect(seen).toEqual([
            { runId: run.runId, seq: 1, type: 'message.completed' },
            { runId: run.runId, seq: 2, type: 'turn.completed' },
        ]);
    });

    it('emits nothing for a duplicate or a refused event; a throwing listener does not break the append; dispose stops the signal', async () => {
        const { store } = await openMemoryStore();
        const signalled = withEventSignal(store);
        const run = await signalled.createRun({ providerId: 'fake', spec: { stem: '0007-board', path: '.specs/active/0007-board.md' } });
        await signalled.reportStatus(run.runId, 'Running');
        const seen: number[] = [];
        signalled.onDidStoreEvent(() => {
            throw new Error('listener failure');
        });
        const subscription = signalled.onDidStoreEvent((event) => seen.push(event.seq));
        const first = await signalled.appendEvent(run.runId, { type: 'turn.started', payload: {}, providerEventId: 'p-1' });
        expect(first.outcome).toBe('stored');
        expect((await signalled.appendEvent(run.runId, { type: 'turn.started', payload: {}, providerEventId: 'p-1' })).outcome).toBe('duplicate');
        await expect(signalled.appendEvent('no-such-run', { type: 'turn.started', payload: {} })).rejects.toThrow();
        expect(seen).toEqual([1]);
        subscription.dispose();
        await signalled.appendEvent(run.runId, { type: 'turn.completed', payload: {} });
        expect(seen).toEqual([1]);
    });

    it('the wrapped store is the same store otherwise: reads and run changes pass through', async () => {
        const world = await createCenterWorld();
        const run = await world.addRun();
        await world.append(run.runId, 'turn.started');
        const read = await world.world.store.readEvents(run.runId, 1, 10);
        expect(read.available && read.value.map((event) => event.type)).toEqual(['turn.started']);
    });
});
