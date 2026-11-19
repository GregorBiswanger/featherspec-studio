import type { Disposable } from './host';

export interface CommandPort {
    execute(command: string, args: readonly unknown[]): Promise<unknown>;
}

export interface AssistantExtension {
    active: boolean;
}

export interface AssistantHostPort extends CommandPort {
    extension(id: string): AssistantExtension | undefined;
    activate(id: string): Promise<void>;
    commands(): Promise<readonly string[]>;
    fileUri(root: string, key: string): unknown;
    onDidChangeExtensions(listener: () => void): Disposable;
}
