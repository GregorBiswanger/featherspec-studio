import type { JsonValue } from '../runtime/model';
import type { AvailabilityResult, CapabilityDeclaration, ErrorCategory, EventKind } from '../providers/vocabulary';

export type EventSource = 'provider' | 'derived';

export type SessionStartedPayload = { sessionRef: string; model?: string };
export type EmptyPayload = Record<string, never>;
export type TextPayload = { text: string };
export type ToolPayload = { toolName: string; callId: string };
export type ToolCompletedPayload = { toolName: string; callId: string; ok: boolean; errorText?: string };
export type FileChangedPayload = {
    path: string;
    operation: 'add' | 'update' | 'delete';
    confidence: 'reported' | 'derived';
    outsideProject: boolean;
};
export type ApprovalRequestedPayload = { requestId: string; actionKind: string; summary: string; outsideProject: boolean };
export type ApprovalResolvedPayload = { requestId: string; decision: 'approve-once' | 'reject' };
export type InputRequestedPayload = { requestId: string; question: string };
export type InputResolvedPayload = { requestId: string };
export type PlanUpdatedPayload = { items: { text: string; done: boolean }[] };
export type UsagePayload = { totals: Record<string, number> };
export type AuthStatusPayload = { result: AvailabilityResult; reason?: string };
export type RunCompletedPayload = { finalMessage?: string };
export type RunFailedPayload = { category: ErrorCategory; text: string; providerMessage?: string; hint?: string };
export type RunFailedDeliveredPayload = { category: ErrorCategory; text?: string; providerMessage?: string; hint?: string };
export type RunCancelledPayload = { cause?: string };
export type ProviderUnknownPayload = { typeName: string; fieldNames: string[] };

export interface EventPayloads {
    'session.started': SessionStartedPayload;
    'turn.started': EmptyPayload;
    'turn.completed': EmptyPayload;
    'message.delta': TextPayload;
    'message.completed': TextPayload;
    reasoning: TextPayload;
    'tool.started': ToolPayload;
    'tool.progress': ToolPayload;
    'tool.completed': ToolCompletedPayload;
    'file.changed': FileChangedPayload;
    'approval.requested': ApprovalRequestedPayload;
    'approval.resolved': ApprovalResolvedPayload;
    'input.requested': InputRequestedPayload;
    'input.resolved': InputResolvedPayload;
    'plan.updated': PlanUpdatedPayload;
    usage: UsagePayload;
    warning: TextPayload;
    retry: TextPayload;
    'auth.status': AuthStatusPayload;
    'run.completed': RunCompletedPayload;
    'run.failed': RunFailedPayload;
    'run.cancelled': RunCancelledPayload;
    'provider.unknown': ProviderUnknownPayload;
}

export type PayloadOf<K extends EventKind> = EventPayloads[K];

export interface DeliveredEvent {
    kind: string;
    source: EventSource;
    providerEventId?: string;
    occurredAt?: string;
    payload: JsonValue;
}

export type ProviderEvent = DeliveredEvent & { runId: string };

export interface ProviderEventSink {
    emit(event: DeliveredEvent): void;
    close(): void;
    fail(reason: string): void;
}

export interface ProviderStartRequest {
    runId: string;
    workingDirectory: string;
    prompt: string;
    model?: string;
}

export interface ProviderResumeRequest {
    runId: string;
    workingDirectory: string;
    sessionRef: string;
    continuationText: string;
}

export type ApprovalAnswer = { decision: 'approve-once' } | { decision: 'reject'; reason?: string };

export type OperationOutcome = { ok: true } | { ok: false; reason: string };

export interface AvailabilityReport {
    result: AvailabilityResult;
    hint?: string;
}

export interface AgentProviderPort {
    readonly id: string;
    readonly displayName: string;
    readonly capabilities: CapabilityDeclaration;
    readonly permissionModeLabel: string;
    readonly disclosure?: string;
    checkAvailability(): Promise<AvailabilityReport>;
    start(request: ProviderStartRequest, sink: ProviderEventSink): Promise<void>;
    resume(request: ProviderResumeRequest, sink: ProviderEventSink): Promise<void>;
    cancel(runId: string): Promise<OperationOutcome>;
    respondToApproval(runId: string, requestId: string, answer: ApprovalAnswer): Promise<OperationOutcome>;
    respondToInput(runId: string, requestId: string, text: string): Promise<OperationOutcome>;
    endSession(runId: string): void;
    listModels(): Promise<readonly string[]>;
    nextStartModel(): string | undefined;
    credentialValues(): readonly string[];
}
