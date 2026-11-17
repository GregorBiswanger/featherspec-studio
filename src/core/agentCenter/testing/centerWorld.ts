import type { NavigationRequest } from '../../../shared/protocol/messages';
import type { AgentCenterView, DetailView } from '../../../shared/protocol/agentCenter';
import type { Disposable } from '../../ports/host';
import type { UiMemoryPort } from '../../ports/shell';
import type { AgentCenterStore } from '../../ports/agentCenter';
import type { RunView, StoredEvent, StatusReport } from '../../runtime/model';
import type { RuntimeStore } from '../../runtime/runtimeStore';
import { createWorld, SPEC, type World, type WorldOptions } from '../../orchestrator/testing/world';
import { createAgentCenterService, type AgentCenterService } from '../agentCenterService';
import { withEventSignal } from '../eventSignal';

export interface Read {
    runId: string;
    fromSeq: number;
    size: number;
}

export function recordReads(store: RuntimeStore, reads: Read[]): RuntimeStore {
    return {
        ...store,
        async readEvents(runId, fromSeq, size) {
            reads.push({ runId, fromSeq, size });
            return store.readEvents(runId, fromSeq, size);
        },
    };
}

export interface FakeMemory extends UiMemoryPort {
    value: unknown;
}

export function createFakeMemory(initial?: unknown): FakeMemory {
    const memory: FakeMemory = {
        value: initial,
        get: () => memory.value,
        async set(value) {
            memory.value = value;
        },
    };
    return memory;
}

export interface FakeNavigation {
    port: { onDidNavigate(listener: (request: NavigationRequest) => void): Disposable };
    send(request: NavigationRequest): void;
}

export function createFakeNavigation(): FakeNavigation {
    const listeners = new Set<(request: NavigationRequest) => void>();
    return {
        port: {
            onDidNavigate(listener): Disposable {
                listeners.add(listener);
                return { dispose: () => void listeners.delete(listener) };
            },
        },
        send: (request) => [...listeners].forEach((listener) => listener(request)),
    };
}

export interface CenterWorld {
    world: World;
    reads: Read[];
    memory: FakeMemory;
    navigation: FakeNavigation;
    trust: { trusted: boolean };
    root: { current: string | undefined };
    service: AgentCenterService;
    views: AgentCenterView[];
    detail(): DetailView | undefined;
    addRun(status?: 'Starting' | 'Running', report?: StatusReport): Promise<RunView>;
    append(runId: string, type: string, payload?: Record<string, unknown>): Promise<void>;
    flush(): Promise<void>;
    makeService(memory?: FakeMemory, subscribe?: boolean): AgentCenterService;
    raw: RuntimeStore;
}

export async function createCenterWorld(options: WorldOptions = {}): Promise<CenterWorld> {
    const world = await createWorld(options);
    const reads: Read[] = [];
    const raw = world.store;
    const wrapped = recordReads(withEventSignal(world.store), reads);
    world.store = wrapped;
    world.session.use(wrapped);
    await world.setSpecs([{ folder: 'active', stem: SPEC.stem }]);
    const memory = createFakeMemory();
    const navigation = createFakeNavigation();
    const trust = { trusted: true };
    const root: CenterWorld['root'] = { current: 'memory://project' };
    const views: AgentCenterView[] = [];
    function makeService(useMemory: FakeMemory = memory, subscribe = true): AgentCenterService {
        const created = createAgentCenterService({
            session: {
                current: () => world.session.current() as AgentCenterStore | undefined,
                state: () => world.session.state(),
                onDidChangeState: (listener) => world.session.onDidChangeState(listener),
            },
            providers: world.setup.registry,
            source: { current: () => world.model.current, updatedAt: () => '', onDidChange: () => ({ dispose: () => undefined }) },
            memory: useMemory,
            discovery: { snapshot: () => ({ result: undefined, active: root.current === undefined ? undefined : ({ root: root.current } as never), remembered: undefined, failure: undefined }) },
            navigation: navigation.port,
            trust: { isTrusted: () => trust.trusted },
        });
        if (subscribe) {
            created.onDidChangeView((view) => view !== undefined && views.push(view));
            created.onDidChangeTimeline(() => undefined);
        }
        return created;
    }
    const service = makeService();
    const center: CenterWorld = {
        world,
        reads,
        memory,
        navigation,
        trust,
        root,
        service,
        views,
        detail() {
            const view = service.view();
            return view?.kind === 'ready' ? view.detail : undefined;
        },
        async addRun(status = 'Running', report) {
            const created = await world.store.createRun({ providerId: 'fake', spec: SPEC });
            return world.store.reportStatus(created.runId, status, report);
        },
        async append(runId, type, payload = {}) {
            await world.store.appendEvent(runId, { type, payload: { ...payload, source: 'provider' } as never });
        },
        async flush() {
            await service.whenIdle();
        },
        makeService,
        raw,
    };
    return center;
}

export function seqs(events: readonly StoredEvent[]): number[] {
    return events.map((event) => event.seq);
}
