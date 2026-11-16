import type { SourceEntry, SourceEntryKind, SourceStat, SpecSourcePort } from '../../ports/specSource';

type Entry =
    | { kind: 'file'; bytes: Uint8Array; mtimeMs: number | undefined; readError?: string; statError?: string }
    | { kind: 'symlink'; mtimeMs: number | undefined }
    | { kind: 'directory'; listError?: string };

function key(root: string, relativePath: string): string {
    return `${root}\u0000${relativePath.split('/').filter((part) => part.length > 0).join('/')}`;
}

export interface MemorySpecSource extends SpecSourcePort {
    setFile(root: string, relativePath: string, content: string | Uint8Array, mtimeMs?: number | null): void;
    setSymlink(root: string, relativePath: string): void;
    setDirectory(root: string, relativePath: string): void;
    setUnreadable(root: string, relativePath: string, reason: string): void;
    setStatFails(root: string, relativePath: string, reason: string): void;
    setUnlistable(root: string, relativePath: string, reason: string): void;
    remove(root: string, relativePath: string): void;
    move(root: string, from: string, to: string): void;
    reads(): string[];
}

export function createMemorySpecSource(): MemorySpecSource {
    const entries = new Map<string, Entry>();
    const readLog: string[] = [];
    let clock = 1_000;

    function ensureParents(root: string, relativePath: string): void {
        const parts = relativePath.split('/').filter((part) => part.length > 0);
        for (let index = 1; index < parts.length; index++) {
            const parentKey = key(root, parts.slice(0, index).join('/'));
            if (!entries.has(parentKey)) {
                entries.set(parentKey, { kind: 'directory' });
            }
        }
    }

    return {
        setFile(root, relativePath, content, mtimeMs) {
            ensureParents(root, relativePath);
            const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
            entries.set(key(root, relativePath), {
                kind: 'file',
                bytes,
                mtimeMs: mtimeMs === null ? undefined : (mtimeMs ?? (clock += 1_000)),
            });
        },
        setSymlink(root, relativePath) {
            ensureParents(root, relativePath);
            entries.set(key(root, relativePath), { kind: 'symlink', mtimeMs: (clock += 1_000) });
        },
        setDirectory(root, relativePath) {
            ensureParents(root, relativePath);
            entries.set(key(root, relativePath), { kind: 'directory' });
        },
        setUnreadable(root, relativePath, reason) {
            ensureParents(root, relativePath);
            entries.set(key(root, relativePath), {
                kind: 'file',
                bytes: new Uint8Array(),
                mtimeMs: (clock += 1_000),
                readError: reason,
            });
        },
        setStatFails(root, relativePath, reason) {
            const existing = entries.get(key(root, relativePath));
            if (existing?.kind === 'file') {
                existing.statError = reason;
            }
        },
        setUnlistable(root, relativePath, reason) {
            ensureParents(root, relativePath);
            entries.set(key(root, relativePath), { kind: 'directory', listError: reason });
        },
        remove(root, relativePath) {
            const prefix = key(root, relativePath);
            for (const existing of [...entries.keys()]) {
                if (existing === prefix || existing.startsWith(`${prefix}/`)) {
                    entries.delete(existing);
                }
            }
        },
        move(root, from, to) {
            const entry = entries.get(key(root, from));
            if (entry === undefined) {
                throw new Error(`ENOENT: ${from}`);
            }
            entries.delete(key(root, from));
            ensureParents(root, to);
            entries.set(key(root, to), entry);
        },
        reads() {
            return [...readLog];
        },
        async list(root, relativePath): Promise<readonly SourceEntry[] | undefined> {
            const base = key(root, relativePath);
            const directory = entries.get(base);
            if (directory?.kind !== 'directory') {
                return undefined;
            }
            if (directory.listError !== undefined) {
                throw new Error(directory.listError);
            }
            const result: SourceEntry[] = [];
            for (const [existing, entry] of entries) {
                if (existing.startsWith(`${base}/`) && !existing.slice(base.length + 1).includes('/')) {
                    result.push({ name: existing.slice(base.length + 1), kind: entry.kind as SourceEntryKind });
                }
            }
            return result;
        },
        async stat(root, relativePath): Promise<SourceStat | undefined> {
            const entry = entries.get(key(root, relativePath));
            if (entry === undefined) {
                return undefined;
            }
            if (entry.kind === 'directory') {
                return { kind: 'directory', mtimeMs: undefined, size: undefined };
            }
            if (entry.kind === 'symlink') {
                return { kind: 'symlink', mtimeMs: entry.mtimeMs, size: undefined };
            }
            if (entry.statError !== undefined) {
                throw new Error(entry.statError);
            }
            return { kind: 'file', mtimeMs: entry.mtimeMs, size: entry.bytes.length };
        },
        async readBytes(root, relativePath) {
            readLog.push(relativePath);
            const entry = entries.get(key(root, relativePath));
            if (entry?.kind !== 'file') {
                throw new Error(`ENOENT: ${relativePath}`);
            }
            if (entry.readError !== undefined) {
                throw new Error(entry.readError);
            }
            return entry.bytes;
        },
    };
}
