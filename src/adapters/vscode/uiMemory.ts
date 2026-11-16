import * as vscode from 'vscode';
import type { UiMemoryPort } from '../../core/ports/shell';

const KEY = 'featherspec-studio.shell';

export function createUiMemory(memento: vscode.Memento): UiMemoryPort {
    return {
        get: () => memento.get<unknown>(KEY),
        set: async (value) => {
            await memento.update(KEY, value);
        },
    };
}
