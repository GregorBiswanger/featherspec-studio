import * as path from 'node:path';
import type { DeliveredEvent } from '../../../core/ports/agentProvider';
import type { JsonValue } from '../../../core/runtime/model';
import type { ErrorCategory } from '../../../core/providers/vocabulary';
import type { CopilotElicitationRequest, CopilotEvent, CopilotTodo } from './client';

export const IGNORED_TYPES: readonly string[] = [
    'assistant.streaming_delta',
    'assistant.message_start',
    'assistant.tool_call_delta',
    'assistant.reasoning_delta',
    'assistant.idle',
    'user.message',
    'system.message',
    'pending_messages.modified',
    'session.managed_settings_resolved',
    'session.mcp_server_status_changed',
    'session.mcp_servers_loaded',
    'session.tools_updated',
    'session.title_changed',
    'session.model_change',
    'session.usage_info',
    'session.usage_checkpoint',
    'session.background_tasks_changed',
    'session.shutdown',
    'agent.interrupted',
    'prompt_cache_break',
];

export const SIGN_IN_HINT = 'Run `copilot` in a terminal and sign in, then retry.';
export const QUOTA_HINT = 'Your Copilot allowance or rate limit is reached; retry later.';

export interface MapperOptions {
    workingDirectory: string;
    platform: string;
    sessionId?: string;
    readTodos(): Promise<readonly CopilotTodo[]>;
    isAnswered(requestId: string): boolean;
}

export interface EventMapper {
    started(sessionRef: string, model?: string): DeliveredEvent[];
    promptSent(): void;
    ended(): boolean;
    map(event: CopilotEvent): Promise<DeliveredEvent[]>;
}

type Data = Record<string, unknown>;

const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const record = (value: unknown): Data => (value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Data) : {});

export function isSingleTextField(request: CopilotElicitationRequest): boolean {
    if (request.mode !== undefined && request.mode !== 'form') {
        return false;
    }
    const fields = Object.values(request.requestedSchema?.properties ?? {});
    const only = fields[0];
    return fields.length === 1 && only?.type === 'string' && only.enum === undefined;
}

export function locateInProject(candidate: string, root: string, platform: string): { path: string; outsideProject: boolean } {
    const flavour = platform === 'win32' ? path.win32 : path.posix;
    const relative = flavour.relative(root, flavour.resolve(root, candidate));
    const outside = relative === '..' || relative.startsWith(`..${flavour.sep}`) || flavour.isAbsolute(relative);
    return outside ? { path: candidate, outsideProject: true } : { path: relative.split(flavour.sep).join('/'), outsideProject: false };
}

function categoryOf(data: Data): ErrorCategory {
    const errorType = text(data.errorType);
    const status = typeof data.statusCode === 'number' ? data.statusCode : 0;
    if (errorType === 'authentication') {
        return 'auth';
    }
    if (errorType === 'rate_limit' || errorType === 'quota') {
        return 'quota_or_rate_limit';
    }
    if (errorType === 'authorization' || errorType === 'policy') {
        return 'policy_denied';
    }
    if (status >= 500 || /network|connection/i.test(errorType ?? '')) {
        return 'network_or_server';
    }
    return 'unknown';
}

function hintOf(category: ErrorCategory): string | undefined {
    if (category === 'auth') {
        return SIGN_IN_HINT;
    }
    return category === 'quota_or_rate_limit' ? QUOTA_HINT : undefined;
}

function approvalSummary(kind: string, request: Data): string {
    const direct =
        kind === 'shell'
            ? text(request.fullCommandText)
            : kind === 'write'
              ? text(request.fileName)
              : kind === 'read'
                ? text(request.path)
                : kind === 'url'
                  ? text(request.url)
                  : kind === 'memory'
                    ? text(request.fact)
                    : text(request.toolName);
    return direct ?? text(request.intention) ?? kind;
}

function approvalPath(kind: string, request: Data): string | undefined {
    if (kind === 'shell') {
        return text(request.resolvedWorkingDirectory);
    }
    if (kind === 'write') {
        return text(request.resolvedPath) ?? text(request.fileName);
    }
    return kind === 'read' ? (text(request.resolvedPath) ?? text(request.path)) : undefined;
}

