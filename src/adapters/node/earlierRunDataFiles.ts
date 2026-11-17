import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { EarlierRunDataFilesPort } from '../../core/ports/earlierRunData';

export type EarlierRunDataFileSystem = Pick<typeof fs, 'readdir' | 'readFile' | 'rm' | 'access'>;

function errorCode(error: unknown): string | undefined {
    return typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : undefined;
}

export function createEarlierRunDataFiles(storageRoot: string, files: EarlierRunDataFileSystem = fs): EarlierRunDataFilesPort {
    const base = path.resolve(storageRoot);

    function resolveInside(relativePath: string): string {
        const segments = relativePath.split('/');
        if (relativePath === '' || relativePath.includes('\\') || path.isAbsolute(relativePath) || segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
            throw new Error(`Path ${relativePath} is not allowed.`);
        }
        const full = path.resolve(base, ...segments);
        if (!full.startsWith(base + path.sep)) {
            throw new Error(`Path ${relativePath} lies outside the global storage.`);
        }
        return full;
    }

    return {
        async exists(relativePath) {
            try {
                await files.access(resolveInside(relativePath));
                return true;
            } catch (error) {
                if (errorCode(error) === 'ENOENT' || errorCode(error) === 'ENOTDIR') {
                    return false;
                }
                throw error;
            }
        },
        async entries(relativePath) {
            try {
                return await files.readdir(resolveInside(relativePath));
            } catch (error) {
                if (errorCode(error) === 'ENOENT' || errorCode(error) === 'ENOTDIR') {
                    return [];
                }
                throw error;
            }
        },
        async read(relativePath) {
            try {
                return await files.readFile(resolveInside(relativePath), 'utf8');
            } catch (error) {
                if (errorCode(error) === 'ENOENT' || errorCode(error) === 'ENOTDIR') {
                    return undefined;
                }
                throw error;
            }
        },
        async remove(relativePath) {
            await files.rm(resolveInside(relativePath), { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
        },
    };
}
