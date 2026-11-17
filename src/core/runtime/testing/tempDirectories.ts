import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export interface TempDirectories {
    make(prefix: string): Promise<string>;
    closeBeforeRemoval(close: () => Promise<void>): void;
    removeAll(): Promise<void>;
}

export function createTempDirectories(): TempDirectories {
    const directories: string[] = [];
    const closers: (() => Promise<void>)[] = [];
    return {
        async make(prefix) {
            const directory = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
            directories.push(directory);
            return directory;
        },
        closeBeforeRemoval(close) {
            closers.push(close);
        },
        async removeAll() {
            const failures: unknown[] = [];
            for (const close of closers.splice(0).reverse()) {
                await close().catch((error: unknown) => void failures.push(error));
            }
            for (const directory of directories.splice(0)) {
                await fs.rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
            }
            if (failures.length > 0) {
                throw failures[0];
            }
        },
    };
}
