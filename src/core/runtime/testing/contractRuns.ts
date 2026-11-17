import { describe, expect, it } from 'vitest';
import { RuntimeRefusal } from '../model';
import type { ContractContext } from './contract';

const SPEC = { stem: '0007-board', path: '.specs/active/0007-board.md' };

export function registerRunsContract(context: ContractContext): void {
    describe('runs and statuses', () => {
        it('AC-003: a created run shows provider, spec, timestamp, status Starting and model "not available"', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            const run = await store.createRun({ providerId: 'fake', spec: SPEC });
            expect(run.providerId).toBe('fake');
            expect(run.spec).toEqual(SPEC);
            expect(run.status).toBe('Starting');
            expect(run.model).toBe('not available');
            expect(run.created).toBe(new Date(rig.clock.epochMs()).toISOString());
            expect(run.statusHistory).toEqual([{ status: 'Starting', at: run.created }]);
            const read = await store.getRun(run.runId);
            expect(read).toEqual({ available: true, value: run });
        });

        it('AC-003: a model the provider delivers is stored as given', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            const run = await store.createRun({ providerId: 'fake', spec: SPEC, model: 'm-1', sessionRef: 's-9' });
            expect(run.model).toBe('m-1');
            expect(run.sessionRef).toBe('s-9');
        });

        it('0011 BR-005: a cause given at creation is the cause of the first status entry and kept after a reopen', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            const run = await store.createRun({ providerId: 'fake', spec: SPEC, cause: 'resumed from run-1' });
            expect(run.statusHistory).toEqual([{ status: 'Starting', at: run.created, cause: 'resumed from run-1' }]);
            await store.dispose();
            const reopened = await rig.open();
            const read = await reopened.getRun(run.runId);
            expect(read.available && read.value?.statusHistory[0]).toEqual({ status: 'Starting', at: run.created, cause: 'resumed from run-1' });
            const plain = await reopened.createRun({ providerId: 'fake', spec: SPEC });
            expect(plain.statusHistory[0]).not.toHaveProperty('cause');
        });

        it('AC-004: a status of the closed list is appended with its timestamp; the first Running is started', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            const run = await store.createRun({ providerId: 'fake', spec: SPEC });
            rig.clock.advance(1000);
            const running = await store.reportStatus(run.runId, 'Running', { sessionRef: 'sess-1', model: 'm-2' });
            expect(running.status).toBe('Running');
            expect(running.started).toBe(new Date(rig.clock.epochMs()).toISOString());
            expect(running.sessionRef).toBe('sess-1');
            expect(running.model).toBe('m-2');
            expect(running.ended).toBeUndefined();
            rig.clock.advance(1000);
            const waiting = await store.reportStatus(run.runId, 'WaitingForApproval', { cause: 'tool needs approval' });
            expect(waiting.statusHistory.map((entry) => entry.status)).toEqual(['Starting', 'Running', 'WaitingForApproval']);
            expect(waiting.statusHistory[2]?.cause).toBe('tool needs approval');
            expect(waiting.started).toBe(running.started);
        });

        it('AC-004, BR-011: an end state stores the end time and the result, error class and message supplied', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            const done = await store.createRun({ providerId: 'fake', spec: SPEC });
            const failed = await store.createRun({ providerId: 'fake', spec: SPEC });
            rig.clock.advance(5000);
            const completed = await store.reportStatus(done.runId, 'Completed', { result: { summary: 'ok' } });
            expect(completed.ended).toBe(new Date(rig.clock.epochMs()).toISOString());
            expect(completed.result).toEqual({ summary: 'ok' });
            const bad = await store.reportStatus(failed.runId, 'Failed', { errorClass: 'ProviderError', errorMessage: 'boom' });
            expect(bad.errorClass).toBe('ProviderError');
            expect(bad.errorMessage).toBe('boom');
            expect(bad.ended).toBe(bad.statusHistory[bad.statusHistory.length - 1]?.at);
        });

        it('AC-004: a status outside the closed list is refused and nothing is stored', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            const run = await store.createRun({ providerId: 'fake', spec: SPEC });
            const before = await rig.rawBytes();
            await expect(store.reportStatus(run.runId, 'Paused')).rejects.toMatchObject({ code: 'invalid-status' });
            await expect(store.reportStatus(run.runId, 'completed')).rejects.toBeInstanceOf(RuntimeRefusal);
            expect(await rig.rawBytes()).toBe(before);
            const read = await store.getRun(run.runId);
            expect(read.available && read.value?.status).toBe('Starting');
        });

        it('AC-028: a status change for a run the store does not hold is refused naming the run ID, nothing stored', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            await store.createRun({ providerId: 'fake', spec: SPEC });
            const before = await rig.rawBytes();
            await expect(store.reportStatus('run-unknown', 'Running')).rejects.toThrow(/run-unknown/);
            await expect(store.reportStatus('run-unknown', 'Running')).rejects.toMatchObject({ code: 'unknown-run' });
            expect(await rig.rawBytes()).toBe(before);
        });

        it('AC-008: only the runs of the requested project, newest first, optionally of one spec stem', async () => {
            const rig = await context.newRig();
            const a = await rig.open({ project: 'project-A' });
            const b = await rig.open({ project: 'project-B' });
            const first = await a.createRun({ providerId: 'fake', spec: SPEC });
            rig.clock.advance(1000);
            const other = await a.createRun({ providerId: 'fake', spec: { stem: '0008-x', path: '.specs/active/0008-x.md' } });
            rig.clock.advance(1000);
            const third = await a.createRun({ providerId: 'fake', spec: SPEC });
            const inB = await b.createRun({ providerId: 'fake', spec: SPEC });
            const all = await a.listRuns();
            expect(all.available && all.value.map((run) => run.runId)).toEqual([third.runId, other.runId, first.runId]);
            const forSpec = await a.listRuns({ stem: '0007-board' });
            expect(forSpec.available && forSpec.value.map((run) => run.runId)).toEqual([third.runId, first.runId]);
            const inBList = await b.listRuns();
            expect(inBList.available && inBList.value.map((run) => run.runId)).toEqual([inB.runId]);
        });

        it('AC-008: the same project returns the same runs when it is opened again', async () => {
            const rig = await context.newRig();
            const first = await rig.open();
            const run = await first.createRun({ providerId: 'fake', spec: SPEC });
            await first.reportStatus(run.runId, 'Completed');
            await first.dispose();
            const second = await rig.open();
            const list = await second.listRuns();
            expect(list.available && list.value.map((entry) => [entry.runId, entry.status])).toEqual([[run.runId, 'Completed']]);
        });

        it('AC-009: a project opened under another root URI returns no run', async () => {
            const rig = await context.newRig();
            const original = await rig.open({ project: 'file:///work/app' });
            await original.createRun({ providerId: 'fake', spec: SPEC });
            const renamed = await rig.open({ project: 'file:///work/app-renamed' });
            const list = await renamed.listRuns();
            expect(list).toEqual({ available: true, value: [] });
        });
    });
}
