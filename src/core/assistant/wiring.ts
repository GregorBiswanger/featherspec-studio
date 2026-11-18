import type { AssistantHostPort } from '../ports/assistant';
import type { ClipboardPort } from '../ports/board';
import type { StepUiPort } from '../ports/copyNextStep';
import type { ClockPort, OutputPort, SettingPort } from '../ports/host';
import { createSettingsSource, type SettingsSource } from '../settings/settingsSource';
import { extensionPresence, offerOf, type Offer } from './offer';
import { createSend, type Send } from './send';

export interface AssistantWiringDeps {
    setting: SettingPort;
    host: AssistantHostPort;
    clipboard: ClipboardPort;
    ui: Pick<StepUiPort, 'warn'>;
    output: OutputPort;
    clock: ClockPort;
    platform: string;
}

export interface AssistantWiring {
    offer: SettingsSource<Offer | undefined>;
    send: Send;
}

export function createAssistantWiring(deps: AssistantWiringDeps): AssistantWiring {
    const offer = createSettingsSource([deps.setting, extensionPresence(deps.host)], ([chosen, present]) => offerOf(chosen, present as readonly string[]));
    const send = createSend({ host: deps.host, clipboard: deps.clipboard, ui: deps.ui, output: deps.output, clock: deps.clock, platform: deps.platform, chosen: deps.setting });
    return { offer, send };
}
