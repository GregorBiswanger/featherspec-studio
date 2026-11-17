export type TargetEntryKind = 'file' | 'directory' | 'other';

export interface SetupTargetPort {
    kind(root: string, relativePath: string): Promise<TargetEntryKind | undefined>;
    readBytes(root: string, relativePath: string): Promise<Uint8Array>;
}
