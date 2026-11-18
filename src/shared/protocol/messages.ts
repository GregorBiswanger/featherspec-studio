import { isAreaId, type AreaId } from './areas';
import { isBoardView, isSortKey, type BoardView, type SortKey } from './board';
import { isDetailView, type DetailView } from './detail';
import { isBoardFilter, type BoardFilter } from './boardFilter';
import { isRecord } from './envelope';
import { isDerivedRule, type DerivedRule } from './board';
import { isOverviewView, type OverviewView } from './overview';

export const ACTION_IDS = [
    'openFolder',
    'openSetupGuide',
    'refresh',
    'selectProject',
    'showOutput',
    'retry',
    'manageTrust',
    'reload',
    'setUp',
    'copyMergePrompt',
] as const;
export type ActionId = (typeof ACTION_IDS)[number];

export type NavigationTarget =
    | { kind: 'spec'; stem: string; path?: string }
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
    setupPending?: true;
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
    projectVersion?: string;
    updatedAt?: string;
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

export interface BoardSetDonePayload {
    expanded: boolean;
}

export interface BoardSetSortPayload {
    sort: SortKey;
}

export interface OpenFilePayload {
    key: string;
    line?: number;
}

export interface CopyTextPayload {
    text: string;
}

export interface CopyResultEventPayload {
    ok: boolean;
    text: string;
}

export interface ShellRequestPayloads {
    hello: HelloPayload;
    navigate: NavigationRequest;
    select: SelectPayload;
    runAction: RunActionPayload;
    dismissNotice: Record<string, never>;
}

export interface BoardRequestPayloads {
    boardSetSort: BoardSetSortPayload;
    boardSetDone: BoardSetDonePayload;
    boardClearFilters: Record<string, never>;
    openFile: OpenFilePayload;
    copyText: CopyTextPayload;
}

export interface OverviewSetActivityPayload {
    open: boolean;
}

export interface OverviewRequestPayloads {
    overviewSetActivity: OverviewSetActivityPayload;
}

export type RequestPayloads = ShellRequestPayloads & BoardRequestPayloads & OverviewRequestPayloads;

export type RequestType = keyof RequestPayloads;
export type ShellRequestType = keyof ShellRequestPayloads;
export type BoardRequestType = keyof BoardRequestPayloads;
export type OverviewRequestType = keyof OverviewRequestPayloads;

export interface BoardEventPayload {
    view: BoardView;
}

export interface DetailEventPayload {
    view: DetailView;
}

export interface OverviewEventPayload {
    view: OverviewView;
}

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

export function isBoardSetDonePayload(value: unknown): value is BoardSetDonePayload {
    return isRecord(value) && Object.keys(value).length === 1 && typeof value.expanded === 'boolean';
}

export function isBoardSetSortPayload(value: unknown): value is BoardSetSortPayload {
    return isRecord(value) && isSortKey(value.sort);
}

export function isOverviewSetActivityPayload(value: unknown): value is OverviewSetActivityPayload {
    return isRecord(value) && Object.keys(value).length === 1 && typeof value.open === 'boolean';
}

export function isOpenFilePayload(value: unknown): value is OpenFilePayload {
    return (
        isRecord(value) &&
        isString(value.key) &&
        value.key.length > 0 &&
        (value.line === undefined || (typeof value.line === 'number' && Number.isInteger(value.line) && value.line >= 1))
    );
}

export function isCopyTextPayload(value: unknown): value is CopyTextPayload {
    return isRecord(value) && Object.keys(value).length === 1 && isString(value.text) && value.text.length > 0;
}

export function isCopyResultEventPayload(value: unknown): value is CopyResultEventPayload {
    return isRecord(value) && typeof value.ok === 'boolean' && isString(value.text);
}

export function isBoardEventPayload(value: unknown): value is BoardEventPayload {
    return isRecord(value) && isBoardView(value.view);
}

export function isDetailEventPayload(value: unknown): value is DetailEventPayload {
    return isRecord(value) && isDetailView(value.view);
}

export function isOverviewEventPayload(value: unknown): value is OverviewEventPayload {
    return isRecord(value) && isOverviewView(value.view);
}

function keysOnly(value: Record<string, unknown>, allowed: readonly string[]): boolean {
    return Object.keys(value).every((key) => allowed.includes(key)) && allowed.every((key) => key in value || key === 'reason');
}

export const REQUEST_GUARDS: { [Type in RequestType]: (value: unknown) => value is RequestPayloads[Type] } = {
    hello: isHelloPayload,
    navigate: isNavigationRequest,
    select: isSelectPayload,
    runAction: isRunActionPayload,
    dismissNotice: isEmptyPayload,
    boardSetSort: isBoardSetSortPayload,
    boardSetDone: isBoardSetDonePayload,
    boardClearFilters: isEmptyPayload,
    openFile: isOpenFilePayload,
    copyText: isCopyTextPayload,
    overviewSetActivity: isOverviewSetActivityPayload,
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
                    (folder) => isRecord(folder) && isString(folder.folder) &&
                        Array.isArray(folder.markers) &&
                        folder.markers.every(isString) &&
                        (folder.setupPending === undefined || folder.setupPending === true),
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
        isOptionalString(value.projectVersion) &&
        isOptionalString(value.updatedAt) &&
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
