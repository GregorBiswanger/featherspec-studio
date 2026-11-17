export type ArchiveEntryKind = 'file' | 'directory' | 'metadata' | 'other';

export interface ArchiveEntry {
    path: string;
    kind: ArchiveEntryKind;
    bytes: Uint8Array;
}

export type ArchiveReadResult =
    | { ok: true; entries: readonly ArchiveEntry[] }
    | { ok: false; failure: 'unreadable'; detail: string }
    | { ok: false; failure: 'too-large' };

export interface ReleaseArchivePort {
    read(bytes: Uint8Array, maxUnpackedBytes: number): Promise<ArchiveReadResult>;
}
