import { isAreaId, type AreaId } from './areas';
import { isJsonValue, isRecord, type JsonValue } from './envelope';

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
    | { kind: 'boardFilter'; filter: JsonValue };

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
    derivedLabel: string | undefined;
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

export interface RequestPayloads {
    hello: HelloPayload;
    navigate: NavigationRequest;
    select: SelectPayload;
    runAction: RunActionPayload;
    dismissNotice: Record<string, never>;
}

export type RequestType = keyof RequestPayloads;

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
        return isJsonValue(value.filter);
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

export const REQUEST_GUARDS: { [Type in RequestType]: (value: unknown) => value is RequestPayloads[Type] } = {
    hello: isHelloPayload,
    navigate: isNavigationRequest,
    select: isSelectPayload,
    runAction: isRunActionPayload,
    dismissNotice: isEmptyPayload,
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
        isOptionalString(value.derivedLabel) &&
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
