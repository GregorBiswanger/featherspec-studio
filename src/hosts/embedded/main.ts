import { composeStudio, type PanelPort, type PanelServices, type Studio } from '../compose';
import { createPanelSession } from '../panelSession';
import type { MediumLine, RuntimeMedium } from '../../core/ports/runtimeMedium';
import type { WorkspaceFolderInfo } from '../../core/ports/host';
import type { ShellActionsPort } from '../../core/ports/shell';
import { openRuntimeStore, type RuntimeStore } from '../../core/runtime/runtimeStore';
import type { OpenRequest } from '../../core/shell/shellService';
import { isAreaId } from '../../shared/protocol/areas';
import { isRunActionPayload, isSelectPayload } from '../../shared/protocol/messages';
import { buildWebviewHtml } from '../../adapters/vscode/webviewHtml';
import { createBridge, isRecord, type Bridge } from './bridge';
import { INVOKE_COMMANDS, type AsyncCall, type CoreConfig, type InvokeCommand, type NativeHost } from './contract';
import { createBudgetProbe, type BudgetProbe } from './budgets';
import { createMirrors, type Mirrors } from './mirrors';
import { archivePortOf, createEmbeddedPorts, type EmbeddedPorts } from './ports';
import { parseConformanceInput, runConformance, runSetupConformance } from './conformance';
import { jetBrainsText, translatedPorts, translateTree } from './terms';

export interface EmbeddedHost {
    start(configJson: string): Promise<void>;
    resolve(id: string, resultJson: string): void;
    resolveMany(batchJson: string): void;
    dispatch(event: string, payloadJson: string): void;
    invoke(id: string, command: string, argsJson: string): void;
    conformance(id: string, inputJson: string): void;
    setupConformance(id: string, archiveJson: string): void;
}

export interface EmbeddedPanel extends PanelPort {
    opened(): void;
    closed(): void;
    receive(raw: unknown): void;
}

interface Running {
    studio: Studio<EmbeddedPanel>;
    ports: EmbeddedPorts;
    mirrors: Mirrors;
}

interface TreeRow {
    specKey: string;
    planKey?: string;
    line?: string;
    stem?: string;
    path?: string;
    mapStep?: string;
}

export function createEmbeddedHost(native: NativeHost): EmbeddedHost {
    const bridge = createBridge(native);
    const archive = archivePortOf(bridge);
    let running: Running | undefined;
    let budgets: BudgetProbe | undefined;

    const shellActions: ShellActionsPort = {
        openFolder: () => Promise.reject(new Error('Opening a folder is not available in the embedded host.')),
        openSetupGuide: () => bridge.callAsync<void>('actions.openSetupGuide', {}),
        showOutput: () => bridge.emit('showOutput', null),
        manageTrust: () => bridge.callAsync<void>('actions.manageTrust', {}),
        reloadPanel: () => {
            void bridge.callAsync<void>('actions.reloadPanel', {}).catch(() => undefined);
        },
        setUp: async () => {
            await running?.studio.setup.start();
        },
        copyMergePrompt: async () => {
            await running?.studio.setup.copyMergePrompt();
        },
    };

    const settle = (id: string, work: () => Promise<string>): void => {
        Promise.resolve()
            .then(work)
            .then(
                (ok) => bridge.reply(id, { ok }),
                (error: unknown) => bridge.reply(id, { error: describe(error) }),
            );
    };

    return {
        async start(configJson) {
            try {
                const config = parseConfig(configJson);
                const mirrors = createMirrors(config);
                const ports = translatedPorts(createEmbeddedPorts(bridge, mirrors, config));
                const studio = composeStudio<EmbeddedPanel>({
                    ...ports,
                    openStore: (projectRoot) =>
                        openRuntimeStore({
                            medium: mediumProxy(bridge, projectRoot),
                            ids: ports.ids,
                            clock: ports.runtimeClock,
                            notices: { show: (message) => bridge.emit('warn', jetBrainsText(message)) },
                            projectRoot,
                        }),
                    shellActions,
                    openStudio: async () => {
                        await bridge.callAsync<void>('actions.openStudio', {});
                    },
                    createPanel: (services) => createEmbeddedPanel(bridge, services),
                });
                running = { studio, ports, mirrors };
                studio.treeService.onDidChange((model) => bridge.emit('tree', translateTree(model)));
                await studio.start();
                bridge.emit('tree', translateTree(studio.treeService.model()));
                bridge.ready();
            } catch (error) {
                const message = describe(error);
                bridge.emit('log', [message]);
                bridge.failed(message);
            }
        },
        resolve(id, resultJson) {
            bridge.resolve(id, resultJson);
        },
        resolveMany(batchJson) {
            bridge.resolveMany(batchJson);
        },
        dispatch(event, payloadJson) {
            if (running === undefined) {
                return;
            }
            const payload: unknown = JSON.parse(payloadJson);
            if (running.mirrors.apply(event, payload)) {
                return;
            }
            const { studio, ports } = running;
            switch (event) {
                case 'panelMessage':
                    studio.panel.receive(payload);
                    return;
                case 'panelOpened':
                    studio.panel.opened();
                    return;
                case 'panelClosed':
                    studio.panel.closed();
                    return;
                case 'fileChanged':
                    if (isRecord(payload) && typeof payload.root === 'string' && typeof payload.path === 'string') {
                        ports.routes.fileChanged(payload.root, payload.path);
                    }
                    return;
                case 'markerChanged':
                    if (isRecord(payload) && typeof payload.root === 'string') {
                        ports.routes.markerChanged(payload.root);
                    }
                    return;
                case 'progressCancelled':
                    if (isRecord(payload) && typeof payload.id === 'string') {
                        ports.routes.progressCancelled(payload.id);
                    }
                    return;
            }
        },
        invoke(id, command, argsJson) {
            if (running === undefined) {
                bridge.reply(id, { error: 'The core has not started.' });
                return;
            }
            if (!isInvokeCommand(command)) {
                bridge.reply(id, { error: `Unknown command ${command}.` });
                return;
            }
            const args: unknown = JSON.parse(argsJson);
            const { ports } = running;
            const probe = (): BudgetProbe => {
                budgets ??= createBudgetProbe({ source: ports.specSource, fileSystem: ports.fileSystem, sameRoot: ports.sameRoot, clock: ports.clock, now: monotonicNow, stats: () => bridge.stats() });
                return budgets;
            };
            runCommand(running.studio, command, args, probe, () => budgets).then(
                (ok) => bridge.reply(id, { ok: ok ?? null }),
                (error: unknown) => bridge.reply(id, { error: describe(error) }),
            );
        },
        conformance(id, inputJson) {
            settle(id, () => runConformance(parseConformanceInput(inputJson)));
        },
        setupConformance(id, archiveJson) {
            settle(id, () => runSetupConformance(parseArchiveText(archiveJson), archive));
        },
    };
}

