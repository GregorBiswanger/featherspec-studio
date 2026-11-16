import { describeRuntimeStoreContract } from './testing/contract';
import { createMemoryBacking, createMemoryMedium, type MemoryBacking } from './testing/memoryMedium';

describeRuntimeStoreContract('in-memory medium', async () => {
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
        openMedium: (project) => createMemoryMedium(backing(project)),
        readRaw: async (project, name) => backing(project).files.get(name),
        writeRaw: async (project, name, text) => void backing(project).files.set(name, text),
        listRaw: async (project) => [...backing(project).files.keys()].sort(),
        cleanup: async () => undefined,
    };
});
