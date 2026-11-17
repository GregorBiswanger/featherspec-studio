export interface EarlierRunDataFilesPort {
    exists(relativePath: string): Promise<boolean>;
    entries(relativePath: string): Promise<string[]>;
    read(relativePath: string): Promise<string | undefined>;
    remove(relativePath: string): Promise<void>;
}

export interface EarlierRunDataStatePort {
    has(key: string): boolean;
    remove(key: string): Promise<void>;
}
