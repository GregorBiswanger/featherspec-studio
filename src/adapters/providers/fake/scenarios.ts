import { KIND_CAPABILITY, ERROR_CATEGORIES, type CapabilityDeclaration, type ErrorCategory } from '../../../core/providers/vocabulary';
import type { ScriptEvent, ScriptStep } from './script';

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

function ending(): ScriptStep[] {
    return [emit('turn.completed', {}), emit('run.completed', { finalMessage: 'Done (fake).' })];
}

function happyPath(context: ScenarioContext): ScriptStep[] {
    return [...prelude(context), ...turn(), ...work(), ...ending(), { type: 'close' }];
}

export function filterByCapabilities(steps: readonly ScriptStep[], capabilities: CapabilityDeclaration): ScriptStep[] {
    return steps.filter((step) => {
        if (step.type !== 'emit') {
            return true;
        }
        const needed = (KIND_CAPABILITY as Record<string, string | null | undefined>)[step.event.kind];
        return needed === null || needed === undefined || capabilities[needed as keyof CapabilityDeclaration].value !== 'none';
    });
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
        case 'no-end':
            return [...prelude(context), ...turn(), { type: 'close' }];
        default:
            return happyPath(context);
    }
}

export function buildScenario(id: FakeScenarioId, context: ScenarioContext): ScriptStep[] {
    return filterByCapabilities(buildRaw(id, context), context.capabilities);
}
