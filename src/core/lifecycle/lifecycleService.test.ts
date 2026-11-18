import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createFileRuntimeMedium, projectStoreDirectory } from '../../adapters/node/fileRuntimeMedium';
import { createNodeSpecSource } from '../../adapters/node/nodeSpecSource';
import { fixturePath } from '../discovery/testing/fixtures';
import { snapshotTree } from '../discovery/testing/snapshotTree';
import type { ClockPort, Disposable } from '../ports/host';
import { RuntimeRefusal } from '../runtime/model';
import type { StoreState } from '../runtime/model';
import type { RuntimeSession } from '../runtime/runtimeSession';
import { openRuntimeStore } from '../runtime/runtimeStore';
import type { RuntimeStore } from '../runtime/runtimeStore';
import { createFakeNotices, createFakeRuntimeClock, createSequentialIds, settle } from '../runtime/testing/fakes';
import { createMemoryBacking, createMemoryMedium } from '../runtime/testing/memoryMedium';
import { readProject } from '../specs/readProject';
import type { ProjectRead } from '../specs/readProject';
import { createSpecRepository } from '../specs/specRepository';
import type { SpecChange, SpecRepository } from '../specs/specRepository';
import { createFakeFileWatch } from '../specs/testing/fakeFileWatch';
import { createMemorySpecSource } from '../specs/testing/memorySpecSource';
import { createLifecycleService } from './lifecycleService';
import { planText, ROOT, specText, VERSION } from './testing/projects';

const LINKED = '[0001-a.plan.md](0001-a.plan.md)';
const cleanups: (() => Promise<void>)[] = [];

afterEach(async () => {
    for (const cleanup of cleanups.splice(0).reverse()) {
        await cleanup();
    }
});

function fakeClock(): ClockPort {
    let tick = 0;
    return { now: () => `2026-11-16T10:00:${String(++tick).padStart(2, '0')}Z`, setTimeout: () => ({ dispose: () => undefined }) };
}

function fakeRepository() {
    const listeners = new Set<(change: SpecChange) => void>();
    let current: ProjectRead | undefined;
    const repository: Pick<SpecRepository, 'snapshot' | 'onDidChange'> = {
        snapshot: () => current,
        onDidChange(listener): Disposable {
            listeners.add(listener);
            return { dispose: () => void listeners.delete(listener) };
        },
    };
    return {
        repository,
        listenerCount: () => listeners.size,
        set(project: ProjectRead | undefined): void {
            current = project;
        },
        emit(references: string[] = []): void {
            [...listeners].forEach((listener) => listener({ references, untied: false, cause: 'files' }));
        },
    };
}

function fakeSession(initial: RuntimeStore | undefined) {
    const listeners = new Set<(state: StoreState) => void>();
    let store = initial;
    let override: StoreState | undefined;
    const session: Pick<RuntimeSession, 'current' | 'state' | 'onDidChangeState'> = {
        current: () => store,
        state: () => override ?? store?.state() ?? { kind: 'unavailable', reason: 'no active project' },
        onDidChangeState(listener): Disposable {
            listeners.add(listener);
            return { dispose: () => void listeners.delete(listener) };
        },
    };
    return {
        session,
        replace(next: RuntimeStore | undefined, state?: StoreState): void {
            store = next;
            override = state;
            listeners.forEach((listener) => listener(session.state()));
        },
    };
}

async function memoryStore(): Promise<RuntimeStore> {
    const store = await openRuntimeStore({
        medium: createMemoryMedium(createMemoryBacking()),
        ids: createSequentialIds(),
        clock: createFakeRuntimeClock(),
        notices: createFakeNotices(),
        projectRoot: 'project-A',
    });
    cleanups.push(() => store.dispose());
    return store;
}

async function readMemory(files: Record<string, string>): Promise<ProjectRead> {
    const source = createMemorySpecSource();
    for (const [relativePath, content] of Object.entries(files)) {
        source.setFile(ROOT, relativePath, content);
    }
    return readProject(source, ROOT, VERSION);
}

const ACTIVE_FILES = {
    '.specs/active/0001-a.md': specText({ status: 'In Progress', plan: LINKED }),
    '.specs/active/0001-a.plan.md': planText({ status: 'In Progress' }),
};

