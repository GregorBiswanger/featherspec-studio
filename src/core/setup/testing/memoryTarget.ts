import type { SetupTargetPort, TargetEntryKind } from '../../ports/setupTarget';

type Entry = { kind: 'file'; bytes: Uint8Array } | { kind: 'directory' } | { kind: 'other' };

export interface MemoryTarget extends SetupTargetPort {
    setFile(root: string, relativePath: string, content: string | Uint8Array): void;
    setDirectory(root: string, relativePath: string): void;
    setOther(root: string, relativePath: string): void;
    files(root: string): string[];
}

function key(root: string, relativePath: string): string {
    return `${root}\u0000${relativePath}`;
}

export function createMemoryTarget(): MemoryTarget {
    const entries = new Map<string, Entry>();

    function parents(root: string, relativePath: string): void {
        const parts = relativePath.split('/');
        for (let index = 1; index < parts.length; index++) {
            const parent = key(root, parts.slice(0, index).join('/'));
            if (!entries.has(parent)) {
                entries.set(parent, { kind: 'directory' });
            }
        }
    }

    return {
        setFile(root, relativePath, content) {
            parents(root, relativePath);
            entries.set(key(root, relativePath), { kind: 'file', bytes: typeof content === 'string' ? new TextEncoder().encode(content) : content.slice() });
        },
        setDirectory(root, relativePath) {
            parents(root, relativePath);
            entries.set(key(root, relativePath), { kind: 'directory' });
        },
        setOther(root, relativePath) {
            parents(root, relativePath);
            entries.set(key(root, relativePath), { kind: 'other' });
        },
        files(root) {
            return [...entries.entries()].filter(([name, entry]) => name.startsWith(`${root}\u0000`) && entry.kind === 'file').map(([name]) => name.slice(root.length + 1));
        },
        async kind(root, relativePath): Promise<TargetEntryKind | undefined> {
            return entries.get(key(root, relativePath))?.kind;
        },
        async readBytes(root, relativePath) {
            const entry = entries.get(key(root, relativePath));
            if (entry?.kind !== 'file') {
                throw new Error(`not a file: ${relativePath}`);
            }
            return entry.bytes.slice();
        },
    };
}
