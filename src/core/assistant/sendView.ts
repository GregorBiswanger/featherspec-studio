import { ASSISTANT_TARGETS, type SendView } from '../../shared/protocol/assistant';
import { ASSISTANT_NAMES, sendTipText } from '../../shared/protocol/assistantTexts';
import { TIP_CLOSING, type StepCase } from '../../shared/protocol/nextStepTexts';
import type { Offer } from './offer';

export function tipClosingOf(offer: Offer | undefined): readonly [string, string] {
    return offer === undefined ? TIP_CLOSING : [sendTipText(ASSISTANT_NAMES[offer.assistant]), TIP_CLOSING[1]];
}

export function sendViewOf(offer: Offer | undefined, _stepCase: StepCase): SendView | undefined {
    if (offer === undefined) {
        return undefined;
    }
    return { assistant: offer.assistant, target: 'new', targets: [...ASSISTANT_TARGETS[offer.assistant]] };
}
