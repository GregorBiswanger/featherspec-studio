import { isAreaId, type AreaId } from './areas';
import { isAgentStartView, type AgentStartView } from './agentStart';
import { isAgentCenterView, isTimelinePayload, type AgentCenterView, type TimelinePayload } from './agentCenter';
import { isBoardView, isMoveResult, isSortKey, type BoardView, type MoveResult, type SortKey } from './board';
import { isDetailView, type DetailView } from './detail';
import { isBoardFilter, isBoardState, type BoardFilter, type BoardState } from './boardFilter';
import { isRecord } from './envelope';
import { isDerivedRule, isMissionControlView, type DerivedRule, type MissionControlView } from './missionControl';

export const ACTION_IDS = [
    'openFolder',
    'openSetupGuide',
    'refresh',
    'selectProject',
    'showOutput',
    'retry',
    'manageTrust',
    'reload',
] as const;
export type ActionId = (typeof ACTION_IDS)[number];

export type NavigationTarget =
    | { kind: 'spec'; stem: string; path?: string }
    | { kind: 'run'; id: string }
    | { kind: 'boardFilter'; filter: BoardFilter };

export interface NavigationRequest {
    area: AreaId;
    target?: NavigationTarget;
}

export type S5Reason =
    | { cause: 'discovery'; message: string }
    | { cause: 'listing'; folder: string; reason: string }
    | { cause: 'protocol' };

export interface IncompleteFolder {
    folder: string;
    markers: string[];
}

export type PanelState =
    | { id: 'S1' }
    | { id: 'S2' }
    | { id: 'S3' }
    | { id: 'S4' }
    | { id: 'S5'; reason: S5Reason }
    | { id: 'S6' }
    | { id: 'S8'; name: string; canSelect: boolean }
    | { id: 'S9'; folders: IncompleteFolder[] };

export interface SpecRow {
    stem: string;
    path: string;
    number: string;
    title: string | undefined;
    state: string;
    derivedRule: DerivedRule | undefined;
    showPath: boolean;
    selected: boolean;
}

export interface SelectedSpec {
    stem: string;
    path?: string;
    number: string;
}

export interface ShellView {
    state: PanelState | undefined;
    restricted: boolean;
    projectName: string | undefined;
    area: AreaId;
    target: NavigationTarget | undefined;
    selection: SelectedSpec | undefined;
    notice: { number: string } | undefined;
    rows: SpecRow[];
}

export interface HelloPayload {
    lastSeq: number;
}

export interface SelectPayload {
    stem: string;
    path?: string;
}

export interface RunActionPayload {
    action: ActionId;
}

export interface BoardSetFilterPayload {
    filter: BoardFilter;
}

export interface BoardSetSortPayload {
    sort: SortKey;
}

export interface BoardFocusPayload {
    key: string | null;
}

export interface MoveRequestPayload {
    key: string;
    target: BoardState;
}

export interface OpenFilePayload {
    key: string;
    line?: number;
}

export interface ShellRequestPayloads {
    hello: HelloPayload;
    navigate: NavigationRequest;
    select: SelectPayload;
    runAction: RunActionPayload;
    dismissNotice: Record<string, never>;
}

export interface BoardRequestPayloads {
    boardSetFilter: BoardSetFilterPayload;
    boardSetSort: BoardSetSortPayload;
    boardClearFilters: Record<string, never>;
    boardFocus: BoardFocusPayload;
    moveRequest: MoveRequestPayload;
    openFile: OpenFilePayload;
}

export interface AgentStartTokenPayload {
    token: string;
}

export interface AgentStartDismissPayload {
    which: 'refusal' | 'notice';
}

export interface AgentStartRequestPayloads {
    agentStartConfirm: AgentStartTokenPayload;
    agentStartCancel: AgentStartTokenPayload;
    agentStartDismiss: AgentStartDismissPayload;
}

