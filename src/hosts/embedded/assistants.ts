import { OPEN_CHAT_COMMAND } from '../../core/assistant/send';
import type { AssistantAttachment, AssistantSpec, AssistantTable } from '../../core/assistant/assistants';
import { CLI_FORMS, cliText } from '../../core/assistant/references';
import type { AssistantId } from '../../shared/protocol/assistant';
import { AGENT_UNTRUSTED_CAUSE, agentNotInstalledCause, agentNotInstalledText, agentNotReadyCause, agentNotReadyNowCause, agentUntrustedText, agentWaitingText, TERMINAL_UNAVAILABLE_CAUSE, terminalCallFailedCause } from '../../shared/protocol/assistantTexts';

export const TERMINAL_PLUGIN = 'org.jetbrains.plugins.terminal';
export { OPEN_CHAT_COMMAND };
export const TERMINAL_COMMAND = 'featherspec.terminal';
export const TERMINAL_BUDGET_MS = 20000;
export const READY_BUDGET_MS = 15000;
export const UNSET_ASSISTANT = 'junie';

export interface CliAgent {
    id: AssistantId;
    name: string;
    command: string;
    presence: string;
}

export const CLI_AGENTS: readonly CliAgent[] = [
    { id: 'junie', name: 'Junie', command: 'junie', presence: 'cli:junie' },
    { id: 'claudeCode', name: 'Claude Code', command: 'claude', presence: 'cli:claude' },
    { id: 'copilot', name: 'Copilot', command: 'copilot', presence: 'cli:copilot' },
];

const CLI_PRESENCE = 'cli:';

export function pluginPresent(id: string, plugins: readonly string[]): boolean {
    return id.startsWith(CLI_PRESENCE) ? plugins.includes(TERMINAL_PLUGIN) && plugins.includes(id) : plugins.includes(id);
}

function noticeOf(agent: CliAgent): (message: string) => string | undefined {
    return (message) => {
        if (message === agentNotReadyCause(agent.name, READY_BUDGET_MS) || message === agentNotReadyNowCause(agent.name)) {
            return agentWaitingText(agent.name);
        }
        if (message === agentNotInstalledCause(agent.command)) {
            return agentNotInstalledText(agent.name, agent.command);
        }
        return message === AGENT_UNTRUSTED_CAUSE ? agentUntrustedText(agent.command) : undefined;
    };
}

function cliRow(agent: CliAgent): AssistantSpec {
    const notice = noticeOf(agent);
    return {
        extensionId: agent.presence,
        handover: 'send',
        attachesSpec: true,
        targets: ['current', 'new'],
        timeoutMs: TERMINAL_BUDGET_MS,
        causes: {
            unavailable: TERMINAL_UNAVAILABLE_CAUSE,
            failed: (message) => (notice(message) === undefined ? terminalCallFailedCause(message) : message),
            notice,
        },
        callsFor: (target, line, attachment) => {
            const files: readonly AssistantAttachment[] = attachment === undefined ? [] : 'path' in attachment ? [attachment] : attachment;
            return [{ command: TERMINAL_COMMAND, args: [{ assistant: agent.id, target, text: cliText(line, files.map((file) => file.path), CLI_FORMS[agent.id]) }] }];
        },
    };
}

export function createJetBrainsAssistants(): AssistantTable {
    return Object.fromEntries(CLI_AGENTS.map((agent) => [agent.id, cliRow(agent)]));
}

export const JETBRAINS_SEND_TARGETS = { 'copilot': ['current', 'new'], claudeCode: ['current', 'new'], junie: ['current', 'new'] } as const;
