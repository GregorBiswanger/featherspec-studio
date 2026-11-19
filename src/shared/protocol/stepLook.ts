import type { StepLookKey } from './planMapTexts';
import { STATE_LOOK } from './stateLook';

export interface StepMotif {
    /** A codicon name; a dropped step has none (struck ID instead). */
    motif: string | undefined;
    colour: string;
}

/** 0025 U-01, §5.5: step state to codicon motif and colour (the pattern of 0022 §4.8's STATE_LOOK). */
export const STEP_LOOK: Record<StepLookKey, StepMotif> = {
    done: { motif: 'check', colour: 'descriptionForeground' },
    next: { motif: 'debug-stackframe', colour: 'focusBorder' },
    open: { motif: 'circle-large-outline', colour: 'descriptionForeground' },
    returned: { motif: 'reply', colour: 'descriptionForeground' },
    returnedBlocked: { motif: 'circle-slash', colour: STATE_LOOK.Blocked.colour },
    notFound: { motif: 'question', colour: 'descriptionForeground' },
    dropped: { motif: undefined, colour: 'descriptionForeground' },
};
