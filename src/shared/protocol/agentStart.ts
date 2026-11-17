import { isRecord } from './envelope';
import type { RunStatusWord } from './missionControl';

export type TransitionRefusalKind = 'not-observed' | 'derived-target' | 'needs-evidence' | 'not-ready' | 'lifecycle-move';

export type AvailabilityWord = 'not-installed' | 'not-signed-in' | 'blocked-by-policy' | 'unknown' | 'available';

export type RefusalItem =
    | { id: 'P-1'; kind: 'transition'; refusal: TransitionRefusalKind; ids: string[]; text: string }
    | { id: 'P-1'; kind: 'no-entry'; stem: string }
    | { id: 'P-1'; kind: 'several'; stem: string }
    | { id: 'P-2'; missing: string[] }
    | { id: 'P-3'; configured?: string }
    | { id: 'P-4'; provider: string; result: AvailabilityWord; reason?: string; hint?: string }
    | { id: 'P-5'; runId: string; stem: string }
    | { id: 'P-6'; state: 'read-only' | 'unavailable'; reason?: string }
    | { id: 'P-7' }
    | { id: 'P-8'; stem: string }
    | { id: 'pending' }
    | { id: 'outdated' }
    | { id: 'orchestrator'; text: string; run?: { runId: string; stem: string } };

export type CapabilityGap = 'approvals' | 'userInput';

export type PreviousRunView =
    | { kind: 'none' }
    | { kind: 'run'; runId: string; status: RunStatusWord; errorClass: string; errorText: string }
    | { kind: 'not-available'; reason: string };

export interface StartConfirmation {
    token: string;
    spec: { number: string; title: string; stem: string };
    provider: { id: string; displayName: string };
    model?: string;
    permissionMode: string;
    disclosure?: string;
    missing: CapabilityGap[];
    previousRun: PreviousRunView;
    prompt: string;
    starting: boolean;
}

export interface StartRefusal {
    number?: string;
    items: RefusalItem[];
}

export interface StartNotice {
    runId: string;
    errorClass: string;
}

export interface AgentStartView {
    checking?: { number: string };
    confirmation?: StartConfirmation;
    refusal?: StartRefusal;
    notice?: StartNotice;
}

const REFUSAL_KINDS: readonly string[] = ['not-observed', 'derived-target', 'needs-evidence', 'not-ready', 'lifecycle-move'];
const AVAILABILITY_WORDS: readonly string[] = ['not-installed', 'not-signed-in', 'blocked-by-policy', 'unknown', 'available'];
const RUN_STATUS_WORDS: readonly string[] = ['Starting', 'Running', 'WaitingForApproval', 'WaitingForInput', 'Completed', 'Failed', 'Cancelled', 'Interrupted'];
const GAPS: readonly string[] = ['approvals', 'userInput'];

