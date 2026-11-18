import { isDerivedRule, type DerivedRule } from './board';
import { isBoardState, type BoardState } from './boardFilter';
import { isRecord } from './envelope';
import { isStepView, type StepView } from './stepView';

export type AttentionReason = 'Blocked' | 'Problem' | 'Review pending';

export interface SpecRef {
    stem: string;
    number: string;
    title: string | null;
    path?: string;
    found: boolean;
}

export interface McHeader {
    name: string;
    version: string;
    updatedAt: string;
    problems: number;
    problemStems: string[];
}

export interface StateCount {
    state: BoardState;
    count: number;
    derivedRule?: DerivedRule;
    deprecated?: number;
}

export type McProgress = { kind: 'value'; percent: number; done: number; divisor: number } | { kind: 'not available' };

export type McSpecs = { kind: 'empty' } | { kind: 'counts'; total: number; states: StateCount[]; progress: McProgress };

export interface AttentionRow {
    spec: SpecRef;
    reasons: AttentionReason[];
    step?: StepView;
}

export interface McAttention {
    rows: AttentionRow[];
}

export type ActivityChange =
    | { kind: 'state'; old: BoardState; new: BoardState; whileClosed: boolean }
    | { kind: 'gone'; old: BoardState };

export interface ActivityEntry {
    at: string;
    spec: SpecRef;
    change: ActivityChange;
}

export type McActivity = { available: false; reason: string } | { available: true; entries: ActivityEntry[] };

export interface OverviewRow {
    spec: SpecRef;
    state: BoardState;
    status: string;
    problems: number;
    step?: StepView;
}

export interface OverviewUpNext {
    rows: OverviewRow[];
    more: number;
    stems: string[];
}

export interface OverviewView {
    now: OverviewRow[];
    upNext: OverviewUpNext;
    header: McHeader;
    specs: McSpecs;
    attention: McAttention;
    activity: McActivity;
}

const ATTENTION_REASONS: readonly string[] = ['Blocked', 'Problem', 'Review pending'];

function exactly(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean {
    const keys = Object.keys(value);
    return required.every((key) => key in value) && keys.every((key) => required.includes(key) || optional.includes(key));
}

function isText(value: unknown): value is string {
    return typeof value === 'string';
}

function isCount(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isOneOf(value: unknown, words: readonly string[]): boolean {
    return typeof value === 'string' && words.includes(value);
}

function isSpecRef(value: unknown): value is SpecRef {
    return (
        isRecord(value) &&
        exactly(value, ['stem', 'number', 'title', 'found'], ['path']) &&
        isText(value.stem) &&
        isText(value.number) &&
        (value.title === null || isText(value.title)) &&
        (value.path === undefined || isText(value.path)) &&
        typeof value.found === 'boolean'
    );
}

function isHeader(value: unknown): value is McHeader {
    return (
        isRecord(value) &&
        exactly(value, ['name', 'version', 'updatedAt', 'problems', 'problemStems']) &&
        isText(value.name) &&
        isText(value.version) &&
        isText(value.updatedAt) &&
        isCount(value.problems) &&
        Array.isArray(value.problemStems) &&
        value.problemStems.every(isText)
    );
}

function isStateCount(value: unknown): value is StateCount {
    return (
        isRecord(value) &&
        exactly(value, ['state', 'count'], ['derivedRule', 'deprecated']) &&
        isBoardState(value.state) &&
        isCount(value.count) &&
        (value.derivedRule === undefined || isDerivedRule(value.derivedRule)) &&
        (value.deprecated === undefined || isCount(value.deprecated))
    );
}

function isProgress(value: unknown): value is McProgress {
    if (!isRecord(value)) {
        return false;
    }
    if (value.kind === 'not available') {
        return exactly(value, ['kind']);
    }
    return value.kind === 'value' && exactly(value, ['kind', 'percent', 'done', 'divisor']) && isCount(value.percent) && isCount(value.done) && isCount(value.divisor);
}

function isSpecs(value: unknown): value is McSpecs {
    if (!isRecord(value)) {
        return false;
    }
    if (value.kind === 'empty') {
        return exactly(value, ['kind']);
    }
    return (
        value.kind === 'counts' &&
        exactly(value, ['kind', 'total', 'states', 'progress']) &&
        isCount(value.total) &&
        Array.isArray(value.states) &&
        value.states.every(isStateCount) &&
        isProgress(value.progress)
    );
}

function isAttentionRow(value: unknown): value is AttentionRow {
    return (
        isRecord(value) &&
        exactly(value, ['spec', 'reasons'], ['step']) &&
        (value.step === undefined || isStepView(value.step)) &&
        isSpecRef(value.spec) &&
        Array.isArray(value.reasons) &&
        value.reasons.every((reason) => isOneOf(reason, ATTENTION_REASONS))
    );
}

function isAttention(value: unknown): value is McAttention {
    return isRecord(value) && exactly(value, ['rows']) && Array.isArray(value.rows) && value.rows.every(isAttentionRow);
}

function isChange(value: unknown): value is ActivityChange {
    if (!isRecord(value)) {
        return false;
    }
    switch (value.kind) {
        case 'state':
            return exactly(value, ['kind', 'old', 'new', 'whileClosed']) && isBoardState(value.old) && isBoardState(value.new) && typeof value.whileClosed === 'boolean';
        case 'gone':
            return exactly(value, ['kind', 'old']) && isBoardState(value.old);
        default:
            return false;
    }
}

function isActivityEntry(value: unknown): value is ActivityEntry {
    return isRecord(value) && exactly(value, ['at', 'spec', 'change']) && isText(value.at) && isSpecRef(value.spec) && isChange(value.change);
}

function isActivity(value: unknown): value is McActivity {
    if (!isRecord(value)) {
        return false;
    }
    if (value.available === false) {
        return exactly(value, ['available', 'reason']) && isText(value.reason);
    }
    return value.available === true && exactly(value, ['available', 'entries']) && Array.isArray(value.entries) && value.entries.every(isActivityEntry);
}

function isRow(value: unknown): value is OverviewRow {
    return (
        isRecord(value) &&
        exactly(value, ['spec', 'state', 'status', 'problems'], ['step']) &&
        isSpecRef(value.spec) &&
        isBoardState(value.state) &&
        isText(value.status) &&
        isCount(value.problems) &&
        (value.step === undefined || isStepView(value.step))
    );
}

function isRows(value: unknown): value is OverviewRow[] {
    return Array.isArray(value) && value.every(isRow);
}

function isUpNext(value: unknown): value is OverviewUpNext {
    return isRecord(value) && exactly(value, ['rows', 'more', 'stems']) && isRows(value.rows) && isCount(value.more) && Array.isArray(value.stems) && value.stems.every(isText);
}

export function isOverviewView(value: unknown): value is OverviewView {
    return (
        isRecord(value) &&
        exactly(value, ['now', 'upNext', 'header', 'specs', 'attention', 'activity']) &&
        isRows(value.now) &&
        isUpNext(value.upNext) &&
        isHeader(value.header) &&
        isSpecs(value.specs) &&
        isAttention(value.attention) &&
        isActivity(value.activity)
    );
}