export type AgentCenterAnswer = { kind: 'approval'; decision: 'approve-once' | 'reject'; reason?: string } | { kind: 'input'; text: string };

export interface AgentCenterRunPayload {
    runId: string;
}

export interface AgentCenterRequestPayloads {
    acSelect: AgentCenterRunPayload;
    acClearFilter: Record<string, never>;
    acLoadEarlier: AgentCenterRunPayload;
    acFollow: { runId: string; on: boolean };
    acAnswer: { runId: string; requestId: string; answer: AgentCenterAnswer };
    acCancel: AgentCenterRunPayload;
    acResume: AgentCenterRunPayload;
    acOpenFile: { runId: string; path: string };
}

export type RequestPayloads = ShellRequestPayloads & BoardRequestPayloads & AgentStartRequestPayloads & AgentCenterRequestPayloads;

export type RequestType = keyof RequestPayloads;
export type ShellRequestType = keyof ShellRequestPayloads;
export type BoardRequestType = keyof BoardRequestPayloads;
export type AgentStartRequestType = keyof AgentStartRequestPayloads;
export type AgentCenterRequestType = keyof AgentCenterRequestPayloads;

export interface BoardEventPayload {
    view: BoardView;
}

export interface DetailEventPayload {
    view: DetailView;
}

export interface MoveResultEventPayload {
    result: MoveResult;
}

export interface MissionControlEventPayload {
    view: MissionControlView;
}

export interface AgentStartEventPayload {
    view: AgentStartView;
}

export interface AgentCenterEventPayload {
    view: AgentCenterView;
}

export type AgentCenterTimelineEventPayload = TimelinePayload;

export interface ShellEventPayload {
    view: ShellView;
}

export interface ResponsePayload {
    ok: boolean;
    error?: string;
}

function isString(value: unknown): value is string {
    return typeof value === 'string';
}

function isOptionalString(value: unknown): boolean {
    return value === undefined || typeof value === 'string';
}

export function isNavigationTarget(value: unknown): value is NavigationTarget {
    if (!isRecord(value)) {
        return false;
    }
    if (value.kind === 'spec') {
        return isString(value.stem) && value.stem.length > 0 && isOptionalString(value.path);
    }
    if (value.kind === 'run') {
        return isString(value.id) && value.id.length > 0;
    }
    if (value.kind === 'boardFilter') {
        return isBoardFilter(value.filter);
    }
    return false;
}

export function isNavigationRequest(value: unknown): value is NavigationRequest {
    return isRecord(value) && isAreaId(value.area) && (value.target === undefined || isNavigationTarget(value.target));
}

export function isHelloPayload(value: unknown): value is HelloPayload {
    return isRecord(value) && typeof value.lastSeq === 'number' && Number.isInteger(value.lastSeq) && value.lastSeq >= 0;
}

export function isSelectPayload(value: unknown): value is SelectPayload {
    return isRecord(value) && isString(value.stem) && value.stem.length > 0 && isOptionalString(value.path);
}

export function isRunActionPayload(value: unknown): value is RunActionPayload {
    return isRecord(value) && isString(value.action) && (ACTION_IDS as readonly string[]).includes(value.action);
}

export function isEmptyPayload(value: unknown): value is Record<string, never> {
    return value === undefined || (isRecord(value) && Object.keys(value).length === 0);
}

export function isBoardSetFilterPayload(value: unknown): value is BoardSetFilterPayload {
    return isRecord(value) && isBoardFilter(value.filter);
}

export function isBoardSetSortPayload(value: unknown): value is BoardSetSortPayload {
    return isRecord(value) && isSortKey(value.sort);
}

export function isBoardFocusPayload(value: unknown): value is BoardFocusPayload {
    return isRecord(value) && (value.key === null || (isString(value.key) && value.key.length > 0));
}

export function isMoveRequestPayload(value: unknown): value is MoveRequestPayload {
    return isRecord(value) && isString(value.key) && value.key.length > 0 && isBoardState(value.target);
}

