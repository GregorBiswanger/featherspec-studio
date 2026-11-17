export const NEXT_STEP_HEADING = 'Next step';

export const NEXT_STEP_COPY_LABEL = 'Copy';

export const NEXT_STEP_THEN_LABEL = 'Then:';

export const NEXT_STEP_THEN_AFTER_READY_LABEL = 'Then, after a READY verdict:';

export const NEXT_STEP_UNREADABLE_TEXT = 'Studio cannot read this spec. See its diagnostics.';

export const NEXT_STEP_DONE_TEXT = 'Done — no FeatherSpec step left.';

export function nextStepNumberUsedText(number: string): string {
    return `Another spec uses number ${number}. FeatherSpec has no command for this: rename one spec by hand.`;
}

export const COPIED_TEXT = 'Copied to the clipboard.';

export const COPY_FAILED_TEXT = 'Could not copy to the clipboard.';

export function moveNextStepText(number: string): string {
    return `Studio starts no agent. Next step for ${number} — paste it into your AI assistant:`;
}