function createEmbeddedPanel(bridge: Bridge, services: PanelServices): EmbeddedPanel {
    let open = false;
    const session = createPanelSession({
        service: services.service,
        board: services.board,
        overview: services.overview,
        output: services.output,
        post: (message) => bridge.emit('panel', message),
        testMode: false,
        onHello: () => undefined,
        onProbeResult: () => undefined,
    });
    return {
        panelCount: () => (open ? 1 : 0),
        show: () => {
            void bridge.callAsync<void>('actions.openStudio', {}).catch(() => undefined);
        },
        opened: () => {
            if (!open) {
                open = true;
                session.attach();
            }
        },
        closed: () => {
            if (open) {
                open = false;
                session.detach();
            }
        },
        receive: (raw) => session.receive(raw),
    };
}

function mediumProxy(bridge: Bridge, root: string): RuntimeMedium {
    const call = <T>(name: AsyncCall, args: Record<string, unknown>): Promise<T> => bridge.callAsync<T>(name, { root, ...args });
    return {
        open: () => call<void>('medium.open', {}),
        read: async (name) => (await call<string | null>('medium.read', { name })) ?? undefined,
        async *lines(name): AsyncGenerator<MediumLine> {
            for (const line of await call<MediumLine[]>('medium.lines', { name })) {
                yield line;
            }
        },
        append: (name, text) => call<void>('medium.append', { name, text }),
        replace: (name, text) => call<void>('medium.replace', { name, text }),
        createExclusive: (name, text) => call<boolean>('medium.createExclusive', { name, text }),
        remove: (name) => call<void>('medium.remove', { name }),
        list: (directory) => call<string[]>('medium.list', { name: directory }),
    };
}

