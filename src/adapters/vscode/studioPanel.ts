import { randomBytes } from 'node:crypto';
import * as vscode from 'vscode';
import type { OutputPort } from '../../core/ports/host';
import { createMessageRouter, type RequestHandlers } from '../../core/shell/messageRouter';
import type { ShellService } from '../../core/shell/shellService';
import type { BoardView, MoveResult } from '../../shared/protocol/board';
import type { DetailView, OpenFileResultPayload } from '../../shared/protocol/detail';
import type { MissionControlView } from '../../shared/protocol/missionControl';
import { PROTOCOL_VERSION, readEnvelope, type Envelope } from '../../shared/protocol/envelope';
import { isProbeResultPayload, type BoardRequestType, type ProbeOutcome } from '../../shared/protocol/messages';
import { buildWebviewHtml } from './webviewHtml';

export const VIEW_TYPE = 'featherspecStudio.main';
const PROBE_TIMEOUT_MS = 5000;

export interface PanelBoard {
    handlers: Pick<RequestHandlers, BoardRequestType>;
    view(): BoardView | undefined;
    detail(): DetailView;
    onDidChangeView(listener: (view: BoardView | undefined) => void): vscode.Disposable;
    onDidChangeDetail(listener: (view: DetailView) => void): vscode.Disposable;
    onDidMoveResult(listener: (result: MoveResult) => void): vscode.Disposable;
    onDidOpenFileResult(listener: (result: OpenFileResultPayload) => void): vscode.Disposable;
    panelClosed(): void;
}

export interface PanelMissionControl {
    view(): MissionControlView | undefined;
    onDidChangeView(listener: (view: MissionControlView | undefined) => void): vscode.Disposable;
}

export interface StudioPanelDeps {
    extensionUri: vscode.Uri;
    service: ShellService;
    board: PanelBoard;
    missionControl: PanelMissionControl;
    output: OutputPort;
    testMode: boolean;
}

export interface StudioPanelInspection {
    options: vscode.WebviewOptions;
    panelOptions: vscode.WebviewPanelOptions;
    html: string;
}

export interface StudioPanel extends vscode.Disposable {
    show(): void;
    reload(): void;
    panelCount(): number;
    lastHelloAt(): number | undefined;
    probe(url: string): Promise<ProbeOutcome>;
    showMoveResult(result: MoveResult): boolean;
    asWebviewUri(uri: vscode.Uri): string | undefined;
    inspect(): StudioPanelInspection | undefined;
    serializer: vscode.WebviewPanelSerializer;
}

