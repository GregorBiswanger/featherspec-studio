import { ASSISTANT_TARGETS, type SendView } from '../../shared/protocol/assistant';
import { ASSISTANT_NAMES, sendTipText } from '../../shared/protocol/assistantTexts';
import { STEP_GUIDES, TIP_CLOSING, type StepCase } from '../../shared/protocol/nextStepTexts';
import { attachmentOf, type AttachmentContext } from './attachment';
import type { Offer } from './offer';

export function tipClosingOf(offer: Offer | undefined): readonly [string, string] {
    if (offer === undefined) {
        return TIP_CLOSING;
    }
    const name = ASSISTANT_NAMES[offer.assistant];
    return [sendTipText(name), TIP_CLOSING[1]];
}

export function plainSendViewOf(offer: Offer | undefined): SendView | undefined {
    return offer === undefined ? undefined : { assistant: offer.assistant, ...(offer.terminal === true ? { terminal: true as const } : {}), target: offer.targets?.[0] ?? 'new', targets: [...(offer.targets ?? ASSISTANT_TARGETS[offer.assistant])] };
}

function followsSession(view: SendView, stepCase: StepCase): boolean {
    return view.target === 'current' && view.targets.includes('new') && STEP_GUIDES[stepCase].session === 'new';
}

export function sendViewOf(offer: Offer | undefined, stepCase: StepCase, context?: AttachmentContext): SendView | undefined {
    const plain = plainSendViewOf(offer);
    if (plain === undefined || offer === undefined) {
        return undefined;
    }
    const view = followsSession(plain, stepCase) ? { ...plain, target: 'new' as const } : plain;
    const decision = context === undefined ? {} : attachmentOf(offer, stepCase, context);
    return decision.attach === undefined ? view : { ...view, attach: decision.attach, ...(decision.attachAlso === undefined ? {} : { attachAlso: decision.attachAlso }) };
}
