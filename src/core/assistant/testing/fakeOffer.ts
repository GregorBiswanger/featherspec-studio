import type { SettingPort } from '../../ports/host';
import { createSettingsSource, type SettingsSource } from '../../settings/settingsSource';
import type { AssistantId } from '../../../shared/protocol/assistant';
import { ASSISTANTS, type AssistantTable } from '../assistants';
import { extensionPresence, offerOf, type Offer } from '../offer';
import { createFakeAssistantHost, type FakeAssistantHost } from './fakeAssistantHost';

function extensionOf(assistant: AssistantId): string {
    return (ASSISTANTS as AssistantTable)[assistant]?.extensionId ?? assistant;
}

export interface FakeOffer extends SettingsSource<Offer | undefined> {
    host: FakeAssistantHost;
    choose(value: unknown): void;
    install(assistant: AssistantId): void;
    uninstall(assistant: AssistantId): void;
    set(next: Offer | undefined): void;
}

export interface FakeOfferOptions {
    attaching?: (id: AssistantId) => boolean;
}

export function createFakeOffer(initial: Offer | undefined = undefined, options: FakeOfferOptions = {}): FakeOffer {
    const host = createFakeAssistantHost();
    const listeners = new Set<() => void>();
    let value: unknown = 'none';
    const setting: SettingPort = {
        read: () => value,
        onDidChange(listener) {
            listeners.add(listener);
            return { dispose: () => void listeners.delete(listener) };
        },
    };
    const source = createSettingsSource([setting, extensionPresence(host)], ([chosen, present]) => offerOf(chosen, present as readonly string[], options.attaching));
    const fake: FakeOffer = {
        host,
        read: () => source.read(),
        onDidChange: (listener) => source.onDidChange(listener),
        choose(next) {
            value = next;
            [...listeners].forEach((listener) => listener());
        },
        install(assistant) {
            host.install(extensionOf(assistant));
            host.fireExtensionsChanged();
        },
        uninstall(assistant) {
            host.uninstall(extensionOf(assistant));
            host.fireExtensionsChanged();
        },
        set(next) {
            if (next === undefined) {
                fake.choose('none');
                return;
            }
            host.install(extensionOf(next.assistant));
            fake.choose(next.assistant);
        },
    };
    if (initial !== undefined) {
        host.install(extensionOf(initial.assistant));
        value = initial.assistant;
    }
    return fake;
}
