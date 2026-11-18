import type { Disposable } from './host';

export interface ClipboardPort {
    writeText(text: string): Promise<void>;
}

export type OpenOutcome = 'opened' | 'not-found';

export interface EditorPort {
    open(root: string, key: string, line?: number): Promise<OpenOutcome>;
}

export interface SelectionSource {
    selection(): { stem: string; path?: string } | undefined;
    onDidChange(listener: () => void): Disposable;
}
