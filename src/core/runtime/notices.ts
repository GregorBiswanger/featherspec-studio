export interface RunRef {
    runId: string;
    stem: string;
}

function listRuns(runs: readonly RunRef[]): string {
    return runs.map((run) => `${run.stem} (${run.runId})`).join(', ');
}

export const READER_REASON = "Another VS Code window holds the write lock for this project's run history.";
export const STORE_CLOSED_REASON = "The run history of this project was closed in this window.";
export const NEWER_VERSION_REASON = 'history from a newer version';
export const EXTENSION_HOST_RESTARTED = 'extension host restarted';
export const NO_ACTIVE_PROJECT_REASON = 'No active FeatherSpec project.';

export function saveFailedNotice(run: RunRef): string {
    return `FeatherSpec Studio could not save the history of run ${run.runId} (spec ${run.stem}). The agent keeps working; this run's history is incomplete.`;
}

export function unreadableRunsNotice(runs: readonly RunRef[]): string {
    return `FeatherSpec Studio cannot read the stored history of ${runs.length} run(s): ${listRuns(runs)}. The data was left unchanged.`;
}

export function newerVersionNotice(): string {
    return "The run history of this project was written by a newer version of FeatherSpec Studio. It is left unchanged and is not shown; update FeatherSpec Studio to see it.";
}

export function incompleteRecordNotice(runs: readonly RunRef[]): string {
    return `FeatherSpec Studio skipped an incomplete record in the history of ${runs.length} run(s): ${listRuns(runs)}. The other records are shown.`;
}

export function storageUnreachableNotice(reason: string): string {
    return `FeatherSpec Studio cannot reach its run history storage (${reason}). Run history is not available in this window.`;
}

export function clearConfirmation(project: string): string {
    return `Clear the run history of ${project}? All ended runs, their events and the spec status history are removed. Runs still open are kept.`;
}

export const CLEAR_BUTTON = 'Clear Run History';

export function clearedNotice(failed: number): string {
    return failed === 0 ? 'Run history cleared.' : `Run history cleared; ${failed} run(s) could not be removed.`;
}

export const NOT_CLEARED_DECLINED = 'Run history was not cleared.';
export const NOT_CLEARED_NO_PROJECT = 'No active FeatherSpec project; nothing was cleared.';

export function notClearedBecause(reason: string): string {
    return `Run history was not cleared: ${reason}`;
}
