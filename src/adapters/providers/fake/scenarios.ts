import { KIND_CAPABILITY, ERROR_CATEGORIES, type CapabilityDeclaration, type ErrorCategory } from '../../../core/providers/vocabulary';
import type { AnswerKey, ScriptEvent, ScriptStep } from './script';

export const FAKE_PROVIDER_ID = 'fake';
export const FAKE_DISPLAY_NAME = 'Fake provider (no agent, no network)';
export const FAKE_MODEL = 'fake-model';
export const FAKE_SAMPLE_CREDENTIAL = 'fake-sample-credential-7f3a';
export const FAKE_DELTA_COUNT = 3;
export const FAKE_DELTA_INTERVAL_MS = 50;
export const FAKE_LONG_RUN_INTERVAL_MS = 1_000;
export const FAKE_FILE_PATH = 'README.md';
export const FAKE_DUPLICATE_EVENT_ID = 'fake-duplicate-1';
export const FAKE_UNKNOWN_TYPE = 'fake.mystery';

export type FailureCategory = Exclude<ErrorCategory, 'cancelled'>;
export const FAILURE_CATEGORIES: readonly FailureCategory[] = ERROR_CATEGORIES.filter(
    (category): category is FailureCategory => category !== 'cancelled',
);

export type FakeScenarioId =
    | 'happy-path'
    | 'approval'
    | 'input'
    | `failure:${FailureCategory}`
    | 'long-run'
    | 'unknown-event'
    | 'duplicates-and-late'
    | 'no-end';

export const FAKE_SCENARIOS: readonly FakeScenarioId[] = [
    'happy-path',
    'approval',
    'input',
    ...FAILURE_CATEGORIES.map((category): FakeScenarioId => `failure:${category}`),
    'long-run',
    'unknown-event',
    'duplicates-and-late',
    'no-end',
];

export function resolveScenario(value: unknown): FakeScenarioId {
    return FAKE_SCENARIOS.find((id) => id === value) ?? 'happy-path';
}

export function fakeSessionRef(runId: string): string {
    return `fake-session-${runId}`;
}

export function isFakeSessionRef(sessionRef: string): boolean {
    return sessionRef.startsWith('fake-session-') && sessionRef.length > 'fake-session-'.length;
}

export interface ScenarioContext {
    runId: string;
    capabilities: CapabilityDeclaration;
    sessionRef?: string;
}

const emit = (kind: string, payload: ScriptEvent['payload'], extra: Partial<ScriptEvent> = {}, delayMs?: number): ScriptStep => ({
    type: 'emit',
    event: { kind, payload, ...extra },
    ...(delayMs === undefined ? {} : { delayMs }),
});

const DELTAS = ['Hello ', 'from the ', 'fake provider.'];

function prelude(context: ScenarioContext): ScriptStep[] {
    return [
        emit('session.started', { sessionRef: context.sessionRef ?? fakeSessionRef(context.runId), model: FAKE_MODEL }),
    ];
}

function turn(): ScriptStep[] {
    return [
        emit('turn.started', {}),
        ...DELTAS.slice(0, FAKE_DELTA_COUNT).map((text) => emit('message.delta', { text }, {}, FAKE_DELTA_INTERVAL_MS)),
        emit('message.completed', { text: DELTAS.slice(0, FAKE_DELTA_COUNT).join('') }),
    ];
}

function work(): ScriptStep[] {
    return [
        emit('reasoning', { text: 'Planning the change.' }),
        emit('plan.updated', { items: [{ text: 'Edit the file', done: false }, { text: 'Check the result', done: false }] }),
        emit('tool.started', { toolName: 'edit', callId: 'fake-call-1' }),
        emit('tool.progress', { toolName: 'edit', callId: 'fake-call-1' }),
        emit('tool.completed', { toolName: 'edit', callId: 'fake-call-1', ok: true }),
        emit('file.changed', { path: FAKE_FILE_PATH, operation: 'update', confidence: 'reported', outsideProject: false }),
        emit('usage', { totals: { inputTokens: 120, outputTokens: 48 } }),
    ];
}

const APPROVAL_ID = 'fake-approval-1';
const INPUT_ID = 'fake-input-1';

function approvalScenario(context: ScenarioContext): ScriptStep[] {
    const resolved = (decision: 'approve-once' | 'reject'): ScriptStep =>
        emit('approval.resolved', { requestId: APPROVAL_ID, decision });
    const completed = (ok: boolean): ScriptStep =>
        emit('tool.completed', { toolName: 'edit', callId: 'fake-call-1', ok, ...(ok ? {} : { errorText: 'The action was rejected.' }) });
    return [
        ...prelude(context),
        ...turn(),
        emit('tool.started', { toolName: 'edit', callId: 'fake-call-1' }),
        emit('approval.requested', { requestId: APPROVAL_ID, actionKind: 'edit', summary: `Edit ${FAKE_FILE_PATH}`, outsideProject: false }),
        {
            type: 'awaitAnswer',
            answerType: 'approval',
            requestId: APPROVAL_ID,
            branches: {
                'approve-once': [resolved('approve-once'), completed(true)],
                reject: [resolved('reject'), completed(false)],
            },
        },
        emit('run.completed', { finalMessage: 'Done (fake).' }),
        { type: 'close' },
    ];
}

