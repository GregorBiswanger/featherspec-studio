import type * as vscode from 'vscode';
import type { EarlierRunDataStatePort } from '../../core/ports/earlierRunData';

export function createEarlierRunDataState(memento: vscode.Memento): EarlierRunDataStatePort {
    return {
        has: (key) => memento.keys().includes(key),
        remove: async (key) => {
            await memento.update(key, undefined);
        },
    };
}
