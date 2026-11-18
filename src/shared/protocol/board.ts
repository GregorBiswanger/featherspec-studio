import { isBoardFilter, isBoardState, type BoardFilter, type BoardState } from './boardFilter';
import { isRecord } from './envelope';
import { isDerivedRule, type DerivedRule } from './missionControl';

export const SORT_KEYS = ['number', 'title', 'lastChange'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export function isSortKey(value: unknown): value is SortKey {
    return typeof value === 'string' && (SORT_KEYS as readonly string[]).includes(value);
}

export interface Progress {
    done: number;
    total: number;
}

export interface CardView {
    key: string;
    stem: string;
    number: string;
    title: string;
    titleIsStem: boolean;
    path: string | undefined;
    state: BoardState;
    derivedRule: DerivedRule | undefined;
    deprecated: boolean;
    problems: number;
    blocked: string[];
    readiness: ReadinessCheck | undefined;
    summary: string | undefined;
    tasks: Progress | undefined;
    criteria: Progress | undefined;
    lastChangeMs: number | undefined;
}

export interface ReadinessCheck {
    id: string;
    reason: string;
}

export interface BoardColumn {
    state: BoardState;
    cards: CardView[];
    hidden: number;
    emptyBeforeFilter: boolean;
}

export interface BannerLine {
    where: string;
    reason: string;
}

export interface Banner {
    problems: BannerLine[];
    notes: BannerLine[];
}

export interface BoardView {
    columns: BoardColumn[];
    banner: Banner;
    filter: BoardFilter;
    sort: SortKey;
    noSpecs: boolean;
}

export type MoveResult =
    | { kind: 'none' }
    | { kind: 'refused'; text: string }
    | { kind: 'nextStep'; number: string; line: string };

function isString(value: unknown): value is string {
    return typeof value === 'string';
}

function isOptionalString(value: unknown): boolean {
    return value === undefined || typeof value === 'string';
}

function isProgress(value: unknown): boolean {
    return value === undefined || (isRecord(value) && typeof value.done === 'number' && typeof value.total === 'number');
}

export function isCardView(value: unknown): value is CardView {
    return (
        isRecord(value) &&
        isString(value.key) &&
        isString(value.stem) &&
        isString(value.number) &&
        isString(value.title) &&
        typeof value.titleIsStem === 'boolean' &&
        isOptionalString(value.path) &&
        isBoardState(value.state) &&
        (value.derivedRule === undefined || isDerivedRule(value.derivedRule)) &&
        typeof value.deprecated === 'boolean' &&
        typeof value.problems === 'number' &&
        Array.isArray(value.blocked) &&
        value.blocked.every(isString) &&
        (value.readiness === undefined || (isRecord(value.readiness) && isString(value.readiness.id) && isString(value.readiness.reason))) &&
        isOptionalString(value.summary) &&
        isProgress(value.tasks) &&
        isProgress(value.criteria) &&
        (value.lastChangeMs === undefined || typeof value.lastChangeMs === 'number')
    );
}

function isColumn(value: unknown): value is BoardColumn {
    return (
        isRecord(value) &&
        isBoardState(value.state) &&
        Array.isArray(value.cards) &&
        value.cards.every(isCardView) &&
        typeof value.hidden === 'number' &&
        typeof value.emptyBeforeFilter === 'boolean'
    );
}

function isBannerLines(value: unknown): boolean {
    return Array.isArray(value) && value.every((line) => isRecord(line) && isString(line.where) && isString(line.reason));
}

function isBanner(value: unknown): value is Banner {
    return isRecord(value) && isBannerLines(value.problems) && isBannerLines(value.notes);
}

export function isBoardView(value: unknown): value is BoardView {
    return (
        isRecord(value) &&
        Array.isArray(value.columns) &&
        value.columns.every(isColumn) &&
        isBanner(value.banner) &&
        isBoardFilter(value.filter) &&
        isSortKey(value.sort) &&
        typeof value.noSpecs === 'boolean'
    );
}

export function isMoveResult(value: unknown): value is MoveResult {
    if (!isRecord(value)) {
        return false;
    }
    switch (value.kind) {
        case 'none':
            return true;
        case 'refused':
            return isString(value.text);
        case 'nextStep':
            return isString(value.number) && isString(value.line);
        default:
            return false;
    }
}
