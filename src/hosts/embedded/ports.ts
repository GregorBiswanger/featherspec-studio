import type { HostPorts } from '../compose';
import type { ArchiveEntryKind, ArchiveReadResult, ReleaseArchivePort } from '../../core/ports/releaseArchive';
import type { Disposable, WorkspaceFolderInfo } from '../../core/ports/host';
import type { EntryKind, ReadOnlyFileSystem } from '../../core/ports/readOnlyFileSystem';
import type { SourceEntry, SourceEntryKind, SourceStat, SpecSourcePort } from '../../core/ports/specSource';
import type { HttpResponse, ReleaseHttpPort } from '../../core/ports/releaseHttp';
import type { CreateOutcome, ReplaceOutcome, SetupTargetPort, TargetEntryKind } from '../../core/ports/setupTarget';
import type { NotificationAction, SelectItem, UiPort } from '../../core/ports/host';
import type { OpenOutcome } from '../../core/ports/board';
import type { IdSource, RuntimeClock } from '../../core/ports/runtimeMedium';
import type { AssistantHostPort } from '../../core/ports/assistant';
import type { SetupPickItem, SetupUiPort } from '../../core/ports/setupUi';
import type { StepPickItem, StepUiPort } from '../../core/ports/copyNextStep';
import type { CoreConfig } from './contract';
import type { Bridge } from './bridge';
import { fromBase64, toBase64 } from './bridge';
import type { Mirrors } from './mirrors';

export interface EmbeddedRoutes {
    fileChanged(root: string, relativePath: string): void;
    markerChanged(root: string): void;
    progressCancelled(id: string): void;
}

export type EmbeddedPorts = Omit<HostPorts, 'openStore' | 'shellActions' | 'openStudio' | 'createPanel'> & {
    runtimeClock: RuntimeClock;
    ids: IdSource;
    routes: EmbeddedRoutes;
};

const ACTIVE_PROJECT_KEY = 'featherspec-studio.activeProject';
const SCAN_DIRS: readonly string[] = ['.specs', '.memory-bank'];
const SCAN_FRESH_MS = 100;

interface ScanEntry {
    kind: SourceEntryKind;
    mtimeMs: number | undefined;
    size: number | undefined;
    children?: SourceEntry[];
}

type ScanEntries = Record<string, ScanEntry>;

interface ScanState {
    generation: number;
    pending: Promise<ScanEntries | undefined> | undefined;
    settled: { entries: ScanEntries | undefined; at: number } | undefined;
}

function scanKey(relativePath: string): string | undefined {
    const parts = relativePath.split('/').filter((part) => part !== '' && part !== '.');
    if (parts.includes('..')) {
        return undefined;
    }
    const key = parts.join('/');
    return SCAN_DIRS.some((dir) => key === dir || key.startsWith(`${dir}/`)) ? key : undefined;
}

interface WireArchiveEntry {
    path: string;
    kind: ArchiveEntryKind;
    bytes: string;
}

type WireArchiveResult =
    | { ok: true; entries: WireArchiveEntry[] }
    | { ok: false; failure: 'unreadable'; detail: string }
    | { ok: false; failure: 'too-large' };

interface WireResponse {
    status: number;
    headers: Record<string, string>;
    body: string;
}

export function archivePortOf(bridge: Bridge): ReleaseArchivePort {
    return {
        read: async (bytes: Uint8Array, maxUnpackedBytes: number): Promise<ArchiveReadResult> => {
            const result = await bridge.callAsync<WireArchiveResult>('archive.read', { bytes: toBase64(bytes), maxUnpackedBytes });
            if (result.ok) {
                return { ok: true, entries: result.entries.map((entry) => ({ path: entry.path, kind: entry.kind, bytes: fromBase64(entry.bytes) })) };
            }
            return result.failure === 'unreadable' ? { ok: false, failure: 'unreadable', detail: result.detail } : { ok: false, failure: 'too-large' };
        },
    };
}

