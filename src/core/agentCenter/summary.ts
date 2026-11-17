import {
    AC_BASIS_WORDS,
    AC_NOT_AVAILABLE,
    AC_NOT_DONE,
    AC_NO_RESULT,
    AC_OPERATION_WORDS,
    AC_WAITING_FOR_INPUT,
    acErrorClassWord,
    acFileChangesNotDelivered,
    acRunningTool,
    acStatusWord,
    acToolsNotDelivered,
    acWaitingForApproval,
} from '../../shared/protocol/agentCenterTexts';
import { readRunResult } from '../orchestrator/result';
import type { ProviderEntry } from '../providers/registry';
import { NOT_AVAILABLE, isEndStatus, type RunView, type StoredEvent } from '../runtime/model';
import { kindText, payloadObject, timeOf } from './timeline';

export interface OpenRequest {
    kind: 'approval' | 'input';
    requestId: string;
    seq: number;
    actionKind: string;
    summary: string;
    question: string;
    outsideProject: boolean;
}

export interface OpenTool {
    callId: string;
    toolName: string;
    seq: number;
}

export interface FileChange {
    path: string;
    operation: string;
    basis: string;
    outsideProject: boolean;
}

export interface EventNote {
    kind: string;
    time: string;
}

export interface RunSummary {
    requests: readonly OpenRequest[];
    tools: readonly OpenTool[];
    files: readonly FileChange[];
    lastEvent: EventNote | undefined;
    beforeFailure: EventNote | undefined;
    sawFailure: boolean;
    lastSeq: number;
}

export interface ErrorDetails {
    errorClass: string;
    message: string;
    failedAt: string;
    lastStatus: string;
    lastEvent: string;
}

export interface ResultView {
    text: string;
    notDone: string;
}

export function emptySummary(): RunSummary {
    return { requests: [], tools: [], files: [], lastEvent: undefined, beforeFailure: undefined, sawFailure: false, lastSeq: 0 };
}

function text(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

export function summarize(summary: RunSummary, event: StoredEvent): RunSummary {
    const payload = payloadObject(event);
    const next: { -readonly [Key in keyof RunSummary]: RunSummary[Key] } = { ...summary, lastEvent: { kind: kindText(event), time: timeOf(event) }, lastSeq: event.seq };
    switch (event.type) {
        case 'approval.requested':
        case 'input.requested': {
            const requestId = text(payload['requestId']);
            if (requestId !== '' && !summary.requests.some((request) => request.requestId === requestId)) {
                next.requests = [
                    ...summary.requests,
                    {
                        kind: event.type === 'approval.requested' ? 'approval' : 'input',
                        requestId,
                        seq: event.seq,
                        actionKind: text(payload['actionKind']),
                        summary: text(payload['summary']),
                        question: text(payload['question']),
                        outsideProject: payload['outsideProject'] === true,
                    },
                ];
            }
            break;
        }
        case 'approval.resolved':
        case 'input.resolved':
            next.requests = summary.requests.filter((request) => request.requestId !== text(payload['requestId']));
            break;
        case 'tool.started': {
            const callId = text(payload['callId']);
            next.tools = [...summary.tools.filter((tool) => tool.callId !== callId), { callId, toolName: text(payload['toolName']), seq: event.seq }];
            break;
        }
        case 'tool.completed':
            next.tools = summary.tools.filter((tool) => tool.callId !== text(payload['callId']));
            break;
        case 'file.changed': {
            const path = text(payload['path']);
            if (path !== '') {
                next.files = [
                    ...summary.files,
                    {
                        path,
                        operation: AC_OPERATION_WORDS[text(payload['operation'])] ?? AC_NOT_AVAILABLE,
                        basis: AC_BASIS_WORDS[text(payload['confidence'])] ?? AC_NOT_AVAILABLE,
                        outsideProject: payload['outsideProject'] === true,
                    },
                ];
            }
            break;
        }
        case 'run.failed':
            if (!summary.sawFailure) {
                next.sawFailure = true;
                next.beforeFailure = summary.lastEvent;
            }
            break;
        default:
            break;
    }
    return next;
}

export function openRequests(run: RunView, summary: RunSummary): readonly OpenRequest[] {
    return isEndStatus(run.status) ? [] : summary.requests;
}

export function currentActivity(run: RunView, summary: RunSummary): string | undefined {
    if (isEndStatus(run.status)) {
        return undefined;
    }
    const approval = summary.requests.find((request) => request.kind === 'approval');
    if (approval !== undefined) {
        return acWaitingForApproval(approval.summary);
    }
    if (summary.requests.some((request) => request.kind === 'input')) {
        return AC_WAITING_FOR_INPUT;
    }
    const tool = summary.tools[summary.tools.length - 1];
    return tool === undefined ? AC_NOT_AVAILABLE : acRunningTool(tool.toolName);
}

export function errorDetails(run: RunView, summary: RunSummary): ErrorDetails | undefined {
    if (run.status !== 'Failed') {
        return undefined;
    }
    const history = run.statusHistory;
    let failedIndex = -1;
    history.forEach((entry, index) => {
        if (entry.status === 'Failed') {
            failedIndex = index;
        }
    });
    const failedAt = failedIndex >= 0 ? history[failedIndex]?.at : run.ended;
    const before = failedIndex > 0 ? history[failedIndex - 1] : undefined;
    const lastEvent = summary.sawFailure ? summary.beforeFailure : summary.lastEvent;
    return {
        errorClass: acErrorClassWord(run.errorClass),
        message: run.errorMessage ?? NOT_AVAILABLE,
        failedAt: failedAt ?? NOT_AVAILABLE,
        lastStatus: before === undefined ? NOT_AVAILABLE : acStatusWord(before.status),
        lastEvent: lastEvent?.kind ?? NOT_AVAILABLE,
    };
}

export function resultView(run: RunView): ResultView | undefined {
    if (run.status !== 'Completed') {
        return undefined;
    }
    const message = readRunResult(run).finalMessage;
    return { text: message === NOT_AVAILABLE ? AC_NO_RESULT : message, notDone: AC_NOT_DONE };
}

export function capabilityNotes(provider: Pick<ProviderEntry, 'displayName' | 'capabilities'> | undefined): string[] {
    if (provider === undefined) {
        return [];
    }
    const notes: string[] = [];
    if (provider.capabilities.toolEvents.value === 'none') {
        notes.push(acToolsNotDelivered(provider.displayName));
    }
    if (provider.capabilities.fileChanges.value === 'none') {
        notes.push(acFileChangesNotDelivered(provider.displayName));
    }
    return notes;
}
