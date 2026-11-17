import type { Probe } from './probe';
import { DEFAULT_AREA, type AreaId } from '../shared/protocol/areas';
import { PROTOCOL_VERSION, readEnvelope, type Envelope } from '../shared/protocol/envelope';
import type { BoardView, MoveResult, SortKey } from '../shared/protocol/board';
import type { BoardFilter, BoardState } from '../shared/protocol/boardFilter';
import { isOpenFileResultPayload, type DetailView } from '../shared/protocol/detail';
import type { MissionControlView } from '../shared/protocol/missionControl';
import type { AgentStartView } from '../shared/protocol/agentStart';
import type { AgentCenterView, TimelinePayload } from '../shared/protocol/agentCenter';
import {
    isAgentCenterEventPayload,
    isAgentCenterTimelineEventPayload,
    isAgentStartEventPayload,
    isBoardEventPayload,
    isDetailEventPayload,
    isMissionControlEventPayload,
    isMoveResultEventPayload,
    isProbePayload,
    isResponsePayload,
    isShellEventPayload,
    type ActionId,
    type AgentCenterAnswer,
    type NavigationRequest,
    type PanelState,
    type RequestPayloads,
    type RequestType,
    type ShellView,
} from '../shared/protocol/messages';

export interface ClientSnapshot {
    view: ShellView | undefined;
    state: PanelState | undefined;
    area: AreaId;
    board: BoardView | undefined;
    detail: DetailView | undefined;
    missionControl: MissionControlView | undefined;
    agentStart: AgentStartView | undefined;
    agentCenter: AgentCenterView | undefined;
    agentCenterTimeline: TimelinePayload | undefined;
    move: MoveResult;
    fileResult: { key: string; text: string } | undefined;
}

export interface SpecReference {
    stem: string;
    path?: string;
}

export interface ShellClient {
    start(): void;
    stop(): void;
    receive(raw: unknown): void;
    navigate(request: NavigationRequest): void;
    select(reference: SpecReference): void;
    runAction(action: ActionId): void;
    dismissNotice(): void;
    setBoardFilter(filter: BoardFilter): void;
    setBoardSort(sort: SortKey): void;
    clearBoardFilters(): void;
    focusCard(key: string | null): void;
    requestMove(key: string, target: BoardState): void;
    openFile(key: string, line?: number): void;
    dismissMove(): void;
    confirmStart(token: string): void;
    cancelStart(token: string): void;
    dismissStart(which: 'refusal' | 'notice'): void;
    acSelect(runId: string): void;
    acClearFilter(): void;
    acLoadEarlier(runId: string): void;
    acFollow(runId: string, on: boolean): void;
    acAnswer(runId: string, requestId: string, answer: AgentCenterAnswer): void;
    acCancel(runId: string): void;
    acResume(runId: string): void;
    acOpenFile(runId: string, path: string): void;
    subscribe(listener: () => void): () => void;
    getSnapshot(): ClientSnapshot;
}

export const HELLO_TIMEOUT_MS = 5000;

export interface ClientDeps {
    post: (message: Envelope) => void;
    probe?: Probe;
    reloaded?: boolean;
    helloTimeoutMs?: number;
}

