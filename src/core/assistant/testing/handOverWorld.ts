import { readMemory } from '../../lifecycle/testing/projects';
import type { Disposable } from '../../ports/host';
import type { UiMemoryPort } from '../../ports/shell';
import type { ProjectRead } from '../../specs/readProject';
import type { SpecRepository } from '../../specs/specRepository';
import { createModelSource } from '../../shell/modelSource';
import { createHandOverMemory, type HandOverMemory } from '../handOver';

export interface FakeMemory extends UiMemoryPort {
    value: unknown;
    writes: number;
}

export function createFakeMemory(value?: unknown): FakeMemory {
    const memory: FakeMemory = {
        value,
        writes: 0,
        get: () => memory.value,
        async set(next) {
            memory.value = next;
            memory.writes += 1;
        },
    };
    return memory;
}

export interface FakeRepository extends Pick<SpecRepository, 'snapshot' | 'readAt' | 'onDidChange'> {
    set(project: ProjectRead | undefined): void;
}

export function createFakeRepository(initial?: ProjectRead): FakeRepository {
    let project = initial;
    const listeners = new Set<(change: never) => void>();
    return {
        snapshot: () => project,
        readAt: () => '2026-11-20T10:00:00.000Z',
        onDidChange(listener): Disposable {
            listeners.add(listener as (change: never) => void);
            return { dispose: () => void listeners.delete(listener as (change: never) => void) };
        },
        set(next) {
            project = next;
            [...listeners].forEach((listener) => listener(undefined as never));
        },
    };
}

export async function projectOf(files: Record<string, string>, stamp?: { modifiedMs?: number; size?: number }): Promise<ProjectRead> {
    const project = await readMemory(files);
    if (stamp === undefined) {
        return project;
    }
    return { ...project, specs: project.specs.map((spec) => ({ ...spec, ...stamp })) };
}

export interface HandOverWorld {
    repository: FakeRepository;
    memory: FakeMemory;
    handOvers: HandOverMemory;
    source: ReturnType<typeof createModelSource>;
}

export function createHandOverWorld(project: ProjectRead, memory: FakeMemory = createFakeMemory()): HandOverWorld {
    const repository = createFakeRepository(project);
    const source: { current?: ReturnType<typeof createModelSource> } = {};
    const handOvers = createHandOverMemory(memory, () => source.current?.current()?.project);
    source.current = createModelSource(repository, handOvers);
    return { repository, memory, handOvers, source: source.current };
}
