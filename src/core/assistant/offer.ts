import type { AssistantHostPort } from '../ports/assistant';
import type { SettingPort } from '../ports/host';
import { ASSISTANT_IDS, type AssistantId } from '../../shared/protocol/assistant';
import { ASSISTANTS } from './assistants';

export const ASSISTANT_KEY = 'assistant';

export interface Offer {
    assistant: AssistantId;
    attaches?: boolean;
}

export function attachesOf(offer: Offer): boolean {
    return offer.attaches ?? ASSISTANTS[offer.assistant].attachesSpec;
}

export function offerOf(value: unknown, present: readonly string[], attaching?: (id: AssistantId) => boolean): Offer | undefined {
    const assistant = ASSISTANT_IDS.find((id) => id === value);
    if (assistant === undefined || !present.includes(ASSISTANTS[assistant].extensionId)) {
        return undefined;
    }
    return attaching === undefined ? { assistant } : { assistant, attaches: attaching(assistant) };
}

export function extensionPresence(host: AssistantHostPort): SettingPort {
    return {
        read: () => ASSISTANT_IDS.map((id) => ASSISTANTS[id].extensionId).filter((extensionId) => host.extension(extensionId) !== undefined),
        onDidChange: (listener) => host.onDidChangeExtensions(listener),
    };
}
