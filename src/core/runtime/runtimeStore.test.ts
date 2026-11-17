import { describeRuntimeStoreContract, type MediumHarness } from './testing/contract';
import { createMemoryBacking, createMemoryMedium, type MemoryBacking } from './testing/memoryMedium';
import { createSlowMedium } from './testing/slowMedium';

function memoryHarness(delayMs: number): MediumHarness {
    const projects = new Map<string, MemoryBacking>();
    const backing = (project: string): MemoryBacking => {
        let found = projects.get(project);
        if (found === undefined) {
            found = createMemoryBacking();
            projects.set(project, found);
        }
        return found;
    };
    return {
        openMedium: (project) => (delayMs > 0 ? createSlowMedium(createMemoryMedium(backing(project)), delayMs) : createMemoryMedium(backing(project))),
        readRaw: async (project, name) => backing(project).files.get(name),
        writeRaw: async (project, name, text) => void backing(project).files.set(name, text),
        listRaw: async (project) => [...backing(project).files.keys()].sort(),
        cleanup: async () => undefined,
    };
}

describeRuntimeStoreContract('in-memory medium', async () => memoryHarness(0));

describeRuntimeStoreContract('in-memory medium, every operation 4 ms late (slow disk, virus scanner)', async () => memoryHarness(4));
