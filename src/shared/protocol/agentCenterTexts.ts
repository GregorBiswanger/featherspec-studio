export const AC_HEADING = 'Agent runs';
export const AC_SPEC_NOT_FOUND = 'spec not found';
export const AC_HISTORY_INCOMPLETE = 'history incomplete';
export const AC_HISTORY_UNREADABLE = 'history unreadable';
export const AC_NOT_AVAILABLE = 'not available';
export const AC_CLEAR_FILTER = 'Clear filter';
export const AC_NO_RUNS = 'No runs yet. Start one by moving a Ready spec to Active on the Spec Board.';
export const AC_NO_MATCH = 'No runs match this filter';
export const AC_PICK_A_RUN = 'Select a run to see its events.';

export function acRunNotInHistory(runId: string): string {
    return `Run ${runId} is not in the run history`;
}

export function acFilterLabel(label: string): string {
    return `Filter: ${label}`;
}

export function acRunsUnavailable(reason: string): string {
    return `Runs: not available — ${reason}`;
}

export const RUN_STATUS_WORDS: Readonly<Record<string, string>> = {
    Starting: 'Starting',
    Running: 'Running',
    WaitingForApproval: 'Waiting for approval',
    WaitingForInput: 'Waiting for input',
    Completed: 'Completed',
    Failed: 'Failed',
    Cancelled: 'Cancelled',
    Interrupted: 'Interrupted',
};

export function acStatusWord(status: string): string {
    return RUN_STATUS_WORDS[status] ?? status;
}

export function acStatusWithCause(status: string, cause: string | undefined): string {
    return cause === undefined ? acStatusWord(status) : `${acStatusWord(status)} (${cause})`;
}

export const AC_LABEL_RUN_ID = 'Run ID';
export const AC_LABEL_PROVIDER = 'Provider';
export const AC_LABEL_MODEL = 'Model';
export const AC_LABEL_SESSION = 'Session';
export const AC_LABEL_SPEC = 'Spec';
export const AC_LABEL_STATUS = 'Status';
export const AC_LABEL_STARTED = 'Started';
export const AC_LABEL_DURATION = 'Duration';

export const AC_CURRENT_ACTIVITY = 'Current activity';

export function acWaitingForApproval(summary: string): string {
    return `Waiting for approval: ${summary}`;
}

export const AC_WAITING_FOR_INPUT = 'Waiting for input';

export function acRunningTool(name: string): string {
    return `Running tool ${name}`;
}

export const AC_TIMELINE = 'Timeline';
export const AC_LOAD_EARLIER = 'Load earlier';
export const AC_JUMP_TO_LATEST = 'Jump to latest';
export const AC_SOURCE_PROVIDER = 'provider';
export const AC_SOURCE_DERIVED = 'derived';
export const AC_SOURCE_STUDIO = 'Studio';
export const AC_TRUNCATED = 'Event history truncated at the size cap';

export function acUnknownEvent(name: string): string {
    return `Unknown provider event: ${name}`;
}

export const EVENT_KIND_WORDS: Readonly<Record<string, string>> = {
    'session.started': 'Session started',
    'turn.started': 'Turn started',
    'turn.completed': 'Turn completed',
    'message.delta': 'Message',
    'message.completed': 'Message',
    reasoning: 'Reasoning',
    'tool.started': 'Tool started',
    'tool.progress': 'Tool progress',
    'tool.completed': 'Tool completed',
    'file.changed': 'File changed',
    'approval.requested': 'Approval requested',
    'approval.resolved': 'Approval resolved',
    'input.requested': 'Input requested',
    'input.resolved': 'Input resolved',
    'plan.updated': 'Plan updated',
    usage: 'Usage',
    warning: 'Warning',
    retry: 'Retry',
    'auth.status': 'Sign-in status',
    'run.completed': 'Run completed',
    'run.failed': 'Run failed',
    'run.cancelled': 'Run cancelled',
};

export const PAYLOAD_FIELD_LABELS: Readonly<Record<string, string>> = {
    sessionRef: 'Session',
    model: 'Model',
    text: 'Text',
    toolName: 'Tool',
    callId: 'Call ID',
    ok: 'Succeeded',
    errorText: 'Error text',
    path: 'Path',
    operation: 'Operation',
    confidence: 'Basis',
    outsideProject: 'Outside the project folder',
    requestId: 'Request ID',
    actionKind: 'Action',
    summary: 'Summary',
    decision: 'Decision',
    question: 'Question',
    items: 'Items',
    totals: 'Totals',
    result: 'Result',
    reason: 'Reason',
    finalMessage: 'Final message',
    category: 'Category',
    providerMessage: 'Provider message',
    hint: 'Hint',
    cause: 'Cause',
};

