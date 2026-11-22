import { isRecord } from './envelope';

export const ASSISTANT_IDS = ['copilot', 'claudeCode', 'junie'] as const;
export type AssistantId = (typeof ASSISTANT_IDS)[number];

export type AssistantTarget = 'new' | 'current';

export const ASSISTANT_TARGETS: Record<AssistantId, readonly AssistantTarget[]> = {
    'copilot': ['new', 'current'],
    claudeCode: ['new'],
    junie: ['new'],
};

export function attachesInTarget(assistant: AssistantId, target: AssistantTarget): boolean {
    return !(assistant === 'copilot' && target === 'current');
}

export interface SendAttachment {
    name: string;
    path: string;
}

export interface SendView {
    assistant: AssistantId;
    target: AssistantTarget;
    targets: AssistantTarget[];
    attach?: SendAttachment;
    attachAlso?: SendAttachment[];
}

export function isAssistantId(value: unknown): value is AssistantId {
    return typeof value === 'string' && (ASSISTANT_IDS as readonly string[]).includes(value);
}

export function isAssistantTarget(value: unknown): value is AssistantTarget {
    return value === 'new' || value === 'current';
}

const SEND_VIEW_KEYS: readonly string[] = ['assistant', 'target', 'targets'];

const ATTACHMENT_KEYS: readonly string[] = ['name', 'path'];

function isSendAttachment(value: unknown): value is SendAttachment {
    if (!isRecord(value) || Object.keys(value).length !== ATTACHMENT_KEYS.length || !ATTACHMENT_KEYS.every((key) => key in value)) {
        return false;
    }
    const { name, path } = value;
    return typeof name === 'string' && typeof path === 'string' && name !== '' && path !== '' && path.slice(path.lastIndexOf('/') + 1) === name;
}

export function isSendView(value: unknown): value is SendView {
    if (!isRecord(value) || !SEND_VIEW_KEYS.every((key) => key in value)) {
        return false;
    }
    const withAttach = 'attach' in value;
    const withAlso = 'attachAlso' in value;
    if (Object.keys(value).length !== SEND_VIEW_KEYS.length + (withAttach ? 1 : 0) + (withAlso ? 1 : 0) || (withAttach && !isSendAttachment(value.attach))) {
        return false;
    }
    if (withAlso && (!withAttach || !Array.isArray(value.attachAlso) || value.attachAlso.length === 0 || !value.attachAlso.every(isSendAttachment))) {
        return false;
    }
    const { assistant, target, targets } = value;
    if (!isAssistantId(assistant) || !isAssistantTarget(target) || !Array.isArray(targets)) {
        return false;
    }
    const own = ASSISTANT_TARGETS[assistant];
    return targets.length === own.length && own.every((item, index) => targets[index] === item) && own.includes(target);
}

export interface SendRequest {
    assistant: AssistantId;
    target: AssistantTarget;
    line: string;
    attach?: string;
    attachAlso?: string[];
}

export interface SendPromptPayload extends SendRequest {
    token: string;
}

export type SendOutcome = 'opened' | 'copied' | 'copyFailed';

export interface SendOutcomeView {
    outcome: SendOutcome;
    text: string;
}

export interface SendResultEventPayload extends SendOutcomeView {
    token: string;
}

const SEND_PROMPT_KEYS: readonly string[] = ['assistant', 'target', 'line', 'token'];
const SEND_RESULT_KEYS: readonly string[] = ['outcome', 'text', 'token'];
const SEND_TOKEN = /^[A-Za-z0-9-]{1,64}$/;

export function isSendToken(value: unknown): value is string {
    return typeof value === 'string' && SEND_TOKEN.test(value);
}

export function isSendPromptPayload(value: unknown): value is SendPromptPayload {
    if (!isRecord(value) || !SEND_PROMPT_KEYS.every((key) => key in value)) {
        return false;
    }
    const withAttach = 'attach' in value;
    const withAlso = 'attachAlso' in value;
    if (Object.keys(value).length !== SEND_PROMPT_KEYS.length + (withAttach ? 1 : 0) + (withAlso ? 1 : 0) || (withAttach && (typeof value.attach !== 'string' || value.attach === ''))) {
        return false;
    }
    if (withAlso && (!withAttach || !Array.isArray(value.attachAlso) || value.attachAlso.length === 0 || !value.attachAlso.every((path) => typeof path === 'string' && path !== ''))) {
        return false;
    }
    const { assistant, target, line, token } = value;
    return isAssistantId(assistant) && isAssistantTarget(target) && ASSISTANT_TARGETS[assistant].includes(target) && typeof line === 'string' && line.length > 0 && isSendToken(token);
}

const SEND_OUTCOMES: readonly string[] = ['opened', 'copied', 'copyFailed'];

export function isSendResultEventPayload(value: unknown): value is SendResultEventPayload {
    if (!isRecord(value) || Object.keys(value).length !== SEND_RESULT_KEYS.length || !SEND_RESULT_KEYS.every((key) => key in value)) {
        return false;
    }
    const { outcome, text, token } = value;
    return typeof outcome === 'string' && SEND_OUTCOMES.includes(outcome) && typeof text === 'string' && isSendToken(token);
}
