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

export type StepLookKey = 'done' | 'next' | 'open' | 'dropped' | 'returned' | 'returnedBlocked' | 'notFound';

export interface StepLook {
    key: StepLookKey;
    word: string;
}

export const STEP_LOOKS = {
    done: { key: 'done', word: 'done' },
    next: { key: 'next', word: 'next' },
    open: { key: 'open', word: 'open' },
    dropped: { key: 'dropped', word: 'dropped' },
    returned: { key: 'returned', word: 'returned' },
    returnedBlocked: { key: 'returnedBlocked', word: 'returned, blocked' },
    notFound: { key: 'notFound', word: 'not in the steps' },
} as const satisfies Record<StepLookKey, StepLook>;

export function stepLook(step: { state: string; returned?: { status: string } }): StepLook {
    if (step.state === 'returned') {
        return step.returned?.status === 'blocked' ? STEP_LOOKS.returnedBlocked : STEP_LOOKS.returned;
    }
    return step.state in STEP_LOOKS ? STEP_LOOKS[step.state as keyof typeof STEP_LOOKS] : STEP_LOOKS.open;
}

export function chipName(id: string, title: string, word: string): string {
    return title === '' ? `${id}, ${word}` : `${id} ${title}, ${word}`;
}

export const FILES_LABEL = 'Files';

export const COVERS_LABEL = 'Covers';

export const DO_LABEL = 'Do';

export const VERIFY_LABEL = 'Verify';
export const VERIFIED_LABEL = 'Verified';
export const REPORTED_LABEL = 'Reported';

export const OPEN_IN_PLAN_LABEL = 'Open in plan';

export const STAGES_LABEL = 'Stages';

export function stageHeading(number: number, description: string): string {
    return description === '' ? `Stage ${number}` : `Stage ${number} — ${description}`;
}

export const STAGE_KIND_TEXTS = {
    single: undefined,
    sequential: '→ in order: each step builds on the one before',
    parallel: '⇉ can run in parallel: the steps share no file',
    mixed: '⇉ partly in parallel',
} as const;

export function returnedText(returned: { status: 'done' | 'blocked' | 'unknown'; reason?: string }): string {
    if (returned.status === 'done') {
        return 'Returned · done';
    }
    if (returned.status === 'blocked') {
        return returned.reason === undefined || returned.reason === '' ? 'Returned · blocked' : `Returned · blocked: ${returned.reason}`;
    }
    return 'Returned · status unknown';
}

export type ReturnedClause = 'integrates' | 'finds-out' | 'none';

export function returnedWorkText(n: number, blocked: readonly string[], clause: ReturnedClause): string {
    const state = blocked.length === 0 ? ', waiting to be integrated' : `, ${blocked.join(', ')} blocked`;
    const tail = clause === 'integrates' ? ': the next step integrates them' : clause === 'finds-out' ? ': the next step finds out what blocks' : '';
    return `${n} returned${state}${tail}.`;
}

export function groupReturnedText(k: number, m: number, blocked: readonly string[], out: readonly string[]): string {
    return `${k} of ${m} returned${blocked.length === 0 ? '' : `, ${blocked.join(', ')} blocked`} · ${out.join(', ')} not back yet`;
}

export function parallelHintText(n: number): string {
    return `Stage ${n} can run in parallel · `;
}

export const WAYS_TO_RUN_IT_LABEL = 'Ways to run it';

export function waysHeading(n: number): string {
    return `Ways to run stage ${n}`;
}

export const WAYS_LEAD_TEXT =
    'Steps joined by ‖ share no file and may run in parallel. In sequence is the default; parallel pays off for large steps. Either parallel way runs the quality gates once, on the combined result, before a step is ticked.';

export const START_LINES_LEAD_TEXT = 'Start lines — commit first: a worktree holds committed files only.';

export function stepLinkTooltip(name: string, id: string, mac: boolean): string {
    return `${name}\nShow ${id} in the plan map · ${mac ? 'Cmd' : 'Ctrl'}+click opens the plan file`;
}
