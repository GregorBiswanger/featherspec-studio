import type { AssistantHostPort } from '../ports/assistant';
import type { ClipboardPort } from '../ports/board';
import type { StepUiPort } from '../ports/copyNextStep';
import type { ClockPort, OutputPort, SettingPort } from '../ports/host';
import type { ShellModelSource } from '../ports/shell';
import type { SpecSourcePort } from '../ports/specSource';
import { createSettingsSource, type SettingsSource } from '../settings/settingsSource';
import { ASSISTANTS, type AssistantTable } from './assistants';
import { createAttachmentCheck } from './attachment';
import { extensionPresence, offerOf, type Offer } from './offer';
import type { HandOverPort } from './handOver';
import { createSend, type Send } from './send';

export interface AssistantWiringDeps {
    setting: SettingPort;
    host: AssistantHostPort;
    clipboard: ClipboardPort;
    ui: Pick<StepUiPort, 'warn'>;
    output: OutputPort;
    clock: ClockPort;
    platform: string;
    source: ShellModelSource;
    specs: Pick<SpecSourcePort, 'stat'>;
    handOver?: HandOverPort;
    table?: AssistantTable;
}

export interface AssistantWiring {
    offer: SettingsSource<Offer | undefined>;
    send: Send;
}

export function createAssistantWiring(deps: AssistantWiringDeps): AssistantWiring {
    const table = deps.table ?? ASSISTANTS;
    const offer = createSettingsSource([deps.setting, extensionPresence(deps.host, table)], ([chosen, present]) => offerOf(chosen, present as readonly string[], undefined, table));
    const send = createSend({ table, host: deps.host, clipboard: deps.clipboard, ui: deps.ui, output: deps.output, clock: deps.clock, platform: deps.platform, chosen: deps.setting, attachment: createAttachmentCheck({ source: deps.source, specs: deps.specs, host: deps.host }), ...(deps.handOver === undefined ? {} : { handOver: deps.handOver }) });
    return { offer, send };
}
