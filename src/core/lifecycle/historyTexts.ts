export const HISTORY_UNAVAILABLE_TEXT = 'Status history not available';

export const HISTORY_REASON_UNREADABLE = 'it could not be read';

export function historyUnavailableText(reason?: string): string {
    return reason === undefined ? HISTORY_UNAVAILABLE_TEXT : `${HISTORY_UNAVAILABLE_TEXT}: ${reason}`;
}
