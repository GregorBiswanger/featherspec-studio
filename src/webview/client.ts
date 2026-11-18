import type { Probe } from './probe';
import { DEFAULT_AREA, type AreaId } from '../shared/protocol/areas';
import { PROTOCOL_VERSION, readEnvelope, type Envelope } from '../shared/protocol/envelope';
import type { BoardView, SortKey } from '../shared/protocol/board';
import type { BoardFilter, BoardState } from '../shared/protocol/boardFilter';
import { isSendResultEventPayload, type SendPromptPayload, type SendResultEventPayload } from '../shared/protocol/assistant';
import { isOpenFileResultPayload, type DetailView } from '../shared/protocol/detail';
import type { OverviewView } from '../shared/protocol/overview';
import {
    isBoardEventPayload,
    isCopyResultEventPayload,
    isDetailEventPayload,
    isOverviewEventPayload,
    isProbePayload,
    isResponsePayload,
    isShellEventPayload,
    type ActionId,
    type CopyResultEventPayload,
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
    overview: OverviewView | undefined;
    fileResult: { key: string; text: string } | undefined;
    copyResult: CopyResultEventPayload | undefined;
    sendResult: SendResultEventPayload | undefined;
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
    clearSelection(): void;
    setSideWidth(fraction: number): void;
    resetSideWidth(): void;
    runAction(action: ActionId): void;
    dismissNotice(): void;
    setBoardSort(sort: SortKey): void;
    setBoardDone(expanded: boolean): void;
    clearBoardFilters(): void;
    setActivityOpen(open: boolean): void;
    openFile(key: string, line?: number): void;
    copyText(text: string): void;
    sendPrompt(request: SendPromptPayload): void;
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
    let overview: OverviewView | undefined;
    let fileResult: { key: string; text: string } | undefined;
    let copyResult: CopyResultEventPayload | undefined;
    let sendResult: SendResultEventPayload | undefined;
    let snapshot: ClientSnapshot = { view: undefined, state: { id: 'S4' }, area: DEFAULT_AREA, board: undefined, detail: undefined, overview: undefined, fileResult: undefined, copyResult: undefined, sendResult: undefined };
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
            snapshot.overview === overview &&
            snapshot.fileResult === fileResult &&
            snapshot.copyResult === copyResult &&
            snapshot.sendResult === sendResult &&
            JSON.stringify(snapshot.state) === JSON.stringify(state)
        ) {
            return;
        }
        snapshot = { view, state, area, board, detail, overview, fileResult, copyResult, sendResult };
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
                    if (detail?.kind !== 'spec' || envelope.payload.view.kind !== 'spec' || detail.key !== envelope.payload.view.key) {
                        copyResult = undefined;
                        sendResult = undefined;
                    }
                    detail = envelope.payload.view;
                    fileResult = undefined;
                    refresh();
                }
            } else if (envelope.kind === 'evt' && envelope.type === 'overview') {
                if (isOverviewEventPayload(envelope.payload)) {
                    overview = envelope.payload.view;
                    refresh();
                }
            } else if (envelope.kind === 'evt' && envelope.type === 'copyResult') {
                if (isCopyResultEventPayload(envelope.payload)) {
                    copyResult = envelope.payload;
                    refresh();
                }
            } else if (envelope.kind === 'evt' && envelope.type === 'sendResult') {
                if (isSendResultEventPayload(envelope.payload)) {
                    sendResult = envelope.payload;
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
        clearSelection() {
            send('clearSelection', {});
        },
        setSideWidth(fraction) {
            send('setSideWidth', { fraction });
        },
        resetSideWidth() {
            send('resetSideWidth', {});
        },
        runAction(action) {
            send('runAction', { action });
        },
        dismissNotice() {
            send('dismissNotice', {});
        },
        setBoardDone(expanded) {
            send('boardSetDone', { expanded });
        },
        setBoardSort(sort) {
            send('boardSetSort', { sort });
        },
        setActivityOpen(open) {
            send('overviewSetActivity', { open });
        },
        clearBoardFilters() {
            send('boardClearFilters', {});
        },
        copyText(text) {
            send('copyText', { text });
        },
        sendPrompt(request) {
            send('sendPrompt', request);
        },
        openFile(key, line) {
            send('openFile', line === undefined ? { key } : { key, line });
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => void listeners.delete(listener);
        },
        getSnapshot: () => snapshot,
    };
    return api;
}
