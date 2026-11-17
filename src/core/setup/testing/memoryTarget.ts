import type { CreateOutcome, ReplaceOutcome, SetupTargetPort, TargetEntryKind } from '../../ports/setupTarget';

type Entry = { kind: 'file'; bytes: Uint8Array } | { kind: 'directory' } | { kind: 'other' };

export interface MemoryTarget extends SetupTargetPort {
    setFile(root: string, relativePath: string, content: string | Uint8Array): void;
    setDirectory(root: string, relativePath: string): void;
    setOther(root: string, relativePath: string): void;
    remove(root: string, relativePath: string): void;
    files(root: string): string[];
    text(root: string, relativePath: string): string | undefined;
    log: string[];
    failOn(relativePath: string, reason: string): void;
    beforeCreate(listener: (relativePath: string) => void): void;
    beforeReplace(listener: (relativePath: string) => void): void;
}

function key(root: string, relativePath: string): string {
    return `${root}\u0000${relativePath}`;
}

export function createMemoryTarget(): MemoryTarget {
    const entries = new Map<string, Entry>();
    const failures = new Map<string, string>();
    const createListeners: ((relativePath: string) => void)[] = [];
    const replaceListeners: ((relativePath: string) => void)[] = [];
    const log: string[] = [];

    function parents(root: string, relativePath: string): void {
        const parts = relativePath.split('/');
        for (let index = 1; index < parts.length; index++) {
            const parent = key(root, parts.slice(0, index).join('/'));
            if (!entries.has(parent)) {
                entries.set(parent, { kind: 'directory' });
            }
        }
    }

    function refuseBelowFile(root: string, relativePath: string): void {
        const parts = relativePath.split('/');
        for (let index = 1; index < parts.length; index++) {
            const parent = entries.get(key(root, parts.slice(0, index).join('/')));
            if (parent !== undefined && parent.kind !== 'directory') {
                throw new Error('not a directory');
            }
        }
    }

    return {
        log,
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
        remove(root, relativePath) {
            for (const name of [...entries.keys()]) {
                if (name === key(root, relativePath) || name.startsWith(`${key(root, relativePath)}/`)) {
                    entries.delete(name);
                }
            }
        },
        files(root) {
            return [...entries.entries()].filter(([name, entry]) => name.startsWith(`${root}\u0000`) && entry.kind === 'file').map(([name]) => name.slice(root.length + 1)).sort();
        },
        text(root, relativePath) {
            const entry = entries.get(key(root, relativePath));
            return entry?.kind === 'file' ? new TextDecoder().decode(entry.bytes) : undefined;
        },
        failOn(relativePath, reason) {
            failures.set(relativePath, reason);
        },
        beforeCreate(listener) {
            createListeners.push(listener);
        },
        beforeReplace(listener) {
            replaceListeners.push(listener);
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
        async createExclusive(root, relativePath, bytes): Promise<CreateOutcome> {
            createListeners.forEach((listener) => listener(relativePath));
            const failure = failures.get(relativePath);
            if (failure !== undefined) {
                throw new Error(failure);
            }
            refuseBelowFile(root, relativePath);
            if (entries.has(key(root, relativePath))) {
                return 'exists';
            }
            parents(root, relativePath);
            entries.set(key(root, relativePath), { kind: 'file', bytes: bytes.slice() });
            log.push(`create ${relativePath}`);
            return 'created';
        },
        async replaceIfUnchanged(root, relativePath, expected, next): Promise<ReplaceOutcome> {
            replaceListeners.forEach((listener) => listener(relativePath));
            const failure = failures.get(relativePath);
            if (failure !== undefined) {
                throw new Error(failure);
            }
            const entry = entries.get(key(root, relativePath));
            if (entry?.kind !== 'file' || entry.bytes.length !== expected.length || !entry.bytes.every((byte, index) => byte === expected[index])) {
                return 'changed';
            }
            entries.set(key(root, relativePath), { kind: 'file', bytes: next.slice() });
            log.push(`replace ${relativePath}`);
            return 'replaced';
        },
        async clearSetupFolder(root) {
            const failure = failures.get('.featherspec-setup');
            if (failure !== undefined) {
                throw new Error(failure);
            }
            for (const name of [...entries.keys()]) {
                if (name === key(root, '.featherspec-setup') || name.startsWith(`${key(root, '.featherspec-setup')}/`)) {
                    entries.delete(name);
                }
            }
            log.push('clear .featherspec-setup');
        },
    };
}
