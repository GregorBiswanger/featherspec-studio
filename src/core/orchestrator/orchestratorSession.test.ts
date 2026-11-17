import { describe, expect, it } from 'vitest';
import { createDiscoveryController } from '../discovery/discoveryController';
import { createFakeHost, createFakeState } from '../discovery/testing/fakeHost';
import { createMemoryFileSystem } from '../discovery/testing/memoryFileSystem';
import type { ShellModelSource } from '../ports/shell';
import { createProviderSetup } from '../providers/providerSetup';
import { createControlledAdapter } from '../providers/testing/controlledAdapter';
import type { JsonValue } from '../runtime/model';
import { openRuntimeStore } from '../runtime/runtimeStore';
import { createRuntimeSession } from '../runtime/runtimeSession';
import { createFakeCredentials, createFakeNotices, createFakeRuntimeClock, createSequentialIds } from '../runtime/testing/fakes';
import { createMemoryBacking, createMemoryMedium, type MemoryBacking } from '../runtime/testing/memoryMedium';
import { createOrchestrator } from './orchestrator';
import { START_TIMEOUT_MS } from './texts';
import { createFakeOrchestratorUi, SPEC } from './testing/world';

async function realWorld(roots: string[]) {
    const fileSystem = createMemoryFileSystem();
    for (const root of roots) {
        fileSystem.setFile(root, 'AGENTS.md', 'FeatherSpecVersion: 1.10.0\n');
        fileSystem.setDirectory(root, '.specs');
    }
    const host = createFakeHost(roots.map((root) => ({ root, name: `name-${root}` })), createFakeState());
    const discovery = createDiscoveryController({
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
    const clock = createFakeRuntimeClock();
    const ids = createSequentialIds('run');
    const backings = new Map<string, MemoryBacking>();
    const session = createRuntimeSession({
        discovery,
        ui: { confirmClear: () => Promise.resolve(false), info: () => undefined, warn: () => undefined },
        openStore(root) {
            let backing = backings.get(root);
            if (backing === undefined) {
                backing = createMemoryBacking();
                backings.set(root, backing);
            }
            return openRuntimeStore({
                medium: createMemoryMedium(backing),
                ids,
                clock,
                notices: createFakeNotices(),
                credentials: createFakeCredentials(),
                projectRoot: root,
                maxAgeDays: () => undefined,
            });
        },
    });
    const controlled = createControlledAdapter('controlled');
    const setup = createProviderSetup({ clock, adapters: [controlled.adapter] });
    const specs: ShellModelSource = { current: () => undefined, updatedAt: () => '', onDidChange: () => ({ dispose: () => undefined }) };
    const orchestrator = createOrchestrator({
        session,
        registry: setup.registry,
        providers: setup.service,
        specs,
        ui: createFakeOrchestratorUi(),
        clock,
        workingDirectory: () => roots[0],
    });
    await session.start();
    await discovery.start();
    const select = async (root: string) => {
        host.ui.pickAnswer = () => root;
        await discovery.selectProject();
        await session.whenIdle();
        await orchestrator.whenIdle();
    };
    await select(roots[0] ?? '');
    const emit = async (runId: string, kind: string, payload: JsonValue = {}) => {
        controlled.sink(runId).emit({ kind, source: 'provider', payload });
        await orchestrator.whenIdle();
    };
    const startRun = async () => {
        const result = await orchestrator.start({
            stem: SPEC.stem,
            path: SPEC.path,
            providerId: 'controlled',
            model: 'not available',
            prompt: 'Implement the spec.',
            workingDirectory: roots[0] ?? '',
        });
        if (result.kind !== 'started') {
            throw new Error(`start refused: ${result.reason}`);
        }
        return result.runId;
    };
    const statusesIn = async (root: string, runId: string) => {
        const store = session.current();
        if (store === undefined || backings.get(root) === undefined) {
            throw new Error(`no store for ${root}`);
        }
        const found = await store.getRun(runId);
        return found.available && found.value !== undefined ? found.value.statusHistory.map((entry) => entry.status) : [];
    };
    return { session, orchestrator, controlled, clock, select, emit, startRun, statusesIn };
}

describe('window end with the real runtime session', () => {
    it('AC-024: switching the active project while a run waits for approval calls cancel once, then endSession once', async () => {
        const world = await realWorld(['a', 'b']);
        const runId = await world.startRun();
        await world.emit(runId, 'session.started', { sessionRef: 's' });
        await world.emit(runId, 'approval.requested', { requestId: 'r1', tool: 'shell', summary: 'run tests' });
        await world.select('b');
        expect(world.controlled.calls).toEqual([`start:${runId}`, `cancel:${runId}`, `endSession:${runId}`]);
        await world.emit(runId, 'approval.resolved', { requestId: 'r1' });
        world.clock.advance(START_TIMEOUT_MS * 2);
        await world.orchestrator.whenIdle();
        expect(world.controlled.calls).toHaveLength(3);
        await world.select('a');
        expect(await world.statusesIn('a', runId)).toEqual(['Starting', 'Running', 'WaitingForApproval', 'Interrupted']);
    });

    it('AC-024: a project switch with no open run calls nothing', async () => {
        const world = await realWorld(['a', 'b']);
        const runId = await world.startRun();
        await world.emit(runId, 'session.started');
        await world.emit(runId, 'run.completed', { finalMessage: 'Done' });
        await world.select('b');
        expect(world.controlled.calls).toEqual([`start:${runId}`]);
    });
});
