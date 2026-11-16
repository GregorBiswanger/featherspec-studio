import * as vscode from 'vscode';
import type { WorkspaceStatePort } from '../../core/ports/host';

const KEY = 'featherspec-studio.activeProject';

export function createWorkspaceState(memento: vscode.Memento): WorkspaceStatePort {
    return {
        get: () => memento.get<string>(KEY),
        set: async (root) => {
            await memento.update(KEY, root);
        },
    };
}
