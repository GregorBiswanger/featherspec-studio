import { describe, expect, it } from 'vitest';
import { EXTENSION_HOST_RESTARTED, READER_REASON, storageUnreachableNotice } from '../notices';
import type { StoreState } from '../model';
import type { ContractContext, ContractRig } from './contract';

const SPEC = { stem: '0011-orchestrator', path: '.specs/active/0011-orchestrator.md' };
const DAY = 86_400_000;
const PROJECT = 'project-A';

function iso(ms: number): string {
    return new Date(ms).toISOString();
}

async function plantLock(rig: ContractRig, owner: string, heartbeatAt: number): Promise<void> {
    await rig.harness.writeRaw(PROJECT, 'lock.json', JSON.stringify({ owner, heartbeatAt }));
}

export function registerWriterContract(context: ContractContext): void {
    describe('restore and Interrupted classification', () => {
        it('AC-011: a writer sets every run in an open state to Interrupted with the cause and the time of classification', async () => {
            const rig = await context.newRig();
            const first = await rig.open();
            const starting = await first.createRun({ providerId: 'fake', spec: SPEC });
            const running = await first.createRun({ providerId: 'fake', spec: SPEC });
            const approval = await first.createRun({ providerId: 'fake', spec: SPEC });
            const input = await first.createRun({ providerId: 'fake', spec: SPEC });
            const done = await first.createRun({ providerId: 'fake', spec: SPEC });
            await first.reportStatus(running.runId, 'Running');
            await first.reportStatus(approval.runId, 'WaitingForApproval');
            await first.reportStatus(input.runId, 'WaitingForInput');
            await first.reportStatus(done.runId, 'Completed');
            await first.dispose();
            rig.clock.advance(3600_000);
            const second = await rig.open();
            const list = await second.listRuns();
            const byId = new Map((list.available ? list.value : []).map((run) => [run.runId, run]));
            for (const open of [starting, running, approval, input]) {
                const run = byId.get(open.runId);
                expect(run?.status).toBe('Interrupted');
                expect(run?.ended).toBe(iso(rig.clock.epochMs()));
                const last = run?.statusHistory[run.statusHistory.length - 1];
                expect(last).toEqual({ status: 'Interrupted', at: iso(rig.clock.epochMs()), cause: EXTENSION_HOST_RESTARTED });
            }
            expect(byId.get(done.runId)?.status).toBe('Completed');
            expect(byId.get(done.runId)?.statusHistory.length).toBe(2);
        });

        it('AC-011: the classification is stored, so the next activation changes nothing again', async () => {
            const rig = await context.newRig();
            const first = await rig.open();
            const run = await first.createRun({ providerId: 'fake', spec: SPEC });
            await first.dispose();
            rig.clock.advance(1000);
            const second = await rig.open();
            await second.dispose();
            rig.clock.advance(5000);
            const third = await rig.open();
            const read = await third.getRun(run.runId);
            expect(read.available && read.value?.statusHistory.map((entry) => entry.status)).toEqual(['Starting', 'Interrupted']);
        });

        it('AC-010: after a restart every run is returned with history, timestamps, spec reference and events in order', async () => {
            const rig = await context.newRig();
            const first = await rig.open();
            const run = await first.createRun({ providerId: 'fake', spec: SPEC, model: 'm-1' });
            rig.clock.advance(1000);
            await first.reportStatus(run.runId, 'Running', { sessionRef: 's-1' });
            await first.appendEvent(run.runId, { type: 'message', payload: 'one' });
            await first.appendEvent(run.runId, { type: 'message', payload: 'two' });
            rig.clock.advance(1000);
            await first.reportStatus(run.runId, 'Completed', { result: 'done' });
            const before = await first.getRun(run.runId);
            await first.dispose();
            const second = await rig.open();
            const after = await second.getRun(run.runId);
            expect(before.available && before.value?.runId).toBe(run.runId);
            expect(after).toEqual(before);
            expect(after.available && after.value?.spec).toEqual(SPEC);
            const page = await second.readEvents(run.runId, 1, 10);
            expect(page.available && page.value.map((event) => event.payload)).toEqual(['one', 'two']);
        });
    });

    describe('writer lock', () => {
        it('AC-023: a second window is a reader; it reads, and refuses every write with the reason', async () => {
            const rig = await context.newRig();
            const writer = await rig.open();
            expect(writer.state()).toEqual({ kind: 'writable', reason: undefined });
            const run = await writer.createRun({ providerId: 'fake', spec: SPEC });
            await writer.reportStatus(run.runId, 'Running');
            await writer.appendEvent(run.runId, { type: 'message', payload: 'seen' });
            await rig.settle();
            const reader = await rig.open();
            expect(reader.state()).toEqual({ kind: 'read-only', reason: READER_REASON });
            const list = await reader.listRuns();
            expect(list.available && list.value.map((entry) => [entry.runId, entry.status])).toEqual([[run.runId, 'Running']]);
            const page = await reader.readEvents(run.runId, 1, 10);
            expect(page.available && page.value.map((event) => event.payload)).toEqual(['seen']);
            const before = await rig.rawBytes();
            const refusals = [
                reader.createRun({ providerId: 'fake', spec: SPEC }),
                reader.reportStatus(run.runId, 'Completed'),
                reader.appendEvent(run.runId, { type: 'message', payload: 'x' }),
                reader.appendSpecStatusEntry('0011-orchestrator', { a: 1 }),
                reader.clear(),
            ];
            for (const attempt of refusals) {
                await expect(attempt).rejects.toMatchObject({ code: 'read-only', message: READER_REASON });
            }
            expect(await rig.rawBytes()).toBe(before);
        });

        it('AC-023: a reader neither classifies open runs nor applies the age cap', async () => {
            const rig = await context.newRig();
            const writer = await rig.open();
            const open = await writer.createRun({ providerId: 'fake', spec: SPEC });
            const old = await writer.createRun({ providerId: 'fake', spec: SPEC });
            await writer.reportStatus(old.runId, 'Completed');
            rig.clock.advance(100 * DAY);
            await plantLock(rig, 'someone-else', rig.clock.epochMs());
            const reader = await rig.open();
            expect(reader.state().kind).toBe('read-only');
            const list = await reader.listRuns();
            expect(list.available && list.value.map((run) => [run.runId, run.status]).sort()).toEqual(
                [[open.runId, 'Starting'], [old.runId, 'Completed']].sort(),
            );
        });

        it('AC-024: a stale lock is taken over at activation, and the open runs become Interrupted', async () => {
            const rig = await context.newRig();
            const seed = await rig.open();
            const run = await seed.createRun({ providerId: 'fake', spec: SPEC });
            await seed.reportStatus(run.runId, 'Running');
            await plantLock(rig, 'dead-window', rig.clock.epochMs());
            rig.clock.advance(61_000);
            const taker = await rig.open();
            expect(taker.state().kind).toBe('writable');
            const read = await taker.getRun(run.runId);
            expect(read.available && read.value?.status).toBe('Interrupted');
        });

        it('AC-024: a reader takes over when the heartbeat is older than 60 s, not before', async () => {
            const rig = await context.newRig();
            const seed = await rig.open();
            const run = await seed.createRun({ providerId: 'fake', spec: SPEC });
            await seed.reportStatus(run.runId, 'Running');
            await seed.dispose();
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
            const read = await reader.getRun(run.runId);
            expect(read.available && read.value?.status).toBe('Interrupted');
            const created = await reader.createRun({ providerId: 'fake', spec: SPEC });
            expect(created.status).toBe('Starting');
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
            await expect(writer.createRun({ providerId: 'fake', spec: SPEC })).rejects.toMatchObject({ code: 'read-only' });
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
        async function seedHistory(rig: ContractRig): Promise<{ old: string; recent: string; open: string }> {
            const first = await rig.open();
            const old = await first.createRun({ providerId: 'fake', spec: SPEC });
            await first.appendEvent(old.runId, { type: 'message', payload: 'old event' });
            await first.reportStatus(old.runId, 'Completed');
            await first.appendSpecStatusEntry('0011-orchestrator', { to: 'old' });
            rig.clock.advance(80 * DAY);
            const recent = await first.createRun({ providerId: 'fake', spec: SPEC });
            await first.reportStatus(recent.runId, 'Failed', { errorMessage: 'x' });
            await first.appendSpecStatusEntry('0011-orchestrator', { to: 'recent' });
            const open = await first.createRun({ providerId: 'fake', spec: SPEC });
            await first.dispose();
            return { old: old.runId, recent: recent.runId, open: open.runId };
        }

        it('AC-018: at activation runs ended more than 90 days ago go with their events; recent and open runs stay', async () => {
            const rig = await context.newRig();
            const ids = await seedHistory(rig);
            rig.clock.advance(15 * DAY);
            const second = await rig.open();
            const list = await second.listRuns();
            expect(list.available && list.value.map((run) => run.runId).sort()).toEqual([ids.open, ids.recent].sort());
            const raw = await rig.rawBytes();
            expect(raw).not.toContain('old event');
            const files = await rig.harness.listRaw(PROJECT);
            expect(files.some((name) => name.includes(ids.old))).toBe(false);
            expect(files.some((name) => name.includes(ids.recent))).toBe(true);
        });

        it('AC-018: spec status history entries observed more than 90 days ago are removed, newer ones stay in order', async () => {
            const rig = await context.newRig();
            await seedHistory(rig);
            rig.clock.advance(15 * DAY);
            const second = await rig.open();
            const history = await second.readSpecStatusHistory();
            expect(history.available && history.value.map((record) => record.entry)).toEqual([{ to: 'recent' }]);
        });

        it('AC-018: nothing is removed before the cap is exceeded (negative control)', async () => {
            const rig = await context.newRig();
            const ids = await seedHistory(rig);
            rig.clock.advance(5 * DAY);
            const second = await rig.open();
            const list = await second.listRuns();
            expect(list.available && list.value.map((run) => run.runId).sort()).toEqual([ids.old, ids.open, ids.recent].sort());
        });

        it('AC-018, BR-011: a run that was open is Interrupted at activation, so its 90 days start then and it stays', async () => {
            const rig = await context.newRig();
            const first = await rig.open();
            const run = await first.createRun({ providerId: 'fake', spec: SPEC });
            await first.dispose();
            rig.clock.advance(200 * DAY);
            const second = await rig.open();
            const read = await second.getRun(run.runId);
            expect(read.available && read.value?.status).toBe('Interrupted');
            await second.dispose();
            rig.clock.advance(89 * DAY);
            const third = await rig.open();
            expect((await third.getRun(run.runId)).available).toBe(true);
            const kept = await third.getRun(run.runId);
            expect(kept.available && kept.value?.runId).toBe(run.runId);
            await third.dispose();
            rig.clock.advance(2 * DAY);
            const fourth = await rig.open();
            expect(await fourth.getRun(run.runId)).toEqual({ available: true, value: undefined });
        });

        it('AC-018: the setting changes the cap; a value below 1, fractional or not a number falls back to 90', async () => {
            const rig = await context.newRig();
            await seedHistory(rig);
            rig.clock.advance(15 * DAY);
            const strict = await rig.open({ maxAgeDays: 10 });
            const strictList = await strict.listRuns();
            expect(strictList.available && strictList.value.length).toBe(1);
            await strict.dispose();
            for (const invalid of [0, -3, 2.5, 'ten', null, undefined]) {
                const rigInvalid = await context.newRig();
                await seedHistory(rigInvalid);
                rigInvalid.clock.advance(15 * DAY);
                const store = await rigInvalid.open({ maxAgeDays: invalid });
                const list = await store.listRuns();
                expect(list.available && list.value.length, String(invalid)).toBe(2);
            }
        });
    });

    describe('store state', () => {
        it('AC-025: a medium that cannot be opened makes the store unavailable; reads say not available, writes refuse', async () => {
            const rig = await context.newRig();
            rig.faults.failOpen('disk offline');
            const store = await rig.open();
            expect(store.state()).toEqual({ kind: 'unavailable', reason: 'disk offline' });
            expect(await store.listRuns()).toEqual({ available: false, reason: 'disk offline' });
            expect(await store.getRun('run-1')).toEqual({ available: false, reason: 'disk offline' });
            expect(await store.readEvents('run-1', 1, 10)).toEqual({ available: false, reason: 'disk offline' });
            expect(await store.readSpecStatusHistory()).toEqual({ available: false, reason: 'disk offline' });
            await expect(store.createRun({ providerId: 'fake', spec: SPEC })).rejects.toMatchObject({ code: 'unavailable' });
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
