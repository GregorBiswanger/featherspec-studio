export type EntryKind = 'file' | 'directory' | 'other';

export interface ReadOnlyFileSystem {
    stat(root: string, relativePath: string): Promise<EntryKind | undefined>;
    readText(root: string, relativePath: string): Promise<string>;
    readDirectory(root: string, relativePath: string): Promise<readonly string[] | undefined>;
}
