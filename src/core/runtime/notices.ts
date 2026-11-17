export const READER_REASON = "Another VS Code window holds the write lock for this project's status history.";
export const STORE_CLOSED_REASON = 'The status history of this project was closed in this window.';
export const NEWER_VERSION_REASON = 'history from a newer version';
export const NO_ACTIVE_PROJECT_REASON = 'No active FeatherSpec project.';

export function newerVersionNotice(): string {
    return 'The status history of this project was written by a newer version of FeatherSpec Studio. It is left unchanged and is not shown; update FeatherSpec Studio to see it.';
}

export function storageUnreachableNotice(reason: string): string {
    return `FeatherSpec Studio cannot reach its status history storage (${reason}). The status history is not available in this window.`;
}
