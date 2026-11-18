import * as vscode from 'vscode';
import type { UiMemoryPort } from '../../core/ports/shell';

export const SHELL_MEMORY_KEY = 'featherspec-studio.shell';
export const BOARD_MEMORY_KEY = 'featherspec-studio.board';

export function createUiMemory(memento: vscode.Memento, key: string): UiMemoryPort {
    return {
        get: () => memento.get<unknown>(key),
        set: async (value) => {
            await memento.update(key, value);
        },
    };
}
