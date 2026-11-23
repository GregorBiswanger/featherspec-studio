import { ASSISTANT_TARGETS, type AssistantId, type AssistantTarget } from '../../shared/protocol/assistant';

export interface AssistantCall {
    command: string;
    args: unknown[];
}

export interface AssistantAttachment {
    uri: unknown;
    path: string;
}

export type AssistantHandover = 'send' | 'copyFor';

export interface AssistantSpec {
    extensionId: string;
    handover: AssistantHandover;
    attachesSpec: boolean;
    targets: readonly AssistantTarget[];
    text?(line: string, paths: readonly string[]): string;
    timeoutMs?: number;
    place?(): string;
    causes?: { unavailable: string; failed(message: string): string; waiting?(message: string): boolean };
    callsFor(target: AssistantTarget, line: string, attachment?: AssistantAttachment | readonly AssistantAttachment[]): AssistantCall[];
}

function listOf(attachment: AssistantAttachment | readonly AssistantAttachment[] | undefined): readonly AssistantAttachment[] {
    return attachment === undefined ? [] : 'path' in attachment ? [attachment] : attachment;
}

export type AssistantTable = Partial<Record<AssistantId, AssistantSpec>>;

export const ASSISTANTS: Record<'copilot' | 'claudeCode', AssistantSpec> = {
    'copilot': {
        extensionId: 'GitHub.copilot-chat',
        handover: 'send',
        attachesSpec: true,
        targets: ASSISTANT_TARGETS['copilot'],
        callsFor(target, line, attachment) {
            const files = listOf(attachment);
            const open: AssistantCall = { command: 'workbench.action.chat.open', args: [{ query: line, isPartialQuery: true, ...(files.length === 0 ? {} : { attachFiles: files.map((file) => file.uri) }) }] };
            return target === 'new' ? [{ command: 'workbench.action.chat.newChat', args: [] }, open] : [open];
        },
    },
    claudeCode: {
        extensionId: 'anthropic.claude-code',
        handover: 'send',
        attachesSpec: true,
        targets: ASSISTANT_TARGETS.claudeCode,
        callsFor(_target, line, attachment) {
            const mentions = listOf(attachment).filter((file) => !/\s/.test(file.path)).map((file) => ` @${file.path}`);
            return [{ command: 'claude-vscode.editor.open', args: [undefined, `${line}${mentions.join('')}`] }];
        },
    },
};
