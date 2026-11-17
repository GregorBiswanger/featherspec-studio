import { isRecord } from './envelope';
import type { SpecRef } from './missionControl';

export const RUN_STATUS_KEYS = ['Starting', 'Running', 'WaitingForApproval', 'WaitingForInput', 'Completed', 'Failed', 'Cancelled', 'Interrupted'] as const;
export type RunStatusKey = (typeof RUN_STATUS_KEYS)[number];

export const OPEN_STATUS_KEYS: readonly RunStatusKey[] = ['Starting', 'Running', 'WaitingForApproval', 'WaitingForInput'];

export function isOpenStatusKey(status: string): boolean {
    return (OPEN_STATUS_KEYS as readonly string[]).includes(status);
}

export interface RunTiming {
    status: RunStatusKey;
    started: string | undefined;
    ended: string | undefined;
}

export interface RunRowView extends RunTiming {
    runId: string;
    spec: SpecRef;
    provider: string;
    historyIncomplete: boolean;
    historyUnreadable: boolean;
    selected: boolean;
}

export interface HeaderView extends RunTiming {
    runId: string;
    provider: string;
    model: string;
    session: string;
    spec: SpecRef;
    cause: string | undefined;
}

export interface FilterView {
    stem: string;
    label: string;
}

export interface RowField {
    label: string;
    text: string;
}

export interface TimelineRow {
    key: number;
    kind: string;
    time: string;
    source: string;
    fields: RowField[];
}

export interface TimelinePayload {
    runId: string;
    rows: TimelineRow[];
    hasEarlier: boolean;
}

