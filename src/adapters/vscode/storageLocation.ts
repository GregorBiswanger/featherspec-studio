import * as path from 'node:path';

export interface StorageUriLike {
    scheme: string;
    fsPath: string;
}

export type StorageLocation = { kind: 'directory'; path: string } | { kind: 'unavailable'; reason: string };

function isAbsoluteAnywhere(candidate: string): boolean {
    return path.win32.isAbsolute(candidate) || path.posix.isAbsolute(candidate);
}

export function resolveStorageLocation(uri: StorageUriLike, legacyPath: string | undefined): StorageLocation {
    if (uri.scheme === 'file') {
        return { kind: 'directory', path: uri.fsPath };
    }
    if (legacyPath !== undefined && legacyPath !== '' && isAbsoluteAnywhere(legacyPath)) {
        return { kind: 'directory', path: legacyPath };
    }
    return { kind: 'unavailable', reason: `storage location is not on the local file system (scheme "${uri.scheme}")` };
}