describe('lifecycle service', () => {
    it('AC-014: a change reported by the repository re-derives the model, notifies and appends one history entry', async () => {
        const store = await memoryStore();
        const repo = fakeRepository();
        repo.set(await readMemory(ACTIVE_FILES));
        const service = createLifecycleService({ repository: repo.repository, session: fakeSession(store).session, clock: fakeClock() });
        await service.whenIdle();
        const seen: (string | undefined)[] = [];
        service.onDidChange((model) => seen.push(model?.entries[0]?.state));
        repo.set(await readMemory({ ...ACTIVE_FILES, '.specs/active/0001-a.plan.md': planText({ status: 'Done' }) }));
        repo.emit(['0001-a']);
        await service.whenIdle();
        expect(service.model()?.entries[0].state).toBe('Review');
        expect(seen).toEqual(['Review']);
        const view = await service.history();
        expect(view.available && view.entries.map((entry) => [entry.old, entry.new, entry.cause.kind])).toEqual([
            [null, 'Active', 'first-observed'],
            ['Active', 'Review', 'files'],
        ]);
        service.dispose();
    });

    it('AC-014: without a project there is no model; the latest snapshot of the repository gives one', async () => {
        const repo = fakeRepository();
        const service = createLifecycleService({ repository: repo.repository, session: fakeSession(undefined).session, clock: fakeClock() });
        await service.whenIdle();
        expect(service.model()).toBeUndefined();
        repo.set(
            await readMemory({ '.specs/backlog/0001-a.md': specText({ plan: LINKED }), '.specs/backlog/0001-a.plan.md': planText() }),
        );
        repo.emit();
        await service.whenIdle();
        expect(service.model()?.entries.map((entry) => [entry.key, entry.state])).toEqual([['.specs/backlog/0001-a.md', 'Ready']]);
        service.dispose();
    });

    it('AC-024: without a store the states are derived and the history is not available with the session reason', async () => {
        const repo = fakeRepository();
        repo.set(await readMemory(ACTIVE_FILES));
        const service = createLifecycleService({ repository: repo.repository, session: fakeSession(undefined).session, clock: fakeClock() });
        await service.whenIdle();
        expect(service.model()?.entries[0].state).toBe('Active');
        expect(await service.history()).toEqual({ available: false, text: 'Status history not available: no active project' });
        service.dispose();
    });

    it('AC-024: a store that appears later gets its own baseline; a failing store does not stop the model', async () => {
        const repo = fakeRepository();
        repo.set(await readMemory(ACTIVE_FILES));
        const fake = fakeSession(undefined);
        const service = createLifecycleService({ repository: repo.repository, session: fake.session, clock: fakeClock() });
        await service.whenIdle();
        const store = await memoryStore();
        fake.replace(store);
        await service.whenIdle();
        const view = await service.history();
        expect(view.available && view.entries.map((entry) => entry.cause.kind)).toEqual(['first-observed']);
        const broken = await memoryStore();
        broken.appendSpecStatusEntry = async () => {
            throw new RuntimeRefusal('storage-failed', 'disk full');
        };
        fake.replace(broken);
        await service.whenIdle();
        expect(service.model()?.entries[0].state).toBe('Active');
        service.dispose();
    });

    it('AC-014: switching the project starts a new baseline instead of recording the other project as changes', async () => {
        const repo = fakeRepository();
        repo.set(await readMemory(ACTIVE_FILES));
        const service = createLifecycleService({ repository: repo.repository, session: fakeSession(await memoryStore()).session, clock: fakeClock() });
        await service.whenIdle();
        const source = createMemorySpecSource();
        source.setFile('memory://other', '.specs/backlog/0001-a.md', specText({ plan: '_none yet_' }));
        repo.set(await readProject(source, 'memory://other', VERSION));
        repo.emit();
        await service.whenIdle();
        const view = await service.history();
        expect(view.available && view.entries.map((entry) => entry.cause.kind)).toEqual(['first-observed', 'changed-while-not-running']);
        service.dispose();
    });

    it('AC-014: dispose stops listening', async () => {
        const repo = fakeRepository();
        const service = createLifecycleService({ repository: repo.repository, session: fakeSession(undefined).session, clock: fakeClock() });
        await service.whenIdle();
        expect(repo.listenerCount()).toBe(1);
        service.dispose();
        expect(repo.listenerCount()).toBe(0);
    });

    it('AC-011: derivation and a history append leave the project tree unchanged', async () => {
        const project = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-lifecycle-project-'));
        const storage = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-lifecycle-store-'));
        cleanups.push(async () => {
            await fs.rm(project, { recursive: true, force: true });
            await fs.rm(storage, { recursive: true, force: true });
        });
        await fs.cp(fixturePath('fs110-ready-synthetic'), project, { recursive: true });
        const store = await openRuntimeStore({
            medium: createFileRuntimeMedium(projectStoreDirectory(storage, project)),
            ids: createSequentialIds(),
            clock: createFakeRuntimeClock(),
            notices: createFakeNotices(),
                projectRoot: project,
            });
        cleanups.push(() => store.dispose());
        await store.appendSpecStatusEntry('0001-ready-feature', {
            observedAt: 'earlier',
            stem: '0001-ready-feature',
            old: null,
            new: 'Backlog',
            rule: 'S-BACKLOG',
            cause: { kind: 'first-observed' },
            flow: 'not checked',
        });
        const clock = fakeClock();
        const repository = createSpecRepository({ source: createNodeSpecSource(), watch: createFakeFileWatch(), clock });
        cleanups.push(async () => repository.dispose());
        await repository.open({ root: project, version: VERSION });
        const before = await snapshotTree(project);
        const service = createLifecycleService({ repository, session: fakeSession(store).session, clock });
        await service.whenIdle();
        expect(service.model()?.entries.map((entry) => entry.state)).toContain('Ready');
        await settle();
        const history = await service.history();
        expect(history.available && history.entries.map((entry) => entry.cause.kind)).toContain('changed-while-not-running');
        expect(await snapshotTree(project)).toEqual(before);
        service.dispose();
    });
});
