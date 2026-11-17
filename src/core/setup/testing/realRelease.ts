import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { createTarGzArchive } from '../../../adapters/node/tarGzArchive';
import { checkRelease, type ReleaseFile } from '../releaseArchive';

export interface RealRelease {
    version: string;
    files: readonly ReleaseFile[];
}

let cached: Promise<RealRelease> | undefined;

export function realReleaseBytes(): Uint8Array {
    return new Uint8Array(readFileSync(path.resolve(__dirname, '..', '..', '..', '..', 'test', 'fixtures', 'setup', 'featherspec-1.10.0.tar.gz')));
}

export function loadRealRelease(): Promise<RealRelease> {
    cached ??= checkRelease(createTarGzArchive(), realReleaseBytes()).then((result) => {
        if (!result.ok) {
            throw new Error(`the real release fixture is refused: ${result.reason}`);
        }
        return { version: result.version, files: result.files };
    });
    return cached;
}

export async function realFile(releasePath: string): Promise<ReleaseFile> {
    const release = await loadRealRelease();
    const found = release.files.find((file) => file.path === releasePath);
    if (found === undefined) {
        throw new Error(`the real release has no ${releasePath}`);
    }
    return found;
}
