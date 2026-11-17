import type { Disposable } from '../../../core/ports/host';

export interface CopilotEvent {
    type: string;
    id?: string;
    timestamp?: string;
    ephemeral?: boolean;
    data: Record<string, unknown>;
}

export type CopilotPermissionRequest = { kind: string; toolCallId?: string } & Record<string, unknown>;
export type CopilotPermissionAnswer = { kind: 'approve-once' } | { kind: 'reject'; feedback?: string };

export interface CopilotUserInputRequest {
    question: string;
    choices?: readonly string[];
    allowFreeform?: boolean;
    requestId?: string;
}
export interface CopilotUserInputAnswer {
    answer: string;
    wasFreeform: boolean;
}

export interface CopilotElicitationRequest {
    message: string;
    mode?: string;
    requestedSchema?: { properties?: Record<string, { type?: string; title?: string; description?: string; enum?: readonly string[] }> };
}
export interface CopilotElicitationAnswer {
    action: 'accept' | 'decline' | 'cancel';
    content?: Record<string, string>;
}

export interface CopilotSessionConfig {
    workingDirectory: string;
    model?: string;
    trustWorkingDirectory: boolean;
    onEvent(event: CopilotEvent): void;
    onPermission(request: CopilotPermissionRequest): Promise<CopilotPermissionAnswer>;
    onUserInput(request: CopilotUserInputRequest): Promise<CopilotUserInputAnswer>;
    onElicitation(request: CopilotElicitationRequest): Promise<CopilotElicitationAnswer>;
}

export interface CopilotTodo {
    title: string;
    status: string;
}

export interface CopilotSession {
    readonly sessionId: string;
    send(prompt: string): Promise<void>;
    abort(): Promise<void>;
    disconnect(): Promise<void>;
    readTodos(): Promise<readonly CopilotTodo[]>;
}

export interface CopilotRuntimeExit {
    code?: number;
    message: string;
}

export interface CopilotClient {
    start(): Promise<void>;
    stop(): Promise<void>;
    forceStop(): Promise<void>;
    getStatus(): Promise<{ version: string; protocolVersion: number }>;
    getAuthStatus(): Promise<{ isAuthenticated: boolean; authType?: string }>;
    listModels(): Promise<readonly string[]>;
    createSession(config: CopilotSessionConfig): Promise<CopilotSession>;
    resumeSession(sessionId: string, config: CopilotSessionConfig): Promise<CopilotSession>;
    onExit(listener: (exit: CopilotRuntimeExit) => void): Disposable;
}

export interface CopilotClientOptions {
    cliPath: string;
    baseDirectory?: string;
    workingDirectory: string;
}

export type CopilotClientFactory = (options: CopilotClientOptions) => CopilotClient;
