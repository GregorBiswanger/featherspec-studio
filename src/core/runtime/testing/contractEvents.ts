import { describe, expect, it } from 'vitest';
import type { StoredEvent } from '../model';
import type { ContractContext } from './contract';

const SPEC = { stem: '0012-live', path: '.specs/active/0012-live.md' };

function seqs(events: readonly StoredEvent[]): number[] {
    return events.map((event) => event.seq);
}

export function registerEventsContract(context: ContractContext): void {
    describe('events', () => {
        it('AC-005: each accepted event gets the next sequence number of its run, starting at 1, in receipt order', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            const one = await store.createRun({ providerId: 'fake', spec: SPEC });
            const two = await store.createRun({ providerId: 'fake', spec: SPEC });
            expect(await store.appendEvent(one.runId, { type: 'message', payload: 'a' })).toEqual({ outcome: 'stored', seq: 1 });
            expect(await store.appendEvent(one.runId, { type: 'message', payload: 'b' })).toEqual({ outcome: 'stored', seq: 2 });
            expect(await store.appendEvent(two.runId, { type: 'message', payload: 'c' })).toEqual({ outcome: 'stored', seq: 1 });
            const page = await store.readEvents(one.runId, 1, 10);
            expect(page.available && page.value.map((event) => [event.seq, event.payload, event.type, event.runId])).toEqual([
                [1, 'a', 'message', one.runId],
                [2, 'b', 'message', one.runId],
            ]);
        });

        it('AC-005: numbering continues after a restart and is never reused', async () => {
            const rig = await context.newRig();
            const first = await rig.open();
            const run = await first.createRun({ providerId: 'fake', spec: SPEC });
            await first.appendEvent(run.runId, { type: 'message', payload: 1 });
            await first.appendEvent(run.runId, { type: 'message', payload: 2 });
            await first.dispose();
            const second = await rig.open();
            expect(await second.appendEvent(run.runId, { type: 'message', payload: 3 })).toEqual({ outcome: 'stored', seq: 3 });
            const page = await second.readEvents(run.runId, 1, 10);
            expect(page.available && seqs(page.value)).toEqual([1, 2, 3]);
        });

        it('AC-005: occurred-at, received-at, provider identity and a nested payload are returned as stored', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            const run = await store.createRun({ providerId: 'fake', spec: SPEC });
            await store.appendEvent(run.runId, {
                type: 'tool',
                payload: { name: 'edit', args: ['a', { b: null }] },
                occurredAt: '2026-11-16T07:59:00.000Z',
                providerEventId: 'p-1',
            });
            const page = await store.readEvents(run.runId, 1, 5);
            expect(page.available && page.value[0]).toEqual({
                runId: run.runId,
                seq: 1,
                occurredAt: '2026-11-16T07:59:00.000Z',
                receivedAt: new Date(rig.clock.epochMs()).toISOString(),
                type: 'tool',
                payload: { name: 'edit', args: ['a', { b: null }] },
                providerEventId: 'p-1',
            });
        });

        it('AC-006: a page from 9,901 of size 100 returns exactly events 9,901 to 10,000; from 10,001 it is empty', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            const run = await store.createRun({ providerId: 'fake', spec: SPEC });
            for (let index = 1; index <= 10_000; index += 1) {
                await store.appendEvent(run.runId, { type: 'message', payload: index });
            }
            const page = await store.readEvents(run.runId, 9901, 100);
            expect(page.available && seqs(page.value)).toEqual(Array.from({ length: 100 }, (_, offset) => 9901 + offset));
            expect(await store.readEvents(run.runId, 10_001, 100)).toEqual({ available: true, value: [] });
            const middle = await store.readEvents(run.runId, 5000, 3);
            expect(middle.available && seqs(middle.value)).toEqual([5000, 5001, 5002]);
        });

        it('AC-006: a page larger than the maximum of 500 is cut to 500; a size below 1 returns no event', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            const run = await store.createRun({ providerId: 'fake', spec: SPEC });
            for (let index = 1; index <= 600; index += 1) {
                await store.appendEvent(run.runId, { type: 'message', payload: index });
            }
            const large = await store.readEvents(run.runId, 1, 10_000);
            expect(large.available && large.value.length).toBe(500);
            expect(large.available && large.value[499]?.seq).toBe(500);
            expect(await store.readEvents(run.runId, 1, 0)).toEqual({ available: true, value: [] });
        });

        it('AC-007: an event with an already accepted provider identity is not stored a second time', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            const run = await store.createRun({ providerId: 'fake', spec: SPEC });
            const other = await store.createRun({ providerId: 'fake', spec: SPEC });
            await store.appendEvent(run.runId, { type: 'message', payload: 'a', providerEventId: 'e-1' });
            expect(await store.appendEvent(run.runId, { type: 'message', payload: 'a-again', providerEventId: 'e-1' })).toEqual({
                outcome: 'duplicate',
            });
            expect(await store.appendEvent(other.runId, { type: 'message', payload: 'a', providerEventId: 'e-1' })).toEqual({
                outcome: 'stored',
                seq: 1,
            });
            const page = await store.readEvents(run.runId, 1, 10);
            expect(page.available && page.value.map((event) => event.payload)).toEqual(['a']);
        });

        it('AC-007: events without a provider identity are always stored; a duplicate is still caught after a restart', async () => {
            const rig = await context.newRig();
            const first = await rig.open();
            const run = await first.createRun({ providerId: 'fake', spec: SPEC });
            await first.appendEvent(run.runId, { type: 'message', payload: 'same' });
            await first.appendEvent(run.runId, { type: 'message', payload: 'same' });
            await first.appendEvent(run.runId, { type: 'message', payload: 'x', providerEventId: 'e-9' });
            await first.dispose();
            const second = await rig.open();
            expect(await second.appendEvent(run.runId, { type: 'message', payload: 'x', providerEventId: 'e-9' })).toEqual({
                outcome: 'duplicate',
            });
            const page = await second.readEvents(run.runId, 1, 10);
            expect(page.available && page.value.length).toBe(3);
        });

        it('AC-027: at the size cap one truncated event ends the run, later events are dropped, status changes go on', async () => {
            const rig = await context.newRig();
            const store = await rig.open({ maxEventsPerRun: 5 });
            const run = await store.createRun({ providerId: 'fake', spec: SPEC });
            for (let index = 1; index <= 5; index += 1) {
                expect(await store.appendEvent(run.runId, { type: 'message', payload: index })).toEqual({ outcome: 'stored', seq: index });
            }
            expect(await store.appendEvent(run.runId, { type: 'message', payload: 6 })).toEqual({ outcome: 'dropped' });
            expect(await store.appendEvent(run.runId, { type: 'message', payload: 7 })).toEqual({ outcome: 'dropped' });
            const page = await store.readEvents(run.runId, 1, 50);
            expect(page.available && page.value.map((event) => event.type)).toEqual([
                'message',
                'message',
                'message',
                'message',
                'message',
                'truncated',
            ]);
            const done = await store.reportStatus(run.runId, 'Completed');
            expect(done.status).toBe('Completed');
            await store.dispose();
            const reopened = await rig.open({ maxEventsPerRun: 5 });
            expect(await reopened.appendEvent(run.runId, { type: 'message', payload: 8 })).toEqual({ outcome: 'dropped' });
            const again = await reopened.readEvents(run.runId, 1, 50);
            expect(again.available && again.value.filter((event) => event.type === 'truncated').length).toBe(1);
        });

        it('AC-028: an event for a run the store does not hold is refused naming the run ID, nothing stored', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            await store.createRun({ providerId: 'fake', spec: SPEC });
            const before = await rig.rawBytes();
            await expect(store.appendEvent('run-gone', { type: 'message', payload: 'x' })).rejects.toThrow(/run-gone/);
            await expect(store.appendEvent('run-gone', { type: 'message', payload: 'x' })).rejects.toMatchObject({ code: 'unknown-run' });
            expect(await rig.rawBytes()).toBe(before);
        });

        it('AC-028: a late event for an ended run is stored in receipt order and leaves the status unchanged', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            const run = await store.createRun({ providerId: 'fake', spec: SPEC });
            await store.appendEvent(run.runId, { type: 'message', payload: 'before' });
            await store.reportStatus(run.runId, 'Cancelled');
            expect(await store.appendEvent(run.runId, { type: 'message', payload: 'late' })).toEqual({ outcome: 'stored', seq: 2 });
            const page = await store.readEvents(run.runId, 1, 10);
            expect(page.available && page.value.map((event) => event.payload)).toEqual(['before', 'late']);
            const read = await store.getRun(run.runId);
            expect(read.available && read.value?.status).toBe('Cancelled');
        });

        it('AC-029: with a medium whose writes never complete, 100 appends return and a read returns the 100 events in order', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            const run = await store.createRun({ providerId: 'fake', spec: SPEC });
            rig.faults.hangWrites(true);
            for (let index = 1; index <= 100; index += 1) {
                expect(await store.appendEvent(run.runId, { type: 'message', payload: index })).toEqual({ outcome: 'stored', seq: index });
            }
            const page = await store.readEvents(run.runId, 1, 100);
            expect(page.available && seqs(page.value)).toEqual(Array.from({ length: 100 }, (_, offset) => offset + 1));
            expect(rig.faults.writeAttempts()).toBeGreaterThan(0);
            rig.faults.hangWrites(false);
        });

        it('AC-029: negative control, without the hang the same events reach the medium', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            const run = await store.createRun({ providerId: 'fake', spec: SPEC });
            await store.appendEvent(run.runId, { type: 'message', payload: 'visible' });
            await new Promise<void>((resolve) => setTimeout(resolve, 20));
            expect(await rig.rawBytes()).toContain('visible');
        });
    });
}