export const EVENT_KIND_FIELDS: Readonly<Record<string, readonly string[]>> = {
    'session.started': ['sessionRef', 'model'],
    'turn.started': [],
    'turn.completed': [],
    'message.delta': ['text'],
    'message.completed': ['text'],
    reasoning: ['text'],
    'tool.started': ['toolName', 'callId'],
    'tool.progress': ['toolName', 'callId'],
    'tool.completed': ['toolName', 'callId', 'ok', 'errorText'],
    'file.changed': ['path', 'operation', 'confidence', 'outsideProject'],
    'approval.requested': ['requestId', 'actionKind', 'summary', 'outsideProject'],
    'approval.resolved': ['requestId', 'decision'],
    'input.requested': ['requestId', 'question'],
    'input.resolved': ['requestId'],
    'plan.updated': ['items'],
    usage: ['totals'],
    warning: ['text'],
    retry: ['text'],
    'auth.status': ['result', 'reason'],
    'run.completed': ['finalMessage'],
    'run.failed': ['category', 'text', 'providerMessage', 'hint'],
    'run.cancelled': ['cause'],
};

export function acToolsNotDelivered(provider: string): string {
    return `Tool calls: not delivered by ${provider}`;
}

export function acFileChangesNotDelivered(provider: string): string {
    return `File changes: not delivered by ${provider}`;
}

export function acCancelNotSupported(provider: string): string {
    return `Cancel: not supported by ${provider}`;
}

export const AC_FILE_CHANGES = 'File changes';
export const AC_OPERATION_WORDS: Readonly<Record<string, string>> = { add: 'added', update: 'changed', delete: 'deleted' };
export const AC_BASIS_WORDS: Readonly<Record<string, string>> = { reported: 'reported by provider', derived: 'derived from tool input' };
export const AC_OPEN_FILE = 'Open file';

export const AC_WAITING_FOR_YOU = 'Waiting for you';
export const AC_OUTSIDE_PROJECT = 'outside the project folder';
export const AC_APPROVE_ONCE = 'Approve once';
export const AC_REJECT = 'Reject';
export const AC_REASON_OPTIONAL = 'Reason (optional)';
export const AC_YOUR_ANSWER = 'Your answer';
export const AC_SEND = 'Send';

export function acApprovalNotification(number: string): string {
    return `Spec ${number}: the agent asks for approval.`;
}

export function acInputNotification(number: string): string {
    return `Spec ${number}: the agent asks for input.`;
}

export const AC_OPEN_IN_AGENT_CENTER = 'Open in Agent Center';

export function acCancelConfirmation(number: string): string {
    return `Cancel the agent run for spec ${number}? The agent stops; changes it already made stay.`;
}

export const AC_CANCEL_BUTTON = 'Cancel run';

export const AC_ERROR = 'Error';
export const AC_ERROR_CLASS = 'Error class';
export const AC_ERROR_MESSAGE = 'Message';
export const AC_FAILED_AT = 'Failed at';
export const AC_LAST_STATUS = 'Last status before failure';
export const AC_LAST_EVENT = 'Last event before failure';

export const ERROR_CLASS_WORDS: Readonly<Record<string, string>> = {
    auth: 'Sign-in rejected',
    quota_or_rate_limit: 'Quota or rate limit reached',
    model_unavailable: 'Model not available',
    network_or_server: 'Network or server error',
    runtime_missing: 'Provider runtime missing',
    policy_denied: 'Denied by policy',
    provider_exited: 'Provider stopped without a final event',
    start_timeout: 'Start timed out',
    unknown: 'Unknown error',
};

export function acErrorClassWord(errorClass: string | undefined): string {
    return (errorClass === undefined ? undefined : ERROR_CLASS_WORDS[errorClass]) ?? ERROR_CLASS_WORDS['unknown']!;
}

export const AC_RESULT = 'Result';
export const AC_NO_RESULT = 'No result delivered';
export const AC_NOT_DONE = 'The spec is not done until FeatherSpec verifies it.';

export const AC_ACTION_CANCEL = 'Cancel run';
export const AC_ACTION_RESUME = 'Resume';
export const AC_ACTION_OPEN_SPEC = 'Open spec';

export const AC_REQUEST_FAILED = 'The request failed.';
