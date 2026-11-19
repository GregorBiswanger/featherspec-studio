import type { StepLookKey } from './planMapTexts';
import { STATE_LOOK } from './stateLook';

export interface StepMotif {
    motif: string | undefined;
    colour: string;
}

export const STEP_LOOK: Record<StepLookKey, StepMotif> = {
    done: { motif: 'check', colour: 'descriptionForeground' },
    next: { motif: 'debug-stackframe', colour: 'focusBorder' },
    open: { motif: 'circle-large-outline', colour: 'descriptionForeground' },
    returned: { motif: 'reply', colour: 'descriptionForeground' },
    returnedBlocked: { motif: 'circle-slash', colour: STATE_LOOK.Blocked.colour },
    notFound: { motif: 'question', colour: 'descriptionForeground' },
    dropped: { motif: undefined, colour: 'descriptionForeground' },
};
