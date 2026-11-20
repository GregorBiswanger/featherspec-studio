import type { AssistantId, AssistantTarget } from '../../shared/protocol/assistant';

export interface AssistantCall {
    command: string;
    args: unknown[];
}

export interface AssistantAttachment {
    uri: unknown;
    path: string;
}

export interface AssistantSpec {
    extensionId: string;
    attachesSpec: boolean;
    callsFor(target: AssistantTarget, line: string, attachment?: AssistantAttachment): AssistantCall[];
}

export const ASSISTANTS: Record<AssistantId, AssistantSpec> = {
    'copilot': {
        extensionId: 'GitHub.copilot-chat',
        attachesSpec: true,
        callsFor(target, line, attachment) {
            const open: AssistantCall = { command: 'workbench.action.chat.open', args: [{ query: line, isPartialQuery: true, ...(attachment === undefined ? {} : { attachFiles: [attachment.uri] }) }] };
            return target === 'new' ? [{ command: 'workbench.action.chat.newChat', args: [] }, open] : [open];
        },
    },
    claudeCode: {
        extensionId: 'anthropic.claude-code',
        attachesSpec: true,
        callsFor(_target, line, attachment) {
            const suffixed = attachment !== undefined && !/\s/.test(attachment.path);
            return [{ command: 'claude-vscode.editor.open', args: [undefined, suffixed ? `${line} @${attachment.path}` : line] }];
        },
    },
};
