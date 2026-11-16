import { promises as fs } from 'fs';
import type { Dirent, Stats } from 'fs';
import * as path from 'path';
import type { SourceEntryKind, SpecSourcePort } from '../../core/ports/specSource';

const ABSENT_CODES = new Set(['ENOENT', 'ENOTDIR']);

function isAbsent(error: unknown): boolean {
    return typeof error === 'object' && error !== null && ABSENT_CODES.has((error as { code?: string }).code ?? '');
}

function resolve(root: string, relativePath: string): string {
    return path.join(root, ...relativePath.split('/').filter((part) => part.length > 0));
}

function kindOf(entry: Dirent | Stats): SourceEntryKind {
    if (entry.isSymbolicLink()) {
        return 'symlink';
    }
    if (entry.isFile()) {
        return 'file';
    }
    return entry.isDirectory() ? 'directory' : 'other';
}

export function createNodeSpecSource(): SpecSourcePort {
    return {
        async list(root, relativePath) {
            try {
                const entries = await fs.readdir(resolve(root, relativePath), { withFileTypes: true });
                return entries.map((entry) => ({ name: entry.name, kind: kindOf(entry) }));
            } catch (error) {
                if (isAbsent(error)) {
                    return undefined;
                }
                throw error;
            }
        },
        async stat(root, relativePath) {
            try {
                const stats = await fs.lstat(resolve(root, relativePath));
                return { kind: kindOf(stats), mtimeMs: stats.mtimeMs, size: stats.size };
            } catch (error) {
                if (isAbsent(error)) {
                    return undefined;
                }
                throw error;
            }
        },
        readBytes(root, relativePath) {
            return fs.readFile(resolve(root, relativePath));
        },
    };
}
