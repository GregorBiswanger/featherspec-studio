export const START_TIMEOUT_MS = 60_000;
export const STOP_TIMEOUT_MS = 30_000;

export const READER_TEXT = 'Another window holds the write lock for this project.';
export const RESUME_BUTTON = 'Resume';
export const STOP_BUTTON = 'Stop Run';
export const NO_RUN_OPEN = 'No run is open.';
export const NO_RUN_RESUMABLE = 'No run can be resumed.';
export const RESUME_PICK_PLACEHOLDER = 'Choose the run to resume';
export const STOP_NOT_CONFIRMED_CAUSE = 'stop not confirmed by provider';
export const INVALID_APPROVAL_TEXT = 'An approval answer is "approve once" or "reject".';
export const NO_RUN = 'No run';

function plain(reason: string): string {
    return reason.replace(/\.+$/, '');
}

export const storeText = (reason: string): string => `The run history is not writable: ${plain(reason)}.`;
export const runOpenText = (runId: string, stem: string): string => `Run ${runId} of spec ${stem} is still open.`;
export const notRegisteredText = (providerId: string): string => `Provider ${providerId} is not registered.`;
export const createFailedText = (reason: string): string => `The run could not be created: ${plain(reason)}.`;
export const alreadyEndedText = (runId: string): string => `Run ${runId} has already ended.`;
export const noStopText = (displayName: string): string => `${displayName} does not support stopping a run.`;
export const stopPendingText = (runId: string): string => `A stop of run ${runId} is already pending.`;
export const requestNotOpenText = (runId: string, requestId: string): string => `Request ${requestId} of run ${runId} is not open.`;
export const notInterruptedText = (runId: string): string => `Run ${runId} is not Interrupted.`;
export const notLatestText = (runId: string, stem: string): string => `Run ${runId} is not the latest run of spec ${stem}.`;
export const noResumeText = (displayName: string): string => `${displayName} does not support resume.`;
export const noSessionRefText = (runId: string): string => `Run ${runId} has no stored session reference.`;
export const specMissingText = (stem: string): string => `Spec ${stem} is not in the project.`;
export const specAmbiguousText = (stem: string): string => `Spec ${stem} exists more than once in the project.`;
export const specDoneText = (stem: string): string => `Spec ${stem} is Done.`;
export const resumeConfirmText = (runId: string, stem: string): string => `Resume the interrupted run ${runId} of spec ${stem}?`;
export const stopConfirmText = (stem: string): string => `Stop the run of spec ${stem}?`;
export const resumedCause = (runId: string): string => `resumed from ${runId}`;
export const continuationText = (stem: string): string =>
    `Continue the interrupted work on spec \`${stem}\`: read \`AGENTS.md\` and the plan beside the spec again, then continue at the plan's current step under the same rules as before.`;