function inputScenario(context: ScenarioContext): ScriptStep[] {
    return [
        ...prelude(context),
        ...turn(),
        emit('input.requested', { requestId: INPUT_ID, question: 'Which option should the fake use?' }),
        {
            type: 'awaitAnswer',
            answerType: 'input',
            requestId: INPUT_ID,
            branches: { answer: [emit('input.resolved', { requestId: INPUT_ID }), emit('message.completed', { text: 'Thanks for the answer.' })] },
        },
        emit('run.completed', { finalMessage: 'Done (fake).' }),
        { type: 'close' },
    ];
}

function ending(): ScriptStep[] {
    return [emit('turn.completed', {}), emit('run.completed', { finalMessage: 'Done (fake).' })];
}

function happyPath(context: ScenarioContext): ScriptStep[] {
    return [...prelude(context), ...turn(), ...work(), ...ending(), { type: 'close' }];
}

const kindAllowed = (kind: string, capabilities: CapabilityDeclaration): boolean => {
    const needed = (KIND_CAPABILITY as Record<string, string | null | undefined>)[kind];
    return needed === null || needed === undefined || capabilities[needed as keyof CapabilityDeclaration].value !== 'none';
};

export function filterByCapabilities(steps: readonly ScriptStep[], capabilities: CapabilityDeclaration): ScriptStep[] {
    const result: ScriptStep[] = [];
    for (const step of steps) {
        if ((step.type === 'emit' || step.type === 'repeat') && !kindAllowed(step.event.kind, capabilities)) {
            continue;
        }
        if (step.type === 'awaitAnswer') {
            const capability = step.answerType === 'approval' ? 'approvals' : 'userInput';
            const inline = step.branches['approve-once'] ?? step.branches.answer ?? [];
            if (capabilities[capability].value === 'none') {
                result.push(...filterByCapabilities(inline, capabilities));
            } else {
                const branches: Partial<Record<AnswerKey, ScriptStep[]>> = {};
                for (const [key, branch] of Object.entries(step.branches) as [AnswerKey, ScriptStep[]][]) {
                    branches[key] = filterByCapabilities(branch, capabilities);
                }
                result.push({ ...step, branches });
            }
            continue;
        }
        result.push(step);
    }
    return result;
}

function buildRaw(id: FakeScenarioId, context: ScenarioContext): ScriptStep[] {
    if (id.startsWith('failure:')) {
        const requested = id.slice('failure:'.length) as FailureCategory;
        const category = context.capabilities.typedErrors.value === 'none' ? 'unknown' : requested;
        const providerMessage =
            requested === 'auth' ? `Sign-in failed for token ${FAKE_SAMPLE_CREDENTIAL}` : `Fake failure of category ${requested}`;
        return [...prelude(context), ...turn(), emit('run.failed', { category, providerMessage }), { type: 'close' }];
    }
    switch (id) {
        case 'unknown-event':
            return [
                ...prelude(context),
                ...turn(),
                emit('provider.unknown', { typeName: FAKE_UNKNOWN_TYPE, fieldNames: ['alpha', 'beta'] }),
                ...work(),
                ...ending(),
                { type: 'close' },
            ];
        case 'duplicates-and-late':
            return [
                ...prelude(context),
                ...turn(),
                emit('reasoning', { text: 'Planning the change.' }, { providerEventId: FAKE_DUPLICATE_EVENT_ID }),
                emit('reasoning', { text: 'Planning the change.' }, { providerEventId: FAKE_DUPLICATE_EVENT_ID }),
                ...work().slice(1),
                ...ending(),
                emit('warning', { text: 'A late event after the end.' }),
                { type: 'close' },
            ];
        case 'approval':
            return approvalScenario(context);
        case 'input':
            return inputScenario(context);
        case 'long-run':
            return [...prelude(context), { type: 'repeat', intervalMs: FAKE_LONG_RUN_INTERVAL_MS, event: { kind: 'message.delta', payload: { text: 'still working ' } } }];
        case 'no-end':
            return [...prelude(context), ...turn(), { type: 'close' }];
        default:
            return happyPath(context);
    }
}

export function buildScenario(id: FakeScenarioId, context: ScenarioContext): ScriptStep[] {
    return filterByCapabilities(buildRaw(id, context), context.capabilities);
}
