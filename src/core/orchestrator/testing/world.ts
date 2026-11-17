import { createFakeProvider, type FakeProvider } from '../../../adapters/providers/fake/fakeProvider';
import type { FakeScenarioId } from '../../../adapters/providers/fake/scenarios';
import type { ScriptStep } from '../../../adapters/providers/fake/script';
import type { Disposable } from '../../ports/host';
import type { RuntimeMedium } from '../../ports/runtimeMedium';
import type { OrchestratorUiPort, PickItem } from '../../ports/orchestrator';
import type { ShellModel, ShellModelSource } from '../../ports/shell';
import { deriveLifecycle } from '../../lifecycle/deriveLifecycle';
import { readMemory, specText } from '../../lifecycle/testing/projects';
import { createProviderSetup, type ProviderSetup } from '../../providers/providerSetup';
import { createControlledAdapter, type ControlledAdapter } from '../../providers/testing/controlledAdapter';
import type { RunView, StoreState } from '../../runtime/model';
import { openRuntimeStore, type RuntimeStore } from '../../runtime/runtimeStore';
import type { RuntimeSession } from '../../runtime/runtimeSession';
import { createFakeCredentials, createFakeNotices, createFakeRuntimeClock, createSequentialIds, type FakeRuntimeClock } from '../../runtime/testing/fakes';
import { createMemoryBacking, createMemoryMedium, type MemoryBacking } from '../../runtime/testing/memoryMedium';
import { createOrchestrator, type Orchestrator, type StartRequest } from '../orchestrator';

export const SPEC = { stem: '0007-board', path: '.specs/active/0007-board.md' };

export interface SessionDouble extends Pick<RuntimeSession, 'current' | 'state' | 'onDidChangeState'> {
    use(store: RuntimeStore | undefined, state?: StoreState): void;
}

export function createSessionDouble(store: RuntimeStore | undefined): SessionDouble {
    let current = store;
    let state: StoreState = store?.state() ?? { kind: 'unavailable', reason: 'No active FeatherSpec project.' };
    const listeners = new Set<(state: StoreState) => void>();
    return {
        current: () => current,
        state: () => state,
        onDidChangeState(listener): Disposable {
            listeners.add(listener);
            return { dispose: () => void listeners.delete(listener) };
        },
        use(next, nextState) {
            current = next;
            state = nextState ?? next?.state() ?? { kind: 'unavailable', reason: 'No active FeatherSpec project.' };
            [...listeners].forEach((listener) => listener(state));
        },
    };
}

export interface FakeOrchestratorUi extends OrchestratorUiPort {
    confirmations: { message: string; button: string }[];
    infos: string[];
    picks: { items: readonly PickItem[]; placeholder: string }[];
    confirmAnswer: boolean | (() => Promise<boolean>);
    pickAnswer: (items: readonly PickItem[]) => string | undefined;
}

export function createFakeOrchestratorUi(): FakeOrchestratorUi {
    const ui: FakeOrchestratorUi = {
        confirmations: [],
        infos: [],
        picks: [],
        confirmAnswer: true,
        pickAnswer: (items) => items[0]?.id,
        async confirm(message, button) {
            ui.confirmations.push({ message, button });
            return typeof ui.confirmAnswer === 'function' ? ui.confirmAnswer() : ui.confirmAnswer;
        },
        async pick(items, placeholder) {
            ui.picks.push({ items, placeholder });
            return ui.pickAnswer(items);
        },
        info(message) {
            ui.infos.push(message);
        },
    };
    return ui;
}

export interface WorldOptions {
    scenario?: FakeScenarioId;
    script?: readonly ScriptStep[];
    fakeCapabilities?: FakeProvider['capabilities'];
    medium?: () => RuntimeMedium;
    wrapProviders?: (service: ProviderSetup['service']) => ProviderSetup['service'];
}

