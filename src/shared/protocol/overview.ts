import { isSendView, type SendView } from './assistant';
import { isBoardState, type BoardState } from './boardFilter';
import { isRecord } from './envelope';
import { isStepTipsView, isStepView, type StepTipsView, type StepView } from './stepView';

export interface SpecRef {
    stem: string;
    number: string;
    title: string | null;
    path?: string;
    found: boolean;
}

export interface StateCount {
    state: BoardState;
    count: number;
    deprecated?: number;
}

export type McProgress = { kind: 'value'; percent: number; done: number; divisor: number } | { kind: 'not available' };

export type OverviewFigures = { kind: 'empty' } | { kind: 'counts'; total: number; states: StateCount[]; progress: McProgress };

export interface ProblemLine {
    where: string;
    reason: string;
    sentence: string;
}

export interface OverviewProblems {
    rows: OverviewRow[];
    lines: ProblemLine[];
}

export type ActivityChange =
    | { kind: 'state'; old: BoardState; new: BoardState; whileClosed: boolean }
    | { kind: 'gone'; old: BoardState };

export interface ActivityEntry {
    at: string;
    spec: SpecRef;
    change: ActivityChange;
}

export type McActivity = { available: false; reason: string } | { available: true; entries: ActivityEntry[]; open: boolean };

export interface OverviewRow {
    spec: SpecRef;
    state: BoardState;
    status: string;
    problems: number;
    reasons?: string;
    step?: StepView;
    tips?: StepTipsView;
    send?: SendView;
}

export interface OverviewUpNext {
    rows: OverviewRow[];
    more: number;
    stems: string[];
}

export interface OverviewView {
    now: OverviewRow[];
    upNext: OverviewUpNext;
    problems: OverviewProblems;
    figures: OverviewFigures;
    activity: McActivity;
}


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

function isStateCount(value: unknown): value is StateCount {
    return (
        isRecord(value) &&
        exactly(value, ['state', 'count'], ['deprecated']) &&
        isBoardState(value.state) &&
        isCount(value.count) &&
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

function isFigures(value: unknown): value is OverviewFigures {
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
    return value.available === true && exactly(value, ['available', 'entries', 'open']) && typeof value.open === 'boolean' && Array.isArray(value.entries) && value.entries.every(isActivityEntry);
}

function isRow(value: unknown): value is OverviewRow {
    return (
        isRecord(value) &&
        exactly(value, ['spec', 'state', 'status', 'problems'], ['step', 'reasons', 'tips', 'send']) &&
        isSpecRef(value.spec) &&
        isBoardState(value.state) &&
        isText(value.status) &&
        isCount(value.problems) &&
        (value.reasons === undefined || isText(value.reasons)) &&
        (value.step === undefined || isStepView(value.step)) &&
        (value.tips === undefined || isStepTipsView(value.tips)) &&
        (value.send === undefined || (value.step !== undefined && isSendView(value.send)))
    );
}

function isRows(value: unknown): value is OverviewRow[] {
    return Array.isArray(value) && value.every(isRow);
}

function isUpNext(value: unknown): value is OverviewUpNext {
    return isRecord(value) && exactly(value, ['rows', 'more', 'stems']) && isRows(value.rows) && isCount(value.more) && Array.isArray(value.stems) && value.stems.every(isText);
}

function isProblemLine(value: unknown): value is ProblemLine {
    return isRecord(value) && exactly(value, ['where', 'reason', 'sentence']) && isText(value.where) && isText(value.reason) && isText(value.sentence);
}

function isProblems(value: unknown): value is OverviewProblems {
    return isRecord(value) && exactly(value, ['rows', 'lines']) && isRows(value.rows) && Array.isArray(value.lines) && value.lines.every(isProblemLine);
}

export function isOverviewView(value: unknown): value is OverviewView {
    return (
        isRecord(value) &&
        exactly(value, ['now', 'upNext', 'problems', 'figures', 'activity']) &&
        isRows(value.now) &&
        isUpNext(value.upNext) &&
        isProblems(value.problems) &&
        isFigures(value.figures) &&
        isActivity(value.activity)
    );
}
