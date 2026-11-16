import { promises as fs } from 'fs';
import * as path from 'path';
import type { EntryKind, ReadOnlyFileSystem } from '../../core/ports/readOnlyFileSystem';

const ABSENT_CODES = new Set(['ENOENT', 'ENOTDIR']);

function isAbsent(error: unknown): boolean {
    return typeof error === 'object' && error !== null && ABSENT_CODES.has((error as { code?: string }).code ?? '');
}

function resolve(root: string, relativePath: string): string {
    return path.join(root, ...relativePath.split('/').filter((part) => part.length > 0));
}

export function createNodeFileSystem(): ReadOnlyFileSystem {
    return {
        async stat(root, relativePath): Promise<EntryKind | undefined> {
            try {
                const stats = await fs.stat(resolve(root, relativePath));
                if (stats.isFile()) {
                    return 'file';
                }
                return stats.isDirectory() ? 'directory' : 'other';
            } catch (error) {
                if (isAbsent(error)) {
                    return undefined;
                }
                throw error;
            }
        },
        readText(root, relativePath) {
            return fs.readFile(resolve(root, relativePath), 'utf8');
        },
        async readDirectory(root, relativePath) {
            try {
                return await fs.readdir(resolve(root, relativePath));
            } catch (error) {
                if (isAbsent(error)) {
                    return undefined;
                }
                throw error;
            }
        },
    };
}
