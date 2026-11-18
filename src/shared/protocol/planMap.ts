import type { LineTarget } from './detail';
import { isRecord } from './envelope';

export type PlanStepState = 'done' | 'next' | 'open' | 'dropped' | 'returned' | 'notFound';

export type PlanStageKind = 'single' | 'sequential' | 'parallel' | 'mixed';

export interface PlanReturnView {
    status: 'done' | 'blocked' | 'unknown';
    reason?: string;
    reasonFull?: string;
}

export interface PlanCoverView {
    id: string;
    open?: LineTarget;
}

export interface PlanStepView {
    id: string;
    state: PlanStepState;
    title: string;
    open?: LineTarget;
    files: string[];
    covers: PlanCoverView[];
    doText?: string;
    verify?: string;
    returned?: PlanReturnView;
}

export interface PlanGroupView {
    sep?: '→';
    steps: PlanStepView[];
}

export interface PlanWaysView {
    stage: number;
    prompts: [string, string, string];
    startLines: string[];
}

export interface PlanStageView {
    number: number;
    description: string;
    kind: PlanStageKind;
    parallel: boolean;
    current: boolean;
    finished: boolean;
    returned?: { n: number; m: number };
    groups: PlanGroupView[];
    ways?: PlanWaysView;
}

export interface PlanClosingView {
    text: string;
    short: string;
    full: string;
}

export interface PlanView {
    kind: 'plan';
    plan: LineTarget;
    count?: { done: number; total: number };
    closing?: PlanClosingView;
    staged: boolean;
    stages: PlanStageView[];
    loose: PlanStepView[];
}

export interface PlanUnreadableView {
    kind: 'unreadable';
}

export interface PlanSpecProblem {
    sentence: string;
    reason: string;
}

export interface PlanSpecView {
    stem: string;
    path?: string;
    number: string;
    title: string;
    problems: PlanSpecProblem[];
}

const STEP_STATES: readonly string[] = ['done', 'next', 'open', 'dropped', 'returned', 'notFound'];
const STAGE_KINDS: readonly string[] = ['single', 'sequential', 'parallel', 'mixed'];

function keysAre(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean {
    const keys = Object.keys(value);
    return required.every((key) => key in value) && keys.every((key) => required.includes(key) || optional.includes(key));
}

function isString(value: unknown): value is string {
    return typeof value === 'string';
}

function isCount(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isLineTarget(value: unknown): value is LineTarget {
    return isRecord(value) && keysAre(value, ['key', 'line']) && isString(value.key) && value.key.length > 0 && Number.isInteger(value.line) && (value.line as number) >= 1;
}

function isCover(value: unknown): value is PlanCoverView {
    return isRecord(value) && keysAre(value, ['id'], ['open']) && isString(value.id) && (value.open === undefined || isLineTarget(value.open));
}

function isReturn(value: unknown): value is PlanReturnView {
    return (
        isRecord(value) &&
        keysAre(value, ['status'], ['reason', 'reasonFull']) &&
        (value.status === 'done' || value.status === 'blocked' || value.status === 'unknown') &&
        (value.reason === undefined || isString(value.reason)) &&
        (value.reasonFull === undefined || isString(value.reasonFull))
    );
}

function isStep(value: unknown): value is PlanStepView {
    return (
        isRecord(value) &&
        keysAre(value, ['id', 'state', 'title', 'files', 'covers'], ['open', 'doText', 'verify', 'returned']) &&
        isString(value.id) &&
        isString(value.state) &&
        STEP_STATES.includes(value.state) &&
        isString(value.title) &&
        (value.open === undefined || isLineTarget(value.open)) &&
        Array.isArray(value.files) &&
        value.files.every(isString) &&
        Array.isArray(value.covers) &&
        value.covers.every(isCover) &&
        (value.doText === undefined || isString(value.doText)) &&
        (value.verify === undefined || isString(value.verify)) &&
        (value.returned === undefined || isReturn(value.returned))
    );
}

function isGroup(value: unknown): value is PlanGroupView {
    return isRecord(value) && keysAre(value, ['steps'], ['sep']) && (value.sep === undefined || value.sep === '→') && Array.isArray(value.steps) && value.steps.length > 0 && value.steps.every(isStep);
}

function isWays(value: unknown): value is PlanWaysView {
    return (
        isRecord(value) &&
        keysAre(value, ['stage', 'prompts', 'startLines']) &&
        isCount(value.stage) &&
        Array.isArray(value.prompts) &&
        value.prompts.length === 3 &&
        value.prompts.every(isString) &&
        Array.isArray(value.startLines) &&
        value.startLines.every(isString)
    );
}

function isStage(value: unknown): value is PlanStageView {
    return (
        isRecord(value) &&
        keysAre(value, ['number', 'description', 'kind', 'parallel', 'current', 'finished', 'groups'], ['returned', 'ways']) &&
        isCount(value.number) &&
        isString(value.description) &&
        isString(value.kind) &&
        STAGE_KINDS.includes(value.kind) &&
        typeof value.parallel === 'boolean' &&
        typeof value.current === 'boolean' &&
        typeof value.finished === 'boolean' &&
        (value.returned === undefined || (isRecord(value.returned) && keysAre(value.returned, ['n', 'm']) && isCount(value.returned.n) && isCount(value.returned.m))) &&
        Array.isArray(value.groups) &&
        value.groups.every(isGroup) &&
        (value.ways === undefined || isWays(value.ways))
    );
}

function isClosing(value: unknown): value is PlanClosingView {
    return isRecord(value) && keysAre(value, ['text', 'short', 'full']) && isString(value.text) && isString(value.short) && isString(value.full);
}

export function isPlanView(value: unknown): value is PlanView {
    return (
        isRecord(value) &&
        keysAre(value, ['kind', 'plan', 'staged', 'stages', 'loose'], ['count', 'closing']) &&
        value.kind === 'plan' &&
        isLineTarget(value.plan) &&
        (value.count === undefined || (isRecord(value.count) && keysAre(value.count, ['done', 'total']) && isCount(value.count.done) && isCount(value.count.total))) &&
        (value.closing === undefined || isClosing(value.closing)) &&
        typeof value.staged === 'boolean' &&
        Array.isArray(value.stages) &&
        value.stages.every(isStage) &&
        Array.isArray(value.loose) &&
        value.loose.every(isStep)
    );
}

export function isPlanUnreadableView(value: unknown): value is PlanUnreadableView {
    return isRecord(value) && keysAre(value, ['kind']) && value.kind === 'unreadable';
}

export function isPlanSpecView(value: unknown): value is PlanSpecView {
    return (
        isRecord(value) &&
        keysAre(value, ['stem', 'number', 'title', 'problems'], ['path']) &&
        isString(value.stem) &&
        (value.path === undefined || isString(value.path)) &&
        isString(value.number) &&
        isString(value.title) &&
        Array.isArray(value.problems) &&
        value.problems.every((problem) => isRecord(problem) && keysAre(problem, ['sentence', 'reason']) && isString(problem.sentence) && isString(problem.reason))
    );
}
