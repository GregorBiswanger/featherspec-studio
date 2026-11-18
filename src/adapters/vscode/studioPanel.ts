import { randomBytes } from 'node:crypto';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { OutputPort } from '../../core/ports/host';
import { createMessageRouter, type RequestHandlers } from '../../core/shell/messageRouter';
import type { ShellService } from '../../core/shell/shellService';
import type { BoardView } from '../../shared/protocol/board';
import type { DetailView, OpenFileResultPayload } from '../../shared/protocol/detail';
import type { OverviewView } from '../../shared/protocol/overview';
import { PROTOCOL_VERSION, readEnvelope, type Envelope } from '../../shared/protocol/envelope';
import { isProbeResultPayload, type BoardRequestType, type CopyResultEventPayload, type OverviewRequestType, type ProbeOutcome } from '../../shared/protocol/messages';
import { createProbeChannel } from './probeChannel';
import { buildWebviewHtml } from './webviewHtml';

export const VIEW_TYPE = 'featherspecStudio.main';
const PROBE_HELLO_TIMEOUT_MS = 20_000;
const PROBE_ANSWER_TIMEOUT_MS = 20_000;

export interface PanelBoard {
    handlers: Pick<RequestHandlers, BoardRequestType>;
    view(): BoardView | undefined;
    detail(): DetailView;
    onDidChangeView(listener: (view: BoardView | undefined) => void): vscode.Disposable;
    onDidChangeDetail(listener: (view: DetailView) => void): vscode.Disposable;
    onDidOpenFileResult(listener: (result: OpenFileResultPayload) => void): vscode.Disposable;
    onDidCopyResult(listener: (result: CopyResultEventPayload) => void): vscode.Disposable;
    panelClosed(): void;
}

export interface PanelOverview {
    handlers: Pick<RequestHandlers, OverviewRequestType>;
    view(): OverviewView | undefined;
    onDidChangeView(listener: (view: OverviewView | undefined) => void): vscode.Disposable;
}

export interface StudioPanelDeps {
    extensionUri: vscode.Uri;
    service: ShellService;
    board: PanelBoard;
    overview: PanelOverview;
    output: OutputPort;
    testMode: boolean;
}

export interface StudioPanelInspection {
    options: vscode.WebviewOptions;
    panelOptions: vscode.WebviewPanelOptions;
    html: string;
    icon: { light: string; dark: string } | undefined;
}

const TAB_ICON = { light: 'studio-light.svg', dark: 'studio-dark.svg' } as const;

function iconFileNames(icon: vscode.WebviewPanel['iconPath']): { light: string; dark: string } | undefined {
    if (icon === undefined || icon instanceof vscode.Uri || icon instanceof vscode.ThemeIcon) {
        return undefined;
    }
    return { light: path.posix.basename(icon.light.path), dark: path.posix.basename(icon.dark.path) };
}

export interface StudioShowOptions {
    preserveFocus?: boolean;
}

export interface StudioPanel extends vscode.Disposable {
    show(options?: StudioShowOptions): void;
    reload(): void;
    panelCount(): number;
    closePanel(): void;
    lastHelloAt(): number | undefined;
    probe(url: string): Promise<ProbeOutcome>;
    isFocused(): boolean;
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
    const probeChannel = createProbeChannel({
        send: (url) => post({ v: PROTOCOL_VERSION, kind: 'evt', type: 'probe', payload: { url } }),
        helloTimeoutMs: PROBE_HELLO_TIMEOUT_MS,
        answerTimeoutMs: PROBE_ANSWER_TIMEOUT_MS,
        describe: () =>
            `panel open: ${panel !== undefined}, visible: ${panel?.visible}, active: ${panel?.active}, last hello ${helloAt === undefined ? 'never' : `${Date.now() - helloAt} ms ago`}`,
    });
    const assets = vscode.Uri.joinPath(deps.extensionUri, 'dist', 'webview');

    function options(): vscode.WebviewOptions {
        return { enableScripts: true, enableCommandUris: false, localResourceRoots: [assets] };
    }

    function render(target: vscode.WebviewPanel): void {
        const webview = target.webview;
        probeChannel.markNotReady();
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

    function pushOverview(view: OverviewView | undefined): void {
        if (view !== undefined) {
            post({ v: PROTOCOL_VERSION, kind: 'evt', type: 'overview', payload: { view } });
        }
    }

    function pushDetail(view: DetailView): void {
        post({ v: PROTOCOL_VERSION, kind: 'evt', type: 'detail', payload: { view } });
    }

    const router = createMessageRouter({
        handlers: {
            ...deps.board.handlers,
            ...deps.service.handlers,
            ...deps.overview.handlers,
            hello: async (payload) => {
                helloAt = Date.now();
                pushView(payload.lastSeq);
                pushBoard(deps.board.view());
                pushOverview(deps.overview.view());
                pushDetail(deps.board.detail());
                probeChannel.markReady();
            },
        },
        output: deps.output,
        post,
    });

    function handle(raw: unknown): void {
        if (deps.testMode) {
            const read = readEnvelope(raw);
            if (read.ok && read.envelope.type === 'probeResult' && isProbeResultPayload(read.envelope.payload)) {
                probeChannel.answer(read.envelope.payload.outcome);
                return;
            }
        }
        void router.receive(raw);
    }

    function adopt(target: vscode.WebviewPanel): void {
        panel = target;
        target.iconPath = {
            light: vscode.Uri.joinPath(deps.extensionUri, 'media', TAB_ICON.light),
            dark: vscode.Uri.joinPath(deps.extensionUri, 'media', TAB_ICON.dark),
        };
        target.webview.options = options();
        subscriptions = [
            target.webview.onDidReceiveMessage(handle),
            deps.service.onDidChangeView(() => pushView()),
            deps.board.onDidChangeView(pushBoard),
            deps.overview.onDidChangeView(pushOverview),
            deps.board.onDidChangeDetail(pushDetail),
            deps.board.onDidOpenFileResult((payload) => post({ v: PROTOCOL_VERSION, kind: 'evt', type: 'openFileResult', payload })),
            deps.board.onDidCopyResult((payload) => post({ v: PROTOCOL_VERSION, kind: 'evt', type: 'copyResult', payload })),
            target.onDidDispose(() => {
                subscriptions.forEach((subscription) => subscription.dispose());
                subscriptions = [];
                panel = undefined;
                probeChannel.markNotReady();
                deps.board.panelClosed();
            }),
        ];
    }

    return {
        show(showOptions) {
            const preserveFocus = showOptions?.preserveFocus === true;
            if (panel !== undefined) {
                panel.reveal(panel.viewColumn ?? vscode.ViewColumn.Active, preserveFocus);
                return;
            }
            reloaded = false;
            const created = vscode.window.createWebviewPanel(VIEW_TYPE, 'FeatherSpec Studio', { viewColumn: vscode.ViewColumn.Active, preserveFocus }, options());
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
        closePanel: () => panel?.dispose(),
        lastHelloAt: () => helloAt,
        probe(url) {
            if (!deps.testMode) {
                return Promise.reject(new Error('The probe exists only in test mode'));
            }
            if (panel === undefined) {
                return Promise.reject(new Error('No Studio panel is open'));
            }
            return probeChannel.probe(url);
        },
        isFocused: () => panel !== undefined && panel.visible && panel.active,
        asWebviewUri: (uri) => panel?.webview.asWebviewUri(uri).toString(),
        inspect: () => (panel === undefined ? undefined : { options: panel.webview.options, panelOptions: panel.options, html: panel.webview.html, icon: iconFileNames(panel.iconPath) }),
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
            deps.board.panelClosed();
        },
    };
}
