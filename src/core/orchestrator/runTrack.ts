import type { EventSource } from '../ports/agentProvider';
import { isEndStatus, type JsonValue, type RunStatus } from '../runtime/model';
import { classOf } from './errorClasses';

export type ChangedFile = {
    path: string;
    operation: string;
};

export interface RunTrack {
    status: RunStatus;
    sessionStarted: boolean;
    approvals: readonly string[];
    inputs: readonly string[];
    finalMessage: string | undefined;
    lastMessage: string | undefined;
    usage: Record<string, number> | undefined;
    changedFiles: readonly ChangedFile[];
}

export interface TrackEvent {
    kind: string;
    source?: EventSource;
    payload: JsonValue;
}

export interface TrackStep {
    status: RunStatus;
    cause?: string;
    sessionRef?: string;
    model?: string;
    failure?: { errorClass: string; errorMessage: string };
}

export interface Applied {
    track: RunTrack;
    steps: TrackStep[];
}

export const ALLOWED_TRANSITIONS: Readonly<Record<RunStatus, readonly RunStatus[]>> = {
    Starting: ['Running', 'Failed', 'Cancelled'],
    Running: ['WaitingForApproval', 'WaitingForInput', 'Completed', 'Failed', 'Cancelled'],
    WaitingForApproval: ['WaitingForInput', 'Running', 'Completed', 'Failed', 'Cancelled'],
    WaitingForInput: ['WaitingForApproval', 'Running', 'Completed', 'Failed', 'Cancelled'],
    Completed: [],
    Failed: [],
    Cancelled: [],
    Interrupted: [],
};

export function canTransition(from: RunStatus, to: RunStatus): boolean {
    return ALLOWED_TRANSITIONS[from].includes(to);
}

export function createTrack(): RunTrack {
    return {
        status: 'Starting',
        sessionStarted: false,
        approvals: [],
        inputs: [],
        finalMessage: undefined,
        lastMessage: undefined,
        usage: undefined,
        changedFiles: [],
    };
}

export function transition(track: RunTrack, status: RunStatus): RunTrack | undefined {
    return canTransition(track.status, status) ? { ...track, status } : undefined;
}

function isRecord(value: JsonValue): value is { [key: string]: JsonValue } {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(payload: { [key: string]: JsonValue }, key: string): string | undefined {
    const value = payload[key];
    return typeof value === 'string' ? value : undefined;
}

function numbers(value: JsonValue | undefined): Record<string, number> | undefined {
    if (value === undefined || !isRecord(value)) {
        return undefined;
    }
    const totals: Record<string, number> = {};
    for (const [name, amount] of Object.entries(value)) {
        if (typeof amount === 'number') {
            totals[name] = amount;
        }
    }
    return totals;
}

function absorb(track: RunTrack, event: TrackEvent): RunTrack {
    const payload = isRecord(event.payload) ? event.payload : {};
    switch (event.kind) {
        case 'message.completed': {
            const message = text(payload, 'text');
            return message === undefined ? track : { ...track, lastMessage: message };
        }
        case 'usage': {
            const totals = numbers(payload['totals']);
            return totals === undefined ? track : { ...track, usage: totals };
        }
        case 'file.changed': {
            const path = text(payload, 'path');
            const operation = text(payload, 'operation');
            if (path === undefined || operation === undefined) {
                return track;
            }
            const known = track.changedFiles.some((file) => file.path === path);
            const next = known ? track.changedFiles.map((file) => (file.path === path ? { path, operation } : file)) : [...track.changedFiles, { path, operation }];
            return { ...track, changedFiles: next };
        }
        default:
            return track;
    }
}

function without(list: readonly string[], id: string): readonly string[] {
    return list.filter((entry) => entry !== id);
}

function waitingStatus(track: RunTrack): RunStatus {
    if (track.approvals.length > 0) {
        return 'WaitingForApproval';
    }
    return track.inputs.length > 0 ? 'WaitingForInput' : 'Running';
}

function settle(track: RunTrack, sessionStep?: Pick<TrackStep, 'sessionRef' | 'model'>): Applied {
    const steps: TrackStep[] = [];
    let current = track;
    const wanted = waitingStatus(track);
    const goTo = (status: RunStatus, extra: Partial<TrackStep> = {}): void => {
        if (current.status !== status && canTransition(current.status, status)) {
            steps.push({ status, ...extra });
            current = { ...current, status };
        }
    };
    if (current.status === 'Starting') {
        goTo('Running', sessionStep);
    }
    goTo(wanted);
    return { track: current, steps };
}

export function applyEvent(track: RunTrack, event: TrackEvent): Applied {
    if (isEndStatus(track.status)) {
        return { track, steps: [] };
    }
    const payload = isRecord(event.payload) ? event.payload : {};
    const absorbed = absorb(track, event);
    switch (event.kind) {
        case 'session.started': {
            const sessionRef = text(payload, 'sessionRef');
            const model = text(payload, 'model');
            const started = { ...absorbed, sessionStarted: true };
            return settle(started, { ...(sessionRef === undefined ? {} : { sessionRef }), ...(model === undefined ? {} : { model }) });
        }
        case 'approval.requested':
        case 'input.requested': {
            const id = text(payload, 'requestId');
            if (id === undefined) {
                return { track: absorbed, steps: [] };
            }
            const key = event.kind === 'approval.requested' ? 'approvals' : 'inputs';
            const list = absorbed[key];
            const next = list.includes(id) ? absorbed : { ...absorbed, [key]: [...list, id] };
            return absorbed.sessionStarted ? settle(next) : { track: next, steps: [] };
        }
        case 'approval.resolved':
        case 'input.resolved': {
            const id = text(payload, 'requestId');
            const key = event.kind === 'approval.resolved' ? 'approvals' : 'inputs';
            if (id === undefined || !absorbed[key].includes(id)) {
                return { track: absorbed, steps: [] };
            }
            const next = { ...absorbed, [key]: without(absorbed[key], id) };
            return absorbed.sessionStarted ? settle(next) : { track: next, steps: [] };
        }
        case 'run.completed': {
            const finalMessage = text(payload, 'finalMessage');
            const done = finalMessage === undefined ? absorbed : { ...absorbed, finalMessage };
            const ended = transition(done, 'Completed');
            return ended === undefined ? { track: done, steps: [] } : { track: ended, steps: [{ status: 'Completed' }] };
        }
        case 'run.failed': {
            const ended = transition(absorbed, 'Failed');
            if (ended === undefined) {
                return { track: absorbed, steps: [] };
            }
            const errorClass = classOf({ ...(event.source === undefined ? {} : { source: event.source }), category: payload['category'] });
            const errorMessage = text(payload, 'text') ?? '';
            return { track: ended, steps: [{ status: 'Failed', failure: { errorClass, errorMessage } }] };
        }
        case 'run.cancelled': {
            const ended = transition(absorbed, 'Cancelled');
            return ended === undefined ? { track: absorbed, steps: [] } : { track: ended, steps: [{ status: 'Cancelled' }] };
        }
        default:
            return { track: absorbed, steps: [] };
    }
}
