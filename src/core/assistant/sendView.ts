import { ASSISTANT_TARGETS, type SendView } from '../../shared/protocol/assistant';
import { STEP_GUIDES, type StepCase } from '../../shared/protocol/nextStepTexts';
import type { Offer } from './offer';

export function sendViewOf(offer: Offer | undefined, stepCase: StepCase): SendView | undefined {
    if (offer === undefined) {
        return undefined;
    }
    const targets = [...ASSISTANT_TARGETS[offer.assistant]];
    const current = offer.assistant === 'copilot' && STEP_GUIDES[stepCase].session !== 'new';
    return { assistant: offer.assistant, target: current ? 'current' : 'new', targets };
}
