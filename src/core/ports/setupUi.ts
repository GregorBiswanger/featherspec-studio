export interface SetupPickItem {
    label: string;
    description: string;
    detail: string;
    root: string;
}

export interface SetupConfirmation {
    message: string;
    detail: string;
    confirmLabel: string;
}

export interface SetupUiPort {
    pickTarget(items: readonly SetupPickItem[], placeholder: string): Promise<string | undefined>;
    confirm(model: SetupConfirmation): Promise<boolean>;
    withProgress<T>(title: string, task: (signal: AbortSignal) => Promise<T>): Promise<T>;
    notify(message: string, actions: readonly string[]): Promise<string | undefined>;
    copy(text: string): Promise<void>;
}
