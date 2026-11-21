import type { WorkspaceFolderInfo, Disposable } from '../../core/ports/host';
import type { CoreConfig } from './contract';
import { isRecord } from './bridge';

export interface Mirrors {
    settings(): ReadonlyMap<string, unknown>;
    trusted(): boolean;
    folders(): readonly WorkspaceFolderInfo[];
    memoryGet(key: string): unknown;
    memorySet(key: string, json: string | undefined): void;
    apply(event: string, payload: unknown): boolean;
    onSettings(listener: (key: string) => void): Disposable;
    onTrust(listener: () => void): Disposable;
    onFolders(listener: () => void): Disposable;
}

export function createMirrors(config: CoreConfig): Mirrors {
    const settings = new Map<string, unknown>(Object.entries(config.settings));
    const memory = new Map<string, string>(Object.entries(config.memory));
    let trusted = config.trusted;
    let folders: readonly WorkspaceFolderInfo[] = config.folders;
    const settingsListeners = new Set<(key: string) => void>();
    const trustListeners = new Set<() => void>();
    const folderListeners = new Set<() => void>();

    const subscribe = <Listener>(listeners: Set<Listener>, listener: Listener): Disposable => {
        listeners.add(listener);
        return { dispose: () => listeners.delete(listener) };
    };

    return {
        settings: () => settings,
        trusted: () => trusted,
        folders: () => folders,
        memoryGet(key) {
            const json = memory.get(key);
            return json === undefined ? undefined : parseJson(json);
        },
        memorySet(key, json) {
            if (json === undefined) {
                memory.delete(key);
            } else {
                memory.set(key, json);
            }
        },
        apply(event, payload) {
            if (event === 'settingsChanged' && isRecord(payload) && typeof payload.key === 'string') {
                settings.set(payload.key, payload.value);
                for (const listener of [...settingsListeners]) {
                    listener(payload.key);
                }
                return true;
            }
            if (event === 'trustGranted') {
                trusted = true;
                for (const listener of [...trustListeners]) {
                    listener();
                }
                return true;
            }
            if (event === 'foldersChanged' && isRecord(payload) && Array.isArray(payload.folders)) {
                folders = payload.folders.filter(isFolderInfo);
                for (const listener of [...folderListeners]) {
                    listener();
                }
                return true;
            }
            return false;
        },
        onSettings: (listener) => subscribe(settingsListeners, listener),
        onTrust: (listener) => subscribe(trustListeners, listener),
        onFolders: (listener) => subscribe(folderListeners, listener),
    };
}

function parseJson(json: string): unknown {
    const parsed: unknown = JSON.parse(json);
    return parsed;
}

function isFolderInfo(value: unknown): value is WorkspaceFolderInfo {
    return isRecord(value) && typeof value.root === 'string' && typeof value.name === 'string';
}
