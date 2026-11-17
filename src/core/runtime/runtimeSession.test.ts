import { describe, expect, it } from 'vitest';
import { createDiscoveryController } from '../discovery/discoveryController';
import { createFakeHost, createFakeState } from '../discovery/testing/fakeHost';
import { createMemoryFileSystem } from '../discovery/testing/memoryFileSystem';
import { NO_ACTIVE_PROJECT_REASON, READER_REASON } from './notices';
import { openRuntimeStore, type RuntimeStore } from './runtimeStore';
import { createRuntimeSession } from './runtimeSession';
import { createFakeNotices, createFakeRuntimeClock, createSequentialIds } from './testing/fakes';
import { createMemoryBacking, createMemoryMedium, type MemoryBacking } from './testing/memoryMedium';

function setup(roots: string[]) {
    const fileSystem = createMemoryFileSystem();
    for (const root of roots) {
        fileSystem.setFile(root, 'AGENTS.md', 'FeatherSpecVersion: 1.10.0\n');
        fileSystem.setDirectory(root, '.specs');
    }
    const host = createFakeHost(roots.map((root) => ({ root, name: `name-${root}` })), createFakeState());
    const controller = createDiscoveryController({
        fileSystem,
        statusBar: host.statusBar,
        output: host.output,
        state: host.state,
        folders: host.folders,
        clock: host.clock,
        ui: host.ui,
        watch: host.watch,
        sameRoot: (first, second) => first === second,
    });
    const backings = new Map<string, MemoryBacking>();
    const clock = createFakeRuntimeClock();
    const ids = createSequentialIds();
    const opened: string[] = [];
    const stores: RuntimeStore[] = [];
    const session = createRuntimeSession({
        discovery: controller,
        async openStore(root) {
            opened.push(root);
            let backing = backings.get(root);
            if (backing === undefined) {
                backing = createMemoryBacking();
                backings.set(root, backing);
            }
            const store = await openRuntimeStore({
                medium: createMemoryMedium(backing),
                ids,
                clock,
                notices: createFakeNotices(),
                projectRoot: root,
            });
            stores.push(store);
            return store;
        },
    });
    return { host, controller, session, opened, stores, backings, clock, ids };
}

describe('runtime session', () => {
    it('AC-025: opens the store of the active project once discovery reports it, and says "unavailable" before', async () => {
        const { controller, session, opened } = setup(['a']);
        await session.start();
        expect(session.state()).toEqual({ kind: 'unavailable', reason: NO_ACTIVE_PROJECT_REASON });
        await controller.start();
        await session.whenIdle();
        expect(opened).toEqual(['a']);
        expect(session.state()).toEqual({ kind: 'writable', reason: undefined });
        expect(session.current()).toBeDefined();
    });

    it('AC-025: a project switch closes the old store (releasing its lock) and opens the other; the state change is announced', async () => {
        const { host, controller, session, opened, backings } = setup(['a', 'b']);
        const states: string[] = [];
        session.onDidChangeState((state) => states.push(`${state.kind}`));
        await session.start();
        await controller.start();
        host.ui.pickAnswer = () => 'a';
        await controller.selectProject();
        await session.whenIdle();
        host.ui.pickAnswer = () => 'b';
        await controller.selectProject();
        await session.whenIdle();
        expect(opened).toEqual(['a', 'b']);
        expect(backings.get('a')?.files.has('lock.json')).toBe(false);
        expect(backings.get('b')?.files.has('lock.json')).toBe(true);
        expect(states).toContain('writable');
    });

    it('AC-008: the same project selected again keeps its store and does not reopen it', async () => {
        const { host, controller, session, opened } = setup(['a']);
        await session.start();
        await controller.start();
        await session.whenIdle();
        await controller.refresh();
        host.ui.pickAnswer = () => 'a';
        await session.whenIdle();
        expect(opened).toEqual(['a']);
    });

    it('AC-023, AC-026: in a window whose project another window writes, the state is read-only with the reader reason', async () => {
        const { controller, session, backings } = setup(['a']);
        backings.set('a', createMemoryBacking());
        backings.get('a')!.files.set('lock.json', JSON.stringify({ owner: 'other-window', heartbeatAt: Date.UTC(2026, 10, 16, 8, 0, 0) }));
        await session.start();
        await controller.start();
        await session.whenIdle();
        expect(session.state()).toEqual({ kind: 'read-only', reason: READER_REASON });
        expect(READER_REASON).toBe("Another VS Code window holds the write lock for this project's status history.");
    });

    it('a stored status entry of the active project is read back through the session store', async () => {
        const { controller, session } = setup(['a']);
        await session.start();
        await controller.start();
        await session.whenIdle();
        const store = session.current()!;
        await store.appendSpecStatusEntry('0007-board', { to: 'x' });
        const history = await store.readSpecStatusHistory('0007-board');
        expect(history.available && history.value.map((record) => record.entry)).toEqual([{ to: 'x' }]);
    });
});
