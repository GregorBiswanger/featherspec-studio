export const NEXT_STEP_HEADING = 'Next step';

export const COPY_PROMPT_LABEL = 'Copy prompt';

export const NEXT_STEP_HIDDEN_LABEL = 'Next step: ';

export const NEXT_STEP_UNREADABLE_TEXT = 'Studio cannot read this spec. See the problem below.';

export const NEXT_STEP_DONE_TEXT = 'Done — no FeatherSpec step left.';

export function nextStepNumberUsedText(number: string): string {
    return `Another spec uses number ${number}. FeatherSpec has no command for this: rename one spec by hand.`;
}

export const COPIED_TEXT = 'Copied to the clipboard.';

export const COPY_FAILED_TEXT = 'Could not copy to the clipboard.';

export const COPIED_LABEL = 'Copied';

export const COPY_FAILED_LABEL = 'Could not copy';

export function stepTooltip(lines: ReadonlyArray<{ text: string; intent: string }>): string {
    return lines.map((line) => `${line.intent}\n${line.text}`).join('\n');
}

export const STEP_SHORT_SEPARATOR = ' · ';

export function stepShortForm(step: { intent: string; short: string }): string {
    return `${step.intent}${STEP_SHORT_SEPARATOR}${step.short}`;
}

export type StepCase = 'NS-2' | 'NS-4' | 'NS-4-plan' | 'NS-5' | 'NS-6-open' | 'NS-6-report' | 'NS-6-resume' | 'NS-6-returned' | 'NS-6-plan' | 'NS-7' | 'NS-7-start' | 'NS-8' | 'NS-9' | 'NS-10';

export type SessionKey = 'new' | 'sameOrNew' | 'any';

export type ModelKey = 'fast' | 'strong' | 'strongOtherFamily' | 'strongWebSearch';

export interface StepGuide {
    short: string;
    session: SessionKey;
    model: ModelKey;
    effect: string;
    then?: string;
}

const BUILD_THEN = 'When it stops, the Studio shows the next step; a working agreement such as a test review may stop it earlier.';

const BLOCK_THEN = 'Once the block is solved, the spec shows its next step again.';

const PLAN_THEN = 'You read the plan before anything is built.';

export const STEP_GUIDES: Record<StepCase, StepGuide> = {
    'NS-2': {
        short: 'Move back to Ready',
        session: 'any',
        model: 'fast',
        effect: 'The agent compares folder, status and plan (or both copies of the spec) and proposes the move that brings them in line.',
        then: 'You confirm the move; the Studio follows the files.',
    },
    'NS-4': { short: 'Find blocker', session: 'any', model: 'fast', effect: 'The agent shows the workflow and where every spec stands.', then: BLOCK_THEN },
    'NS-4-plan': {
        short: 'Find blocker',
        session: 'any',
        model: 'strong',
        effect: 'The agent takes in returned work, checks the plan against the code and reports what blocks.',
        then: BLOCK_THEN,
    },
    'NS-5': {
        short: 'Verify',
        session: 'new',
        model: 'strongOtherFamily',
        effect: 'A fresh reviewer checks every acceptance criterion against evidence and gives a verdict.',
        then: 'Only after a READY verdict, close the spec with the second prompt.',
    },
    'NS-6-open': { short: 'Continue', session: 'sameOrNew', model: 'fast', effect: 'The agent builds this one step, runs its check, ticks it and stops.', then: BUILD_THEN },
    'NS-6-report': {
        short: 'Report',
        session: 'any',
        model: 'fast',
        effect: 'The agent checks the plan against the code, brings the ticks and the handoff level and reports where the work stands; it builds nothing yet.',
        then: 'When the plan and the ticks agree, the Studio shows the step to continue with.',
    },
    'NS-6-resume': {
        short: 'Report',
        session: 'any',
        model: 'fast',
        effect: 'The agent checks the plan against the code and reports where it stands.',
        then: 'The spec then shows its next step.',
    },
    'NS-6-returned': {
        short: 'Integrate',
        session: 'sameOrNew',
        model: 'fast',
        effect: 'The agent checks each returned step against its files, runs its check and the quality gates, then ticks the steps and removes the return notes.',
        then: 'Paste it once every worker you started is back.',
    },
    'NS-6-plan': {
        short: 'Write plan',
        session: 'new',
        model: 'strongWebSearch',
        effect: 'The agent researches and writes the plan; for a reactivated spec, a fresh plan for the change.',
        then: PLAN_THEN,
    },
    'NS-7': {
        short: 'Start',
        session: 'any',
        model: 'fast',
        effect: 'The agent builds one step, runs its check, ticks it and stops.',
        then: BUILD_THEN,
    },
    'NS-7-start': {
        short: 'Start',
        session: 'any',
        model: 'fast',
        effect: 'The agent moves spec and plan to active and sets the status to In Progress. Afterwards the Studio offers T-001.',
    },
    'NS-8': { short: 'Add criteria', session: 'any', model: 'strong', effect: 'The agent goes through the spec with you and adds testable acceptance criteria.', then: 'Then the spec is challenged and planned.' },
    'NS-9': {
        short: 'Challenge',
        session: 'new',
        model: 'strong',
        effect: 'A fresh reader looks for gaps, contradictions and untestable criteria.',
        then: 'Then write the plan with the second prompt, in any chat.',
    },
    'NS-10': { short: 'Write plan', session: 'new', model: 'strongWebSearch', effect: 'The agent researches and writes the plan as small, verifiable steps.', then: PLAN_THEN },
};

