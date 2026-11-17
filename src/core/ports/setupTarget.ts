export type TargetEntryKind = 'file' | 'directory' | 'other';

export type CreateOutcome = 'created' | 'exists';
export type ReplaceOutcome = 'replaced' | 'changed';

export interface SetupTargetPort {
    kind(root: string, relativePath: string): Promise<TargetEntryKind | undefined>;
    readBytes(root: string, relativePath: string): Promise<Uint8Array>;
    listDirectory(root: string, relativePath: string): Promise<readonly string[] | undefined>;
    createExclusive(root: string, relativePath: string, bytes: Uint8Array): Promise<CreateOutcome>;
    replaceIfUnchanged(root: string, relativePath: string, expected: Uint8Array, next: Uint8Array): Promise<ReplaceOutcome>;
    clearSetupFolder(root: string): Promise<void>;
}
