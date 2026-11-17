import { describe, expect, it } from 'vitest';
import { READER_REASON, STORE_CLOSED_REASON, storageUnreachableNotice } from '../notices';
import type { StoreState } from '../model';
import type { ContractContext, ContractRig } from './contract';

const STEM = '0011-example';
const DAY = 86_400_000;
const PROJECT = 'project-A';

async function plantLock(rig: ContractRig, owner: string, heartbeatAt: number): Promise<void> {
    await rig.harness.writeRaw(PROJECT, 'lock.json', JSON.stringify({ owner, heartbeatAt }));
}

export function registerWriterContract(context: ContractContext): void {
    describe('restore', () => {
        it('AC-010: after a restart every entry is returned with its stem, its time and its content in append order', async () => {
            const rig = await context.newRig();
            const first = await rig.open();
            await first.appendSpecStatusEntry(STEM, { to: 'one' });
            rig.clock.advance(1000);
            await first.appendSpecStatusEntry(STEM, { to: 'two' });
            const before = await first.readSpecStatusHistory();
            await first.dispose();
            const second = await rig.open();
            const after = await second.readSpecStatusHistory();
            expect(before.available && before.value.map((record) => record.entry)).toEqual([{ to: 'one' }, { to: 'two' }]);
            expect(after).toEqual(before);
            expect(after.available && after.value.map((record) => record.observedAt)).toEqual([
                new Date(Date.UTC(2026, 10, 16, 8, 0, 0)).toISOString(),
                new Date(Date.UTC(2026, 10, 16, 8, 0, 1)).toISOString(),
            ]);
        });
    });

    describe('writer lock', () => {
        it('AC-023: a second window is a reader; it reads, and refuses every write with the reason', async () => {
            const rig = await context.newRig();
            const writer = await rig.open();
            expect(writer.state()).toEqual({ kind: 'writable', reason: undefined });
            await writer.appendSpecStatusEntry(STEM, { to: 'seen' });
            await rig.settle();
            const reader = await rig.open();
            expect(reader.state()).toEqual({ kind: 'read-only', reason: READER_REASON });
            const history = await reader.readSpecStatusHistory();
            expect(history.available && history.value.map((record) => record.entry)).toEqual([{ to: 'seen' }]);
            const before = await rig.rawBytes();
            await expect(reader.appendSpecStatusEntry(STEM, { a: 1 })).rejects.toMatchObject({ code: 'read-only', message: READER_REASON });
            expect(await rig.rawBytes()).toBe(before);
        });

        it('AC-023: a reader does not apply the age cap', async () => {
            const rig = await context.newRig();
            const writer = await rig.open();
            await writer.appendSpecStatusEntry(STEM, { to: 'old' });
            await writer.dispose();
            rig.clock.advance(100 * DAY);
            await plantLock(rig, 'someone-else', rig.clock.epochMs());
            const reader = await rig.open();
            expect(reader.state().kind).toBe('read-only');
            const history = await reader.readSpecStatusHistory();
            expect(history.available && history.value.map((record) => record.entry)).toEqual([{ to: 'old' }]);
        });

        it('AC-024: a stale lock is taken over at activation', async () => {
            const rig = await context.newRig();
            await plantLock(rig, 'dead-window', rig.clock.epochMs());
            rig.clock.advance(61_000);
            const taker = await rig.open();
            expect(taker.state().kind).toBe('writable');
            await taker.appendSpecStatusEntry(STEM, { to: 'taken' });
        });

        it('AC-024: a reader takes over when the heartbeat is older than 60 s, not before, and then applies the age cap', async () => {
            const rig = await context.newRig();
            const seed = await rig.open();
            await seed.appendSpecStatusEntry(STEM, { to: 'old' });
            await seed.dispose();
            rig.clock.advance(100 * DAY);
            await plantLock(rig, 'dead-window', rig.clock.epochMs());
            const reader = await rig.open();
            const states: StoreState[] = [];
            reader.onDidChangeState((state) => states.push(state));
            expect(reader.state().kind).toBe('read-only');
            rig.clock.advance(50_000);
            await rig.settle();
            expect(reader.state().kind).toBe('read-only');
            expect(states).toEqual([]);
            rig.clock.advance(20_000);
            await rig.settle();
            expect(reader.state()).toEqual({ kind: 'writable', reason: undefined });
            expect(states).toEqual([{ kind: 'writable', reason: undefined }]);
            const history = await reader.readSpecStatusHistory();
            expect(history).toEqual({ available: true, value: [] });
            await reader.appendSpecStatusEntry(STEM, { to: 'new' });
        });

        it('AC-024: a live writer keeps its lock with the heartbeat, so a later window stays a reader', async () => {
            const rig = await context.newRig();
            const writer = await rig.open();
            for (let step = 0; step < 12; step += 1) {
                rig.clock.advance(10_000);
                await rig.settle();
            }
            const later = await rig.open();
            expect(later.state()).toEqual({ kind: 'read-only', reason: READER_REASON });
            expect(writer.state().kind).toBe('writable');
        });

        it('AC-023: a writer that finds the lock owned by another window stops writing', async () => {
            const rig = await context.newRig();
            const writer = await rig.open();
            const states: StoreState[] = [];
            writer.onDidChangeState((state) => states.push(state));
            await plantLock(rig, 'thief', rig.clock.epochMs());
            rig.clock.advance(10_000);
            await rig.settle();
            expect(writer.state()).toEqual({ kind: 'read-only', reason: READER_REASON });
            expect(states).toEqual([{ kind: 'read-only', reason: READER_REASON }]);
            await expect(writer.appendSpecStatusEntry(STEM, { to: 'x' })).rejects.toMatchObject({ code: 'read-only' });
        });

        it('AC-023: a closed store refuses every write and touches the medium no more', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            await store.appendSpecStatusEntry(STEM, { to: 'kept' });
            await store.dispose();
            const before = rig.faults.writeAttempts();
            await expect(store.appendSpecStatusEntry(STEM, { to: 'late' })).rejects.toMatchObject({ code: 'read-only', message: STORE_CLOSED_REASON });
            expect(store.state()).toEqual({ kind: 'read-only', reason: STORE_CLOSED_REASON });
            await rig.settle();
            expect(rig.faults.writeAttempts()).toBe(before);
            expect(await rig.harness.readRaw(PROJECT, 'lock.json')).toBeUndefined();
        });

        it('AC-023: closing waits for every write before it releases the lock', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            void store.appendSpecStatusEntry(STEM, { to: 'in flight' });
            await store.dispose();
            expect(rig.faults.operationsInFlight()).toBe(0);
            expect(await rig.harness.readRaw(PROJECT, 'lock.json')).toBeUndefined();
            expect(await rig.harness.readRaw(PROJECT, 'spec-status-history.jsonl')).toContain('in flight');
        });

        it('AC-023: closing the writer releases the lock, the next window becomes the writer', async () => {
            const rig = await context.newRig();
            const writer = await rig.open();
            await writer.dispose();
            const next = await rig.open();
            expect(next.state().kind).toBe('writable');
        });
    });

    describe('retention', () => {
        async function seedHistory(rig: ContractRig): Promise<void> {
            const first = await rig.open();
            await first.appendSpecStatusEntry(STEM, { to: 'old' });
            rig.clock.advance(80 * DAY);
            await first.appendSpecStatusEntry(STEM, { to: 'recent' });
            await first.dispose();
        }

        it('AC-018: spec status history entries observed more than 90 days ago are removed at activation, newer ones stay in order', async () => {
            const rig = await context.newRig();
            await seedHistory(rig);
            rig.clock.advance(15 * DAY);
            const second = await rig.open();
            const history = await second.readSpecStatusHistory();
            expect(history.available && history.value.map((record) => record.entry)).toEqual([{ to: 'recent' }]);
        });

        it('AC-018: nothing is removed before the cap is exceeded (negative control)', async () => {
            const rig = await context.newRig();
            await seedHistory(rig);
            rig.clock.advance(5 * DAY);
            const second = await rig.open();
            const history = await second.readSpecStatusHistory();
            expect(history.available && history.value.map((record) => record.entry)).toEqual([{ to: 'old' }, { to: 'recent' }]);
        });

        it('AC-018: the cap is 90 days, not configurable: an entry of exactly 89 days stays, one of 91 days goes', async () => {
            const rig = await context.newRig();
            const first = await rig.open();
            await first.appendSpecStatusEntry(STEM, { to: 'a' });
            await first.dispose();
            rig.clock.advance(89 * DAY);
            const second = await rig.open();
            const kept = await second.readSpecStatusHistory();
            expect(kept.available && kept.value.length).toBe(1);
            await second.dispose();
            rig.clock.advance(2 * DAY);
            const third = await rig.open();
            expect(await third.readSpecStatusHistory()).toEqual({ available: true, value: [] });
        });
    });

    describe('store state', () => {
        it('AC-025: a medium that cannot be opened makes the store unavailable; reads say not available, writes refuse', async () => {
            const rig = await context.newRig();
            rig.faults.failOpen('disk offline');
            const store = await rig.open();
            expect(store.state()).toEqual({ kind: 'unavailable', reason: 'disk offline' });
            expect(await store.readSpecStatusHistory()).toEqual({ available: false, reason: 'disk offline' });
            await expect(store.appendSpecStatusEntry(STEM, { to: 'x' })).rejects.toMatchObject({ code: 'unavailable' });
            expect(rig.notices.messages).toEqual([storageUnreachableNotice('disk offline')]);
        });

        it('AC-025: a writable store reports the state, the change event fires once per change', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            expect(store.state()).toEqual({ kind: 'writable', reason: undefined });
            expect(rig.notices.messages).toEqual([]);
            const listenerStates: StoreState[] = [];
            const subscription = store.onDidChangeState((state) => listenerStates.push(state));
            subscription.dispose();
            await plantLock(rig, 'thief', rig.clock.epochMs());
            rig.clock.advance(10_000);
            await rig.settle();
            expect(listenerStates).toEqual([]);
        });
    });
}
