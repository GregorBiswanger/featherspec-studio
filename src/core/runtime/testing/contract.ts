import { afterEach, describe } from 'vitest';
import type { RuntimeMedium } from '../../ports/runtimeMedium';
import { openRuntimeStore, type RuntimeStore } from '../runtimeStore';
import { registerEventsContract } from './contractEvents';
import { registerRunsContract } from './contractRuns';
import { createFaults, createFaultyMedium, type Faults } from './faultyMedium';
import {
    createFakeCredentials,
    createFakeNotices,
    createFakeRuntimeClock,
    createSequentialIds,
    type FakeCredentials,
    type FakeNotices,
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
    maxEventsPerRun?: number;
    maxAgeDays?: unknown;
}

export interface ContractRig {
    harness: MediumHarness;
    clock: FakeRuntimeClock;
    notices: FakeNotices;
    credentials: FakeCredentials;
    faults: Faults;
    open(options?: OpenOptions): Promise<RuntimeStore>;
    rawBytes(project?: string): Promise<string>;
}

export function createContractRig(harness: MediumHarness): ContractRig {
    const clock = createFakeRuntimeClock();
    const notices = createFakeNotices();
    const credentials = createFakeCredentials();
    const ids = createSequentialIds();
    const { faults, state } = createFaults();
    return {
        harness,
        clock,
        notices,
        credentials,
        faults,
        async open(options = {}) {
            const project = options.project ?? 'project-A';
            return openRuntimeStore({
                medium: createFaultyMedium(harness.openMedium(project), state),
                ids,
                clock,
                notices,
                credentials,
                projectRoot: project,
                maxAgeDays: () => options.maxAgeDays,
                maxEventsPerRun: options.maxEventsPerRun,
            });
        },
        async rawBytes(project = 'project-A') {
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
        afterEach(async () => {
            for (const store of stores.splice(0)) {
                await store.dispose();
            }
            for (const cleanup of cleanups.splice(0)) {
                await cleanup();
            }
        });
        const context = {
            async newRig(): Promise<ContractRig> {
                const harness = await makeHarness();
                cleanups.push(() => harness.cleanup());
                const rig = createContractRig(harness);
                const open = rig.open;
                rig.open = async (options) => {
                    const store = await open(options);
                    stores.push(store);
                    return store;
                };
                return rig;
            },
        };
        registerRunsContract(context);
        registerEventsContract(context);
    });
}

export interface ContractContext {
    newRig(): Promise<ContractRig>;
}
