import type { Disposable } from './host';

export interface ClipboardPort {
    writeText(text: string): Promise<void>;
}

export type OpenOutcome = 'opened' | 'not-found';

export type OpenPlace = 'beside' | 'activeGroup';

export interface EditorPort {
    open(root: string, key: string, line?: number, place?: OpenPlace): Promise<OpenOutcome>;
}

export interface SelectionSource {
    selection(): { stem: string; path?: string } | undefined;
    onDidChange(listener: () => void): Disposable;
}
