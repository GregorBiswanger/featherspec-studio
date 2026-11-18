export type WayKey = 'sequence' | 'subagents' | 'otherAgents';

export const WAY_KEYS: readonly WayKey[] = ['sequence', 'subagents', 'otherAgents'];

export interface WayText {
    name: string;
    effect: string;
    suffix: string;
}

export const WAYS: Record<WayKey, WayText> = {
    sequence: {
        name: 'In sequence',
        effect: 'One chat builds the steps one after another and stops at the stage end and at every test review on the way.',
        suffix: 'in sequence',
    },
    subagents: {
        name: 'Subagents',
        effect: "Where a working agreement asks for a test review, the chat first writes the stage's tests and stops for it; then it hands each step to a subagent. Subagents cannot ask you; there is no steering in between.",
        suffix: 'with subagents',
    },
    otherAgents: {
        name: 'Other agents',
        effect: 'The chat proposes the commit a worktree needs and prints one start line per step. Paste each into another chat, tool or worktree; each worker builds its step and leaves a return note.',
        suffix: 'with other agents',
    },
};

export function stagePrompt(way: WayKey, stage: number, plan: string): string {
    return `Implement the whole stage ${stage} of ${plan} ${WAYS[way].suffix}`;
}

export function startLine(id: string, plan: string): string {
    return `Implement ${id} of ${plan} as a parallel worker.`;
}

export const PLAN_MAP_TITLE = 'Plan map';

export const PLAN_MAP_PURPOSE = "See a plan's stages, what can run in parallel and how to start it.";

export const PLAN_MAP_COMMAND_TITLE = 'FeatherSpec Studio: Open Plan Map';

export const NO_SPEC_SELECTED_TEXT = 'Select a spec with a plan to see its stages.';

export function noPlanText(number: string): string {
    return `${number} has no plan yet.`;
}

export function specDoneText(number: string): string {
    return `${number} is done.`;
}

export const SPECS_WITH_PLAN_HEADING = 'Specs with a plan';

export const OPEN_PLAN_LABEL = 'Open plan';

export function planSaysText(closing: string): string {
    return `The plan says: ${closing}`;
}

export const PLAN_HEADING = 'Plan';

export const OPEN_PLAN_MAP_LABEL = 'Open plan map';

export const CAN_RUN_PARALLEL_TEXT = '⇉ can run in parallel';

export const NOT_IN_A_STAGE_TEXT = 'Not in a stage';

export interface StepLook {
    symbol?: string;
    word: string;
}

export const STEP_LOOKS = {
    done: { symbol: '✓', word: 'done' },
    next: { symbol: '◐', word: 'next' },
    open: { symbol: '○', word: 'open' },
    dropped: { word: 'dropped' },
    returned: { symbol: '↩', word: 'returned' },
    returnedBlocked: { symbol: '⊘', word: 'returned, blocked' },
    notFound: { symbol: '?', word: 'not in the steps' },
} as const satisfies Record<string, StepLook>;

export function stepLook(step: { state: string; returned?: { status: string } }): StepLook {
    if (step.state === 'returned') {
        return step.returned?.status === 'blocked' ? STEP_LOOKS.returnedBlocked : STEP_LOOKS.returned;
    }
    return step.state in STEP_LOOKS ? STEP_LOOKS[step.state as keyof typeof STEP_LOOKS] : STEP_LOOKS.open;
}

export function chipName(id: string, title: string, word: string): string {
    return title === '' ? `${id}, ${word}` : `${id} ${title}, ${word}`;
}
