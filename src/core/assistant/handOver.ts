import { isRecord } from '../../shared/protocol/envelope';
import type { Disposable } from '../ports/host';
import type { HandOverEntry, UiMemoryPort } from '../ports/shell';
import type { ProjectRead } from '../specs/readProject';

export const HAND_OVER_VERSION = 1;
export const CLARIFY_PREFIX = '/sdd-clarify ';

export interface HandOver {
    commit(): Promise<void>;
}

export interface HandOverPort {
    begin(line: string): HandOver | undefined;
}

export interface HandOverMemory extends HandOverPort {
    read(root: string): Readonly<Record<string, HandOverEntry>>;
    onDidChange(listener: () => void): Disposable;
}

type Stored = Record<string, Record<string, HandOverEntry>>;

function optionalNumber(value: unknown): number | undefined | 'invalid' {
    if (value === undefined) {
        return undefined;
    }
    return typeof value === 'number' && Number.isFinite(value) ? value : 'invalid';
}

function entryOf(value: unknown): HandOverEntry | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    const modifiedMs = optionalNumber(value.modifiedMs);
    const size = optionalNumber(value.size);
    if (modifiedMs === 'invalid' || size === 'invalid') {
        return undefined;
    }
    return { ...(modifiedMs === undefined ? {} : { modifiedMs }), ...(size === undefined ? {} : { size }) };
}

function storedOf(value: unknown): Stored {
    const stored: Stored = {};
    if (!isRecord(value) || value.v !== HAND_OVER_VERSION || !isRecord(value.roots)) {
        return stored;
    }
    for (const [root, entries] of Object.entries(value.roots)) {
        if (!isRecord(entries)) {
            continue;
        }
        const clean: Record<string, HandOverEntry> = {};
        for (const [key, raw] of Object.entries(entries)) {
            const entry = entryOf(raw);
            if (entry !== undefined) {
                clean[key] = entry;
            }
        }
        stored[root] = clean;
    }
    return stored;
}

function safeGet(memory: UiMemoryPort): unknown {
    try {
        return memory.get();
    } catch {
        return undefined;
    }
}

export function createHandOverMemory(memory: UiMemoryPort, project: () => ProjectRead | undefined): HandOverMemory {
    const listeners = new Set<() => void>();

    return {
        read(root) {
            return storedOf(safeGet(memory))[root] ?? {};
        },
        begin(line) {
            if (!line.startsWith(CLARIFY_PREFIX)) {
                return undefined;
            }
            const key = line.slice(CLARIFY_PREFIX.length);
            const read = project();
            const spec = read?.specs.find((candidate) => candidate.key === key);
            if (read === undefined || spec === undefined) {
                return undefined;
            }
            const root = read.root;
            const snapshot: HandOverEntry = {
                ...(spec.modifiedMs === undefined ? {} : { modifiedMs: spec.modifiedMs }),
                ...(spec.size === undefined ? {} : { size: spec.size }),
            };
            return {
                async commit() {
                    const stored = storedOf(safeGet(memory));
                    const latest = project();
                    const names = new Set((latest?.root === root ? latest : read).specs.map((candidate) => candidate.key));
                    const entries: Record<string, HandOverEntry> = {};
                    for (const [name, entry] of Object.entries(stored[root] ?? {})) {
                        if (names.has(name)) {
                            entries[name] = entry;
                        }
                    }
                    entries[key] = snapshot;
                    stored[root] = entries;
                    try {
                        await memory.set({ v: HAND_OVER_VERSION, roots: stored });
                    } catch {
                        return;
                    }
                    [...listeners].forEach((listener) => {
                        try {
                            listener();
                        } catch {
                            return;
                        }
                    });
                },
            };
        },
        onDidChange(listener) {
            listeners.add(listener);
            return { dispose: () => void listeners.delete(listener) };
        },
    };
}