export interface World {
    clock: FakeRuntimeClock;
    backing: MemoryBacking;
    store: RuntimeStore;
    session: SessionDouble;
    setup: ProviderSetup;
    fake: FakeProvider;
    controlled: ControlledAdapter;
    ui: FakeOrchestratorUi;
    orchestrator: Orchestrator;
    model: { current: ShellModel | undefined };
    workingDirectory: { current: string | undefined };
    scenario: { current: FakeScenarioId };
    openStoreOn(backing?: MemoryBacking): Promise<RuntimeStore>;
    reopen(): Promise<RuntimeStore>;
    setSpecs(specs: readonly { folder: 'backlog' | 'active' | 'done'; stem: string; status?: string }[]): Promise<void>;
    advance(milliseconds: number): Promise<void>;
    request(overrides?: Partial<StartRequest>): StartRequest;
    runOf(runId: string): Promise<RunView>;
    runs(): Promise<RunView[]>;
    statusesOf(runId: string): Promise<string[]>;
    eventKinds(runId: string): Promise<string[]>;
    fakeCalls(): string[];
}

export async function createWorld(options: WorldOptions = {}): Promise<World> {
    const clock = createFakeRuntimeClock();
    const ids = createSequentialIds('run');
    const backing = createMemoryBacking();
    const open = (target: MemoryBacking): Promise<RuntimeStore> =>
        openRuntimeStore({
            medium: options.medium === undefined ? createMemoryMedium(target) : options.medium(),
            ids,
            clock,
            notices: createFakeNotices(),
            credentials: createFakeCredentials(),
            projectRoot: 'memory://project',
            maxAgeDays: () => undefined,
        });
    const store = await open(backing);
    const session = createSessionDouble(store);
    const scenario = { current: options.scenario ?? 'happy-path' } as { current: FakeScenarioId };
    const fake = createFakeProvider({
        clock,
        scenario: () => scenario.current,
        ...(options.script === undefined ? {} : { script: options.script }),
        ...(options.fakeCapabilities === undefined ? {} : { capabilities: options.fakeCapabilities }),
    });
    const controlled = createControlledAdapter('controlled');
    const setup = createProviderSetup({ clock, adapters: [fake, controlled.adapter] });
    const ui = createFakeOrchestratorUi();
    const model: World['model'] = { current: undefined };
    const workingDirectory: World['workingDirectory'] = { current: 'C:/project' };
    const specs: ShellModelSource = {
        current: () => model.current,
        updatedAt: () => '',
        onDidChange: () => ({ dispose: () => undefined }),
    };
    const orchestrator = createOrchestrator({
        session,
        registry: setup.registry,
        providers: options.wrapProviders === undefined ? setup.service : options.wrapProviders(setup.service),
        specs,
        ui,
        clock,
        workingDirectory: () => workingDirectory.current,
    });
    const world: World = {
        clock,
        backing,
        store,
        session,
        setup,
        fake,
        controlled,
        ui,
        orchestrator,
        model,
        workingDirectory,
        scenario,
        openStoreOn: (target = backing) => open(target),
        async reopen() {
            await world.store.dispose();
            world.store = await open(backing);
            session.use(world.store);
            return world.store;
        },
        async setSpecs(specs) {
            const files: Record<string, string> = {};
            for (const spec of specs) {
                files[`.specs/${spec.folder}/${spec.stem}.md`] = specText({ status: spec.status ?? (spec.folder === 'done' ? 'Implemented' : spec.folder === 'active' ? 'In Progress' : 'Draft') });
            }
            const project = await readMemory(files);
            model.current = { project, lifecycle: deriveLifecycle(project) };
        },
        async advance(milliseconds) {
            clock.advance(milliseconds);
            await orchestrator.whenIdle();
        },
        request: (overrides = {}) => ({
            stem: SPEC.stem,
            path: SPEC.path,
            providerId: 'fake',
            model: 'not available',
            prompt: 'Implement the spec.',
            workingDirectory: 'C:/project',
            ...overrides,
        }),
        async runOf(runId) {
            const found = await world.store.getRun(runId);
            if (!found.available || found.value === undefined) {
                throw new Error(`run ${runId} not found`);
            }
            return found.value;
        },
        async runs() {
            const found = await world.store.listRuns();
            return found.available ? found.value : [];
        },
        async statusesOf(runId) {
            return (await world.runOf(runId)).statusHistory.map((entry) => entry.status);
        },
        async eventKinds(runId) {
            const events = await world.store.readEvents(runId, 0, 500);
            return events.available ? events.value.map((event) => event.type) : [];
        },
        fakeCalls: () => fake.calls().map((call) => call.operation),
    };
    return world;
}