export function createEventMapper(options: MapperOptions): EventMapper {
    let startedEmitted = false;
    let promptWasSent = false;
    let endKind = false;
    let finalMessage: string | undefined;
    let inputTokens = 0;
    let outputTokens = 0;
    const toolNames = new Map<string, string>();

    const make = (event: CopilotEvent | undefined, kind: string, payload: Record<string, JsonValue>, index = 0): DeliveredEvent => {
        const delivered: DeliveredEvent = { kind, source: 'provider', payload };
        if (event?.id !== undefined) {
            delivered.providerEventId = index === 0 ? event.id : `${event.id}#${index + 1}`;
        }
        if (event?.timestamp !== undefined) {
            delivered.occurredAt = event.timestamp;
        }
        return delivered;
    };

    const many = (event: CopilotEvent, items: { kind: string; payload: Record<string, JsonValue> }[]): DeliveredEvent[] =>
        items.map((item, index) => make(event, item.kind, item.payload, index));

    const start = (event: CopilotEvent | undefined, sessionRef: string | undefined, model: string | undefined): DeliveredEvent[] => {
        if (startedEmitted || sessionRef === undefined) {
            return [];
        }
        startedEmitted = true;
        return [make(event, 'session.started', model === undefined ? { sessionRef } : { sessionRef, model })];
    };

    const finish = (event: CopilotEvent, kind: string, payload: Record<string, JsonValue>): DeliveredEvent[] => {
        if (endKind) {
            return [];
        }
        endKind = true;
        return [make(event, kind, payload)];
    };

    const fileChanges = (event: CopilotEvent, data: Data, completed: { kind: string; payload: Record<string, JsonValue> }): DeliveredEvent[] => {
        const items = [completed];
        const edits = Array.isArray(data.fileEdits) ? (data.fileEdits as unknown[]) : [];
        for (const edit of edits) {
            const { kind, path: file } = record(edit);
            const operation = kind === 'create' ? 'add' : kind === 'edit' ? 'update' : kind === 'delete' ? 'delete' : undefined;
            if (typeof file !== 'string') {
                continue;
            }
            if (operation === undefined) {
                items.push({ kind: 'warning', payload: { text: `Copilot reported a file change of kind "${String(kind)}" for ${file}; Studio does not list it.` } });
                continue;
            }
            const located = locateInProject(file, options.workingDirectory, options.platform);
            items.push({ kind: 'file.changed', payload: { path: located.path, operation, confidence: 'reported', outsideProject: located.outsideProject } });
        }
        return many(event, items);
    };

    const map = async (event: CopilotEvent): Promise<DeliveredEvent[]> => {
        const data = event.data;
        switch (event.type) {
            case 'session.start':
                return start(event, text(data.sessionId) ?? options.sessionId, text(data.selectedModel));
            case 'session.resume':
                return start(event, options.sessionId ?? text(data.sessionId), text(data.selectedModel));
            case 'assistant.turn_start':
                return [make(event, 'turn.started', {})];
            case 'assistant.turn_end':
                return [make(event, 'turn.completed', {})];
            case 'assistant.message_delta':
                return [make(event, 'message.delta', { text: text(data.deltaContent) ?? '' })];
            case 'assistant.message':
                finalMessage = text(data.content) ?? '';
                return [make(event, 'message.completed', { text: finalMessage })];
            case 'assistant.reasoning':
                return [make(event, 'reasoning', { text: text(data.content) ?? '' })];
            case 'tool.execution_start': {
                const toolName = text(data.toolName) ?? 'unknown';
                const callId = text(data.toolCallId) ?? '';
                toolNames.set(callId, toolName);
                return [make(event, 'tool.started', { toolName, callId })];
            }
            case 'tool.execution_progress': {
                const callId = text(data.toolCallId) ?? '';
                return [make(event, 'tool.progress', { toolName: toolNames.get(callId) ?? 'unknown', callId })];
            }
            case 'tool.execution_complete': {
                const callId = text(data.toolCallId) ?? '';
                const errorText = text(record(data.error).message);
                const payload: Record<string, JsonValue> = { toolName: toolNames.get(callId) ?? 'unknown', callId, ok: data.success === true };
                if (errorText !== undefined) {
                    payload.errorText = errorText;
                }
                return fileChanges(event, data, { kind: 'tool.completed', payload });
            }
            case 'permission.requested': {
                const request = record(data.permissionRequest);
                const kind = text(request.kind) ?? 'unknown';
                const located = approvalPath(kind, request);
                const outsideProject = located !== undefined && locateInProject(located, options.workingDirectory, options.platform).outsideProject;
                return [make(event, 'approval.requested', { requestId: text(data.requestId) ?? '', actionKind: kind, summary: approvalSummary(kind, request), outsideProject })];
            }
            case 'permission.completed': {
                const requestId = text(data.requestId) ?? '';
                if (options.isAnswered(requestId)) {
                    return [];
                }
                const result = typeof data.result === 'string' ? data.result : (text(record(data.result).kind) ?? '');
                return [make(event, 'approval.resolved', { requestId, decision: result.startsWith('approved') ? 'approve-once' : 'reject' })];
            }
            case 'user_input.requested': {
                const choices = Array.isArray(data.choices) ? (data.choices as string[]) : [];
                const question = text(data.question) ?? '';
                return [make(event, 'input.requested', { requestId: text(data.requestId) ?? '', question: choices.length === 0 ? question : `${question}\n\nChoices: ${choices.join(', ')}` })];
            }
            case 'elicitation.requested': {
                const request = { message: text(data.message) ?? '', mode: text(data.mode), requestedSchema: data.requestedSchema } as CopilotElicitationRequest;
                if (isSingleTextField(request)) {
                    return [make(event, 'input.requested', { requestId: text(data.requestId) ?? '', question: request.message })];
                }
                return [make(event, 'warning', { text: `Copilot asked a question Studio cannot show as a form, so it was declined: ${request.message}` })];
            }
            case 'user_input.completed':
            case 'elicitation.completed': {
                const requestId = text(data.requestId) ?? '';
                return options.isAnswered(requestId) ? [] : [make(event, 'input.resolved', { requestId })];
            }
            case 'session.todos_changed': {
                try {
                    const todos = await options.readTodos();
                    return [make(event, 'plan.updated', { items: todos.map((todo) => ({ text: todo.title, done: todo.status === 'done' })) })];
                } catch {
                    return [];
                }
            }
            case 'assistant.usage': {
                inputTokens += typeof data.inputTokens === 'number' ? data.inputTokens : 0;
                outputTokens += typeof data.outputTokens === 'number' ? data.outputTokens : 0;
                return [make(event, 'usage', { totals: { inputTokens, outputTokens } })];
            }
            case 'session.warning':
                return [make(event, 'warning', { text: text(data.message) ?? '' })];
            case 'session.idle':
                if (!promptWasSent || data.aborted === true) {
                    return [];
                }
                return finish(event, 'run.completed', finalMessage === undefined ? {} : { finalMessage });
            case 'session.error': {
                const category = categoryOf(data);
                const hint = hintOf(category);
                const payload: Record<string, JsonValue> = { category };
                const message = text(data.message);
                if (message !== undefined) {
                    payload.providerMessage = message;
                }
                if (hint !== undefined) {
                    payload.hint = hint;
                }
                return finish(event, 'run.failed', payload);
            }
            case 'abort':
                return finish(event, 'run.cancelled', {});
            default:
                if (event.type.startsWith('model.') || IGNORED_TYPES.includes(event.type)) {
                    return [];
                }
                return [make(event, 'provider.unknown', { typeName: event.type, fieldNames: Object.keys(data) })];
        }
    };

    return {
        started: (sessionRef, model) => start(undefined, sessionRef, model),
        promptSent: () => {
            promptWasSent = true;
        },
        ended: () => endKind,
        map,
    };
}