export function createClient(deps: ClientDeps): ShellClient {
    const listeners = new Set<() => void>();
    let view: ShellView | undefined;
    let lastSeq = 0;
    let nextId = 0;
    let localArea: { area: AreaId; id: string } | undefined;
    let board: BoardView | undefined;
    let detail: DetailView | undefined;
    let missionControl: MissionControlView | undefined;
    let agentStart: AgentStartView | undefined;
    let agentCenter: AgentCenterView | undefined;
    let agentCenterTimeline: TimelinePayload | undefined;
    let move: MoveResult = { kind: 'none' };
    let fileResult: { key: string; text: string } | undefined;
    let snapshot: ClientSnapshot = { view: undefined, state: { id: 'S4' }, area: DEFAULT_AREA, board: undefined, detail: undefined, missionControl: undefined, agentStart: undefined, agentCenter: undefined, agentCenterTimeline: undefined, move, fileResult: undefined };
    let unlisten: (() => void) | undefined;
    let mismatch = false;
    let protocolFailure = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function effectiveState(): PanelState | undefined {
        if (mismatch) {
            return deps.reloaded === true ? { id: 'S5', reason: { cause: 'protocol' } } : { id: 'S6' };
        }
        if (protocolFailure) {
            return { id: 'S5', reason: { cause: 'protocol' } };
        }
        return view === undefined ? { id: 'S4' } : view.state;
    }

    function refresh(): void {
        const area = localArea?.area ?? view?.area ?? DEFAULT_AREA;
        const state = effectiveState();
        if (
            snapshot.view === view &&
            snapshot.area === area &&
            snapshot.board === board &&
            snapshot.detail === detail &&
            snapshot.missionControl === missionControl &&
            snapshot.agentStart === agentStart &&
            snapshot.agentCenter === agentCenter &&
            snapshot.agentCenterTimeline === agentCenterTimeline &&
            snapshot.move === move &&
            snapshot.fileResult === fileResult &&
            JSON.stringify(snapshot.state) === JSON.stringify(state)
        ) {
            return;
        }
        snapshot = { view, state, area, board, detail, missionControl, agentStart, agentCenter, agentCenterTimeline, move, fileResult };
        listeners.forEach((listener) => listener());
    }

    function send<Type extends RequestType>(type: Type, payload: RequestPayloads[Type]): string {
        nextId += 1;
        const id = `q${nextId}`;
        deps.post({ v: PROTOCOL_VERSION, kind: 'req', id, type, payload });
        return id;
    }

    function onShellEvent(envelope: Envelope): void {
        if (!isShellEventPayload(envelope.payload) || envelope.seq === undefined) {
            protocolFailure = true;
            refresh();
            return;
        }
        if (envelope.seq <= lastSeq) {
            return;
        }
        protocolFailure = false;
        clearTimer();
        const gap = envelope.seq > lastSeq + 1;
        const previous = lastSeq;
        lastSeq = envelope.seq;
        view = envelope.payload.view;
        refresh();
        if (gap) {
            send('hello', { lastSeq: previous });
        }
    }

    function clearTimer(): void {
        if (timer !== undefined) {
            clearTimeout(timer);
            timer = undefined;
        }
    }

    function onProbe(envelope: Envelope): void {
        if (deps.probe === undefined || !isProbePayload(envelope.payload)) {
            return;
        }
        void deps.probe(envelope.payload.url).then((outcome) => {
            nextId += 1;
            deps.post({ v: PROTOCOL_VERSION, kind: 'req', id: `q${nextId}`, type: 'probeResult', payload: { outcome } });
        });
    }

    function onResponse(envelope: Envelope): void {
        if (isResponsePayload(envelope.payload) && localArea !== undefined && envelope.id === localArea.id) {
            localArea = undefined;
            refresh();
        }
    }

    const api: ShellClient = {
        start() {
            const handler = (event: MessageEvent) => api.receive(event.data);
            window.addEventListener('message', handler);
            unlisten = () => window.removeEventListener('message', handler);
            send('hello', { lastSeq });
            timer = setTimeout(() => {
                timer = undefined;
                if (view === undefined) {
                    protocolFailure = true;
                    refresh();
                }
            }, deps.helloTimeoutMs ?? HELLO_TIMEOUT_MS);
        },
        stop() {
            clearTimer();
            unlisten?.();
            unlisten = undefined;
        },
        receive(raw) {
            const read = readEnvelope(raw);
            if (!read.ok) {
                return;
            }
            const { envelope } = read;
            if (envelope.v !== PROTOCOL_VERSION || (envelope.kind === 'evt' && envelope.type === 'versionMismatch')) {
                mismatch = true;
                refresh();
                return;
            }
            if (envelope.kind === 'evt' && envelope.type === 'probe') {
                onProbe(envelope);
            } else if (envelope.kind === 'evt' && envelope.type === 'shell') {
                onShellEvent(envelope);
            } else if (envelope.kind === 'evt' && envelope.type === 'board') {
                if (isBoardEventPayload(envelope.payload)) {
                    board = envelope.payload.view;
                    refresh();
                }
            } else if (envelope.kind === 'evt' && envelope.type === 'detail') {
                if (isDetailEventPayload(envelope.payload)) {
                    detail = envelope.payload.view;
                    fileResult = undefined;
                    refresh();
                }
            } else if (envelope.kind === 'evt' && envelope.type === 'missionControl') {
                if (isMissionControlEventPayload(envelope.payload)) {
                    missionControl = envelope.payload.view;
                    refresh();
                }
            } else if (envelope.kind === 'evt' && envelope.type === 'agentStart') {
                if (isAgentStartEventPayload(envelope.payload)) {
                    agentStart = envelope.payload.view;
                    refresh();
                }
            } else if (envelope.kind === 'evt' && envelope.type === 'agentCenter') {
                if (isAgentCenterEventPayload(envelope.payload)) {
                    agentCenter = envelope.payload.view;
                    refresh();
                }
            } else if (envelope.kind === 'evt' && envelope.type === 'agentCenterTimeline') {
                if (isAgentCenterTimelineEventPayload(envelope.payload)) {
                    agentCenterTimeline = envelope.payload;
                    refresh();
                }
            } else if (envelope.kind === 'evt' && envelope.type === 'moveResult') {
                if (isMoveResultEventPayload(envelope.payload)) {
                    move = envelope.payload.result;
                    refresh();
                }
            } else if (envelope.kind === 'evt' && envelope.type === 'openFileResult') {
                if (isOpenFileResultPayload(envelope.payload)) {
                    fileResult = envelope.payload;
                    refresh();
                }
            } else if (envelope.kind === 'res') {
                onResponse(envelope);
            }
        },
        navigate(request) {
            const id = send('navigate', request);
            localArea = { area: request.area, id };
            refresh();
        },
        select(reference) {
            send('select', reference);
        },
        runAction(action) {
            send('runAction', { action });
        },
        dismissNotice() {
            send('dismissNotice', {});
        },
        setBoardFilter(filter) {
            send('boardSetFilter', { filter });
        },
        setBoardSort(sort) {
            send('boardSetSort', { sort });
        },
        clearBoardFilters() {
            send('boardClearFilters', {});
        },
        focusCard(key) {
            send('boardFocus', { key });
        },
        requestMove(key, target) {
            send('moveRequest', { key, target });
        },
        openFile(key, line) {
            send('openFile', line === undefined ? { key } : { key, line });
        },
        dismissMove() {
            move = { kind: 'none' };
            refresh();
        },
        confirmStart(token) {
            send('agentStartConfirm', { token });
        },
        cancelStart(token) {
            send('agentStartCancel', { token });
        },
        dismissStart(which) {
            send('agentStartDismiss', { which });
        },
        acSelect(runId) {
            send('acSelect', { runId });
        },
        acClearFilter() {
            send('acClearFilter', {});
        },
        acLoadEarlier(runId) {
            send('acLoadEarlier', { runId });
        },
        acFollow(runId, on) {
            send('acFollow', { runId, on });
        },
        acAnswer(runId, requestId, answer) {
            send('acAnswer', { runId, requestId, answer });
        },
        acCancel(runId) {
            send('acCancel', { runId });
        },
        acResume(runId) {
            send('acResume', { runId });
        },
        acOpenFile(runId, path) {
            send('acOpenFile', { runId, path });
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => void listeners.delete(listener);
        },
        getSnapshot: () => snapshot,
    };
    return api;
}
