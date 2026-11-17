import type { NavigationRequest } from '../../../shared/protocol/messages';
import type { AgentCenterView, DetailView } from '../../../shared/protocol/agentCenter';
import type { Disposable } from '../../ports/host';
import type { UiMemoryPort } from '../../ports/shell';
import type { AgentCenterStore } from '../../ports/agentCenter';
import type { RunView, StoredEvent, StatusReport } from '../../runtime/model';
import type { RuntimeStore } from '../../runtime/runtimeStore';
import { createWorld, SPEC, type World, type WorldOptions } from '../../orchestrator/testing/world';
import type { ApprovalAnswer } from '../../ports/agentProvider';
import type { AgentCenterOrchestrator } from '../../ports/agentCenter';
import type { EntryKind } from '../../ports/readOnlyFileSystem';
import type { AnswerResult, Resumability, ResumeResult, StopResult } from '../../orchestrator/orchestrator';
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

export interface RecordingOrchestrator extends AgentCenterOrchestrator {
    calls: { op: string; args: unknown[] }[];
    answers: { approval: AnswerResult; input: AnswerResult; stop: StopResult; resumability: Resumability; resume: ResumeResult };
    gate: { approval: Promise<void> | undefined };
}

export function createRecordingOrchestrator(): RecordingOrchestrator {
    const recorder: RecordingOrchestrator = {
        calls: [],
        answers: { approval: { kind: 'ok' }, input: { kind: 'ok' }, stop: { kind: 'stopping' }, resumability: { resumable: false, reason: 'not resumable' }, resume: { kind: 'declined' } },
        gate: { approval: undefined },
        async stop(runId) {
            recorder.calls.push({ op: 'stop', args: [runId] });
            return recorder.answers.stop;
        },
        async resumability(runId) {
            recorder.calls.push({ op: 'resumability', args: [runId] });
            return recorder.answers.resumability;
        },
        async resume(runId) {
            recorder.calls.push({ op: 'resume', args: [runId] });
            return recorder.answers.resume;
        },
        async respondToApproval(runId, requestId, answer: ApprovalAnswer) {
            recorder.calls.push({ op: 'approval', args: [runId, requestId, answer] });
            await recorder.gate.approval;
            return recorder.answers.approval;
        },
        async respondToInput(runId, requestId, text) {
            recorder.calls.push({ op: 'input', args: [runId, requestId, text] });
            return recorder.answers.input;
        },
    };
    return recorder;
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
    recorder: RecordingOrchestrator;
    confirmations: { text: string; button: string }[];
    confirmAnswer: { current: boolean };
    files: Map<string, EntryKind>;
    opened: { root: string; key: string }[];
    useRealOrchestrator: { current: boolean };
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
    const recorder = createRecordingOrchestrator();
    const confirmations: CenterWorld['confirmations'] = [];
    const confirmAnswer = { current: true };
    const files = new Map<string, EntryKind>();
    const opened: CenterWorld['opened'] = [];
    const useRealOrchestrator = { current: false };
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
            orchestrator: {
                stop: (runId) => (useRealOrchestrator.current ? world.orchestrator.stop(runId) : recorder.stop(runId)),
                resumability: (runId) => (useRealOrchestrator.current ? world.orchestrator.resumability(runId) : recorder.resumability(runId)),
                resume: (runId) => (useRealOrchestrator.current ? world.orchestrator.resume(runId) : recorder.resume(runId)),
                respondToApproval: (runId, requestId, answer) =>
                    useRealOrchestrator.current ? world.orchestrator.respondToApproval(runId, requestId, answer) : recorder.respondToApproval(runId, requestId, answer),
                respondToInput: (runId, requestId, text) =>
                    useRealOrchestrator.current ? world.orchestrator.respondToInput(runId, requestId, text) : recorder.respondToInput(runId, requestId, text),
            },
            ui: {
                async confirm(text, button) {
                    confirmations.push({ text, button });
                    return confirmAnswer.current;
                },
            },
            files: { stat: async (_root, key) => files.get(key) },
            editor: {
                async open(root, key) {
                    opened.push({ root, key });
                    return 'opened';
                },
            },
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
        recorder,
        confirmations,
        confirmAnswer,
        files,
        opened,
        useRealOrchestrator,
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