async function runCommand(studio: Studio<EmbeddedPanel>, command: InvokeCommand, args: unknown, probe: () => BudgetProbe, existing: () => BudgetProbe | undefined): Promise<unknown> {
    switch (command) {
        case 'open':
            if (!isOpenRequest(args)) {
                throw new Error('open needs via start, or via area with a known area.');
            }
            studio.service.open(args);
            studio.panel.show();
            return null;
        case 'refresh':
            await studio.service.refresh();
            return null;
        case 'copyNextStep':
            await studio.copyNextStep.run();
            return null;
        case 'setup':
            await studio.setup.start();
            return null;
        case 'copyMergePrompt':
            await studio.setup.copyMergePrompt();
            return null;
        case 'selectProject':
            await studio.controller.selectProject();
            return null;
        case 'shellAction':
            if (!isRunActionPayload(args)) {
                throw new Error('shellAction needs a known action.');
            }
            await studio.service.runAction(args.action);
            return null;
        case 'tree.select': {
            const row = rowOf(args);
            if (!isSelectPayload(row)) {
                throw new Error('tree.select needs a spec reference.');
            }
            studio.treeActions.select(row.path === undefined ? { stem: row.stem } : { stem: row.stem, path: row.path });
            return null;
        }
        case 'tree.copy':
            await studio.treeActions.copy(requireRow(args));
            return null;
        case 'tree.openSpec':
            await studio.treeActions.open(requireRow(args), 'spec');
            return null;
        case 'tree.openPlan':
            await studio.treeActions.open(requireRow(args), 'plan');
            return null;
        case 'tree.showInPlanMap': {
            const row = requireRow(args);
            if (row.stem !== undefined) {
                studio.treeActions.showInPlanMap({
                    stem: row.stem,
                    ...(row.path === undefined ? {} : { path: row.path }),
                    ...(row.mapStep === undefined ? {} : { mapStep: row.mapStep }),
                });
            }
            return null;
        }
        case 'panelHtml':
            return panelHtml(args);
        case 'diagnostics':
            return { jsHeapBytes: usedJsHeapBytes() };
        case 'budget.read': {
            if (!isRecord(args) || typeof args.root !== 'string' || typeof args.version !== 'string') {
                throw new Error('budget.read needs root and version.');
            }
            return await probe().read(args.root, args.version);
        }
        case 'budget.update': {
            if (!isRecord(args) || typeof args.path !== 'string') {
                throw new Error('budget.update needs path.');
            }
            const current = existing();
            if (current === undefined) {
                throw new Error('budget.update needs a budget.read first.');
            }
            return await current.update(args.path);
        }
        case 'budget.discover': {
            if (!isRecord(args) || !Array.isArray(args.roots) || !args.roots.every((root): root is string => typeof root === 'string')) {
                throw new Error('budget.discover needs roots.');
            }
            return await probe().discover(args.roots);
        }
    }
}

function parseArchiveText(json: string): string {
    const value: unknown = JSON.parse(json);
    if (typeof value !== 'string') {
        throw new Error('The setup conformance needs the release archive as base64 text.');
    }
    return value;
}

function parseConfig(json: string): CoreConfig {
    const value: unknown = JSON.parse(json);
    if (!isCoreConfig(value)) {
        throw new Error('The start configuration is not a JetBrains core configuration.');
    }
    return value;
}

function isCoreConfig(value: unknown): value is CoreConfig {
    return (
        isRecord(value) &&
        value.host === 'jetbrains' &&
        typeof value.platform === 'string' &&
        typeof value.studioVersion === 'string' &&
        isRecord(value.settings) &&
        typeof value.trusted === 'boolean' &&
        Array.isArray(value.folders) &&
        value.folders.every(isFolderInfo) &&
        isRecord(value.memory) &&
        Object.values(value.memory).every((entry) => typeof entry === 'string')
    );
}

function isFolderInfo(value: unknown): value is WorkspaceFolderInfo {
    return isRecord(value) && typeof value.root === 'string' && typeof value.name === 'string' && (value.displayPath === undefined || typeof value.displayPath === 'string');
}

function isInvokeCommand(value: string): value is InvokeCommand {
    return (INVOKE_COMMANDS as readonly string[]).includes(value);
}

function isOpenRequest(value: unknown): value is OpenRequest {
    if (!isRecord(value)) {
        return false;
    }
    return value.via === 'start' || (value.via === 'area' && isAreaId(value.area));
}

function rowOf(args: unknown): unknown {
    return isRecord(args) ? args.row : undefined;
}

function treeRow(value: unknown): TreeRow | undefined {
    if (!isRecord(value) || typeof value.specKey !== 'string') {
        return undefined;
    }
    const row: TreeRow = { specKey: value.specKey };
    if (typeof value.planKey === 'string') {
        row.planKey = value.planKey;
    }
    if (typeof value.line === 'string') {
        row.line = value.line;
    }
    if (typeof value.stem === 'string') {
        row.stem = value.stem;
    }
    if (typeof value.path === 'string') {
        row.path = value.path;
    }
    if (typeof value.mapStep === 'string') {
        row.mapStep = value.mapStep;
    }
    return row;
}

function requireRow(args: unknown): TreeRow {
    const row = treeRow(rowOf(args));
    if (row === undefined) {
        throw new Error('The command needs a tree row with a specKey.');
    }
    return row;
}

function panelHtml(args: unknown): string {
    if (!isRecord(args) || typeof args.nonce !== 'string' || typeof args.cspSource !== 'string' || typeof args.scriptUri !== 'string' || typeof args.styleUri !== 'string' || typeof args.reloaded !== 'boolean') {
        throw new Error('panelHtml needs nonce, cspSource, scriptUri, styleUri and reloaded.');
    }
    return buildWebviewHtml({ nonce: args.nonce, cspSource: args.cspSource, scriptUri: args.scriptUri, styleUri: args.styleUri, reloaded: args.reloaded, test: false, host: 'jetbrains' });
}

function monotonicNow(): number {
    return typeof globalThis.performance === 'object' ? globalThis.performance.now() : Date.now();
}

function usedJsHeapBytes(): number | null {
    const memory = (globalThis.performance as unknown as { memory?: { usedJSHeapSize?: number } }).memory;
    return memory?.usedJSHeapSize ?? null;
}

function describe(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
