import { ASSISTANT_TARGETS, type SendView } from '../../shared/protocol/assistant';
import { ASSISTANT_NAMES, ATTACH_UPDATE_TEXT, sendTipText } from '../../shared/protocol/assistantTexts';
import { TIP_CLOSING, type StepCase } from '../../shared/protocol/nextStepTexts';
import { attachmentOf, type AttachmentContext } from './attachment';
import type { Offer } from './offer';

export function tipClosingOf(offer: Offer | undefined, withheld = false): readonly [string, string] {
    if (offer === undefined) {
        return TIP_CLOSING;
    }
    const send = sendTipText(ASSISTANT_NAMES[offer.assistant]);
    return [withheld ? `${send} ${ATTACH_UPDATE_TEXT}` : send, TIP_CLOSING[1]];
}

export function sendViewOf(offer: Offer | undefined, stepCase: StepCase, context?: AttachmentContext): SendView | undefined {
    if (offer === undefined) {
        return undefined;
    }
    const view: SendView = { assistant: offer.assistant, target: 'new', targets: [...ASSISTANT_TARGETS[offer.assistant]] };
    const attach = context === undefined ? undefined : attachmentOf(offer, stepCase, context).attach;
    return attach === undefined ? view : { ...view, attach };
}

export function withheldOf(offer: Offer | undefined, stepCase: StepCase, context: AttachmentContext): boolean {
    return attachmentOf(offer, stepCase, context).withheld;
}
