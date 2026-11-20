import { ASSISTANT_TARGETS, type SendView } from '../../shared/protocol/assistant';
import { ASSISTANT_NAMES, sendTipText } from '../../shared/protocol/assistantTexts';
import { TIP_CLOSING, type StepCase } from '../../shared/protocol/nextStepTexts';
import { attachmentOf, type AttachmentContext } from './attachment';
import type { Offer } from './offer';

export function tipClosingOf(offer: Offer | undefined): readonly [string, string] {
    if (offer === undefined) {
        return TIP_CLOSING;
    }
    const send = sendTipText(ASSISTANT_NAMES[offer.assistant]);
    return [send, TIP_CLOSING[1]];
}

export function plainSendViewOf(offer: Offer | undefined): SendView | undefined {
    return offer === undefined ? undefined : { assistant: offer.assistant, target: 'new', targets: [...ASSISTANT_TARGETS[offer.assistant]] };
}

export function sendViewOf(offer: Offer | undefined, stepCase: StepCase, context?: AttachmentContext): SendView | undefined {
    const view = plainSendViewOf(offer);
    if (view === undefined || offer === undefined) {
        return undefined;
    }
    const attach = context === undefined ? undefined : attachmentOf(offer, stepCase, context).attach;
    return attach === undefined ? view : { ...view, attach };
}
