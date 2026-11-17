import type { RunStatus } from '../runtime/model';

export interface AgentStartRequest {
    providerId: string;
    model?: string;
    spec: { stem: string; path: string };
    prompt: string;
    projectRoot: string;
}

export type StartAnswer = { kind: 'started'; runId: string } | { kind: 'refused'; text: string; run?: { runId: string; stem: string } };

export type PreviousRunSummary =
    | { kind: 'none' }
    | { kind: 'run'; runId: string; status: RunStatus; errorClass: string; errorText: string }
    | { kind: 'not-available'; reason: string };

export interface StartOrchestratorPort {
    start(request: AgentStartRequest): Promise<StartAnswer>;
    previousRun(stem: string): Promise<PreviousRunSummary>;
}

export interface AgentStartUiPort {
    reveal(): void;
}
