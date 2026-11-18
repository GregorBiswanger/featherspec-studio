import * as vscode from 'vscode';
import type { CommandPort } from '../../core/ports/assistant';

export function createAssistantHost(): CommandPort {
    return {
        execute: (command, args) => Promise.resolve(vscode.commands.executeCommand(command, ...args)),
    };
}
