import { isRecord } from './envelope';

export const ASSISTANT_IDS = ['copilot', 'claudeCode'] as const;
export type AssistantId = (typeof ASSISTANT_IDS)[number];

export type AssistantTarget = 'new' | 'current';

export const ASSISTANT_TARGETS: Record<AssistantId, readonly AssistantTarget[]> = {
    'copilot': ['new', 'current'],
    claudeCode: ['new'],
};

export interface SendView {
    assistant: AssistantId;
    target: AssistantTarget;
    targets: AssistantTarget[];
}

export function isAssistantId(value: unknown): value is AssistantId {
    return typeof value === 'string' && (ASSISTANT_IDS as readonly string[]).includes(value);
}

export function isAssistantTarget(value: unknown): value is AssistantTarget {
    return value === 'new' || value === 'current';
}

const SEND_VIEW_KEYS: readonly string[] = ['assistant', 'target', 'targets'];

export function isSendView(value: unknown): value is SendView {
    if (!isRecord(value) || Object.keys(value).length !== SEND_VIEW_KEYS.length || !SEND_VIEW_KEYS.every((key) => key in value)) {
        return false;
    }
    const { assistant, target, targets } = value;
    if (!isAssistantId(assistant) || !isAssistantTarget(target) || !Array.isArray(targets)) {
        return false;
    }
    const own = ASSISTANT_TARGETS[assistant];
    return targets.length === own.length && own.every((item, index) => targets[index] === item) && own.includes(target);
}

export interface SendPromptPayload {
    assistant: AssistantId;
    target: AssistantTarget;
    line: string;
}

export type SendOutcome = 'opened' | 'copied' | 'copyFailed';

export interface SendResultEventPayload {
    outcome: SendOutcome;
    text: string;
}

const SEND_PROMPT_KEYS: readonly string[] = ['assistant', 'target', 'line'];

export function isSendPromptPayload(value: unknown): value is SendPromptPayload {
    if (!isRecord(value) || Object.keys(value).length !== SEND_PROMPT_KEYS.length || !SEND_PROMPT_KEYS.every((key) => key in value)) {
        return false;
    }
    const { assistant, target, line } = value;
    return isAssistantId(assistant) && isAssistantTarget(target) && ASSISTANT_TARGETS[assistant].includes(target) && typeof line === 'string' && line.length > 0;
}

const SEND_OUTCOMES: readonly string[] = ['opened', 'copied', 'copyFailed'];

export function isSendResultEventPayload(value: unknown): value is SendResultEventPayload {
    return isRecord(value) && Object.keys(value).length === 2 && typeof value.outcome === 'string' && SEND_OUTCOMES.includes(value.outcome) && typeof value.text === 'string';
}
