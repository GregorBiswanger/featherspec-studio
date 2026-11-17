export interface WorkspaceFolderInfo {
    root: string;
    name: string;
    displayPath?: string;
}

export interface Disposable {
    dispose(): void;
}

export interface SettingPort {
    read(): unknown;
    onDidChange(listener: () => void): Disposable;
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
    setTimeout(callback: () => void, milliseconds: number): Disposable;
}

export interface MarkerWatchPort {
    watch(root: string, listener: () => void): Disposable;
}

export type NotificationAction = 'Open setup guide' | 'Refresh';

export interface NotificationModel {
    message: string;
    actions: readonly NotificationAction[];
}

export interface SelectItem {
    label: string;
    description: string;
    detail: string;
    root: string;
}

export interface UiPort {
    showQuickPick(items: readonly SelectItem[]): Promise<SelectItem | undefined>;
    showNotification(model: NotificationModel): Promise<NotificationAction | undefined>;
    openExternal(url: string): Promise<void>;
}