export function createStudioPanel(deps: StudioPanelDeps): StudioPanel {
    let panel: vscode.WebviewPanel | undefined;
    let subscriptions: vscode.Disposable[] = [];
    let seq = 0;
    let reloaded = false;
    let helloAt: number | undefined;
    let lastMove: MoveResult | undefined;
    let pendingProbe: ((outcome: ProbeOutcome) => void) | undefined;
    const assets = vscode.Uri.joinPath(deps.extensionUri, 'dist', 'webview');

    function options(): vscode.WebviewOptions {
        return { enableScripts: true, enableCommandUris: false, localResourceRoots: [assets] };
    }

    function render(target: vscode.WebviewPanel): void {
        const webview = target.webview;
        webview.html = buildWebviewHtml({
            cspSource: webview.cspSource,
            nonce: randomBytes(16).toString('base64url'),
            scriptUri: webview.asWebviewUri(vscode.Uri.joinPath(assets, 'main.js')).toString(),
            styleUri: webview.asWebviewUri(vscode.Uri.joinPath(assets, 'main.css')).toString(),
            reloaded,
            test: deps.testMode,
        });
    }

    function post(message: Envelope): void {
        void panel?.webview.postMessage(message);
    }

    function pushView(floor = 0): void {
        seq = Math.max(seq, floor) + 1;
        post({ v: PROTOCOL_VERSION, kind: 'evt', seq, type: 'shell', payload: { view: deps.service.view() } });
    }

    function pushBoard(view: BoardView | undefined): void {
        if (view !== undefined) {
            post({ v: PROTOCOL_VERSION, kind: 'evt', type: 'board', payload: { view } });
        }
    }

    function pushMissionControl(view: MissionControlView | undefined): void {
        if (view !== undefined) {
            post({ v: PROTOCOL_VERSION, kind: 'evt', type: 'missionControl', payload: { view } });
        }
    }

    function pushDetail(view: DetailView): void {
        post({ v: PROTOCOL_VERSION, kind: 'evt', type: 'detail', payload: { view } });
    }

    function pushMove(result: MoveResult): void {
        lastMove = result.kind === 'none' ? undefined : result;
        post({ v: PROTOCOL_VERSION, kind: 'evt', type: 'moveResult', payload: { result } });
    }

    const router = createMessageRouter({
        handlers: {
            ...deps.board.handlers,
            ...deps.service.handlers,
            hello: async (payload) => {
                helloAt = Date.now();
                pushView(payload.lastSeq);
                pushBoard(deps.board.view());
                pushMissionControl(deps.missionControl.view());
                pushDetail(deps.board.detail());
                if (lastMove !== undefined) {
                    pushMove(lastMove);
                }
            },
        },
        output: deps.output,
        post,
    });

    function handle(raw: unknown): void {
        if (deps.testMode) {
            const read = readEnvelope(raw);
            if (read.ok && read.envelope.type === 'probeResult' && isProbeResultPayload(read.envelope.payload)) {
                pendingProbe?.(read.envelope.payload.outcome);
                pendingProbe = undefined;
                return;
            }
        }
        void router.receive(raw);
    }

    function adopt(target: vscode.WebviewPanel): void {
        panel = target;
        target.webview.options = options();
        subscriptions = [
            target.webview.onDidReceiveMessage(handle),
            deps.service.onDidChangeView(() => pushView()),
            deps.board.onDidChangeView(pushBoard),
            deps.missionControl.onDidChangeView(pushMissionControl),
            deps.board.onDidChangeDetail(pushDetail),
            deps.board.onDidMoveResult(pushMove),
            deps.board.onDidOpenFileResult((payload) => post({ v: PROTOCOL_VERSION, kind: 'evt', type: 'openFileResult', payload })),
            target.onDidDispose(() => {
                subscriptions.forEach((subscription) => subscription.dispose());
                subscriptions = [];
                panel = undefined;
                lastMove = undefined;
                deps.board.panelClosed();
            }),
        ];
    }

    return {
        show() {
            if (panel !== undefined) {
                panel.reveal(panel.viewColumn ?? vscode.ViewColumn.Active);
                return;
            }
            reloaded = false;
            const created = vscode.window.createWebviewPanel(VIEW_TYPE, 'FeatherSpec Studio', vscode.ViewColumn.Active, options());
            adopt(created);
            render(created);
        },
        reload() {
            if (panel !== undefined) {
                reloaded = true;
                render(panel);
            }
        },
        panelCount: () => (panel === undefined ? 0 : 1),
        lastHelloAt: () => helloAt,
        probe(url) {
            if (!deps.testMode) {
                return Promise.reject(new Error('The probe exists only in test mode'));
            }
            if (panel === undefined) {
                return Promise.reject(new Error('No Studio panel is open'));
            }
            return new Promise<ProbeOutcome>((resolve, reject) => {
                const timer = setTimeout(() => {
                    pendingProbe = undefined;
                    reject(new Error('The probe got no answer'));
                }, PROBE_TIMEOUT_MS);
                pendingProbe = (outcome) => {
                    clearTimeout(timer);
                    resolve(outcome);
                };
                post({ v: PROTOCOL_VERSION, kind: 'evt', type: 'probe', payload: { url } });
            });
        },
        showMoveResult(result) {
            if (panel === undefined || !panel.visible || deps.service.view().area !== 'specBoard') {
                return false;
            }
            pushMove(result);
            return true;
        },
        asWebviewUri: (uri) => panel?.webview.asWebviewUri(uri).toString(),
        inspect: () => (panel === undefined ? undefined : { options: panel.webview.options, panelOptions: panel.options, html: panel.webview.html }),
        serializer: {
            async deserializeWebviewPanel(restored) {
                if (panel !== undefined) {
                    restored.dispose();
                    return;
                }
                reloaded = false;
                adopt(restored);
                render(restored);
            },
        },
        dispose() {
            subscriptions.forEach((subscription) => subscription.dispose());
            subscriptions = [];
            panel?.dispose();
            panel = undefined;
            lastMove = undefined;
            deps.board.panelClosed();
        },
    };
}
