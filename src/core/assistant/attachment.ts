import type { StepCase } from '../../shared/protocol/nextStepTexts';
import { attachesFrom } from '../specs/version';
import { attachesOf, type Offer } from './offer';

export const STEP_ATTACHES: Record<StepCase, boolean> = {
    'NS-2': false,
    'NS-4': false,
    'NS-4-plan': true,
    'NS-5': true,
    'NS-6-open': true,
    'NS-6-report': true,
    'NS-6-resume': true,
    'NS-6-returned': true,
    'NS-6-plan': true,
    'NS-7': true,
    'NS-8': true,
    'NS-9': true,
    'NS-10': true,
};

export interface Attachment {
    name: string;
    path: string;
}

export interface AttachmentContext {
    version: string;
    key: string;
}

export interface AttachmentDecision {
    attach?: Attachment;
    withheld: boolean;
}

const WHITESPACE = /\s/;

export function attachmentOf(offer: Offer | undefined, stepCase: StepCase, context: AttachmentContext): AttachmentDecision {
    if (offer === undefined || !STEP_ATTACHES[stepCase] || !attachesOf(offer)) {
        return { withheld: false };
    }
    if (!attachesFrom(context.version)) {
        return { withheld: true };
    }
    if (offer.assistant === 'claudeCode' && WHITESPACE.test(context.key)) {
        return { withheld: false };
    }
    return { attach: { name: context.key.slice(context.key.lastIndexOf('/') + 1), path: context.key }, withheld: false };
}
