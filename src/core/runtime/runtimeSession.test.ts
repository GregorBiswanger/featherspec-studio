import { describe, expect, it } from 'vitest';
import { createDiscoveryController } from '../discovery/discoveryController';
import { createFakeHost, createFakeState } from '../discovery/testing/fakeHost';
import { createMemoryFileSystem } from '../discovery/testing/memoryFileSystem';
import { clearConfirmation, NO_ACTIVE_PROJECT_REASON, READER_REASON } from './notices';
import { openRuntimeStore, type RuntimeStore } from './runtimeStore';
import { createRuntimeSession, type RuntimeUiPort } from './runtimeSession';
import { createFakeCredentials, createFakeNotices, createFakeRuntimeClock, createSequentialIds } from './testing/fakes';
import { createMemoryBacking, createMemoryMedium, type MemoryBacking } from './testing/memoryMedium';

const SPEC = { stem: '0007-board', path: '.specs/active/0007-board.md' };

interface FakeRuntimeUi extends RuntimeUiPort {
    confirmations: string[];
    infos: string[];
    warnings: string[];
    answer: boolean;
}

function createFakeRuntimeUi(): FakeRuntimeUi {
    const ui: FakeRuntimeUi = {
        confirmations: [],
        infos: [],
        warnings: [],
        answer: true,
        async confirmClear(project) {
            ui.confirmations.push(clearConfirmation(project));
            return ui.answer;
        },
        info(message) {
            ui.infos.push(message);
        },
        warn(message) {
            ui.warnings.push(message);
        },
    };
    return ui;
}

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
    const ui = createFakeRuntimeUi();
    const session = createRuntimeSession({
        discovery: controller,
        ui,
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
                credentials: createFakeCredentials(),
                projectRoot: root,
                maxAgeDays: () => undefined,
            });
            stores.push(store);
            return store;
        },
    });
    return { host, controller, session, ui, opened, stores, backings, clock, ids };
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

    it('AC-019: Clear asks for confirmation, removes ended runs and the history, keeps open runs, and reports', async () => {
        const { controller, session, ui } = setup(['a']);
        await session.start();
        await controller.start();
        await session.whenIdle();
        const store = session.current()!;
        const ended = await store.createRun({ providerId: 'fake', spec: SPEC });
        await store.reportStatus(ended.runId, 'Completed');
        const open = await store.createRun({ providerId: 'fake', spec: SPEC });
        await store.appendSpecStatusEntry('0007-board', { to: 'x' });
        await session.clearRunHistory();
        expect(ui.confirmations).toEqual([clearConfirmation('name-a')]);
        expect(ui.infos).toEqual(['Run history cleared.']);
        const list = await store.listRuns();
        expect(list.available && list.value.map((run) => run.runId)).toEqual([open.runId]);
        expect(await store.readSpecStatusHistory()).toEqual({ available: true, value: [] });
        await session.clearRunHistory();
        expect(ui.confirmations.length).toBe(2);
    });

    it('AC-019: declining removes nothing and says so', async () => {
        const { controller, session, ui } = setup(['a']);
        await session.start();
        await controller.start();
        await session.whenIdle();
        const store = session.current()!;
        const ended = await store.createRun({ providerId: 'fake', spec: SPEC });
        await store.reportStatus(ended.runId, 'Completed');
        ui.answer = false;
        await session.clearRunHistory();
        expect(ui.infos).toEqual(['Run history was not cleared.']);
        const list = await store.listRuns();
        expect(list.available && list.value.length).toBe(1);
    });

    it('AC-019: without an active project nothing is cleared and the developer is told', async () => {
        const { session, ui } = setup([]);
        await session.start();
        await session.clearRunHistory();
        expect(ui.confirmations).toEqual([]);
        expect(ui.infos).toEqual(['No active FeatherSpec project; nothing was cleared.']);
    });

    it('AC-019, AC-023: in a reader window Clear says why it did nothing and asks nothing', async () => {
        const { controller, session, ui, backings } = setup(['a']);
        backings.set('a', createMemoryBacking());
        backings.get('a')!.files.set('lock.json', JSON.stringify({ owner: 'other-window', heartbeatAt: Date.UTC(2026, 10, 16, 8, 0, 0) }));
        await session.start();
        await controller.start();
        await session.whenIdle();
        expect(session.state()).toEqual({ kind: 'read-only', reason: READER_REASON });
        await session.clearRunHistory();
        expect(ui.confirmations).toEqual([]);
        expect(ui.infos).toEqual([`Run history was not cleared: ${READER_REASON}`]);
    });

    it('AC-019: a run that could not be removed is counted in the message', async () => {
        const { controller, session, ui } = setup(['a']);
        await session.start();
        await controller.start();
        await session.whenIdle();
        const real = session.current()!;
        const stub: RuntimeStore = { ...real, clear: async () => ({ removed: 1, failed: 2 }) };
        const stubbed = createRuntimeSession({
            discovery: controller,
            ui,
            openStore: async () => stub,
        });
        await stubbed.start();
        await stubbed.whenIdle();
        await stubbed.clearRunHistory();
        expect(ui.infos).toEqual(['Run history cleared; 2 run(s) could not be removed.']);
        await stubbed.dispose();
    });
});
