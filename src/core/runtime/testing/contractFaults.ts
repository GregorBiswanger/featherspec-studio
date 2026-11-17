import { describe, expect, it } from 'vitest';
import {
    NEWER_VERSION_REASON,
    incompleteRecordNotice,
    newerVersionNotice,
    saveFailedNotice,
    unreadableRunsNotice,
} from '../notices';
import type { ContractContext, ContractRig } from './contract';

const SPEC = { stem: '0011-orchestrator', path: '.specs/active/0011-orchestrator.md' };
const PROJECT = 'project-A';
const DAY = 86_400_000;

function runFile(runId: string): string {
    return `runs/${runId}.run.jsonl`;
}

function eventsFile(runId: string): string {
    return `runs/${runId}.events.jsonl`;
}

async function raw(rig: ContractRig, name: string): Promise<string> {
    return (await rig.harness.readRaw(PROJECT, name)) ?? '';
}

async function snapshot(rig: ContractRig): Promise<Map<string, string>> {
    const files = new Map<string, string>();
    for (const name of await rig.harness.listRaw(PROJECT)) {
        files.set(name, await raw(rig, name));
    }
    return files;
}

export function registerFaultsContract(context: ContractContext): void {
    describe('save failures', () => {
        it('AC-014: a failed status write does not fail the caller; the run is flagged, readable, and warned about once', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            const run = await store.createRun({ providerId: 'fake', spec: SPEC });
            rig.faults.failNext('.run.jsonl');
            const running = await store.reportStatus(run.runId, 'Running');
            expect(running.status).toBe('Running');
            expect(running.historyIncomplete).toBe(true);
            rig.faults.failNext('.run.jsonl');
            await store.reportStatus(run.runId, 'WaitingForInput');
            expect(rig.notices.messages).toEqual([saveFailedNotice({ runId: run.runId, stem: SPEC.stem })]);
            const read = await store.getRun(run.runId);
            expect(read.available && read.value?.statusHistory.map((entry) => entry.status)).toEqual(['Starting', 'Running', 'WaitingForInput']);
        });

        it('AC-014: the flag is stored with the next write that succeeds and survives a restart', async () => {
            const rig = await context.newRig();
            const first = await rig.open();
            const run = await first.createRun({ providerId: 'fake', spec: SPEC });
            rig.faults.failNext('.run.jsonl');
            await first.reportStatus(run.runId, 'Running');
            expect(await raw(rig, runFile(run.runId))).not.toContain('"k":"flag"');
            await first.reportStatus(run.runId, 'Completed');
            expect(await raw(rig, runFile(run.runId))).toContain('"k":"flag"');
            await first.dispose();
            const second = await rig.open();
            const read = await second.getRun(run.runId);
            expect(read.available && read.value?.historyIncomplete).toBe(true);
            expect(read.available && read.value?.statusHistory.map((entry) => entry.status)).toEqual(['Starting', 'Completed']);
        });

        it('AC-014, OP-007: a lost event stays readable in the session, is not retried, and later events are stored', async () => {
            const rig = await context.newRig();
            const first = await rig.open();
            const run = await first.createRun({ providerId: 'fake', spec: SPEC });
            await first.appendEvent(run.runId, { type: 'message', payload: 'one' });
            await rig.settle();
            rig.faults.failNext('.events.jsonl');
            expect(await first.appendEvent(run.runId, { type: 'message', payload: 'lost' })).toEqual({ outcome: 'stored', seq: 2 });
            await rig.settle();
            await first.appendEvent(run.runId, { type: 'message', payload: 'three' });
            await rig.settle();
            rig.clock.advance(60_000);
            await rig.settle();
            const live = await first.readEvents(run.runId, 1, 10);
            expect(live.available && live.value.map((event) => event.payload)).toEqual(['one', 'lost', 'three']);
            expect(rig.notices.messages).toEqual([saveFailedNotice({ runId: run.runId, stem: SPEC.stem })]);
            await first.dispose();
            const second = await rig.open();
            const after = await second.readEvents(run.runId, 1, 10);
            expect(after.available && after.value.map((event) => event.payload)).toEqual(['one', 'three']);
            const read = await second.getRun(run.runId);
            expect(read.available && read.value?.historyIncomplete).toBe(true);
        });

        it('AC-014: negative control, without a failure nothing is flagged and nothing is warned', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            const run = await store.createRun({ providerId: 'fake', spec: SPEC });
            await store.reportStatus(run.runId, 'Running');
            await store.appendEvent(run.runId, { type: 'message', payload: 'x' });
            await rig.settle();
            const read = await store.getRun(run.runId);
            expect(read.available && read.value?.historyIncomplete).toBe(false);
            expect(rig.notices.messages).toEqual([]);
            expect(await raw(rig, runFile(run.runId))).not.toContain('flag');
        });

        it('OP-006: a run that cannot be stored when it is created is refused with the reason and is not listed', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            rig.faults.failNext('.run.jsonl');
            await expect(store.createRun({ providerId: 'fake', spec: SPEC })).rejects.toMatchObject({ code: 'storage-failed' });
            expect(await store.listRuns()).toEqual({ available: true, value: [] });
        });
    });

    describe('unreadable and incomplete data', () => {
        async function seedThreeRuns(rig: ContractRig): Promise<string[]> {
            const store = await rig.open();
            const ids: string[] = [];
            for (const stem of ['0007-board', '0008-start', '0009-provider']) {
                const run = await store.createRun({ providerId: 'fake', spec: { stem, path: `.specs/active/${stem}.md` } });
                await store.reportStatus(run.runId, 'Completed');
                await store.appendEvent(run.runId, { type: 'message', payload: stem });
                ids.push(run.runId);
            }
            await rig.settle();
            await store.dispose();
            return ids;
        }

        it('AC-015: one run whose stored data is unreadable is reported as such; the others and the bytes stay unchanged', async () => {
            const rig = await context.newRig();
            const [a, b, c] = await seedThreeRuns(rig);
            const reference = await rig.open();
            const expected = [await reference.getRun(a!), await reference.getRun(c!)];
            await reference.dispose();
            const lines = (await raw(rig, runFile(b!))).split('\n');
            lines.splice(1, 0, '{{ this is not json');
            await rig.harness.writeRaw(PROJECT, runFile(b!), lines.join('\n'));
            const before = await snapshot(rig);
            rig.notices.messages.length = 0;
            const store = await rig.open();
            const broken = await store.getRun(b!);
            expect(broken.available && broken.value?.historyUnreadable).toBe(true);
            expect([await store.getRun(a!), await store.getRun(c!)]).toEqual(expected);
            const list = await store.listRuns();
            expect(list.available && list.value.length).toBe(3);
            expect(rig.notices.messages).toEqual([unreadableRunsNotice([{ runId: b!, stem: '0008-start' }])]);
            expect(await store.readEvents(b!, 1, 10)).toEqual({ available: false, reason: 'history unreadable' });
            await store.dispose();
            for (const [name, text] of before) {
                if (name !== 'lock.json' && name !== 'index.json') {
                    expect(await raw(rig, name), name).toBe(text);
                }
            }
        });

        it('AC-015: an unreadable event line in the middle makes that run unreadable when its events are read', async () => {
            const rig = await context.newRig();
            const [a, b] = await seedThreeRuns(rig);
            const lines = (await raw(rig, eventsFile(a!))).split('\n');
            lines.splice(0, 0, 'not json at all');
            const damaged = lines.join('\n');
            await rig.harness.writeRaw(PROJECT, eventsFile(a!), damaged);
            const store = await rig.open();
            expect(await store.readEvents(a!, 1, 10)).toEqual({ available: false, reason: 'history unreadable' });
            const read = await store.getRun(a!);
            expect(read.available && read.value?.historyUnreadable).toBe(true);
            expect(rig.notices.messages).toEqual([unreadableRunsNotice([{ runId: a!, stem: '0007-board' }])]);
            await store.readEvents(a!, 1, 10);
            expect(rig.notices.messages.length).toBe(1);
            const other = await store.readEvents(b!, 1, 10);
            expect(other.available && other.value.length).toBe(1);
            expect(await raw(rig, eventsFile(a!))).toBe(damaged);
        });

        it('AC-021: an incomplete last record of the events is skipped, reported once, the bytes stay identical', async () => {
            const rig = await context.newRig();
            const [a] = await seedThreeRuns(rig);
            const text = (await raw(rig, eventsFile(a!))) + '{"v":1,"seq":2,"runId":"x","rec';
            await rig.harness.writeRaw(PROJECT, eventsFile(a!), text);
            const store = await rig.open();
            const page = await store.readEvents(a!, 1, 10);
            expect(page.available && page.value.map((event) => event.payload)).toEqual(['0007-board']);
            await store.readEvents(a!, 1, 10);
            expect(rig.notices.messages).toEqual([incompleteRecordNotice([{ runId: a!, stem: '0007-board' }])]);
            const read = await store.getRun(a!);
            expect(read.available && read.value?.historyUnreadable).toBe(false);
            expect(await raw(rig, eventsFile(a!))).toBe(text);
        });

        it('AC-021: an incomplete last record of a run log is skipped at activation and reported once', async () => {
            const rig = await context.newRig();
            const [a, b] = await seedThreeRuns(rig);
            const text = (await raw(rig, runFile(a!))) + '{"v":1,"k":"stat';
            await rig.harness.writeRaw(PROJECT, runFile(a!), text);
            const store = await rig.open();
            const read = await store.getRun(a!);
            expect(read.available && read.value?.status).toBe('Completed');
            expect(read.available && read.value?.historyUnreadable).toBe(false);
            expect(rig.notices.messages).toEqual([incompleteRecordNotice([{ runId: a!, stem: '0007-board' }])]);
            expect(await raw(rig, runFile(a!))).toBe(text);
            expect(b).toBeDefined();
        });

        it('AC-022: an unreadable or missing run list is rebuilt from the per-run data; the same runs come back', async () => {
            const rig = await context.newRig();
            const ids = await seedThreeRuns(rig);
            const reference = await rig.open();
            const expected = await reference.listRuns();
            await reference.dispose();
            for (const damage of ['{ broken', undefined]) {
                if (damage === undefined) {
                    await rig.harness.writeRaw(PROJECT, 'index.json', '');
                } else {
                    await rig.harness.writeRaw(PROJECT, 'index.json', damage);
                }
                const store = await rig.open();
                expect(await store.listRuns()).toEqual(expected);
                await store.dispose();
                const rebuilt = JSON.parse(await raw(rig, 'index.json')) as { runs: { runId: string }[] };
                expect(rebuilt.runs.map((entry) => entry.runId).sort()).toEqual([...ids].sort());
            }
        });
    });

    describe('a kill during a write (PD-028, AC-021, AC-010)', () => {
        const PARTIAL_STATUS = '{"v":1,"k":"stat';
        const PARTIAL_EVENT = '{"v":1,"seq":3,"runId":"x","rec';

        function appendOnly(before: Map<string, string>, after: Map<string, string>): void {
            for (const [name, text] of before) {
                if (name.endsWith('.jsonl')) {
                    expect(after.get(name)?.startsWith(text), name).toBe(true);
                }
            }
        }

        async function seedKilledRun(rig: ContractRig): Promise<string> {
            const seed = await rig.open();
            const run = await seed.createRun({ providerId: 'fake', spec: SPEC });
            await seed.reportStatus(run.runId, 'Running');
            await seed.appendEvent(run.runId, { type: 'message', payload: 'one' });
            await seed.appendEvent(run.runId, { type: 'message', payload: 'two' });
            await rig.settle();
            await seed.dispose();
            await rig.harness.writeRaw(PROJECT, runFile(run.runId), (await raw(rig, runFile(run.runId))) + PARTIAL_STATUS);
            await rig.harness.writeRaw(PROJECT, eventsFile(run.runId), (await raw(rig, eventsFile(run.runId))) + PARTIAL_EVENT);
            return run.runId;
        }

        async function payloads(store: Awaited<ReturnType<ContractRig['open']>>, runId: string): Promise<unknown[]> {
            const page = await store.readEvents(runId, 1, 10);
            return page.available ? page.value.map((event) => event.payload) : ['unavailable'];
        }

        it('AC-021, AC-010: after a kill, restart and restart again list the run as Interrupted with its readable events; earlier bytes stay a prefix', async () => {
            const rig = await context.newRig();
            const runId = await seedKilledRun(rig);
            const killed = await snapshot(rig);
            rig.notices.messages.length = 0;
            const first = await rig.open();
            await rig.settle();
            await first.dispose();
            const afterFirst = await snapshot(rig);
            appendOnly(killed, afterFirst);
            expect(rig.notices.messages).toEqual([incompleteRecordNotice([{ runId, stem: SPEC.stem }])]);
            rig.notices.messages.length = 0;
            const second = await rig.open();
            const run = await second.getRun(runId);
            expect(run.available && run.value?.status).toBe('Interrupted');
            expect(run.available && run.value?.historyUnreadable).toBe(false);
            expect(run.available && run.value?.statusHistory.map((entry) => entry.status)).toEqual(['Starting', 'Running', 'Interrupted']);
            expect(await payloads(second, runId)).toEqual(['one', 'two']);
            const list = await second.listRuns();
            expect(list.available && list.value.map((entry) => entry.status)).toEqual(['Interrupted']);
            expect(rig.notices.messages).toEqual([incompleteRecordNotice([{ runId, stem: SPEC.stem }])]);
            await second.dispose();
            appendOnly(afterFirst, await snapshot(rig));
        });

        it('AC-021: an event appended after an incomplete record starts on a fresh line and stays readable across restarts', async () => {
            const rig = await context.newRig();
            const runId = await seedKilledRun(rig);
            const first = await rig.open();
            await first.appendEvent(runId, { type: 'message', payload: 'three' });
            await rig.settle();
            await first.dispose();
            const afterFirst = await snapshot(rig);
            const second = await rig.open();
            expect(await payloads(second, runId)).toEqual(['one', 'two', 'three']);
            await second.dispose();
            const third = await rig.open();
            expect(await payloads(third, runId)).toEqual(['one', 'two', 'three']);
            const run = await third.getRun(runId);
            expect(run.available && run.value?.historyUnreadable).toBe(false);
            appendOnly(afterFirst, await snapshot(rig));
        });

        it('AC-021: a spec status entry appended after an incomplete history record stays readable', async () => {
            const rig = await context.newRig();
            const seed = await rig.open();
            await seed.appendSpecStatusEntry('0011-orchestrator', { to: 'a' });
            await seed.dispose();
            const file = 'spec-status-history.jsonl';
            await rig.harness.writeRaw(PROJECT, file, (await raw(rig, file)) + '{"v":1,"stem":"0011-orchestrator","obse');
            const killed = await snapshot(rig);
            const first = await rig.open();
            await first.appendSpecStatusEntry('0011-orchestrator', { to: 'b' });
            await first.dispose();
            const second = await rig.open();
            const history = await second.readSpecStatusHistory();
            expect(history.available && history.value.map((record) => record.entry)).toEqual([{ to: 'a' }, { to: 'b' }]);
            appendOnly(killed, await snapshot(rig));
        });

        it('AC-015: negative control, a damaged line that is not an incomplete record still makes the run unreadable', async () => {
            const rig = await context.newRig();
            const runId = await seedKilledRun(rig);
            await rig.harness.writeRaw(PROJECT, runFile(runId), `{{ not json\n${await raw(rig, runFile(runId))}`);
            const store = await rig.open();
            const run = await store.getRun(runId);
            expect(run.available && run.value?.historyUnreadable).toBe(true);
        });
    });

    describe('writes to data that cannot be read or is newer (AC-015, AC-017)', () => {
        async function seedOne(rig: ContractRig): Promise<string> {
            const seed = await rig.open();
            const run = await seed.createRun({ providerId: 'fake', spec: SPEC });
            await seed.appendEvent(run.runId, { type: 'message', payload: 'one' });
            await seed.reportStatus(run.runId, 'Completed');
            await rig.settle();
            await seed.dispose();
            return run.runId;
        }

        async function append(rig: ContractRig, name: string, text: string): Promise<void> {
            await rig.harness.writeRaw(PROJECT, name, (await raw(rig, name)) + text);
        }

        it('AC-015: a status change or an event for a run marked unreadable is refused with the reason; its bytes stay identical', async () => {
            const rig = await context.newRig();
            const runId = await seedOne(rig);
            await append(rig, runFile(runId), '{{ not json\n{"v":1,"k":"flag","at":"x"}\n');
            const before = await snapshot(rig);
            const store = await rig.open();
            await expect(store.reportStatus(runId, 'Running')).rejects.toMatchObject({ code: 'unreadable-run', message: expect.stringContaining(runId) });
            await expect(store.appendEvent(runId, { type: 'message', payload: 'x' })).rejects.toMatchObject({ code: 'unreadable-run', message: expect.stringContaining(runId) });
            await rig.settle();
            await store.dispose();
            for (const name of [runFile(runId), eventsFile(runId)]) {
                expect(await raw(rig, name), name).toBe(before.get(name));
            }
        });

        it('AC-015: an event for a run whose events file holds an unreadable line is refused and nothing is appended', async () => {
            const rig = await context.newRig();
            const runId = await seedOne(rig);
            await append(rig, eventsFile(runId), 'not json at all\n');
            const before = await raw(rig, eventsFile(runId));
            const store = await rig.open();
            await expect(store.appendEvent(runId, { type: 'message', payload: 'x' })).rejects.toMatchObject({ code: 'unreadable-run' });
            await rig.settle();
            await store.dispose();
            expect(await raw(rig, eventsFile(runId))).toBe(before);
        });

        it('AC-017: a status change or an event for a run of a newer format is refused with the reason; its bytes stay identical', async () => {
            const rig = await context.newRig();
            const runId = await seedOne(rig);
            await append(rig, runFile(runId), '{"v":2,"k":"hologram"}\n');
            const before = await snapshot(rig);
            const store = await rig.open();
            await expect(store.reportStatus(runId, 'Running')).rejects.toMatchObject({ code: 'newer-version', message: expect.stringContaining(NEWER_VERSION_REASON) });
            await expect(store.appendEvent(runId, { type: 'message', payload: 'x' })).rejects.toMatchObject({ code: 'newer-version' });
            await rig.settle();
            await store.dispose();
            for (const name of [runFile(runId), eventsFile(runId)]) {
                expect(await raw(rig, name), name).toBe(before.get(name));
            }
        });

        it('AC-017: an event for a run whose events file holds a newer record is refused and nothing is appended', async () => {
            const rig = await context.newRig();
            const runId = await seedOne(rig);
            await append(rig, eventsFile(runId), '{"v":2,"seq":9}\n');
            const before = await raw(rig, eventsFile(runId));
            const store = await rig.open();
            await expect(store.appendEvent(runId, { type: 'message', payload: 'x' })).rejects.toMatchObject({ code: 'newer-version' });
            await rig.settle();
            await store.dispose();
            expect(await raw(rig, eventsFile(runId))).toBe(before);
        });

        it('AC-017: a spec status entry for a history file with a newer record is refused and nothing is appended', async () => {
            const rig = await context.newRig();
            const seed = await rig.open();
            await seed.appendSpecStatusEntry('0011-orchestrator', { to: 'a' });
            await seed.dispose();
            const file = 'spec-status-history.jsonl';
            await append(rig, file, '{"v":2,"stem":"x","entry":1}\n');
            const before = await raw(rig, file);
            const store = await rig.open();
            await expect(store.appendSpecStatusEntry('0011-orchestrator', { to: 'b' })).rejects.toMatchObject({ code: 'newer-version' });
            await store.dispose();
            expect(await raw(rig, file)).toBe(before);
        });

        it('AC-015: negative control, a readable run accepts a status change and an event', async () => {
            const rig = await context.newRig();
            const runId = await seedOne(rig);
            const store = await rig.open();
            await store.reportStatus(runId, 'Failed');
            expect(await store.appendEvent(runId, { type: 'message', payload: 'x' })).toMatchObject({ outcome: 'stored' });
        });
    });

    describe('newer versions', () => {
        it('AC-017: a store written by a newer version is left byte-identical, not shown, not written, one notice', async () => {
            const rig = await context.newRig();
            const seed = await rig.open();
            const run = await seed.createRun({ providerId: 'fake', spec: SPEC });
            await seed.reportStatus(run.runId, 'Running');
            await seed.dispose();
            await rig.harness.writeRaw(PROJECT, 'store.json', JSON.stringify({ storeVersion: 2, projectRoot: PROJECT }));
            rig.clock.advance(200 * DAY);
            const before = await snapshot(rig);
            rig.notices.messages.length = 0;
            const store = await rig.open();
            expect(store.state()).toEqual({ kind: 'read-only', reason: NEWER_VERSION_REASON });
            expect(await store.listRuns()).toEqual({ available: false, reason: NEWER_VERSION_REASON });
            await expect(store.createRun({ providerId: 'fake', spec: SPEC })).rejects.toMatchObject({ code: 'read-only' });
            await expect(store.clear()).rejects.toMatchObject({ code: 'read-only' });
            rig.clock.advance(60_000);
            await rig.settle();
            await store.dispose();
            expect(rig.notices.messages).toEqual([newerVersionNotice()]);
            expect(await snapshot(rig)).toEqual(before);
        });

        it('AC-017: a run record of a newer format is untouched by the age cap and by Clear, and reported', async () => {
            const rig = await context.newRig();
            const seed = await rig.open();
            const future = await seed.createRun({ providerId: 'fake', spec: SPEC });
            const plain = await seed.createRun({ providerId: 'fake', spec: SPEC });
            await seed.reportStatus(future.runId, 'Completed');
            await seed.reportStatus(plain.runId, 'Completed');
            await seed.appendSpecStatusEntry('0011-orchestrator', { to: 'readable' });
            await seed.dispose();
            const futureText = (await raw(rig, runFile(future.runId))) + '{"v":2,"k":"hologram"}\n';
            await rig.harness.writeRaw(PROJECT, runFile(future.runId), futureText);
            const historyText = (await raw(rig, 'spec-status-history.jsonl')) + '{"v":2,"stem":"x","entry":1}\n';
            await rig.harness.writeRaw(PROJECT, 'spec-status-history.jsonl', historyText);
            rig.clock.advance(200 * DAY);
            rig.notices.messages.length = 0;
            const store = await rig.open();
            expect(rig.notices.messages).toEqual([newerVersionNotice()]);
            const list = await store.listRuns();
            expect(list.available && list.value.map((run) => run.runId)).toEqual([future.runId]);
            const result = await store.clear();
            expect(result).toEqual({ removed: 0, failed: 0 });
            expect(await raw(rig, runFile(future.runId))).toBe(futureText);
            expect(await raw(rig, 'spec-status-history.jsonl')).toBe('{"v":2,"stem":"x","entry":1}\n');
        });
    });

    describe('clearing', () => {
        it('AC-019: Clear removes ended runs with their events, unreadable runs and all history entries, and keeps open runs', async () => {
            const rig = await context.newRig();
            const seed = await rig.open();
            const ended = await seed.createRun({ providerId: 'fake', spec: SPEC });
            const broken = await seed.createRun({ providerId: 'fake', spec: SPEC });
            await seed.appendEvent(ended.runId, { type: 'message', payload: 'bye' });
            await seed.reportStatus(ended.runId, 'Failed');
            await seed.reportStatus(broken.runId, 'Completed');
            await seed.appendSpecStatusEntry('0011-orchestrator', { to: 'x' });
            await rig.settle();
            await seed.dispose();
            await rig.harness.writeRaw(PROJECT, runFile(broken.runId), 'garbage\n{"x":1}\n');
            const store = await rig.open();
            const open = await store.createRun({ providerId: 'fake', spec: SPEC });
            await store.appendEvent(open.runId, { type: 'message', payload: 'keep' });
            const result = await store.clear();
            expect(result).toEqual({ removed: 2, failed: 0 });
            const list = await store.listRuns();
            expect(list.available && list.value.map((run) => run.runId)).toEqual([open.runId]);
            expect(await store.readSpecStatusHistory()).toEqual({ available: true, value: [] });
            const files = await rig.harness.listRaw(PROJECT);
            expect(files.some((name) => name.includes(ended.runId) || name.includes(broken.runId))).toBe(false);
            const page = await store.readEvents(open.runId, 1, 10);
            expect(page.available && page.value.length).toBe(1);
            const again = await store.clear();
            expect(again).toEqual({ removed: 0, failed: 0 });
        });

        it('AC-019: a run that cannot be removed stays, the others go, and the number is returned', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            const stuck = await store.createRun({ providerId: 'fake', spec: SPEC });
            const free = await store.createRun({ providerId: 'fake', spec: SPEC });
            await store.reportStatus(stuck.runId, 'Completed');
            await store.reportStatus(free.runId, 'Completed');
            rig.faults.failRemove(stuck.runId);
            const result = await store.clear();
            expect(result).toEqual({ removed: 1, failed: 1 });
            const list = await store.listRuns();
            expect(list.available && list.value.map((run) => run.runId)).toEqual([stuck.runId]);
        });

        it('AC-023: the age cap and Clear are the writer\'s alone (Clear is refused in a reader window)', async () => {
            const rig = await context.newRig();
            const writer = await rig.open();
            const run = await writer.createRun({ providerId: 'fake', spec: SPEC });
            await writer.reportStatus(run.runId, 'Completed');
            const reader = await rig.open();
            await expect(reader.clear()).rejects.toMatchObject({ code: 'read-only' });
            const list = await writer.listRuns();
            expect(list.available && list.value.length).toBe(1);
        });
    });
}
