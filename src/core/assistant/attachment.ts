import type { StepCase } from '../../shared/protocol/nextStepTexts';
import type { AssistantHostPort } from '../ports/assistant';
import type { ShellModelSource } from '../ports/shell';
import type { SpecSourcePort } from '../ports/specSource';
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

/**
 * 0031 §6.2: a follow-up line (index 1) is sent and attached like the step case that shows the same prompt as its first line.
 * A step case that is not listed gets no Send on its follow-up line until a spec adds its row (A-002).
 */
export const FOLLOW_UP_CASE: Partial<Record<StepCase, StepCase>> = {
    'NS-9': 'NS-10',
    'NS-6-open': 'NS-6-report',
    'NS-6-report': 'NS-6-open',
    'NS-5': 'NS-2',
};

export function followUpCaseOf(stepCase: StepCase, index: number): StepCase | undefined {
    return index === 1 ? FOLLOW_UP_CASE[stepCase] : undefined;
}

export interface Attachment {
    name: string;
    path: string;
}

export interface AttachmentContext {
    key: string;
}

export interface AttachmentDecision {
    attach?: Attachment;
}

const WHITESPACE = /\s/;

export function attachmentOf(offer: Offer | undefined, stepCase: StepCase, context: AttachmentContext): AttachmentDecision {
    if (offer === undefined || !STEP_ATTACHES[stepCase] || !attachesOf(offer)) {
        return {};
    }
    if (offer.assistant === 'claudeCode' && WHITESPACE.test(context.key)) {
        return {};
    }
    return { attach: { name: context.key.slice(context.key.lastIndexOf('/') + 1), path: context.key } };
}

export interface AttachmentTarget {
    uri: unknown;
    path: string;
}

export type AttachmentCheck = (path: string) => Promise<AttachmentTarget | undefined>;

export function createAttachmentCheck(deps: { source: ShellModelSource; specs: Pick<SpecSourcePort, 'stat'>; host: Pick<AssistantHostPort, 'fileUri'> }): AttachmentCheck {
    return async (path) => {
        const model = deps.source.current();
        if (model === undefined || !model.project.specs.some((spec) => spec.key === path)) {
            return undefined;
        }
        let found: Awaited<ReturnType<typeof deps.specs.stat>>;
        try {
            found = await deps.specs.stat(model.project.root, path);
        } catch {
            return undefined;
        }
        return found?.kind === 'file' ? { uri: deps.host.fileUri(model.project.root, path), path } : undefined;
    };
}