export function createEmbeddedPorts(bridge: Bridge, mirrors: Mirrors, config: CoreConfig): EmbeddedPorts {
    const fileListeners = new Map<string, Set<(relativePath: string) => void>>();
    const markerListeners = new Map<string, Set<() => void>>();
    const progress = new Map<string, AbortController>();

    const nullToUndefined = async <T>(pending: Promise<T | null>): Promise<T | undefined> => (await pending) ?? undefined;

    const writeMemory = async (key: string, value: unknown): Promise<void> => {
        const json = value === undefined ? undefined : JSON.stringify(value);
        mirrors.memorySet(key, json);
        await bridge.callAsync<void>('memory.set', { key, value: json ?? null });
    };

    const pick = async <T>(items: readonly T[], placeholder?: string): Promise<T | undefined> => {
        const index = await bridge.callAsync<number | null>('ui.pick', { items, placeholder });
        return index === null ? undefined : items[index];
    };

    const schedule = (callback: () => void, milliseconds: number): Disposable => {
        const handle = globalThis.setTimeout(callback, milliseconds);
        return { dispose: () => globalThis.clearTimeout(handle) };
    };

    const watchRoot = <Listener>(registry: Map<string, Set<Listener>>, kind: 'files' | 'markers', root: string, listener: Listener): Disposable => {
        const listeners = registry.get(root) ?? new Set<Listener>();
        registry.set(root, listeners);
        listeners.add(listener);
        bridge.callAsync<void>('watch.add', { root, kind }).catch(() => undefined);
        let disposed = false;
        return {
            dispose: () => {
                if (disposed) {
                    return;
                }
                disposed = true;
                listeners.delete(listener);
                dropScan(root);
                bridge.callAsync<void>('watch.remove', { root, kind }).catch(() => undefined);
            },
        };
    };

    const settingPort = (key: string) => ({
        read: (): unknown => mirrors.settings().get(key),
        onDidChange: (listener: () => void): Disposable => mirrors.onSettings((changed) => {
            if (changed === key) {
                listener();
            }
        }),
    });

    const fileSystem: ReadOnlyFileSystem = {
        stat: (root, relativePath) => nullToUndefined<EntryKind>(bridge.callAsync('fs.stat', { root, relativePath })),
        readText: (root, relativePath) => bridge.callAsync<string>('fs.readText', { root, relativePath }),
        readDirectory: (root, relativePath) => nullToUndefined<string[]>(bridge.callAsync('fs.readDirectory', { root, relativePath })),
    };

    const scanStates = new Map<string, ScanState>();

    const dropScan = (root: string): void => {
        const state = scanStates.get(root);
        if (state !== undefined) {
            state.generation += 1;
            state.pending = undefined;
            state.settled = undefined;
        }
    };

    const scanOf = (root: string): Promise<ScanEntries | undefined> => {
        const state = scanStates.get(root) ?? { generation: 0, pending: undefined, settled: undefined };
        scanStates.set(root, state);
        if (state.settled !== undefined && Date.now() - state.settled.at <= SCAN_FRESH_MS) {
            return Promise.resolve(state.settled.entries);
        }
        if (state.pending !== undefined) {
            return state.pending;
        }
        const generation = state.generation;
        const pending = bridge
            .callAsync<{ entries?: ScanEntries } | null>('source.scan', { root, dirs: [...SCAN_DIRS] })
            .then((reply) => (typeof reply?.entries === 'object' && reply.entries !== null ? reply.entries : undefined))
            .catch(() => undefined)
            .then((entries) => {
                if (state.generation === generation) {
                    state.pending = undefined;
                    state.settled = { entries, at: Date.now() };
                }
                return entries;
            });
        state.pending = pending;
        return pending;
    };

    const scanned = async (root: string, relativePath: string): Promise<{ entry: ScanEntry | undefined } | undefined> => {
        const key = scanKey(relativePath);
        if (key === undefined) {
            return undefined;
        }
        const entries = await scanOf(root);
        if (entries === undefined) {
            return undefined;
        }
        const parts = key.split('/');
        for (let length = 1; length < parts.length; length += 1) {
            if (entries[parts.slice(0, length).join('/')]?.kind === 'symlink') {
                return undefined;
            }
        }
        return { entry: entries[key] };
    };

    const specSource: SpecSourcePort = {
        list: async (root, relativePath) => {
            const answer = await scanned(root, relativePath);
            if (answer !== undefined) {
                const entry = answer.entry;
                if (entry === undefined) {
                    return undefined;
                }
                if (entry.kind === 'directory' && entry.children !== undefined) {
                    return entry.children;
                }
                if (entry.kind !== 'directory' && entry.kind !== 'symlink') {
                    return undefined;
                }
            }
            return nullToUndefined<SourceEntry[]>(bridge.callAsync('source.list', { root, relativePath }));
        },
        stat: async (root, relativePath) => {
            const answer = await scanned(root, relativePath);
            if (answer !== undefined) {
                const entry = answer.entry;
                return entry === undefined ? undefined : { kind: entry.kind, mtimeMs: entry.mtimeMs, size: entry.size };
            }
            return nullToUndefined<SourceStat>(bridge.callAsync('source.stat', { root, relativePath }));
        },
        readBytes: async (root, relativePath) => fromBase64(await bridge.callAsync<string>('source.readBytes', { root, relativePath })),
    };

    const ui: UiPort = {
        showQuickPick: (items: readonly SelectItem[]) => pick(items),
        showNotification: (model) => nullToUndefined<NotificationAction>(bridge.callAsync('ui.notify', model)),
        openExternal: (url) => bridge.callAsync<void>('ui.openExternal', { url }),
    };

    const http: ReleaseHttpPort = {
        get: async (url, options): Promise<HttpResponse> => {
            const response = await bridge.callAsync<WireResponse>('http.get', { url, headers: options.headers });
            return { status: response.status, headers: response.headers, body: singleChunk(fromBase64(response.body)) };
        },
    };

    const archive = archivePortOf(bridge);

    const settledThenDrop = async <T>(root: string, pending: Promise<T>): Promise<T> => {
        try {
            return await pending;
        } finally {
            dropScan(root);
        }
    };

    const setupTarget: SetupTargetPort = {
        kind: (root, relativePath) => nullToUndefined<TargetEntryKind>(bridge.callAsync('target.kind', { root, relativePath })),
        readBytes: async (root, relativePath) => fromBase64(await bridge.callAsync<string>('target.readBytes', { root, relativePath })),
        listDirectory: (root, relativePath) => nullToUndefined<string[]>(bridge.callAsync('target.listDirectory', { root, relativePath })),
        createExclusive: (root, relativePath, bytes) => settledThenDrop(root, bridge.callAsync<CreateOutcome>('target.createExclusive', { root, relativePath, bytes: toBase64(bytes) })),
        replaceIfUnchanged: (root, relativePath, expected, next) => settledThenDrop(root, bridge.callAsync<ReplaceOutcome>('target.replaceIfUnchanged', {
            root,
            relativePath,
            expected: toBase64(expected),
            next: toBase64(next),
        })),
        clearSetupFolder: (root) => settledThenDrop(root, bridge.callAsync<void>('target.clearSetupFolder', { root })),
    };

    const setupUi: SetupUiPort = {
        pickTarget: async (items: readonly SetupPickItem[], placeholder: string) => (await pick(items, placeholder))?.root,
        confirm: (model) => bridge.callAsync<boolean>('ui.confirm', model),
        async withProgress<T>(title: string, task: (signal: AbortSignal) => Promise<T>): Promise<T> {
            const id = await bridge.callAsync<string>('ui.progressStart', { title });
            const controller = new AbortController();
            progress.set(id, controller);
            try {
                return await task(controller.signal);
            } finally {
                progress.delete(id);
                bridge.emit('progressEnd', id);
            }
        },
        notify: (message, actions) => nullToUndefined<string>(bridge.callAsync('ui.notify', { message, actions })),
        copy: (text) => bridge.callAsync<void>('clipboard.write', { text }),
    };

    const stepUi: StepUiPort = {
        pick: (items: readonly StepPickItem[], placeholder: string) => pick(items, placeholder),
        inform: (text, action) => nullToUndefined<string>(bridge.callAsync('ui.notify', { message: text, actions: [action] })),
        warn: (text) => bridge.emit('warn', text),
    };

    const assistantHost: AssistantHostPort = {
        extension: () => undefined,
        activate: async () => undefined,
        commands: async () => [],
        execute: async () => {
            throw new Error('Assistant commands are not available in the embedded host.');
        },
        fileUri: () => undefined,
        onDidChangeExtensions: () => ({ dispose: () => undefined }),
    };

    return {
        platform: config.platform,
        studioVersion: config.studioVersion,
        fileSystem,
        specSource,
        folders: {
            list: (): readonly WorkspaceFolderInfo[] => mirrors.folders(),
            onDidChange: (listener) => mirrors.onFolders(listener),
        },
        workspaceState: {
            get: () => {
                const root = mirrors.memoryGet(ACTIVE_PROJECT_KEY);
                return typeof root === 'string' ? root : undefined;
            },
            set: (root) => writeMemory(ACTIVE_PROJECT_KEY, root),
        },
        uiMemory: (key) => ({
            get: () => mirrors.memoryGet(key),
            set: (value) => writeMemory(key, value),
        }),
        clock: {
            now: () => new Date().toISOString(),
            setTimeout: schedule,
        },
        ui,
        markerWatch: {
            watch: (root, listener) => watchRoot(markerListeners, 'markers', root, listener),
        },
        fileWatch: {
            watch: (root, listener) => watchRoot(fileListeners, 'files', root, listener),
        },
        sameRoot: config.platform === 'win32'
            ? (first, second) => first.toLowerCase() === second.toLowerCase()
            : (first, second) => first === second,
        output: {
            appendBlock: (lines) => bridge.emit('log', lines),
            show: () => bridge.emit('showOutput', null),
        },
        statusItem: {
            show: (view) => bridge.emit('status', view),
            hide: () => bridge.emit('status', null),
        },
        trust: () => ({
            isTrusted: () => mirrors.trusted(),
            onDidGrant: (listener) => mirrors.onTrust(listener),
        }),
        http,
        archive,
        setupTarget,
        setupUi,
        setting: settingPort,
        assistantHost,
        clipboard: {
            writeText: (text) => bridge.callAsync<void>('clipboard.write', { text }),
        },
        stepUi,
        editor: {
            open: (root, key, line, place) => bridge.callAsync<OpenOutcome>('editor.open', { root, key, line, place }),
        },
        earlierRunData: {
            state: {
                has: (key) => mirrors.memoryGet(key) !== undefined,
                remove: (key) => writeMemory(key, undefined),
            },
        },
        runtimeClock: {
            epochMs: () => Date.now(),
            setTimeout: schedule,
        },
        ids: {
            newId: () => globalThis.crypto.randomUUID(),
        },
        routes: {
            fileChanged: (root, relativePath) => {
                dropScan(root);
                fileListeners.get(root)?.forEach((listener) => listener(relativePath));
            },
            markerChanged: (root) => {
                dropScan(root);
                markerListeners.get(root)?.forEach((listener) => listener());
            },
            progressCancelled: (id) => {
                progress.get(id)?.abort();
            },
        },
    };
}

function singleChunk(bytes: Uint8Array): AsyncIterable<Uint8Array> {
    return {
        async *[Symbol.asyncIterator]() {
            yield bytes;
        },
    };
}
