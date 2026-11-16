export type SourceEntryKind = 'file' | 'directory' | 'symlink' | 'other';

export interface SourceEntry {
    name: string;
    kind: SourceEntryKind;
}

export interface SourceStat {
    kind: SourceEntryKind;
    mtimeMs: number | undefined;
    size: number | undefined;
}

export interface SpecSourcePort {
    list(root: string, relativePath: string): Promise<readonly SourceEntry[] | undefined>;
    stat(root: string, relativePath: string): Promise<SourceStat | undefined>;
    readBytes(root: string, relativePath: string): Promise<Uint8Array>;
}
