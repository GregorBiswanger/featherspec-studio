import type {
    AgentProviderPort,
    ApprovalAnswer,
    AvailabilityReport,
    OperationOutcome,
    DeliveredEvent,
    ProviderEvent,
    ProviderEventSink,
    ProviderResumeRequest,
    ProviderStartRequest,
} from '../ports/agentProvider';
import type { JsonValue } from '../runtime/model';
import type { Disposable } from '../ports/host';
import type { CredentialValuesPort, RuntimeClock } from '../ports/runtimeMedium';
import type { ProviderRegistry } from './registry';
import {
    AVAILABILITY_REASONS,
    AVAILABILITY_RESULTS,
    AVAILABILITY_TIMEOUT_HINT,
    AVAILABILITY_TIMEOUT_MS,
    ERROR_CATEGORIES,
    ERROR_CATEGORY_TEXTS,
    STOPPED_WITHOUT_END_REASON,
    isEndKind,
    isEventKind,
    type AvailabilityResult,
    type Capability,
    type CapabilityDeclaration,
    type ErrorCategory,
} from './vocabulary';

export type ServiceRefusal =
    | { kind: 'not-registered'; providerId: string }
    | { kind: 'not-supported'; providerId: string }
    | { kind: 'unknown-run'; runId: string }
    | { kind: 'already-ended'; runId: string }
    | { kind: 'request-not-open'; runId: string; requestId: string }
    | { kind: 'invalid-answer'; reason: string }
    | { kind: 'failed'; reason: string };

export type ServiceResult<T = object> = ({ kind: 'ok' } & T) | ServiceRefusal;

export interface ProviderService {
    start(providerId: string, request: ProviderStartRequest): Promise<ServiceResult>;
    resume(providerId: string, request: ProviderResumeRequest): Promise<ServiceResult>;
    cancel(runId: string): Promise<ServiceResult>;
    endSession(runId: string): ServiceResult;
    checkAvailability(providerId: string): Promise<ServiceResult<{ result: AvailabilityResult; reason?: string; hint?: string }>>;
    respondToApproval(runId: string, requestId: string, answer: ApprovalAnswer): Promise<ServiceResult>;
    respondToInput(runId: string, requestId: string, text: string): Promise<ServiceResult>;
    readonly credentials: CredentialValuesPort;
    listModels(providerId: string): Promise<ServiceResult<{ models: readonly string[] }>>;
    onEvent(listener: (event: ProviderEvent) => void): Disposable;
}

export interface ProviderServiceOptions {
    registry: ProviderRegistry;
    clock: RuntimeClock;
}

interface RunRecord {
    adapter: AgentProviderPort;
    capabilities: CapabilityDeclaration;
    open: Map<string, { type: 'approval' | 'input'; answering: boolean }>;
    ended: boolean;
    sessionEnded: boolean;
}

