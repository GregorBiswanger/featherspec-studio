import { isBoardFilter, isBoardState, type BoardFilter, type BoardState } from './boardFilter';
import { isRecord } from './envelope';
import { isWelcomeView, type WelcomeView } from './overview';
import { isPlanSpecView, type PlanSpecView } from './planMap';
import { isStepView, type StepView } from './stepView';

export type DerivedRule = 'S-READY' | 'S-REVIEW' | 'S-BLOCKED';

const DERIVED_RULES: readonly string[] = ['S-READY', 'S-REVIEW', 'S-BLOCKED'];

export function isDerivedRule(value: unknown): value is DerivedRule {
    return typeof value === 'string' && DERIVED_RULES.includes(value);
}

export const STATE_RULES: Partial<Record<BoardState, DerivedRule>> = { Ready: 'S-READY', Review: 'S-REVIEW', Blocked: 'S-BLOCKED' };

export const SORT_KEYS = ['number', 'title', 'lastChange'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export function isSortKey(value: unknown): value is SortKey {
    return typeof value === 'string' && (SORT_KEYS as readonly string[]).includes(value);
}

export interface Progress {
    done: number;
    total: number;
}

export interface LastChange {
    day: string;
    source: 'plan' | 'file';
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function isLastChange(value: unknown): value is LastChange {
    return isRecord(value) && typeof value.day === 'string' && DAY.test(value.day) && (value.source === 'plan' || value.source === 'file');
}

export interface CardView {
    key: string;
    stem: string;
    number: string;
    title: string;
    titleIsStem: boolean;
    path: string | undefined;
    state: BoardState;
    deprecated: boolean;
    problems: number;
    blocked: string[];
    need: NeedView | undefined;
    step: StepView | undefined;
    summary: string | undefined;
    tasks: Progress | undefined;
    criteria: Progress | undefined;
    lastChange: LastChange | undefined;
}

export interface NeedView {
    text: string;
    rule: string;
}

export type ColumnNarrow = 'empty' | 'filtered' | 'collapsed';

export function isColumnNarrow(value: unknown): value is ColumnNarrow {
    return value === 'empty' || value === 'filtered' || value === 'collapsed';
}

export interface BoardColumn {
    state: BoardState;
    cards: CardView[];
    hidden: number;
    emptyBeforeFilter: boolean;
    count: number;
    narrow?: ColumnNarrow;
    problems?: number;
}

export interface BannerLine {
    where: string;
    reason: string;
    sentence?: string;
}

export interface Banner {
    problems: BannerLine[];
    notes: BannerLine[];
}

export interface BoardView {
    columns: BoardColumn[];
    doneToggle?: 'show' | 'hide';
    sortKeys: SortKey[];
    banner: Banner;
    filter: BoardFilter;
    sort: SortKey;
    noSpecs: boolean;
    welcome?: WelcomeView;
    planSpecs: PlanSpecView[];
}

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
        typeof value.deprecated === 'boolean' &&
        typeof value.problems === 'number' &&
        Array.isArray(value.blocked) &&
        value.blocked.every(isString) &&
        (value.need === undefined || (isRecord(value.need) && isString(value.need.text) && isString(value.need.rule))) &&
        (value.step === undefined || isStepView(value.step)) &&
        isOptionalString(value.summary) &&
        isProgress(value.tasks) &&
        isProgress(value.criteria) &&
        (value.lastChange === undefined || isLastChange(value.lastChange))
    );
}

function isColumn(value: unknown): value is BoardColumn {
    return (
        isRecord(value) &&
        isBoardState(value.state) &&
        Array.isArray(value.cards) &&
        value.cards.every(isCardView) &&
        typeof value.hidden === 'number' &&
        typeof value.emptyBeforeFilter === 'boolean' &&
        typeof value.count === 'number' &&
        (value.narrow === undefined || isColumnNarrow(value.narrow)) &&
        (value.problems === undefined || typeof value.problems === 'number')
    );
}

function isBannerLines(value: unknown): boolean {
    return Array.isArray(value) && value.every((line) => isRecord(line) && isString(line.where) && isString(line.reason) && (line.sentence === undefined || isString(line.sentence)));
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
        Array.isArray(value.sortKeys) &&
        value.sortKeys.length > 0 &&
        value.sortKeys.every(isSortKey) &&
        value.sortKeys.includes(value.sort) &&
        typeof value.noSpecs === 'boolean' &&
        (value.welcome === undefined || (value.noSpecs === true && isWelcomeView(value.welcome))) &&
        Array.isArray(value.planSpecs) &&
        value.planSpecs.every(isPlanSpecView) &&
        (value.doneToggle === undefined || value.doneToggle === 'show' || value.doneToggle === 'hide')
    );
}