export function exactly(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean {
    const keys = Object.keys(value);
    return required.every((key) => key in value) && keys.every((key) => required.includes(key) || optional.includes(key));
}

export function isText(value: unknown): value is string {
    return typeof value === 'string';
}

function isField(value: unknown): value is RowField {
    return isRecord(value) && exactly(value, ['label', 'text']) && isText(value.label) && isText(value.text);
}

export function isTimelineRow(value: unknown): value is TimelineRow {
    return (
        isRecord(value) &&
        exactly(value, ['key', 'kind', 'time', 'source', 'fields']) &&
        typeof value.key === 'number' &&
        Number.isInteger(value.key) &&
        isText(value.kind) &&
        isText(value.time) &&
        isText(value.source) &&
        Array.isArray(value.fields) &&
        value.fields.every(isField)
    );
}

export function isTimelinePayload(value: unknown): value is TimelinePayload {
    return (
        isRecord(value) &&
        exactly(value, ['runId', 'rows', 'hasEarlier']) &&
        isText(value.runId) &&
        value.runId.length > 0 &&
        typeof value.hasEarlier === 'boolean' &&
        Array.isArray(value.rows) &&
        value.rows.every(isTimelineRow)
    );
}

export type ControlsView = { kind: 'enabled' } | { kind: 'disabled'; reason: string } | { kind: 'none' };

export interface RequestView {
    kind: 'approval' | 'input';
    requestId: string;
    actionKind: string;
    summary: string;
    question: string;
    outsideProject: boolean;
    pending: boolean;
    refusal: string | undefined;
}

export interface FileChangeView {
    path: string;
    operation: string;
    basis: string;
    outsideProject: boolean;
    canOpen: boolean;
}

export interface ErrorView {
    errorClass: string;
    message: string;
    failedAt: string;
    lastStatus: string;
    lastEvent: string;
}

export interface ResultBlock {
    text: string;
    notDone: string;
}

export type CancelView = 'offer' | 'unsupported' | 'none';

export interface ActionsView {
    cancel: CancelView;
    cancelNote: string | undefined;
    resume: boolean;
    openSpec: boolean;
    refusal: string | undefined;
}

export interface DetailView {
    header: HeaderView;
    unreadable: boolean;
    activity: string | undefined;
    error: ErrorView | undefined;
    result: ResultBlock | undefined;
    files: FileChangeView[];
    notes: string[];
    requests: RequestView[];
    actions: ActionsView;
}

export type AgentCenterView =
    | { kind: 'unavailable'; reason: string }
    | {
          kind: 'ready';
          controls: ControlsView;
          filter: FilterView | undefined;
          notice: string | undefined;
          empty: 'no-runs' | 'no-match' | undefined;
          rows: RunRowView[];
          detail: DetailView | undefined;
      };

function isFlag(value: unknown): value is boolean {
    return typeof value === 'boolean';
}

function isOptionalText(value: unknown): boolean {
    return value === undefined || isText(value);
}

function isSpecRefView(value: unknown): value is SpecRef {
    return (
        isRecord(value) &&
        exactly(value, ['stem', 'number', 'title', 'found'], ['path']) &&
        isText(value.stem) &&
        isText(value.number) &&
        (value.title === null || isText(value.title)) &&
        isOptionalText(value.path) &&
        isFlag(value.found)
    );
}

function isStatusKey(value: unknown): value is RunStatusKey {
    return typeof value === 'string' && (RUN_STATUS_KEYS as readonly string[]).includes(value);
}

function isRunRow(value: unknown): value is RunRowView {
    return (
        isRecord(value) &&
        exactly(value, ['runId', 'spec', 'provider', 'status', 'historyIncomplete', 'historyUnreadable', 'selected'], ['started', 'ended']) &&
        isText(value.runId) &&
        isSpecRefView(value.spec) &&
        isText(value.provider) &&
        isStatusKey(value.status) &&
        isOptionalText(value.started) &&
        isOptionalText(value.ended) &&
        isFlag(value.historyIncomplete) &&
        isFlag(value.historyUnreadable) &&
        isFlag(value.selected)
    );
}

function isHeader(value: unknown): value is HeaderView {
    return (
        isRecord(value) &&
        exactly(value, ['runId', 'provider', 'model', 'session', 'spec', 'status'], ['cause', 'started', 'ended']) &&
        isText(value.runId) &&
        isText(value.provider) &&
        isText(value.model) &&
        isText(value.session) &&
        isSpecRefView(value.spec) &&
        isStatusKey(value.status) &&
        isOptionalText(value.cause) &&
        isOptionalText(value.started) &&
        isOptionalText(value.ended)
    );
}

function isRequest(value: unknown): value is RequestView {
    return (
        isRecord(value) &&
        exactly(value, ['kind', 'requestId', 'actionKind', 'summary', 'question', 'outsideProject', 'pending'], ['refusal']) &&
        (value.kind === 'approval' || value.kind === 'input') &&
        isText(value.requestId) &&
        isText(value.actionKind) &&
        isText(value.summary) &&
        isText(value.question) &&
        isFlag(value.outsideProject) &&
        isFlag(value.pending) &&
        isOptionalText(value.refusal)
    );
}

function isFileChange(value: unknown): value is FileChangeView {
    return (
        isRecord(value) &&
        exactly(value, ['path', 'operation', 'basis', 'outsideProject', 'canOpen']) &&
        isText(value.path) &&
        isText(value.operation) &&
        isText(value.basis) &&
        isFlag(value.outsideProject) &&
        isFlag(value.canOpen)
    );
}

function isErrorView(value: unknown): value is ErrorView {
    return (
        isRecord(value) &&
        exactly(value, ['errorClass', 'message', 'failedAt', 'lastStatus', 'lastEvent']) &&
        isText(value.errorClass) &&
        isText(value.message) &&
        isText(value.failedAt) &&
        isText(value.lastStatus) &&
        isText(value.lastEvent)
    );
}

function isResultBlock(value: unknown): value is ResultBlock {
    return isRecord(value) && exactly(value, ['text', 'notDone']) && isText(value.text) && isText(value.notDone);
}

function isActions(value: unknown): value is ActionsView {
    return (
        isRecord(value) &&
        exactly(value, ['cancel', 'resume', 'openSpec'], ['cancelNote', 'refusal']) &&
        (value.cancel === 'offer' || value.cancel === 'unsupported' || value.cancel === 'none') &&
        isOptionalText(value.cancelNote) &&
        isFlag(value.resume) &&
        isFlag(value.openSpec) &&
        isOptionalText(value.refusal)
    );
}

function isDetail(value: unknown): value is DetailView {
    return (
        isRecord(value) &&
        exactly(value, ['header', 'unreadable', 'files', 'notes', 'requests', 'actions'], ['activity', 'error', 'result']) &&
        isHeader(value.header) &&
        isFlag(value.unreadable) &&
        isOptionalText(value.activity) &&
        (value.error === undefined || isErrorView(value.error)) &&
        (value.result === undefined || isResultBlock(value.result)) &&
        Array.isArray(value.files) &&
        value.files.every(isFileChange) &&
        Array.isArray(value.notes) &&
        value.notes.every(isText) &&
        Array.isArray(value.requests) &&
        value.requests.every(isRequest) &&
        isActions(value.actions)
    );
}

function isControls(value: unknown): value is ControlsView {
    if (!isRecord(value)) {
        return false;
    }
    if (value.kind === 'disabled') {
        return exactly(value, ['kind', 'reason']) && isText(value.reason);
    }
    return (value.kind === 'enabled' || value.kind === 'none') && exactly(value, ['kind']);
}

export function isAgentCenterView(value: unknown): value is AgentCenterView {
    if (!isRecord(value)) {
        return false;
    }
    if (value.kind === 'unavailable') {
        return exactly(value, ['kind', 'reason']) && isText(value.reason);
    }
    return (
        value.kind === 'ready' &&
        exactly(value, ['kind', 'controls', 'rows'], ['filter', 'notice', 'empty', 'detail']) &&
        isControls(value.controls) &&
        (value.filter === undefined || (isRecord(value.filter) && exactly(value.filter, ['stem', 'label']) && isText(value.filter.stem) && isText(value.filter.label))) &&
        isOptionalText(value.notice) &&
        (value.empty === undefined || value.empty === 'no-runs' || value.empty === 'no-match') &&
        Array.isArray(value.rows) &&
        value.rows.every(isRunRow) &&
        (value.detail === undefined || isDetail(value.detail))
    );
}
