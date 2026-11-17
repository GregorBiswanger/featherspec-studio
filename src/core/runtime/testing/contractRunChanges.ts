import { describe, expect, it } from 'vitest';
import type { ContractContext } from './contract';

const SPEC = { stem: '0007-board', path: '.specs/active/0007-board.md' };
const DAY = 86_400_000;

export function registerRunChangesContract(context: ContractContext): void {
    describe('run-change notification', () => {
        it('AC-030: a created run and a reported status each tell the subscriber, after the change can be read', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            const seen: string[] = [];
            store.onDidChangeRuns(() => {
                void store.listRuns().then((list) => seen.push(list.available ? (list.value[0]?.status ?? 'none') : 'n/a'));
            });
            const run = await store.createRun({ providerId: 'fake', spec: SPEC });
            await rig.settle();
            await store.reportStatus(run.runId, 'Running');
            await rig.settle();
            expect(seen).toEqual(['Starting', 'Running']);
        });

        it('AC-030: the subscriber is told exactly once per change, and not after it is disposed (negative control)', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            let count = 0;
            const subscription = store.onDidChangeRuns(() => (count += 1));
            const run = await store.createRun({ providerId: 'fake', spec: SPEC });
            expect(count).toBe(1);
            await store.reportStatus(run.runId, 'Running');
            expect(count).toBe(2);
            subscription.dispose();
            await store.reportStatus(run.runId, 'Completed');
            expect(count).toBe(2);
        });

        it('AC-030: a refused write tells nobody', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            let count = 0;
            store.onDidChangeRuns(() => (count += 1));
            await expect(store.reportStatus('unknown', 'Running')).rejects.toMatchObject({ code: 'unknown-run' });
            await expect(store.createRun({ providerId: 'fake', spec: SPEC }).then((run) => store.reportStatus(run.runId, 'not-a-status'))).rejects.toMatchObject({
                code: 'invalid-status',
            });
            expect(count).toBe(1);
        });

        it('AC-030: Clear tells the subscriber when it removed runs, and not when it removed none', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            let count = 0;
            store.onDidChangeRuns(() => (count += 1));
            await store.clear();
            expect(count).toBe(0);
            const run = await store.createRun({ providerId: 'fake', spec: SPEC });
            await store.reportStatus(run.runId, 'Completed');
            count = 0;
            const result = await store.clear();
            expect(result.removed).toBe(1);
            expect(count).toBe(1);
        });

        it('AC-030: a reader that becomes the writer tells the subscriber after it loaded, classified and pruned the runs', async () => {
            const rig = await context.newRig();
            const seed = await rig.open();
            const old = await seed.createRun({ providerId: 'fake', spec: SPEC });
            await seed.reportStatus(old.runId, 'Completed');
            rig.clock.advance(100 * DAY);
            const open = await seed.createRun({ providerId: 'fake', spec: SPEC });
            await seed.dispose();
            await rig.harness.writeRaw('project-A', 'lock.json', JSON.stringify({ owner: 'dead-window', heartbeatAt: rig.clock.epochMs() }));
            const reader = await rig.open();
            const seen: string[][] = [];
            reader.onDidChangeRuns(() => {
                void reader.listRuns().then((list) => seen.push(list.available ? list.value.map((run) => `${run.runId}:${run.status}`) : ['n/a']));
            });
            rig.clock.advance(50_000);
            await rig.settle();
            expect(seen).toEqual([]);
            rig.clock.advance(20_000);
            await rig.settle();
            expect(seen).toEqual([[`${open.runId}:Interrupted`]]);
        });

        it('AC-030: a listener that throws does not stop the others or the write', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            let count = 0;
            store.onDidChangeRuns(() => {
                throw new Error('listener failed');
            });
            store.onDidChangeRuns(() => (count += 1));
            const run = await store.createRun({ providerId: 'fake', spec: SPEC });
            expect(run.status).toBe('Starting');
            expect(count).toBe(1);
        });
    });
}