export function isOpenFilePayload(value: unknown): value is OpenFilePayload {
    return (
        isRecord(value) &&
        isString(value.key) &&
        value.key.length > 0 &&
        (value.line === undefined || (typeof value.line === 'number' && Number.isInteger(value.line) && value.line >= 1))
    );
}

export function isBoardEventPayload(value: unknown): value is BoardEventPayload {
    return isRecord(value) && isBoardView(value.view);
}

export function isDetailEventPayload(value: unknown): value is DetailEventPayload {
    return isRecord(value) && isDetailView(value.view);
}

export function isMissionControlEventPayload(value: unknown): value is MissionControlEventPayload {
    return isRecord(value) && isMissionControlView(value.view);
}

export function isAgentStartTokenPayload(value: unknown): value is AgentStartTokenPayload {
    return isRecord(value) && isString(value.token) && value.token.length > 0;
}

export function isAgentStartDismissPayload(value: unknown): value is AgentStartDismissPayload {
    return isRecord(value) && (value.which === 'refusal' || value.which === 'notice');
}

export function isAgentStartEventPayload(value: unknown): value is AgentStartEventPayload {
    return isRecord(value) && isAgentStartView(value.view);
}

function keysOnly(value: Record<string, unknown>, allowed: readonly string[]): boolean {
    return Object.keys(value).every((key) => allowed.includes(key)) && allowed.every((key) => key in value || key === 'reason');
}

function isId(value: unknown): value is string {
    return isString(value) && value.length > 0;
}

export function isAgentCenterRunPayload(value: unknown): value is AgentCenterRunPayload {
    return isRecord(value) && keysOnly(value, ['runId']) && isId(value.runId);
}

export function isAgentCenterAnswerPayload(value: unknown): value is AgentCenterRequestPayloads['acAnswer'] {
    if (!isRecord(value) || !keysOnly(value, ['runId', 'requestId', 'answer']) || !isId(value.runId) || !isId(value.requestId) || !isRecord(value.answer)) {
        return false;
    }
    const answer = value.answer;
    if (answer.kind === 'input') {
        return keysOnly(answer, ['kind', 'text']) && isString(answer.text);
    }
    return (
        answer.kind === 'approval' &&
        keysOnly(answer, ['kind', 'decision', 'reason']) &&
        (answer.decision === 'approve-once' || answer.decision === 'reject') &&
        isOptionalString(answer.reason)
    );
}

export function isAgentCenterFollowPayload(value: unknown): value is AgentCenterRequestPayloads['acFollow'] {
    return isRecord(value) && keysOnly(value, ['runId', 'on']) && isId(value.runId) && typeof value.on === 'boolean';
}

export function isAgentCenterOpenFilePayload(value: unknown): value is AgentCenterRequestPayloads['acOpenFile'] {
    return isRecord(value) && keysOnly(value, ['runId', 'path']) && isId(value.runId) && isId(value.path);
}

export function isAgentCenterEventPayload(value: unknown): value is AgentCenterEventPayload {
    return isRecord(value) && keysOnly(value, ['view']) && isAgentCenterView(value.view);
}

export function isAgentCenterTimelineEventPayload(value: unknown): value is AgentCenterTimelineEventPayload {
    return isTimelinePayload(value);
}

export function isMoveResultEventPayload(value: unknown): value is MoveResultEventPayload {
    return isRecord(value) && isMoveResult(value.result);
}