function exactly(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean {
    const keys = Object.keys(value);
    return required.every((key) => key in value && value[key] !== undefined) && keys.every((key) => required.includes(key) || (optional.includes(key) && value[key] !== undefined) || value[key] === undefined);
}

function isText(value: unknown): value is string {
    return typeof value === 'string';
}

function isOptionalText(value: unknown): boolean {
    return value === undefined || typeof value === 'string';
}

function isTexts(value: unknown): value is string[] {
    return Array.isArray(value) && value.every(isText);
}

function isOneOf(value: unknown, words: readonly string[]): boolean {
    return typeof value === 'string' && words.includes(value);
}

function isRunRef(value: unknown): boolean {
    return isRecord(value) && exactly(value, ['runId', 'stem']) && isText(value.runId) && isText(value.stem);
}

function isRefusalItem(value: unknown): value is RefusalItem {
    if (!isRecord(value)) {
        return false;
    }
    switch (value.id) {
        case 'P-1':
            if (value.kind === 'transition') {
                return exactly(value, ['id', 'kind', 'refusal', 'ids', 'text']) && isOneOf(value.refusal, REFUSAL_KINDS) && isTexts(value.ids) && isText(value.text);
            }
            return (value.kind === 'no-entry' || value.kind === 'several') && exactly(value, ['id', 'kind', 'stem']) && isText(value.stem);
        case 'P-2':
            return exactly(value, ['id', 'missing']) && isTexts(value.missing);
        case 'P-3':
            return exactly(value, ['id'], ['configured']) && isOptionalText(value.configured);
        case 'P-4':
            return (
                exactly(value, ['id', 'provider', 'result'], ['reason', 'hint']) &&
                isText(value.provider) &&
                isOneOf(value.result, AVAILABILITY_WORDS) &&
                isOptionalText(value.reason) &&
                isOptionalText(value.hint)
            );
        case 'P-5':
            return exactly(value, ['id', 'runId', 'stem']) && isText(value.runId) && isText(value.stem);
        case 'P-6':
            return exactly(value, ['id', 'state'], ['reason']) && isOneOf(value.state, ['read-only', 'unavailable']) && isOptionalText(value.reason);
        case 'P-7':
            return exactly(value, ['id']);
        case 'P-8':
            return exactly(value, ['id', 'stem']) && isText(value.stem);
        case 'pending':
        case 'outdated':
            return exactly(value, ['id']);
        case 'orchestrator':
            return exactly(value, ['id', 'text'], ['run']) && isText(value.text) && (value.run === undefined || isRunRef(value.run));
        default:
            return false;
    }
}

function isPreviousRun(value: unknown): value is PreviousRunView {
    if (!isRecord(value)) {
        return false;
    }
    if (value.kind === 'none') {
        return exactly(value, ['kind']);
    }
    if (value.kind === 'not-available') {
        return exactly(value, ['kind', 'reason']) && isText(value.reason);
    }
    return (
        value.kind === 'run' &&
        exactly(value, ['kind', 'runId', 'status', 'errorClass', 'errorText']) &&
        isText(value.runId) &&
        isOneOf(value.status, RUN_STATUS_WORDS) &&
        isText(value.errorClass) &&
        isText(value.errorText)
    );
}

function isConfirmation(value: unknown): value is StartConfirmation {
    if (!isRecord(value)) {
        return false;
    }
    const spec = value.spec;
    const provider = value.provider;
    return (
        exactly(value, ['token', 'spec', 'provider', 'permissionMode', 'missing', 'previousRun', 'prompt', 'starting'], ['model', 'disclosure']) &&
        isText(value.token) &&
        isRecord(spec) &&
        exactly(spec, ['number', 'title', 'stem']) &&
        isText(spec.number) &&
        isText(spec.title) &&
        isText(spec.stem) &&
        isRecord(provider) &&
        exactly(provider, ['id', 'displayName']) &&
        isText(provider.id) &&
        isText(provider.displayName) &&
        isOptionalText(value.model) &&
        isText(value.permissionMode) &&
        isOptionalText(value.disclosure) &&
        Array.isArray(value.missing) &&
        value.missing.every((gap) => isOneOf(gap, GAPS)) &&
        isPreviousRun(value.previousRun) &&
        isText(value.prompt) &&
        typeof value.starting === 'boolean'
    );
}

function isRefusal(value: unknown): value is StartRefusal {
    return isRecord(value) && exactly(value, ['items'], ['number']) && isOptionalText(value.number) && Array.isArray(value.items) && value.items.every(isRefusalItem);
}

function isNotice(value: unknown): value is StartNotice {
    return isRecord(value) && exactly(value, ['runId', 'errorClass']) && isText(value.runId) && isText(value.errorClass);
}

export function isAgentStartView(value: unknown): value is AgentStartView {
    if (!isRecord(value) || !exactly(value, [], ['checking', 'confirmation', 'refusal', 'notice'])) {
        return false;
    }
    const { checking, confirmation, refusal, notice } = value;
    return (
        (checking === undefined || (isRecord(checking) && exactly(checking, ['number']) && isText(checking.number))) &&
        (confirmation === undefined || isConfirmation(confirmation)) &&
        (refusal === undefined || isRefusal(refusal)) &&
        (notice === undefined || isNotice(notice))
    );
}
