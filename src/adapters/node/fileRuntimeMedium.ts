import { createHash } from 'node:crypto';
import { createReadStream, promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { MediumLine, RuntimeMedium } from '../../core/ports/runtimeMedium';
import { openRuntimeStore, type RuntimeStore, type RuntimeStoreDeps } from '../../core/runtime/runtimeStore';
import { createUnavailableMedium } from '../../core/runtime/unavailableMedium';

const RETRY_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);
const RETRY_DELAYS_MS = [10, 25, 60, 150, 300];
const TEMP_MARK = '.tmp-';

export type MediumFileSystem = Pick<typeof fs, 'mkdir' | 'readFile' | 'writeFile' | 'appendFile' | 'rename' | 'rm' | 'unlink' | 'readdir' | 'access'>;

export function projectStoreDirectory(storageRoot: string, projectKey: string): string {
    const hash = createHash('sha256').update(projectKey).digest('hex').slice(0, 16);
    return path.join(storageRoot, 'featherspec-studio', 'projects', hash);
}

export type RuntimeStorage = { kind: 'directory'; path: string } | { kind: 'unavailable'; reason: string };

export interface ProjectStoreOpenerDeps extends Omit<RuntimeStoreDeps, 'medium' | 'projectRoot'> {
    storage: RuntimeStorage;
    platform: NodeJS.Platform;
}

export function createProjectStoreOpener(deps: ProjectStoreOpenerDeps): (projectRoot: string) => Promise<RuntimeStore> {
    const { storage, platform, ...store } = deps;
    return async (projectRoot) =>
        await openRuntimeStore({
            ...store,
            medium:
                storage.kind === 'directory'
                    ? createFileRuntimeMedium(projectStoreDirectory(storage.path, platform === 'win32' ? projectRoot.toLowerCase() : projectRoot))
                    : createUnavailableMedium(storage.reason),
            projectRoot,
        });
}

function errorCode(error: unknown): string | undefined {
    return typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : undefined;
}

async function withRetry<T>(action: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
        try {
            return await action();
        } catch (error) {
            const delay = RETRY_DELAYS_MS[attempt];
            if (!RETRY_CODES.has(errorCode(error) ?? '') || delay === undefined) {
                throw error;
            }
            await new Promise<void>((resolve) => setTimeout(resolve, delay));
        }
    }
}

export function createFileRuntimeMedium(baseDirectory: string, files: MediumFileSystem = fs): RuntimeMedium {
    const base = path.resolve(baseDirectory);
    const queues = new Map<string, Promise<void>>();
    let tempCounter = 0;

    function resolveInside(name: string): string {
        const segments = name.split('/');
        if (name === '' || name.includes('\\') || path.isAbsolute(name) || segments.some((segment) => segment === '' || segment === '..' || segment === '.')) {
            throw new Error(`Status history path ${name} is not allowed.`);
        }
        const full = path.resolve(base, ...segments);
        if (!full.startsWith(base + path.sep)) {
            throw new Error(`Status history path ${name} lies outside the store directory.`);
        }
        return full;
    }

    function serial<T>(name: string, action: () => Promise<T>): Promise<T> {
        const previous = queues.get(name) ?? Promise.resolve();
        const result = previous.then(action);
        queues.set(
            name,
            result.then(
                () => undefined,
                () => undefined,
            ),
        );
        return result;
    }

    return {
        async open() {
            await files.mkdir(base, { recursive: true });
        },
        async read(name) {
            const full = resolveInside(name);
            try {
                return await withRetry(() => files.readFile(full, 'utf8'));
            } catch (error) {
                if (errorCode(error) === 'ENOENT') {
                    return undefined;
                }
                throw error;
            }
        },
        async *lines(name): AsyncGenerator<MediumLine> {
            const full = resolveInside(name);
            try {
                await files.access(full);
            } catch {
                return;
            }
            const stream = createReadStream(full, { encoding: 'utf8' });
            let carry = '';
            try {
                for await (const chunk of stream) {
                    carry += chunk as string;
                    let newline = carry.indexOf('\n');
                    while (newline >= 0) {
                        yield { text: carry.slice(0, newline), terminated: true };
                        carry = carry.slice(newline + 1);
                        newline = carry.indexOf('\n');
                    }
                }
                if (carry !== '') {
                    yield { text: carry, terminated: false };
                }
            } finally {
                stream.destroy();
            }
        },
        async append(name, text) {
            const full = resolveInside(name);
            return serial(name, async () => {
                await files.mkdir(path.dirname(full), { recursive: true });
                await withRetry(() => files.appendFile(full, text, 'utf8'));
            });
        },
        async replace(name, text) {
            const full = resolveInside(name);
            return serial(name, async () => {
                await files.mkdir(path.dirname(full), { recursive: true });
                const temporary = `${full}${TEMP_MARK}${process.pid}-${++tempCounter}`;
                await files.writeFile(temporary, text, 'utf8');
                try {
                    await withRetry(() => files.rename(temporary, full));
                } catch (error) {
                    await files.rm(temporary, { force: true });
                    throw error;
                }
            });
        },
        async createExclusive(name, text) {
            const full = resolveInside(name);
            return serial(name, async () => {
                await files.mkdir(path.dirname(full), { recursive: true });
                try {
                    await withRetry(() => files.writeFile(full, text, { encoding: 'utf8', flag: 'wx' }));
                    return true;
                } catch (error) {
                    if (errorCode(error) === 'EEXIST') {
                        return false;
                    }
                    throw error;
                }
            });
        },
        async remove(name) {
            const full = resolveInside(name);
            return serial(name, async () => {
                try {
                    await withRetry(() => files.unlink(full));
                } catch (error) {
                    if (errorCode(error) !== 'ENOENT') {
                        throw error;
                    }
                }
            });
        },
        async list(directory) {
            const full = resolveInside(directory);
            try {
                const entries = await files.readdir(full, { withFileTypes: true });
                return entries
                    .filter((entry) => entry.isFile() && !entry.name.includes(TEMP_MARK))
                    .map((entry) => `${directory}/${entry.name}`)
                    .sort();
            } catch (error) {
                if (errorCode(error) === 'ENOENT') {
                    return [];
                }
                throw error;
            }
        },
    };
}