export const NS2_INTENT = 'Put folder and status back in line';

export const NS4_INTENT = 'Find out what blocks';

export const NS5_INTENT = 'Have the result verified';

export const NS5_THEN_INTENT = 'Then, after a READY verdict: close the spec';

export const NS6_REPORT_INTENT = 'Or: not sure where it stands? Let the agent report first';

export const NS6_REPORT_FIRST_INTENT = 'Let the agent report first — the plan and the ticks may differ';

export const NS6_RESUME_INTENT = 'Let the agent report where the plan stands';

export const INTEGRATE_INTENT = 'Integrate the returned steps';

export function waitingIntegrateIntent(ids: readonly string[]): string {
    const names = ids.length < 2 ? ids.join('') : `${ids.slice(0, -1).join(', ')} and ${ids[ids.length - 1]}`;
    return `When ${names} ${ids.length < 2 ? 'is' : 'are'} back: integrate the returned steps`;
}

export const WRITE_PLAN_INTENT = 'Write the plan';

export const START_LIFECYCLE_INTENT = 'Start: move the spec and its plan to active';

export const START_SHORT_FORM = 'Set active';

export const NS8_INTENT = 'Add acceptance criteria';

export const NS9_INTENT = 'Have the spec challenged';

export const NS9_THEN_INTENT = 'Then: write the plan';

function withTitle(lead: string, id: string, title: string): string {
    return title === '' ? `${lead}${id}` : `${lead}${id} ${title}`;
}

export function continueIntent(id: string, title: string): string {
    return withTitle('Continue with ', id, title);
}

export function thenContinueIntent(id: string, title: string): string {
    return withTitle('Then: continue with ', id, title);
}

export function startIntent(id: string, title: string): string {
    return withTitle('Start implementing: ', id, title);
}

export const UPDATE_ATTACH_TEXT = 'Update to FeatherSpec 1.11.0 with /sdd-featherspec-update so the attached spec is not read twice.';

export const COACH_TIP_PREFIX = 'Tip:';

export const SESSION_PHRASES: Record<SessionKey, string> = {
    new: 'a new chat',
    sameOrNew: 'the current chat or a new one',
    any: 'any chat',
};

export const SESSION_REASONS: Record<SessionKey, string> = {
    new: 'New chat: a fresh session reads the files as a stranger would; what the current chat knows cannot be unread.',
    sameOrNew: 'Current or new chat: the plan holds the state of the work; after a break, let the agent report first.',
    any: 'Any chat: the step reads everything it needs from the files.',
};

export const INTEGRATE_SEND_THEN = 'Send it once every worker you started is back.';

export const SAME_OR_NEW_REASON_LEVELLED = 'Current or new chat: the plan holds the state of the work; after a break, the step first brings the plan up to date.';

export function verifiedWithoutTickReason(id: string): string {
    return `${id} has a Verified line but no tick.`;
}

export const MODEL_PHRASES: Record<ModelKey, { base: 'a fast model' | 'a strong model'; suffix: string }> = {
    fast: { base: 'a fast model', suffix: '' },
    strong: { base: 'a strong model', suffix: '' },
    strongOtherFamily: { base: 'a strong model', suffix: ' from another model family' },
    strongWebSearch: { base: 'a strong model', suffix: ', and allow web search' },
};

export const MODEL_REASONS: Record<ModelKey, string> = {
    strong: 'Strong model: the step reasons over the whole spec or plan.',
    fast: 'Fast model: one small, well-described step.',
    strongOtherFamily: 'Strong model from another family than the one that built it: a reviewer tends to pass what its own family wrote.',
    strongWebSearch: 'Strong model with web search: the plan checks libraries, versions and APIs against current facts.',
};

export const TIP_CLOSING: readonly [string, string] = ['Choose the chat and the model in your AI assistant before you paste.', "Settings (gear in the Specs view): Show Step Tips hides these tips; Model Hints names your models; Assistant opens your AI assistant's chat with the prompt."];

export const ABOUT_STEP_LABEL = 'About this step';

export const ABOUT_STEP_GLYPH = '?';
