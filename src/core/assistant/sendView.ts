import { ASSISTANT_TARGETS, type SendView } from '../../shared/protocol/assistant';
import { ASSISTANT_NAMES, COPY_FOR_PLACES, copyForTipText, sendTipText } from '../../shared/protocol/assistantTexts';
import { TIP_CLOSING, type StepCase } from '../../shared/protocol/nextStepTexts';
import { attachmentOf, type AttachmentContext } from './attachment';
import type { Offer } from './offer';

export function tipClosingOf(offer: Offer | undefined): readonly [string, string] {
    if (offer === undefined) {
        return TIP_CLOSING;
    }
    const name = ASSISTANT_NAMES[offer.assistant];
    const send = offer.handover === 'copyFor' ? copyForTipText(name, offer.place ?? COPY_FOR_PLACES[offer.assistant === 'junie' ? 'junie' : 'copilot']) : sendTipText(name);
    return [send, TIP_CLOSING[1]];
}

export function plainSendViewOf(offer: Offer | undefined): SendView | undefined {
    return offer === undefined ? undefined : { assistant: offer.assistant, ...(offer.handover === undefined ? {} : { handover: offer.handover }), target: 'new', targets: [...(offer.targets ?? ASSISTANT_TARGETS[offer.assistant])] };
}

export function sendViewOf(offer: Offer | undefined, stepCase: StepCase, context?: AttachmentContext): SendView | undefined {
    const view = plainSendViewOf(offer);
    if (view === undefined || offer === undefined) {
        return undefined;
    }
    const decision = context === undefined ? {} : attachmentOf(offer, stepCase, context);
    return decision.attach === undefined ? view : { ...view, attach: decision.attach, ...(decision.attachAlso === undefined ? {} : { attachAlso: decision.attachAlso }) };
}
