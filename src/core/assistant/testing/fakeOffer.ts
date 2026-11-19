import type { SettingPort } from '../../ports/host';
import { createSettingsSource, type SettingsSource } from '../../settings/settingsSource';
import type { AssistantId } from '../../../shared/protocol/assistant';
import { ASSISTANTS } from '../assistants';
import { extensionPresence, offerOf, type Offer } from '../offer';
import { createFakeAssistantHost, type FakeAssistantHost } from './fakeAssistantHost';

export interface FakeOffer extends SettingsSource<Offer | undefined> {
    host: FakeAssistantHost;
    choose(value: unknown): void;
    install(assistant: AssistantId): void;
    uninstall(assistant: AssistantId): void;
    set(next: Offer | undefined): void;
}

export function createFakeOffer(initial: Offer | undefined = undefined): FakeOffer {
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
    const source = createSettingsSource([setting, extensionPresence(host)], ([chosen, present]) => offerOf(chosen, present as readonly string[]));
    const fake: FakeOffer = {
        host,
        read: () => source.read(),
        onDidChange: (listener) => source.onDidChange(listener),
        choose(next) {
            value = next;
            [...listeners].forEach((listener) => listener());
        },
        install(assistant) {
            host.install(ASSISTANTS[assistant].extensionId);
            host.fireExtensionsChanged();
        },
        uninstall(assistant) {
            host.uninstall(ASSISTANTS[assistant].extensionId);
            host.fireExtensionsChanged();
        },
        set(next) {
            if (next === undefined) {
                fake.choose('none');
                return;
            }
            host.install(ASSISTANTS[next.assistant].extensionId);
            fake.choose(next.assistant);
        },
    };
    if (initial !== undefined) {
        host.install(ASSISTANTS[initial.assistant].extensionId);
        value = initial.assistant;
    }
    return fake;
}
