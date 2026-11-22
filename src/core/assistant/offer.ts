import type { AssistantHostPort } from '../ports/assistant';
import type { SettingPort } from '../ports/host';
import { ASSISTANT_IDS, ASSISTANT_TARGETS, type AssistantId, type AssistantTarget } from '../../shared/protocol/assistant';
import { ASSISTANTS, type AssistantTable } from './assistants';

export const ASSISTANT_KEY = 'assistant';

export interface Offer {
    assistant: AssistantId;
    attaches?: boolean;
    targets?: AssistantTarget[];
}

export function attachesOf(offer: Offer, table: AssistantTable = ASSISTANTS): boolean {
    return offer.attaches ?? table[offer.assistant]?.attachesSpec ?? false;
}

function sameTargets(first: readonly AssistantTarget[], second: readonly AssistantTarget[]): boolean {
    return first.length === second.length && first.every((target, index) => target === second[index]);
}

export function offerOf(value: unknown, present: readonly string[], attaching?: (id: AssistantId) => boolean, table: AssistantTable = ASSISTANTS): Offer | undefined {
    const assistant = ASSISTANT_IDS.find((id) => id === value);
    const row = assistant === undefined ? undefined : table[assistant];
    if (assistant === undefined || row === undefined || !present.includes(row.extensionId)) {
        return undefined;
    }
    const attaches = attaching === undefined ? (row.attachesSpec === (ASSISTANTS[assistant as keyof typeof ASSISTANTS]?.attachesSpec ?? false) ? undefined : row.attachesSpec) : attaching(assistant);
    return {
        assistant,
        ...(attaches === undefined ? {} : { attaches }),
        ...(sameTargets(row.targets, ASSISTANT_TARGETS[assistant]) ? {} : { targets: [...row.targets] }),
    };
}

export function extensionPresence(host: AssistantHostPort, table: AssistantTable = ASSISTANTS): SettingPort {
    return {
        read: () => ASSISTANT_IDS.flatMap((id) => table[id]?.extensionId ?? []).filter((extensionId) => host.extension(extensionId) !== undefined),
        onDidChange: (listener) => host.onDidChangeExtensions(listener),
    };
}
