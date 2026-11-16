import type { Disposable } from './host';

export interface FileWatchPort {
    watch(root: string, listener: (relativePath: string) => void): Disposable;
}
