import * as vscode from 'vscode';
import type { AssistantHostPort } from '../../core/ports/assistant';

export function createAssistantHost(): AssistantHostPort {
    return {
        execute: (command, args) => Promise.resolve(vscode.commands.executeCommand(command, ...args)),
        extension(id) {
            const found = vscode.extensions.getExtension(id);
            return found === undefined ? undefined : { active: found.isActive };
        },
        async activate(id) {
            const found = vscode.extensions.getExtension(id);
            if (found === undefined) {
                throw new Error(`extension ${id} not found`);
            }
            await found.activate();
        },
        async commands() {
            return vscode.commands.getCommands(true);
        },
        onDidChangeExtensions: (listener) => vscode.extensions.onDidChange(listener),
    };
}
