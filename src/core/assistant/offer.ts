import type { AssistantHostPort } from '../ports/assistant';
import type { SettingPort } from '../ports/host';
import { ASSISTANT_IDS, type AssistantId } from '../../shared/protocol/assistant';
import { ASSISTANTS } from './assistants';

export const ASSISTANT_KEY = 'assistant';

export interface Offer {
    assistant: AssistantId;
}

export function offerOf(value: unknown, present: readonly string[]): Offer | undefined {
    const assistant = ASSISTANT_IDS.find((id) => id === value);
    return assistant !== undefined && present.includes(ASSISTANTS[assistant].extensionId) ? { assistant } : undefined;
}

export function extensionPresence(host: AssistantHostPort): SettingPort {
    return {
        read: () => ASSISTANT_IDS.map((id) => ASSISTANTS[id].extensionId).filter((extensionId) => host.extension(extensionId) !== undefined),
        onDidChange: (listener) => host.onDidChangeExtensions(listener),
    };
}
