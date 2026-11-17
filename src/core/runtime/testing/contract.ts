import { afterEach, describe, expect, it } from 'vitest';
import type { RuntimeMedium } from '../../ports/runtimeMedium';
import { openRuntimeStore, type RuntimeStore } from '../runtimeStore';
import { registerFaultsContract } from './contractFaults';
import { registerWriterContract } from './contractWriter';
import { createFaults, createFaultyMedium, type Faults } from './faultyMedium';
import {
    createFakeNotices,
    createFakeRuntimeClock,
    createSequentialIds,
    type FakeNotices,
    settle,
    type FakeRuntimeClock,
} from './fakes';

export interface MediumHarness {
    openMedium(project: string): RuntimeMedium;
    readRaw(project: string, name: string): Promise<string | undefined>;
    writeRaw(project: string, name: string, text: string): Promise<void>;
    listRaw(project: string): Promise<string[]>;
    cleanup(): Promise<void>;
}

export interface OpenOptions {
    project?: string;
}

export const STORE_FILES = ['lock.json', 'spec-status-history.jsonl', 'store.json'];

export interface ContractRig {
    harness: MediumHarness;
    clock: FakeRuntimeClock;
    notices: FakeNotices;
    faults: Faults;
    open(options?: OpenOptions): Promise<RuntimeStore>;
    projects(): string[];
    rawBytes(project?: string): Promise<string>;
    settle(): Promise<void>;
}

export function createContractRig(harness: MediumHarness): ContractRig {
    const clock = createFakeRuntimeClock();
    const notices = createFakeNotices();
    const ids = createSequentialIds();
    const { faults, state } = createFaults();
    const opened = new Set<string>();
    return {
        projects: () => [...opened],
        harness,
        clock,
        notices,
        faults,
        async open(options = {}) {
            const project = options.project ?? 'project-A';
            opened.add(project);
            return openRuntimeStore({
                medium: createFaultyMedium(harness.openMedium(project), state),
                ids,
                clock,
                notices,
                projectRoot: project,
            });
        },
        settle: () => settle(() => state.inFlight),
        async rawBytes(project = 'project-A') {
            await settle(() => state.inFlight);
            const parts: string[] = [];
            for (const name of await harness.listRaw(project)) {
                parts.push((await harness.readRaw(project, name)) ?? '');
            }
            return parts.join('\n');
        },
    };
}

export function describeRuntimeStoreContract(label: string, makeHarness: () => Promise<MediumHarness>): void {
    describe(`runtime store contract (${label})`, () => {
        const cleanups: (() => Promise<void>)[] = [];
        const stores: RuntimeStore[] = [];
        const rigs: ContractRig[] = [];
        afterEach(async () => {
            const found: string[] = [];
            let failure: unknown;
            try {
                for (const rig of rigs.splice(0)) {
                    await rig.settle();
                    for (const project of rig.projects()) {
                        found.push(...(await rig.harness.listRaw(project)).filter((name) => !STORE_FILES.includes(name)));
                    }
                }
            } catch (error) {
                failure = error;
            }
            for (const store of stores.splice(0)) {
                await store.dispose();
            }
            for (const cleanup of cleanups.splice(0)) {
                await cleanup();
            }
            if (failure !== undefined) {
                throw failure;
            }
            expect(found, 'AC-013: the store folder holds only the status history, the lock and the store description').toEqual([]);
        });
        const context = {
            async newRig(): Promise<ContractRig> {
                const harness = await makeHarness();
                cleanups.push(() => harness.cleanup());
                const rig = createContractRig(harness);
                rigs.push(rig);
                const open = rig.open;
                rig.open = async (options) => {
                    const store = await open(options);
                    stores.push(store);
                    return store;
                };
                return rig;
            },
        };
        registerHistoryContract(context);
        registerWriterContract(context);
        registerFaultsContract(context);
    });
}

export interface ContractContext {
    newRig(): Promise<ContractRig>;
}

export function registerHistoryContract(context: ContractContext): void {
    describe('spec status history', () => {
        it('AC-026: entries come back under their stem and for the whole project in append order, also after a restart', async () => {
            const rig = await context.newRig();
            const first = await rig.open();
            await first.appendSpecStatusEntry('0007-board', { from: 'Draft', to: 'Ready' });
            await first.appendSpecStatusEntry('0008-start', { from: 'Draft', to: 'Draft' });
            await first.appendSpecStatusEntry('0007-board', { from: 'Ready', to: 'In Progress', note: 'unchanged text' });
            await first.dispose();
            const second = await rig.open();
            const all = await second.readSpecStatusHistory();
            expect(all.available && all.value.map((record) => [record.stem, record.entry])).toEqual([
                ['0007-board', { from: 'Draft', to: 'Ready' }],
                ['0008-start', { from: 'Draft', to: 'Draft' }],
                ['0007-board', { from: 'Ready', to: 'In Progress', note: 'unchanged text' }],
            ]);
            const one = await second.readSpecStatusHistory('0007-board');
            expect(one.available && one.value.length).toBe(2);
            expect(await second.readSpecStatusHistory('0099-none')).toEqual({ available: true, value: [] });
        });

        it('0004 AC-009: a project opened under another root reads no status history of the first root', async () => {
            const rig = await context.newRig();
            const original = await rig.open({ project: 'file:///work/app' });
            await original.appendSpecStatusEntry('0007-board', { from: 'Draft', to: 'Ready' });
            await original.dispose();
            const renamed = await rig.open({ project: 'file:///work/app-renamed' });
            expect(await renamed.readSpecStatusHistory()).toEqual({ available: true, value: [] });
        });

        it('AC-026, BR-010: entries are not masked or interpreted', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            const text = 'looks like sk-0123456789abcdefghijklmnop but is spec text';
            await store.appendSpecStatusEntry('0007-board', { text });
            const read = await store.readSpecStatusHistory('0007-board');
            expect(read.available && read.value[0]?.entry).toEqual({ text });
        });

        it('AC-013: after appends, a restart and a close the store folder holds no file but the history, the lock and the store description', async () => {
            const rig = await context.newRig();
            const first = await rig.open();
            await first.appendSpecStatusEntry('0007-board', { to: 'a' });
            await rig.settle();
            expect((await rig.harness.listRaw('project-A')).sort()).toEqual(['lock.json', 'spec-status-history.jsonl', 'store.json']);
            await first.dispose();
            const second = await rig.open();
            await second.appendSpecStatusEntry('0007-board', { to: 'b' });
            await second.dispose();
            expect((await rig.harness.listRaw('project-A')).sort()).toEqual(['spec-status-history.jsonl', 'store.json']);
        });

        it('AC-013: negative control, a stray file in a folder is found by the check', async () => {
            const rig = await context.newRig();
            await rig.harness.writeRaw('project-stray', 'index.json', '{}');
            const names = await rig.harness.listRaw('project-stray');
            expect(names.filter((name) => !STORE_FILES.includes(name))).toEqual(['index.json']);
        });
    });
}
