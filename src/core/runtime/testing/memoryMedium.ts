import type { MediumLine, RuntimeMedium } from '../../ports/runtimeMedium';

export interface MemoryBacking {
    files: Map<string, string>;
}

export function createMemoryBacking(): MemoryBacking {
    return { files: new Map() };
}

export function splitLines(text: string): MediumLine[] {
    if (text === '') {
        return [];
    }
    const parts = text.split('\n');
    const last = parts.pop() ?? '';
    const lines: MediumLine[] = parts.map((part) => ({ text: part, terminated: true }));
    if (last !== '') {
        lines.push({ text: last, terminated: false });
    }
    return lines;
}

export function createMemoryMedium(backing: MemoryBacking): RuntimeMedium {
    return {
        async open() {},
        async read(name) {
            return backing.files.get(name);
        },
        async *lines(name) {
            for (const line of splitLines(backing.files.get(name) ?? '')) {
                yield line;
            }
        },
        async append(name, text) {
            backing.files.set(name, (backing.files.get(name) ?? '') + text);
        },
        async replace(name, text) {
            backing.files.set(name, text);
        },
        async createExclusive(name, text) {
            if (backing.files.has(name)) {
                return false;
            }
            backing.files.set(name, text);
            return true;
        },
        async remove(name) {
            backing.files.delete(name);
        },
        async list(directory) {
            const prefix = directory.endsWith('/') ? directory : `${directory}/`;
            return [...backing.files.keys()].filter((name) => name.startsWith(prefix) && !name.slice(prefix.length).includes('/')).sort();
        },
    };
}
