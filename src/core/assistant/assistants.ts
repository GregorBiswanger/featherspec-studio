import type { AssistantId, AssistantTarget } from '../../shared/protocol/assistant';

export interface AssistantCall {
    command: string;
    args: unknown[];
}

export interface AssistantSpec {
    extensionId: string;
    attachesSpec: boolean;
    callsFor(target: AssistantTarget, line: string): AssistantCall[];
}

export const ASSISTANTS: Record<AssistantId, AssistantSpec> = {
    'copilot': {
        extensionId: 'GitHub.copilot-chat',
        attachesSpec: false,
        callsFor(target, line) {
            const open: AssistantCall = { command: 'workbench.action.chat.open', args: [{ query: line, isPartialQuery: true }] };
            return target === 'new' ? [{ command: 'workbench.action.chat.newChat', args: [] }, open] : [open];
        },
    },
    claudeCode: {
        extensionId: 'anthropic.claude-code',
        attachesSpec: true,
        callsFor(_target, line) {
            return [{ command: 'claude-vscode.editor.open', args: [undefined, line] }];
        },
    },
};
