export interface WorkspaceFolderInfo {
    root: string;
    name: string;
}

export interface Disposable {
    dispose(): void;
}

export interface StatusBarPort {
    show(text: string, action: 'select'): void;
    hide(): void;
}

export interface OutputPort {
    appendBlock(lines: readonly string[]): void;
}

export interface WorkspaceStatePort {
    get(): string | undefined;
    set(root: string): Promise<void>;
}

export interface WorkspaceFoldersPort {
    list(): readonly WorkspaceFolderInfo[];
    onDidChange(listener: () => void): Disposable;
}

export interface ClockPort {
    now(): string;
}
