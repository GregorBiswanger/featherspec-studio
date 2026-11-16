import { describe, expect, it } from 'vitest';
import type { Disposable } from '../ports/host';
import type { ReadResult, RunView, StoreState } from '../runtime/model';
import { createRunSource, type RunStore } from './runSource';
import { createFakeSession, openMemoryStore } from './testing/runtimeWorld';

const SPEC = { stem: '0007-board', path: '.specs/active/0007-board.md' };

interface Scripted {
    store: RunStore;
    notify(): void;
    subscribers(): number;
}

function scripted(state: StoreState, list: () => Promise<ReadResult<RunView[]>>): Scripted {
    const listeners = new Set<() => void>();
    return {
        store: {
            state: () => state,
            listRuns: list,
            onDidChangeRuns(listener): Disposable {
                listeners.add(listener);
                return { dispose: () => void listeners.delete(listener) };
            },
        },
        notify: () => [...listeners].forEach((listener) => listener()),
        subscribers: () => listeners.size,
    };
}

async function flush(): Promise<void> {
    await new Promise<void>((resolve) => setImmediate(resolve));
}

describe('run source', () => {
    it('AC-015: a created run and a reported status each tell the listener once, and the next read shows the change', async () => {
        const { store } = await openMemoryStore();
        const session = createFakeSession(store);
        const source = createRunSource({ session });
        let told = 0;
        source.onDidChange(() => (told += 1));
        const run = await store.createRun({ providerId: 'fake', spec: SPEC });
        expect(told).toBe(1);
        expect(await source.read()).toMatchObject({ available: true, runs: [{ runId: run.runId, status: 'Starting' }] });
        await store.reportStatus(run.runId, 'Running');
        expect(told).toBe(2);
        expect(await source.read()).toMatchObject({ available: true, runs: [{ status: 'Running' }] });
    });

    it('AC-015: after the listener is disposed nothing arrives (negative control)', async () => {
        const { store } = await openMemoryStore();
        const source = createRunSource({ session: createFakeSession(store) });
        let told = 0;
        const subscription = source.onDidChange(() => (told += 1));
        await store.createRun({ providerId: 'fake', spec: SPEC });
        subscription.dispose();
        await store.createRun({ providerId: 'fake', spec: SPEC });
        expect(told).toBe(1);
    });

    it('AC-015: no listener, no subscription on the store (the dashboard reads nothing while the panel is closed)', async () => {
        const first = scripted({ kind: 'writable', reason: undefined }, async () => ({ available: true, value: [] }));
        const session = createFakeSession(first.store);
        const source = createRunSource({ session });
        expect(first.subscribers()).toBe(0);
        expect(session.stateListeners()).toBe(0);
        const subscription = source.onDidChange(() => undefined);
        expect(first.subscribers()).toBe(1);
        expect(session.stateListeners()).toBe(1);
        subscription.dispose();
        expect(first.subscribers()).toBe(0);
        expect(session.stateListeners()).toBe(0);
    });

    it('AC-015: a store switch moves the subscription; the old store no longer tells (negative control)', async () => {
        const first = scripted({ kind: 'writable', reason: undefined }, async () => ({ available: true, value: [] }));
        const second = scripted({ kind: 'writable', reason: undefined }, async () => ({ available: true, value: [] }));
        const session = createFakeSession(first.store);
        const source = createRunSource({ session });
        let told = 0;
        source.onDidChange(() => (told += 1));
        first.notify();
        expect(told).toBe(1);
        session.use(second.store);
        await source.read();
        expect(first.subscribers()).toBe(0);
        expect(second.subscribers()).toBe(1);
        first.notify();
        expect(told).toBe(1);
        second.notify();
        expect(told).toBe(2);
    });

    it('AC-015: a store state change tells the listener too', async () => {
        const session = createFakeSession(scripted({ kind: 'writable', reason: undefined }, async () => ({ available: true, value: [] })).store);
        const source = createRunSource({ session });
        let told = 0;
        source.onDidChange(() => (told += 1));
        session.setState({ kind: 'read-only', reason: 'another window writes' });
        expect(told).toBe(1);
    });

    it('AC-018: no store gives "not available" with the session reason, never an empty list', async () => {
        const session = createFakeSession(undefined);
        session.setState({ kind: 'unavailable', reason: 'no active project' });
        const source = createRunSource({ session });
        expect(await source.read()).toEqual({ available: false, reason: 'no active project' });
    });

    it('AC-018: a store in state unavailable gives its reason; an unavailable listRuns gives the reason it reports', async () => {
        const down = scripted({ kind: 'unavailable', reason: 'disk is full' }, async () => ({ available: true, value: [] }));
        expect(await createRunSource({ session: createFakeSession(down.store) }).read()).toEqual({ available: false, reason: 'disk is full' });
        const broken = scripted({ kind: 'writable', reason: undefined }, async () => ({ available: false, reason: 'index unreadable' }));
        expect(await createRunSource({ session: createFakeSession(broken.store) }).read()).toEqual({ available: false, reason: 'index unreadable' });
    });

    it('AC-018: a throwing listRuns gives "not available", not a rejection', async () => {
        const throwing = scripted({ kind: 'writable', reason: undefined }, async () => {
            throw new Error('boom');
        });
        const read = await createRunSource({ session: createFakeSession(throwing.store) }).read();
        expect(read.available).toBe(false);
    });

    it('A-006: a read-only store counts as available (negative control for the unavailable cases)', async () => {
        const readOnly = scripted({ kind: 'read-only', reason: 'another window writes' }, async () => ({ available: true, value: [] }));
        expect(await createRunSource({ session: createFakeSession(readOnly.store) }).read()).toEqual({ available: true, runs: [] });
    });

    it('a listener that throws does not stop the next one', async () => {
        const store = scripted({ kind: 'writable', reason: undefined }, async () => ({ available: true, value: [] }));
        const source = createRunSource({ session: createFakeSession(store.store) });
        let told = 0;
        source.onDidChange(() => {
            throw new Error('listener failed');
        });
        source.onDidChange(() => (told += 1));
        store.notify();
        await flush();
        expect(told).toBe(1);
    });
});
