import { promises as fsPromises } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CreateOutcome, ReplaceOutcome, SetupTargetPort, TargetEntryKind } from '../../core/ports/setupTarget';
import { SETUP_FOLDER } from '../../core/discovery/markerWatchPaths';

export type NodeSetupFs = Pick<typeof fsPromises, 'stat' | 'lstat' | 'readFile' | 'readdir' | 'mkdir' | 'open' | 'rm' | 'rename' | 'realpath'>;

const ABSENT_CODES = new Set(['ENOENT', 'ENOTDIR']);
const BUSY_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);
const RENAME_TRIES = 5;
const RENAME_DELAY_MS = 100;

function codeOf(error: unknown): string {
    return typeof error === 'object' && error !== null ? ((error as { code?: string }).code ?? '') : '';
}

function reason(error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error);
    return new Error(message.replace(/,\s+\w+(?:\s+'[^']*')+$/, ''));
}

function sameContent(first: Uint8Array, second: Uint8Array): boolean {
    return first.length === second.length && first.every((byte, index) => byte === second[index]);
}

let counter = 0;

export function createNodeSetupTarget(fs: NodeSetupFs = fsPromises): SetupTargetPort {
    function locate(root: string, relativePath: string): string {
        return path.join(fileURLToPath(root), ...relativePath.split('/').filter((part) => part.length > 0));
    }

    async function writeNew(target: string, bytes: Uint8Array, mode?: number): Promise<'written' | 'exists'> {
        let handle: Awaited<ReturnType<NodeSetupFs['open']>>;
        try {
            handle = await fs.open(target, 'wx', mode);
        } catch (error) {
            if (codeOf(error) === 'EEXIST') {
                return 'exists';
            }
            throw reason(error);
        }
        try {
            await handle.writeFile(bytes);
            await handle.close();
            return 'written';
        } catch (error) {
            await handle.close().catch(() => undefined);
            await fs.rm(target, { force: true }).catch(() => undefined);
            throw reason(error);
        }
    }

    async function renameOver(from: string, to: string): Promise<void> {
        for (let attempt = 1; ; attempt++) {
            try {
                await fs.rename(from, to);
                return;
            } catch (error) {
                if (!BUSY_CODES.has(codeOf(error)) || attempt >= RENAME_TRIES) {
                    throw error;
                }
                await new Promise((resolve) => setTimeout(resolve, RENAME_DELAY_MS));
            }
        }
    }

    return {
        async kind(root, relativePath): Promise<TargetEntryKind | undefined> {
            const target = locate(root, relativePath);
            try {
                const stats = await fs.stat(target);
                return stats.isFile() ? 'file' : stats.isDirectory() ? 'directory' : 'other';
            } catch (error) {
                if (!ABSENT_CODES.has(codeOf(error))) {
                    throw reason(error);
                }
            }
            try {
                await fs.lstat(target);
                return 'other';
            } catch (error) {
                if (ABSENT_CODES.has(codeOf(error))) {
                    return undefined;
                }
                throw reason(error);
            }
        },

        async readBytes(root, relativePath) {
            try {
                return new Uint8Array(await fs.readFile(locate(root, relativePath)));
            } catch (error) {
                throw reason(error);
            }
        },

        async listDirectory(root, relativePath) {
            try {
                return await fs.readdir(locate(root, relativePath));
            } catch (error) {
                if (ABSENT_CODES.has(codeOf(error))) {
                    return undefined;
                }
                throw reason(error);
            }
        },

        async createExclusive(root, relativePath, bytes): Promise<CreateOutcome> {
            const target = locate(root, relativePath);
            try {
                await fs.mkdir(path.dirname(target), { recursive: true });
            } catch (error) {
                throw reason(error);
            }
            return (await writeNew(target, bytes)) === 'written' ? 'created' : 'exists';
        },

        async replaceIfUnchanged(root, relativePath, expected, next): Promise<ReplaceOutcome> {
            let real: string;
            let current: Uint8Array;
            let mode: number;
            try {
                real = await fs.realpath(locate(root, relativePath));
                current = new Uint8Array(await fs.readFile(real));
                mode = (await fs.stat(real)).mode & 0o777;
            } catch (error) {
                if (ABSENT_CODES.has(codeOf(error))) {
                    return 'changed';
                }
                throw reason(error);
            }
            if (!sameContent(current, expected)) {
                return 'changed';
            }
            counter += 1;
            const temporary = `${real}.featherspec-${process.pid}-${counter}.tmp`;
            if ((await writeNew(temporary, next, mode)) === 'exists') {
                throw new Error('a temporary file of this name exists');
            }
            try {
                await renameOver(temporary, real);
            } catch (error) {
                await fs.rm(temporary, { force: true }).catch(() => undefined);
                throw reason(error);
            }
            return 'replaced';
        },

        async clearSetupFolder(root) {
            const folder = locate(root, SETUP_FOLDER);
            try {
                const stats = await fs.lstat(folder);
                if (stats.isDirectory()) {
                    await fs.rm(folder, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
                }
            } catch (error) {
                if (!ABSENT_CODES.has(codeOf(error))) {
                    throw reason(error);
                }
            }
        },
    };
}
