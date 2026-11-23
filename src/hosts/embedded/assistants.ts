import { OPEN_CHAT_COMMAND } from '../../core/assistant/send';
import type { AssistantTable } from '../../core/assistant/assistants';
import { claudeText, copilotCopyText, JUNIE_FORM, junieCopyText } from '../../core/assistant/references';
import { CLAUDE_NOT_INSTALLED_CAUSE, CLAUDE_NOT_INSTALLED_TEXT, CLAUDE_NOT_READY_NOW_CAUSE, CLAUDE_UNTRUSTED_CAUSE, CLAUDE_UNTRUSTED_TEXT, CLAUDE_WAITING_TEXT, claudeNotReadyCause, COPY_FOR_PLACES, JUNIE_WINDOW_PLACE, TERMINAL_UNAVAILABLE_CAUSE, terminalCallFailedCause } from '../../shared/protocol/assistantTexts';

export const GITHUB_PLUGIN = 'com.github.copilot';
export const TERMINAL_PLUGIN = 'org.jetbrains.plugins.terminal';
export const JUNIE_PLUGIN = 'org.jetbrains.junie';
export const AI_ASSISTANT_PLUGIN = 'com.intellij.ml.llm';
export const JUNIE_PRESENCE = 'junie';
export { OPEN_CHAT_COMMAND };
export const CLAUDE_TERMINAL_COMMAND = 'featherspec.claudeTerminal';
export const CLAUDE_TERMINAL_BUDGET_MS = 20000;
export const CLAUDE_READY_BUDGET_MS = 15000;

export function pluginPresent(id: string, plugins: readonly string[]): boolean {
    return id === JUNIE_PRESENCE ? plugins.includes(JUNIE_PLUGIN) || plugins.includes(AI_ASSISTANT_PLUGIN) : plugins.includes(id);
}

function noticeOf(message: string): string | undefined {
    if (message === claudeNotReadyCause(CLAUDE_READY_BUDGET_MS) || message === CLAUDE_NOT_READY_NOW_CAUSE) {
        return CLAUDE_WAITING_TEXT;
    }
    if (message === CLAUDE_NOT_INSTALLED_CAUSE) {
        return CLAUDE_NOT_INSTALLED_TEXT;
    }
    return message === CLAUDE_UNTRUSTED_CAUSE ? CLAUDE_UNTRUSTED_TEXT : undefined;
}

export function createJetBrainsAssistants(plugins: () => readonly string[]): AssistantTable {
    return {
        'copilot': {
            extensionId: GITHUB_PLUGIN,
            handover: 'copyFor',
            attachesSpec: true,
            targets: ['new'],
            text: copilotCopyText,
            callsFor: () => [],
        },
        claudeCode: {
            extensionId: TERMINAL_PLUGIN,
            handover: 'send',
            attachesSpec: true,
            targets: ['current', 'new'],
            timeoutMs: CLAUDE_TERMINAL_BUDGET_MS,
            causes: {
                unavailable: TERMINAL_UNAVAILABLE_CAUSE,
                failed: (message) => (noticeOf(message) === undefined ? terminalCallFailedCause(message) : message),
                notice: noticeOf,
            },
            callsFor: (target, line, attachment) => {
                const files = attachment === undefined ? [] : 'path' in attachment ? [attachment] : attachment;
                return [{ command: CLAUDE_TERMINAL_COMMAND, args: [{ target, text: claudeText(line, files.map((file) => file.path)) }] }];
            },
        },
        junie: {
            extensionId: JUNIE_PRESENCE,
            handover: 'copyFor',
            attachesSpec: true,
            targets: ['new'],
            text: (line, paths) => junieCopyText(line, paths, JUNIE_FORM),
            place: () => (plugins().includes(AI_ASSISTANT_PLUGIN) ? COPY_FOR_PLACES.junie : JUNIE_WINDOW_PLACE),
            callsFor: () => [],
        },
    };
}

export const JETBRAINS_SEND_TARGETS = { 'copilot': ['new'], claudeCode: ['current', 'new'], junie: ['new'] } as const;
