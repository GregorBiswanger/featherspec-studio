import type { EntryKind, ReadOnlyFileSystem } from '../../ports/readOnlyFileSystem';

type Entry = { kind: 'file'; text: string; readError?: string } | { kind: 'directory'; listError?: string };

function key(root: string, relativePath: string): string {
    return `${root}\u0000${relativePath.split('/').filter((part) => part.length > 0).join('/')}`;
}

export interface MemoryFileSystem extends ReadOnlyFileSystem {
    setFile(root: string, relativePath: string, text: string): void;
    setDirectory(root: string, relativePath: string): void;
    setUnreadable(root: string, relativePath: string, reason: string): void;
    setUnlistable(root: string, relativePath: string, reason: string): void;
    remove(root: string, relativePath: string): void;
}

export function createMemoryFileSystem(): MemoryFileSystem {
    const entries = new Map<string, Entry>();

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
        setFile(root, relativePath, text) {
            ensureParents(root, relativePath);
            entries.set(key(root, relativePath), { kind: 'file', text });
        },
        setDirectory(root, relativePath) {
            ensureParents(root, relativePath);
            entries.set(key(root, relativePath), { kind: 'directory' });
        },
        setUnreadable(root, relativePath, reason) {
            ensureParents(root, relativePath);
            entries.set(key(root, relativePath), { kind: 'file', text: '', readError: reason });
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
        async stat(root, relativePath): Promise<EntryKind | undefined> {
            return entries.get(key(root, relativePath))?.kind;
        },
        async readText(root, relativePath) {
            const entry = entries.get(key(root, relativePath));
            if (entry?.kind !== 'file') {
                throw new Error(`ENOENT: ${relativePath}`);
            }
            if (entry.readError !== undefined) {
                throw new Error(entry.readError);
            }
            return entry.text;
        },
        async readDirectory(root, relativePath) {
            const base = key(root, relativePath);
            const directory = entries.get(base);
            if (directory?.kind !== 'directory') {
                return undefined;
            }
            if (directory.listError !== undefined) {
                throw new Error(directory.listError);
            }
            const names: string[] = [];
            for (const existing of entries.keys()) {
                if (existing.startsWith(`${base}/`) && !existing.slice(base.length + 1).includes('/')) {
                    names.push(existing.slice(base.length + 1));
                }
            }
            return names;
        },
    };
}