function messageOf(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, JsonValue> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalise(event: DeliveredEvent): DeliveredEvent {
    if (!isEventKind(event.kind)) {
        return {
            kind: 'provider.unknown',
            source: 'derived',
            ...(event.providerEventId === undefined ? {} : { providerEventId: event.providerEventId }),
            ...(event.occurredAt === undefined ? {} : { occurredAt: event.occurredAt }),
            payload: { typeName: event.kind, fieldNames: isRecord(event.payload) ? Object.keys(event.payload) : [] },
        };
    }
    if (event.kind === 'run.failed') {
        const delivered = isRecord(event.payload) ? event.payload : {};
        const category: ErrorCategory =
            typeof delivered.category === 'string' &&
            delivered.category !== 'cancelled' &&
            (ERROR_CATEGORIES as readonly string[]).includes(delivered.category)
                ? (delivered.category as ErrorCategory)
                : 'unknown';
        const payload: Record<string, JsonValue> = { category, text: ERROR_CATEGORY_TEXTS[category] };
        if (typeof delivered.providerMessage === 'string') {
            payload.providerMessage = delivered.providerMessage;
        }
        if (typeof delivered.hint === 'string') {
            payload.hint = delivered.hint;
        }
        return { ...event, payload };
    }
    return event;
}

function trackRequests(run: RunRecord, event: DeliveredEvent): void {
    if (!isRecord(event.payload) || typeof event.payload.requestId !== 'string') {
        return;
    }
    const requestId = event.payload.requestId;
    if (event.kind === 'approval.requested' || event.kind === 'input.requested') {
        run.open.set(requestId, { type: event.kind === 'approval.requested' ? 'approval' : 'input', answering: false });
    } else if (event.kind === 'approval.resolved' || event.kind === 'input.resolved') {
        run.open.delete(requestId);
    }
}

function validApproval(answer: unknown): ApprovalAnswer | undefined {
    if (typeof answer !== 'object' || answer === null) {
        return undefined;
    }
    const { decision, reason } = answer as { decision?: unknown; reason?: unknown };
    if (decision === 'approve-once') {
        return { decision };
    }
    if (decision === 'reject' && (reason === undefined || typeof reason === 'string')) {
        return reason === undefined ? { decision } : { decision, reason };
    }
    return undefined;
}

export function createProviderService(options: ProviderServiceOptions): ProviderService {
    const { registry } = options;
    const runs = new Map<string, RunRecord>();
    const listeners = new Set<(event: ProviderEvent) => void>();

    const publish = (runId: string, event: DeliveredEvent): void => {
        const stamped: ProviderEvent = { ...event, runId };
        for (const listener of [...listeners]) {
            try {
                listener(stamped);
            } catch {
                continue;
            }
        }
    };

    const stopped = (runId: string, run: RunRecord, hint?: string): void => {
        if (run.ended || run.sessionEnded) {
            return;
        }
        run.ended = true;
        run.open.clear();
        publish(runId, {
            kind: 'run.failed',
            source: 'derived',
            payload: {
                category: 'unknown',
                text: ERROR_CATEGORY_TEXTS.unknown,
                providerMessage: STOPPED_WITHOUT_END_REASON,
                ...(hint === undefined ? {} : { hint }),
            },
        });
    };

    const sinkFor = (runId: string, run: RunRecord): ProviderEventSink => ({
        emit(event) {
            if (run.sessionEnded) {
                return;
            }
            const normalised = normalise(event);
            if (!run.ended) {
                trackRequests(run, normalised);
            }
            if (!run.ended && isEndKind(normalised.kind)) {
                run.ended = true;
                run.open.clear();
            }
            publish(runId, normalised);
        },
        close: () => stopped(runId, run),
        fail: (reason) => stopped(runId, run, reason),
    });

    const begin = async (
        providerId: string,
        runId: string,
        capability: Capability,
        launch: (adapter: AgentProviderPort, sink: ProviderEventSink) => Promise<void>,
    ): Promise<ServiceResult> => {
        const adapter = registry.adapter(providerId);
        const found = registry.entry(providerId);
        if (adapter === undefined || found.kind !== 'ok') {
            return { kind: 'not-registered', providerId };
        }
        const capabilities = found.entry.capabilities;
        if (capabilities[capability].value === 'none') {
            return { kind: 'not-supported', providerId };
        }
        if (runs.has(runId)) {
            return { kind: 'failed', reason: 'run ID already started' };
        }
        const run: RunRecord = { adapter, capabilities, open: new Map(), ended: false, sessionEnded: false };
        runs.set(runId, run);
        const sink = sinkFor(runId, run);
        try {
            launch(adapter, sink).catch((error: unknown) => sink.fail(messageOf(error)));
        } catch (error) {
            sink.fail(messageOf(error));
        }
        return { kind: 'ok' };
    };

    const respond = async (
        runId: string,
        requestId: string,
        type: 'approval' | 'input',
        capability: Capability,
        prepare: () => ((adapter: AgentProviderPort) => Promise<OperationOutcome>) | undefined,
    ): Promise<ServiceResult> => {
        const run = runs.get(runId);
        if (run === undefined) {
            return { kind: 'unknown-run', runId };
        }
        if (run.capabilities[capability].value === 'none') {
            return { kind: 'not-supported', providerId: run.adapter.id };
        }
        const request = run.open.get(requestId);
        if (run.ended || run.sessionEnded || request === undefined || request.type !== type || request.answering) {
            return { kind: 'request-not-open', runId, requestId };
        }
        const send = prepare();
        if (send === undefined) {
            return { kind: 'invalid-answer', reason: type === 'approval' ? 'only approve-once or reject is accepted' : 'the answer must be text' };
        }
        request.answering = true;
        try {
            const outcome = await send(run.adapter);
            if (!outcome.ok) {
                request.answering = false;
                return { kind: 'failed', reason: outcome.reason };
            }
            return { kind: 'ok' };
        } catch (error) {
            request.answering = false;
            return { kind: 'failed', reason: messageOf(error) };
        }
    };

    return {
        start: (providerId, request) => begin(providerId, request.runId, 'start', (adapter, sink) => adapter.start(request, sink)),
        resume: (providerId, request) => begin(providerId, request.runId, 'resume', (adapter, sink) => adapter.resume(request, sink)),
        async cancel(runId) {
            const run = runs.get(runId);
            if (run === undefined) {
                return { kind: 'unknown-run', runId };
            }
            if (run.capabilities.cancel.value === 'none') {
                return { kind: 'not-supported', providerId: run.adapter.id };
            }
            if (run.ended || run.sessionEnded) {
                return { kind: 'already-ended', runId };
            }
            try {
                const outcome = await run.adapter.cancel(runId);
                return outcome.ok ? { kind: 'ok' } : { kind: 'failed', reason: outcome.reason };
            } catch (error) {
                return { kind: 'failed', reason: messageOf(error) };
            }
        },
        endSession(runId) {
            const run = runs.get(runId);
            if (run === undefined) {
                return { kind: 'unknown-run', runId };
            }
            run.sessionEnded = true;
            try {
                run.adapter.endSession(runId);
            } catch {
                return { kind: 'ok' };
            }
            return { kind: 'ok' };
        },
        async listModels(providerId) {
            const adapter = registry.adapter(providerId);
            const found = registry.entry(providerId);
            if (adapter === undefined || found.kind !== 'ok') {
                return { kind: 'not-registered', providerId };
            }
            if (found.entry.capabilities.modelList.value === 'none') {
                return { kind: 'not-supported', providerId };
            }
            try {
                return { kind: 'ok', models: await adapter.listModels() };
            } catch (error) {
                return { kind: 'failed', reason: messageOf(error) };
            }
        },
        async checkAvailability(providerId) {
            const adapter = registry.adapter(providerId);
            if (adapter === undefined) {
                return { kind: 'not-registered', providerId };
            }
            const outcome = await new Promise<AvailabilityReport | 'timeout'>((resolve) => {
                const timer = options.clock.setTimeout(() => resolve('timeout'), AVAILABILITY_TIMEOUT_MS);
                const settle = (value: AvailabilityReport | 'timeout'): void => {
                    timer.dispose();
                    resolve(value);
                };
                try {
                    adapter.checkAvailability().then(settle, () => settle({ result: 'unknown' }));
                } catch {
                    settle({ result: 'unknown' });
                }
            });
            if (outcome === 'timeout') {
                return { kind: 'ok', result: 'unknown', reason: AVAILABILITY_REASONS.unknown, hint: AVAILABILITY_TIMEOUT_HINT };
            }
            const known = (AVAILABILITY_RESULTS as readonly unknown[]).includes(outcome?.result);
            const result: AvailabilityResult = known ? outcome.result : 'unknown';
            const hint = known && typeof outcome.hint === 'string' ? outcome.hint : undefined;
            return {
                kind: 'ok',
                result,
                ...(result === 'available' ? {} : { reason: AVAILABILITY_REASONS[result] }),
                ...(hint === undefined ? {} : { hint }),
            };
        },
        respondToApproval: (runId, requestId, answer) =>
            respond(runId, requestId, 'approval', 'approvals', () => {
                const valid = validApproval(answer);
                return valid === undefined ? undefined : (adapter) => adapter.respondToApproval(runId, requestId, valid);
            }),
        respondToInput: (runId, requestId, text) =>
            respond(runId, requestId, 'input', 'userInput', () =>
                typeof text === 'string' ? (adapter) => adapter.respondToInput(runId, requestId, text) : undefined,
            ),
        credentials: {
            values() {
                const adapters = new Set<AgentProviderPort>(registry.adapters());
                for (const run of runs.values()) {
                    adapters.add(run.adapter);
                }
                const values = new Set<string>();
                for (const adapter of adapters) {
                    try {
                        for (const value of adapter.credentialValues()) {
                            if (typeof value === 'string' && value !== '') {
                                values.add(value);
                            }
                        }
                    } catch {
                        continue;
                    }
                }
                return [...values];
            },
        },
        onEvent(listener) {
            listeners.add(listener);
            return { dispose: () => void listeners.delete(listener) };
        },
    };
}
