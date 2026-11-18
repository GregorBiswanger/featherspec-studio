import { isRecord } from './envelope';
import { isStepTipsView, type StepTipsView } from './stepView';

export interface LineTarget {
    key: string;
    line: number;
}

export interface NeedLine {
    text: string;
    rule: string;
}

export interface DiagnosticLine {
    sentence?: string;
    reason: string;
    open?: LineTarget;
}

export interface StatusHistoryItem {
    observedAt: string;
    old: string | null;
    new: string | null;
    rule: string | null;
    cause: { kind: 'files' | 'first-observed' | 'changed-while-not-running' | 'no-longer-observed'; paths: string[] };
    flow: string;
}

export interface HistorySection {
    statusHistory: StatusHistoryItem[] | undefined;
    label: string;
    notAvailable: string | undefined;
}

export interface NextOpenStep {
    id: string;
    title: string;
    open: LineTarget;
}

export type StepsProgress = { kind: 'steps'; done: number; total: number; next?: NextOpenStep } | { kind: 'none' } | { kind: 'unavailable' };

export interface OpenCriterion {
    id?: string;
    text: string;
    built: boolean;
    open: LineTarget;
}

export type CriteriaProgress =
    | { kind: 'criteria'; verified: number; total: number; open: OpenCriterion[] }
    | { kind: 'unavailable'; reason: 'no-table' | 'unreadable' };

export interface ProgressView {
    needs: NeedLine[];
    noPlan: boolean;
    steps?: StepsProgress;
    criteria?: CriteriaProgress;
}

export interface FileRow {
    label: string;
    name: string;
    open: LineTarget;
}

export interface NextStepLineView {
    text: string;
    intent: string;
}

export type NextStepView = { rule: string; lines: NextStepLineView[]; tips?: StepTipsView } | { rule: string; text: string };

export interface SpecDetailView {
    kind: 'spec';
    key: string;
    stem: string;
    path?: string;
    number: string;
    title: string;
    state: string;
    rule: string;
    persistence: 'persisted' | 'derived';
    successor?: string;
    nextStep: NextStepView;
    problems: DiagnosticLine[];
    notes: DiagnosticLine[];
    progress?: ProgressView;
    files: FileRow[];
    history: HistorySection;
}

export type DetailView = { kind: 'none' } | SpecDetailView;

export interface OpenFileResultPayload {
    key: string;
    text: string;
}

function isNextStepView(value: unknown): value is NextStepView {
    if (!isRecord(value) || typeof value.rule !== 'string') {
        return false;
    }
    if (typeof value.text === 'string') {
        return true;
    }
    return (
        Array.isArray(value.lines) &&
        value.lines.every((line) => isRecord(line) && typeof line.text === 'string' && typeof line.intent === 'string') &&
        (value.tips === undefined || isStepTipsView(value.tips))
    );
}

function isLineTarget(value: unknown): value is LineTarget {
    return isRecord(value) && typeof value.key === 'string' && value.key.length > 0 && Number.isInteger(value.line) && (value.line as number) >= 1;
}

function isDiagnosticLine(value: unknown): value is DiagnosticLine {
    return isRecord(value) && typeof value.reason === 'string' && (value.sentence === undefined || typeof value.sentence === 'string') && (value.open === undefined || isLineTarget(value.open));
}

function isNeedLine(value: unknown): value is NeedLine {
    return isRecord(value) && typeof value.text === 'string' && typeof value.rule === 'string';
}

function isCount(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isStepsProgress(value: unknown): value is StepsProgress {
    if (!isRecord(value)) {
        return false;
    }
    if (value.kind === 'none' || value.kind === 'unavailable') {
        return true;
    }
    if (value.kind !== 'steps' || !isCount(value.done) || !isCount(value.total)) {
        return false;
    }
    return value.next === undefined || (isRecord(value.next) && typeof value.next.id === 'string' && typeof value.next.title === 'string' && isLineTarget(value.next.open));
}

function isOpenCriterion(value: unknown): value is OpenCriterion {
    return (
        isRecord(value) &&
        (value.id === undefined || typeof value.id === 'string') &&
        typeof value.text === 'string' &&
        typeof value.built === 'boolean' &&
        isLineTarget(value.open)
    );
}

function isCriteriaProgress(value: unknown): value is CriteriaProgress {
    if (!isRecord(value)) {
        return false;
    }
    if (value.kind === 'unavailable') {
        return value.reason === 'no-table' || value.reason === 'unreadable';
    }
    return value.kind === 'criteria' && isCount(value.verified) && isCount(value.total) && Array.isArray(value.open) && value.open.every(isOpenCriterion);
}

function isProgressView(value: unknown): value is ProgressView {
    return (
        isRecord(value) &&
        Array.isArray(value.needs) &&
        value.needs.every(isNeedLine) &&
        typeof value.noPlan === 'boolean' &&
        (value.steps === undefined || isStepsProgress(value.steps)) &&
        (value.criteria === undefined || isCriteriaProgress(value.criteria))
    );
}

function isFileRow(value: unknown): value is FileRow {
    return isRecord(value) && typeof value.label === 'string' && typeof value.name === 'string' && isLineTarget(value.open);
}

function isHistorySection(value: unknown): value is HistorySection {
    return (
        isRecord(value) &&
        typeof value.label === 'string' &&
        (value.notAvailable === undefined || typeof value.notAvailable === 'string') &&
        (value.statusHistory === undefined || Array.isArray(value.statusHistory))
    );
}

export function isDetailView(value: unknown): value is DetailView {
    if (!isRecord(value)) {
        return false;
    }
    if (value.kind === 'none') {
        return true;
    }
    return (
        value.kind === 'spec' &&
        typeof value.key === 'string' &&
        typeof value.stem === 'string' &&
        typeof value.number === 'string' &&
        typeof value.title === 'string' &&
        (value.path === undefined || typeof value.path === 'string') &&
        typeof value.state === 'string' &&
        typeof value.rule === 'string' &&
        (value.persistence === 'persisted' || value.persistence === 'derived') &&
        (value.successor === undefined || typeof value.successor === 'string') &&
        isNextStepView(value.nextStep) &&
        Array.isArray(value.problems) &&
        value.problems.every(isDiagnosticLine) &&
        Array.isArray(value.notes) &&
        value.notes.every(isDiagnosticLine) &&
        (value.progress === undefined || isProgressView(value.progress)) &&
        Array.isArray(value.files) &&
        value.files.every(isFileRow) &&
        isHistorySection(value.history)
    );
}

export function isOpenFileResultPayload(value: unknown): value is OpenFileResultPayload {
    return isRecord(value) && typeof value.key === 'string' && typeof value.text === 'string';
}
