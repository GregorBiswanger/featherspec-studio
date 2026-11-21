import type { Disposable, OutputPort } from '../core/ports/host';
import { createMessageRouter, type RequestHandlers } from '../core/shell/messageRouter';
import type { ShellService } from '../core/shell/shellService';
import type { BoardView } from '../shared/protocol/board';
import type { DetailView, OpenFileResultPayload } from '../shared/protocol/detail';
import type { OverviewView } from '../shared/protocol/overview';
import { PROTOCOL_VERSION, readEnvelope, type Envelope } from '../shared/protocol/envelope';
import type { SendResultEventPayload } from '../shared/protocol/assistant';
import { isProbeResultPayload, type BoardRequestType, type CopyResultEventPayload, type OverviewRequestType, type ProbeOutcome } from '../shared/protocol/messages';

export interface PanelBoard {
    handlers: Pick<RequestHandlers, BoardRequestType>;
    view(): BoardView | undefined;
    detail(): DetailView;
    onDidChangeView(listener: (view: BoardView | undefined) => void): Disposable;
    onDidChangeDetail(listener: (view: DetailView) => void): Disposable;
    onDidOpenFileResult(listener: (result: OpenFileResultPayload) => void): Disposable;
    onDidCopyResult(listener: (result: CopyResultEventPayload) => void): Disposable;
    onDidSendResult(listener: (result: SendResultEventPayload) => void): Disposable;
    panelClosed(): void;
}

export interface PanelOverview {
    handlers: Pick<RequestHandlers, OverviewRequestType>;
    view(): OverviewView | undefined;
    onDidChangeView(listener: (view: OverviewView | undefined) => void): Disposable;
}

export interface PanelSessionDeps {
    service: Pick<ShellService, 'handlers' | 'shellEvent' | 'panelReady' | 'panelGone' | 'onDidChangeView'>;
    board: PanelBoard;
    overview: PanelOverview;
    output: OutputPort;
    post(message: Envelope): void;
    testMode: boolean;
    onHello(): void;
    onProbeResult(outcome: ProbeOutcome): void;
}

export interface PanelSession {
    receive(raw: unknown): void;
    attach(): void;
    stop(): void;
    detach(): void;
    lastHelloAt(): number | undefined;
}

export function createPanelSession(deps: PanelSessionDeps): PanelSession {
    let seq = 0;
    let helloAt: number | undefined;
    let subscriptions: Disposable[] = [];

    function pushView(floor = 0): void {
        seq = Math.max(seq, floor) + 1;
        deps.post({ v: PROTOCOL_VERSION, kind: 'evt', seq, type: 'shell', payload: deps.service.shellEvent() });
    }

    function pushBoard(view: BoardView | undefined): void {
        if (view !== undefined) {
            deps.post({ v: PROTOCOL_VERSION, kind: 'evt', type: 'board', payload: { view } });
        }
    }

    function pushOverview(view: OverviewView | undefined): void {
        if (view !== undefined) {
            deps.post({ v: PROTOCOL_VERSION, kind: 'evt', type: 'overview', payload: { view } });
        }
    }

    function pushDetail(view: DetailView): void {
        deps.post({ v: PROTOCOL_VERSION, kind: 'evt', type: 'detail', payload: { view } });
    }

    const router = createMessageRouter({
        handlers: {
            ...deps.board.handlers,
            ...deps.service.handlers,
            ...deps.overview.handlers,
            hello: async (payload) => {
                helloAt = Date.now();
                deps.service.panelReady();
                pushView(payload.lastSeq);
                pushBoard(deps.board.view());
                pushOverview(deps.overview.view());
                pushDetail(deps.board.detail());
                deps.onHello();
            },
        },
        output: deps.output,
        post: deps.post,
    });

    function receive(raw: unknown): void {
        if (deps.testMode) {
            const read = readEnvelope(raw);
            if (read.ok && read.envelope.type === 'probeResult' && isProbeResultPayload(read.envelope.payload)) {
                deps.onProbeResult(read.envelope.payload.outcome);
                return;
            }
        }
        void router.receive(raw);
    }

    function attach(): void {
        subscriptions = [
            deps.service.onDidChangeView(() => pushView()),
            deps.board.onDidChangeView(pushBoard),
            deps.overview.onDidChangeView(pushOverview),
            deps.board.onDidChangeDetail(pushDetail),
            deps.board.onDidOpenFileResult((payload) => deps.post({ v: PROTOCOL_VERSION, kind: 'evt', type: 'openFileResult', payload })),
            deps.board.onDidCopyResult((payload) => deps.post({ v: PROTOCOL_VERSION, kind: 'evt', type: 'copyResult', payload })),
            deps.board.onDidSendResult((payload) => deps.post({ v: PROTOCOL_VERSION, kind: 'evt', type: 'sendResult', payload })),
        ];
    }

    function stop(): void {
        subscriptions.forEach((subscription) => subscription.dispose());
        subscriptions = [];
    }

    function detach(): void {
        stop();
        deps.service.panelGone();
        deps.board.panelClosed();
    }

    return {
        receive,
        attach,
        stop,
        detach,
        lastHelloAt: () => helloAt,
    };
}
