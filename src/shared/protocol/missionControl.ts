import { isBoardState, type BoardState } from './boardFilter';
import { isRecord } from './envelope';

export type DerivedRule = 'S-READY' | 'S-REVIEW' | 'S-BLOCKED';

export type RunStatusWord = 'Starting' | 'Running' | 'WaitingForApproval' | 'WaitingForInput' | 'Completed' | 'Failed' | 'Cancelled' | 'Interrupted';

export type HighlightedStatus = 'Failed' | 'Interrupted';

export type AttentionReason = 'Blocked' | 'Run failed' | 'Run interrupted' | 'Waiting for you' | 'Diagnostic' | 'Review pending';

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
    projectDiagnostics: number;
    diagnosticStems: string[];
}

export interface StateCount {
    state: BoardState;
    count: number;
    derivedRule?: DerivedRule;
    deprecated?: number;
}

export type McProgress = { kind: 'value'; percent: number; done: number; divisor: number } | { kind: 'not available' };

export type McSpecs = { kind: 'empty' } | { kind: 'counts'; total: number; states: StateCount[]; progress: McProgress };

export interface HighlightedRun {
    runId: string;
    status: HighlightedStatus;
    spec: SpecRef;
}

export type McRuns =
    | { available: false; reason: string }
    | { available: true; running: number; singleRunId?: string; highlighted: HighlightedRun[]; unreadable: number };

export interface AttentionRow {
    spec: SpecRef;
    reasons: AttentionReason[];
}

export type RunReasons = { available: true } | { available: false; reason: string };

export interface McAttention {
    rows: AttentionRow[];
    runReasons: RunReasons;
}

export type ActivityChange =
    | { kind: 'state'; old: BoardState; new: BoardState; whileClosed: boolean }
    | { kind: 'gone'; old: BoardState }
    | { kind: 'run'; status: RunStatusWord; runId: string };

export interface ActivityEntry {
    at: string;
    spec: SpecRef;
    change: ActivityChange;
}

export type McActivity = { available: false; reason: string } | { available: true; entries: ActivityEntry[] };

export interface MissionControlView {
    header: McHeader;
    specs: McSpecs;
    runs: McRuns;
    attention: McAttention;
    activity: McActivity;
}

const DERIVED_RULES: readonly string[] = ['S-READY', 'S-REVIEW', 'S-BLOCKED'];

export function isDerivedRule(value: unknown): value is DerivedRule {
    return typeof value === 'string' && DERIVED_RULES.includes(value);
}
const RUN_STATUS_WORDS: readonly string[] = ['Starting', 'Running', 'WaitingForApproval', 'WaitingForInput', 'Completed', 'Failed', 'Cancelled', 'Interrupted'];
const ATTENTION_REASONS: readonly string[] = ['Blocked', 'Run failed', 'Run interrupted', 'Waiting for you', 'Diagnostic', 'Review pending'];

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
        exactly(value, ['name', 'version', 'updatedAt', 'projectDiagnostics', 'diagnosticStems']) &&
        isText(value.name) &&
        isText(value.version) &&
        isText(value.updatedAt) &&
        isCount(value.projectDiagnostics) &&
        Array.isArray(value.diagnosticStems) &&
        value.diagnosticStems.every(isText)
    );
}

function isStateCount(value: unknown): value is StateCount {
    return (
        isRecord(value) &&
        exactly(value, ['state', 'count'], ['derivedRule', 'deprecated']) &&
        isBoardState(value.state) &&
        isCount(value.count) &&
        (value.derivedRule === undefined || isOneOf(value.derivedRule, DERIVED_RULES)) &&
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

function isHighlighted(value: unknown): value is HighlightedRun {
    return isRecord(value) && exactly(value, ['runId', 'status', 'spec']) && isText(value.runId) && isOneOf(value.status, ['Failed', 'Interrupted']) && isSpecRef(value.spec);
}

function isRuns(value: unknown): value is McRuns {
    if (!isRecord(value)) {
        return false;
    }
    if (value.available === false) {
        return exactly(value, ['available', 'reason']) && isText(value.reason);
    }
    return (
        value.available === true &&
        exactly(value, ['available', 'running', 'highlighted', 'unreadable'], ['singleRunId']) &&
        isCount(value.running) &&
        (value.singleRunId === undefined || isText(value.singleRunId)) &&
        Array.isArray(value.highlighted) &&
        value.highlighted.every(isHighlighted) &&
        isCount(value.unreadable)
    );
}

function isAttentionRow(value: unknown): value is AttentionRow {
    return (
        isRecord(value) &&
        exactly(value, ['spec', 'reasons']) &&
        isSpecRef(value.spec) &&
        Array.isArray(value.reasons) &&
        value.reasons.every((reason) => isOneOf(reason, ATTENTION_REASONS))
    );
}

function isRunReasons(value: unknown): value is RunReasons {
    if (!isRecord(value)) {
        return false;
    }
    if (value.available === true) {
        return exactly(value, ['available']);
    }
    return value.available === false && exactly(value, ['available', 'reason']) && isText(value.reason);
}

function isAttention(value: unknown): value is McAttention {
    return isRecord(value) && exactly(value, ['rows', 'runReasons']) && Array.isArray(value.rows) && value.rows.every(isAttentionRow) && isRunReasons(value.runReasons);
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
        case 'run':
            return exactly(value, ['kind', 'status', 'runId']) && isOneOf(value.status, RUN_STATUS_WORDS) && isText(value.runId);
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

export function isMissionControlView(value: unknown): value is MissionControlView {
    return (
        isRecord(value) &&
        exactly(value, ['header', 'specs', 'runs', 'attention', 'activity']) &&
        isHeader(value.header) &&
        isSpecs(value.specs) &&
        isRuns(value.runs) &&
        isAttention(value.attention) &&
        isActivity(value.activity)
    );
}
