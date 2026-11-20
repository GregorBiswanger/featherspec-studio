import type { StepCase } from '../../shared/protocol/nextStepTexts';
import type { AssistantHostPort } from '../ports/assistant';
import type { ShellModelSource } from '../ports/shell';
import type { SpecSourcePort } from '../ports/specSource';
import { attachesOf, type Offer } from './offer';

export type AttachedFile = 'spec' | 'plan';

/** 0033 §6.3 (PD-097): each case attaches the files its prompt names, in this order. */
export const STEP_FILES: Record<StepCase, readonly AttachedFile[]> = {
    'NS-2': [],
    'NS-4': [],
    'NS-4-plan': ['spec'],
    'NS-5': ['spec'],
    'NS-6-open': ['plan'],
    'NS-6-report': ['spec'],
    'NS-6-resume': ['spec'],
    'NS-6-returned': ['spec'],
    'NS-6-plan': ['spec'],
    'NS-7': ['plan'],
    'NS-7-start': ['spec', 'plan'],
    'NS-8': ['spec'],
    'NS-9': ['spec'],
    'NS-10': ['spec'],
};

export const STEP_ATTACHES: Record<StepCase, boolean> = Object.fromEntries(Object.entries(STEP_FILES).map(([stepCase, files]) => [stepCase, files.length > 0])) as Record<StepCase, boolean>;

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
    plan?: string;
}

/** `attach` is the first file, `attachAlso` the others in table order (0033 §6.3). */
export interface AttachmentDecision {
    attach?: Attachment;
    attachAlso?: Attachment[];
}

const WHITESPACE = /\s/;

export function attachmentOf(offer: Offer | undefined, stepCase: StepCase, context: AttachmentContext): AttachmentDecision {
    if (offer === undefined || !STEP_ATTACHES[stepCase] || !attachesOf(offer)) {
        return {};
    }
    const files = STEP_FILES[stepCase]
        .map((file) => (file === 'spec' ? context.key : context.plan))
        .filter((path): path is string => path !== undefined && !(offer.assistant === 'claudeCode' && WHITESPACE.test(path)))
        .map((path) => ({ name: path.slice(path.lastIndexOf('/') + 1), path }));
    const [first, ...rest] = files;
    return first === undefined ? {} : { attach: first, ...(rest.length === 0 ? {} : { attachAlso: rest }) };
}

export interface AttachmentTarget {
    uri: unknown;
    path: string;
}

export type AttachmentCheck = (path: string) => Promise<AttachmentTarget | undefined>;

export function createAttachmentCheck(deps: { source: ShellModelSource; specs: Pick<SpecSourcePort, 'stat'>; host: Pick<AssistantHostPort, 'fileUri'> }): AttachmentCheck {
    return async (path) => {
        const model = deps.source.current();
        if (model === undefined || !(model.project.specs.some((spec) => spec.key === path) || model.project.plans.some((plan) => plan.key === path))) {
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
