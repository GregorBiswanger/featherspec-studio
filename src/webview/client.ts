import { DEFAULT_AREA, type AreaId } from '../shared/protocol/areas';
import { PROTOCOL_VERSION, readEnvelope, type Envelope } from '../shared/protocol/envelope';
import {
    isResponsePayload,
    isShellEventPayload,
    type ActionId,
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
    subscribe(listener: () => void): () => void;
    getSnapshot(): ClientSnapshot;
}

export const HELLO_TIMEOUT_MS = 5000;

export interface ClientDeps {
    post: (message: Envelope) => void;
    reloaded?: boolean;
    helloTimeoutMs?: number;
}

export function createClient(deps: ClientDeps): ShellClient {
    const listeners = new Set<() => void>();
    let view: ShellView | undefined;
    let lastSeq = 0;
    let nextId = 0;
    let localArea: { area: AreaId; id: string } | undefined;
    let snapshot: ClientSnapshot = { view: undefined, state: { id: 'S4' }, area: DEFAULT_AREA };
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
        if (snapshot.view === view && snapshot.area === area && JSON.stringify(snapshot.state) === JSON.stringify(state)) {
            return;
        }
        snapshot = { view, state, area };
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
            if (envelope.kind === 'evt' && envelope.type === 'shell') {
                onShellEvent(envelope);
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
        subscribe(listener) {
            listeners.add(listener);
            return () => void listeners.delete(listener);
        },
        getSnapshot: () => snapshot,
    };
    return api;
}
