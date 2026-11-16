export const CAPABILITIES = [
    'start',
    'cancel',
    'resume',
    'streamText',
    'toolEvents',
    'fileChanges',
    'approvals',
    'userInput',
    'planUpdates',
    'usage',
    'modelList',
    'mcp',
    'customTools',
    'typedErrors',
] as const;
export type Capability = (typeof CAPABILITIES)[number];

export const CAPABILITY_VALUES = ['native', 'derived', 'none'] as const;
export type CapabilityValue = (typeof CAPABILITY_VALUES)[number];

export type CapabilityDeclaration = { [C in Capability]: { value: CapabilityValue; experimental?: true } };

export const EVENT_KINDS = [
    'session.started',
    'turn.started',
    'turn.completed',
    'message.delta',
    'message.completed',
    'reasoning',
    'tool.started',
    'tool.progress',
    'tool.completed',
    'file.changed',
    'approval.requested',
    'approval.resolved',
    'input.requested',
    'input.resolved',
    'plan.updated',
    'usage',
    'warning',
    'retry',
    'auth.status',
    'run.completed',
    'run.failed',
    'run.cancelled',
    'provider.unknown',
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export const KIND_CAPABILITY: Readonly<Record<EventKind, Capability | null>> = {
    'session.started': null,
    'turn.started': null,
    'turn.completed': null,
    'message.delta': 'streamText',
    'message.completed': null,
    reasoning: null,
    'tool.started': 'toolEvents',
    'tool.progress': 'toolEvents',
    'tool.completed': 'toolEvents',
    'file.changed': 'fileChanges',
    'approval.requested': 'approvals',
    'approval.resolved': 'approvals',
    'input.requested': 'userInput',
    'input.resolved': 'userInput',
    'plan.updated': 'planUpdates',
    usage: 'usage',
    warning: null,
    retry: null,
    'auth.status': null,
    'run.completed': null,
    'run.failed': null,
    'run.cancelled': null,
    'provider.unknown': null,
};

export const END_KINDS = ['run.completed', 'run.failed', 'run.cancelled'] as const satisfies readonly EventKind[];
export type EndKind = (typeof END_KINDS)[number];

export const AVAILABILITY_RESULTS = ['available', 'not-installed', 'not-signed-in', 'blocked-by-policy', 'unknown'] as const;
export type AvailabilityResult = (typeof AVAILABILITY_RESULTS)[number];

export const ERROR_CATEGORIES = [
    'auth',
    'quota_or_rate_limit',
    'model_unavailable',
    'network_or_server',
    'runtime_missing',
    'policy_denied',
    'cancelled',
    'tool_failure',
    'unknown',
] as const;
export type ErrorCategory = (typeof ERROR_CATEGORIES)[number];

export const AVAILABILITY_REASONS: Readonly<Record<Exclude<AvailabilityResult, 'available'>, string>> = {
    'not-installed': "The provider's runtime is not installed.",
    'not-signed-in': 'You are not signed in to the provider.',
    'blocked-by-policy': 'A policy blocks this provider.',
    unknown: 'The availability check failed.',
};

export const ERROR_CATEGORY_TEXTS: Readonly<Record<ErrorCategory, string>> = {
    auth: 'The provider rejected the sign-in.',
    quota_or_rate_limit: "The provider's quota or rate limit was reached.",
    model_unavailable: 'The requested model is not available.',
    network_or_server: 'The provider could not be reached or reported a server error.',
    runtime_missing: "The provider's runtime is missing or could not be started.",
    policy_denied: 'A policy denied the run.',
    cancelled: 'The run was cancelled.',
    tool_failure: 'A tool failed and the run could not continue.',
    unknown: 'The run failed for an unknown reason.',
};

export const STOPPED_WITHOUT_END_REASON = 'provider stopped without a final event';
export const AVAILABILITY_TIMEOUT_HINT = 'The availability check gave no answer within 15 seconds.';
export const AVAILABILITY_TIMEOUT_MS = 15_000;

export function isEventKind(value: string): value is EventKind {
    return (EVENT_KINDS as readonly string[]).includes(value);
}

export function isEndKind(value: string): value is EndKind {
    return (END_KINDS as readonly string[]).includes(value);
}
