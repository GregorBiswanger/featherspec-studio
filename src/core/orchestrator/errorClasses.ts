import type { EventSource } from '../ports/agentProvider';

export const ERROR_CLASSES = [
    'auth',
    'quota_or_rate_limit',
    'model_unavailable',
    'network_or_server',
    'runtime_missing',
    'policy_denied',
    'provider_exited',
    'start_timeout',
    'unknown',
] as const;
export type ErrorClass = (typeof ERROR_CLASSES)[number];

const CATEGORY_CLASSES: readonly ErrorClass[] = ['auth', 'quota_or_rate_limit', 'model_unavailable', 'network_or_server', 'runtime_missing', 'policy_denied'];

export function classOf(failed: { source?: EventSource; category: unknown }): ErrorClass {
    if (failed.source === 'derived') {
        return 'provider_exited';
    }
    return CATEGORY_CLASSES.find((errorClass) => errorClass === failed.category) ?? 'unknown';
}