export const REQUEST_GUARDS: { [Type in RequestType]: (value: unknown) => value is RequestPayloads[Type] } = {
    hello: isHelloPayload,
    navigate: isNavigationRequest,
    select: isSelectPayload,
    runAction: isRunActionPayload,
    dismissNotice: isEmptyPayload,
    boardSetFilter: isBoardSetFilterPayload,
    boardSetSort: isBoardSetSortPayload,
    boardClearFilters: isEmptyPayload,
    boardFocus: isBoardFocusPayload,
    moveRequest: isMoveRequestPayload,
    openFile: isOpenFilePayload,
    agentStartConfirm: isAgentStartTokenPayload,
    agentStartCancel: isAgentStartTokenPayload,
    agentStartDismiss: isAgentStartDismissPayload,
    acSelect: isAgentCenterRunPayload,
    acClearFilter: isEmptyPayload,
    acLoadEarlier: isAgentCenterRunPayload,
    acFollow: isAgentCenterFollowPayload,
    acAnswer: isAgentCenterAnswerPayload,
    acCancel: isAgentCenterRunPayload,
    acResume: isAgentCenterRunPayload,
    acOpenFile: isAgentCenterOpenFilePayload,
};

export function isRequestType(value: string): value is RequestType {
    return Object.prototype.hasOwnProperty.call(REQUEST_GUARDS, value);
}

function isS5Reason(value: unknown): value is S5Reason {
    if (!isRecord(value)) {
        return false;
    }
    if (value.cause === 'discovery') {
        return isString(value.message);
    }
    if (value.cause === 'listing') {
        return isString(value.folder) && isString(value.reason);
    }
    return value.cause === 'protocol';
}

export function isPanelState(value: unknown): value is PanelState {
    if (!isRecord(value)) {
        return false;
    }
    switch (value.id) {
        case 'S1':
        case 'S2':
        case 'S3':
        case 'S4':
        case 'S6':
            return true;
        case 'S5':
            return isS5Reason(value.reason);
        case 'S8':
            return isString(value.name) && typeof value.canSelect === 'boolean';
        case 'S9':
            return (
                Array.isArray(value.folders) &&
                value.folders.every(
                    (folder) => isRecord(folder) && isString(folder.folder) && Array.isArray(folder.markers) && folder.markers.every(isString),
                )
            );
        default:
            return false;
    }
}

export function isSpecRow(value: unknown): value is SpecRow {
    return (
        isRecord(value) &&
        isString(value.stem) &&
        isString(value.path) &&
        isString(value.number) &&
        isOptionalString(value.title) &&
        isString(value.state) &&
        (value.derivedRule === undefined || isDerivedRule(value.derivedRule)) &&
        typeof value.showPath === 'boolean' &&
        typeof value.selected === 'boolean'
    );
}

export function isShellView(value: unknown): value is ShellView {
    if (!isRecord(value)) {
        return false;
    }
    const selection = value.selection;
    const notice = value.notice;
    return (
        (value.state === undefined || isPanelState(value.state)) &&
        typeof value.restricted === 'boolean' &&
        isOptionalString(value.projectName) &&
        isAreaId(value.area) &&
        (value.target === undefined || isNavigationTarget(value.target)) &&
        (selection === undefined || (isRecord(selection) && isString(selection.stem) && isOptionalString(selection.path) && isString(selection.number))) &&
        (notice === undefined || (isRecord(notice) && isString(notice.number))) &&
        Array.isArray(value.rows) &&
        value.rows.every(isSpecRow)
    );
}

export function isShellEventPayload(value: unknown): value is ShellEventPayload {
    return isRecord(value) && isShellView(value.view);
}

export function isResponsePayload(value: unknown): value is ResponsePayload {
    return isRecord(value) && typeof value.ok === 'boolean' && isOptionalString(value.error);
}

export type ProbeOutcome = 'failed' | 'loaded';

export interface ProbePayload {
    url: string;
}

export interface ProbeResultPayload {
    outcome: ProbeOutcome;
}

export function isProbePayload(value: unknown): value is ProbePayload {
    return isRecord(value) && isString(value.url) && value.url.length > 0;
}

export function isProbeResultPayload(value: unknown): value is ProbeResultPayload {
    return isRecord(value) && (value.outcome === 'failed' || value.outcome === 'loaded');
}
