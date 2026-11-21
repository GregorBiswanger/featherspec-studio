import { randomBytes } from 'node:crypto';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { OutputPort } from '../../core/ports/host';
import type { ShellService } from '../../core/shell/shellService';
import { PROTOCOL_VERSION, type Envelope } from '../../shared/protocol/envelope';
import type { ProbeOutcome } from '../../shared/protocol/messages';
import { createPanelSession, type PanelBoard, type PanelOverview } from '../../hosts/panelSession';
import { createProbeChannel } from './probeChannel';
import { buildWebviewHtml } from './webviewHtml';
import { PANEL_TITLE } from '../../shared/protocol/texts';

export type { PanelBoard, PanelOverview } from '../../hosts/panelSession';

export const VIEW_TYPE = 'featherspecStudio.main';
const PROBE_HELLO_TIMEOUT_MS = 20_000;
const PROBE_ANSWER_TIMEOUT_MS = 20_000;

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
    let reloaded = false;
    const probeChannel = createProbeChannel({
        send: (url) => post({ v: PROTOCOL_VERSION, kind: 'evt', type: 'probe', payload: { url } }),
        helloTimeoutMs: PROBE_HELLO_TIMEOUT_MS,
        answerTimeoutMs: PROBE_ANSWER_TIMEOUT_MS,
        describe: () => `panel open: ${panel !== undefined}, visible: ${panel?.visible}, active: ${panel?.active}, last hello ${describeHello()}`,
    });
    const session = createPanelSession({
        service: deps.service,
        board: deps.board,
        overview: deps.overview,
        output: deps.output,
        post,
        testMode: deps.testMode,
        onHello: () => probeChannel.markReady(),
        onProbeResult: (outcome) => probeChannel.answer(outcome),
    });
    const assets = vscode.Uri.joinPath(deps.extensionUri, 'dist', 'webview');

    function describeHello(): string {
        const at = session.lastHelloAt();
        return at === undefined ? 'never' : `${Date.now() - at} ms ago`;
    }

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

    function adopt(target: vscode.WebviewPanel): void {
        panel = target;
        target.iconPath = {
            light: vscode.Uri.joinPath(deps.extensionUri, 'media', TAB_ICON.light),
            dark: vscode.Uri.joinPath(deps.extensionUri, 'media', TAB_ICON.dark),
        };
        target.webview.options = options();
        subscriptions = [
            target.webview.onDidReceiveMessage(session.receive),
            target.onDidDispose(() => {
                subscriptions.forEach((subscription) => subscription.dispose());
                subscriptions = [];
                panel = undefined;
                session.detach();
                probeChannel.markNotReady();
            }),
        ];
        session.attach();
    }

    return {
        show(showOptions) {
            const preserveFocus = showOptions?.preserveFocus === true;
            if (panel !== undefined) {
                panel.reveal(panel.viewColumn ?? vscode.ViewColumn.Active, preserveFocus);
                return;
            }
            reloaded = false;
            const created = vscode.window.createWebviewPanel(VIEW_TYPE, PANEL_TITLE, { viewColumn: vscode.ViewColumn.Active, preserveFocus }, options());
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
        lastHelloAt: () => session.lastHelloAt(),
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
            session.stop();
            panel?.dispose();
            panel = undefined;
            deps.board.panelClosed();
        },
    };
}
