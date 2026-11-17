import { randomBytes } from 'node:crypto';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { OutputPort } from '../../core/ports/host';
import { createMessageRouter, type RequestHandlers } from '../../core/shell/messageRouter';
import type { ShellService } from '../../core/shell/shellService';
import type { AgentCenterView, TimelinePayload } from '../../shared/protocol/agentCenter';
import type { BoardView, MoveResult } from '../../shared/protocol/board';
import type { DetailView, OpenFileResultPayload } from '../../shared/protocol/detail';
import type { MissionControlView } from '../../shared/protocol/missionControl';
import { PROTOCOL_VERSION, readEnvelope, type Envelope } from '../../shared/protocol/envelope';
import { isProbeResultPayload, type AgentCenterRequestType, type BoardRequestType, type CopyResultEventPayload, type ProbeOutcome } from '../../shared/protocol/messages';
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
    onDidMoveResult(listener: (result: MoveResult) => void): vscode.Disposable;
    onDidOpenFileResult(listener: (result: OpenFileResultPayload) => void): vscode.Disposable;
    onDidCopyResult(listener: (result: CopyResultEventPayload) => void): vscode.Disposable;
    panelClosed(): void;
}

export interface PanelMissionControl {
    view(): MissionControlView | undefined;
    onDidChangeView(listener: (view: MissionControlView | undefined) => void): vscode.Disposable;
}

export interface PanelAgentCenter {
    handlers: Pick<RequestHandlers, AgentCenterRequestType>;
    view(): AgentCenterView | undefined;
    timeline(): TimelinePayload | undefined;
    onDidChangeView(listener: (view: AgentCenterView | undefined) => void): vscode.Disposable;
    onDidChangeTimeline(listener: (timeline: TimelinePayload | undefined) => void): vscode.Disposable;
    reread(): void;
}

export interface StudioPanelDeps {
    extensionUri: vscode.Uri;
    service: ShellService;
    board: PanelBoard;
    missionControl: PanelMissionControl;
    agentCenter?: PanelAgentCenter;
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

export interface StudioPanel extends vscode.Disposable {
    show(): void;
    reload(): void;
    panelCount(): number;
    closePanel(): void;
    lastHelloAt(): number | undefined;
    probe(url: string): Promise<ProbeOutcome>;
    showMoveResult(result: MoveResult): boolean;
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
    let lastMove: MoveResult | undefined;
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

    function pushMissionControl(view: MissionControlView | undefined): void {
        if (view !== undefined) {
            post({ v: PROTOCOL_VERSION, kind: 'evt', type: 'missionControl', payload: { view } });
        }
    }

    function pushAgentCenter(view: AgentCenterView | undefined): void {
        if (view !== undefined) {
            post({ v: PROTOCOL_VERSION, kind: 'evt', type: 'agentCenter', payload: { view } });
        }
    }

    function pushAgentCenterTimeline(timeline: TimelinePayload | undefined): void {
        if (timeline !== undefined) {
            post({ v: PROTOCOL_VERSION, kind: 'evt', type: 'agentCenterTimeline', payload: timeline });
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
            acSelect: async (payload) => deps.agentCenter?.handlers.acSelect(payload),
            acClearFilter: async (payload) => deps.agentCenter?.handlers.acClearFilter(payload),
            acLoadEarlier: async (payload) => deps.agentCenter?.handlers.acLoadEarlier(payload),
            acFollow: async (payload) => deps.agentCenter?.handlers.acFollow(payload),
            acAnswer: async (payload) => deps.agentCenter?.handlers.acAnswer(payload),
            acCancel: async (payload) => deps.agentCenter?.handlers.acCancel(payload),
            acResume: async (payload) => deps.agentCenter?.handlers.acResume(payload),
            acOpenFile: async (payload) => deps.agentCenter?.handlers.acOpenFile(payload),
            hello: async (payload) => {
                helloAt = Date.now();
                pushView(payload.lastSeq);
                pushBoard(deps.board.view());
                pushMissionControl(deps.missionControl.view());
                pushDetail(deps.board.detail());
                if (deps.agentCenter !== undefined) {
                    deps.agentCenter.reread();
                    pushAgentCenter(deps.agentCenter.view());
                    pushAgentCenterTimeline(deps.agentCenter.timeline());
                }
                if (lastMove !== undefined) {
                    pushMove(lastMove);
                }
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
            deps.missionControl.onDidChangeView(pushMissionControl),
            deps.board.onDidChangeDetail(pushDetail),
            deps.board.onDidMoveResult(pushMove),
            ...(deps.agentCenter === undefined ? [] : [deps.agentCenter.onDidChangeView(pushAgentCenter), deps.agentCenter.onDidChangeTimeline(pushAgentCenterTimeline)]),
            deps.board.onDidOpenFileResult((payload) => post({ v: PROTOCOL_VERSION, kind: 'evt', type: 'openFileResult', payload })),
            deps.board.onDidCopyResult((payload) => post({ v: PROTOCOL_VERSION, kind: 'evt', type: 'copyResult', payload })),
            target.onDidDispose(() => {
                subscriptions.forEach((subscription) => subscription.dispose());
                subscriptions = [];
                panel = undefined;
                lastMove = undefined;
                probeChannel.markNotReady();
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
        showMoveResult(result) {
            if (panel === undefined || !panel.visible || deps.service.view().area !== 'specBoard') {
                return false;
            }
            pushMove(result);
            return true;
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
            lastMove = undefined;
            deps.board.panelClosed();
        },
    };
}
