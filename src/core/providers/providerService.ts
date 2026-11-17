import type {
    AgentProviderPort,
    DeliveredEvent,
    ProviderEvent,
    ProviderEventSink,
    ProviderResumeRequest,
    ProviderStartRequest,
} from '../ports/agentProvider';
import type { JsonValue } from '../runtime/model';
import type { Disposable } from '../ports/host';
import type { RuntimeClock } from '../ports/runtimeMedium';
import type { ProviderRegistry } from './registry';
import {
    ERROR_CATEGORIES,
    ERROR_CATEGORY_TEXTS,
    STOPPED_WITHOUT_END_REASON,
    isEndKind,
    isEventKind,
    type Capability,
    type CapabilityDeclaration,
    type ErrorCategory,
} from './vocabulary';

export type ServiceRefusal =
    | { kind: 'not-registered'; providerId: string }
    | { kind: 'not-supported'; providerId: string }
    | { kind: 'unknown-run'; runId: string }
    | { kind: 'already-ended'; runId: string }
    | { kind: 'failed'; reason: string };

export type ServiceResult<T = object> = ({ kind: 'ok' } & T) | ServiceRefusal;

export interface ProviderService {
    start(providerId: string, request: ProviderStartRequest): Promise<ServiceResult>;
    resume(providerId: string, request: ProviderResumeRequest): Promise<ServiceResult>;
    cancel(runId: string): Promise<ServiceResult>;
    endSession(runId: string): ServiceResult;
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
            if (!run.ended && isEndKind(normalised.kind)) {
                run.ended = true;
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
        const run: RunRecord = { adapter, capabilities, ended: false, sessionEnded: false };
        runs.set(runId, run);
        const sink = sinkFor(runId, run);
        try {
            launch(adapter, sink).catch((error: unknown) => sink.fail(messageOf(error)));
        } catch (error) {
            sink.fail(messageOf(error));
        }
        return { kind: 'ok' };
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
        onEvent(listener) {
            listeners.add(listener);
            return { dispose: () => void listeners.delete(listener) };
        },
    };
}
