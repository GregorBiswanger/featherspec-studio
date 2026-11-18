import { isRecord } from './envelope';

export interface OpenTarget {
    key: string;
    line?: number;
}

export interface HeaderLine {
    label: string;
    value: string;
}

export interface DiagnosticLine {
    reason: string;
    open?: OpenTarget;
}

export interface ReadinessLine {
    id: string;
    result: 'pass' | 'fail' | 'not available';
    reason: string | undefined;
}

export interface OverviewSection {
    open: OpenTarget;
    headerLines: HeaderLine[];
    state: string;
    rule: string;
    persistence: 'persisted' | 'derived';
    deprecated: boolean;
    successor: string | undefined;
    readiness: ReadinessLine[] | undefined;
    notes: DiagnosticLine[];
}

export interface RequirementItem {
    id: string;
    text: string;
    open: OpenTarget;
}

export interface CriterionItem {
    id: string;
    text: string;
    illustration: string | undefined;
    uncertain: boolean;
    struck: boolean;
    open: OpenTarget;
}

export interface StepItem {
    id: string;
    title: string;
    ticked: boolean | 'undetermined';
    struck: boolean;
    verified: string | undefined;
}

export interface PlanSection {
    open: OpenTarget | undefined;
    stages: string[];
    steps: StepItem[];
}

export interface VerificationSection {
    open: OpenTarget | undefined;
    openRows: number;
    built: number;
    verified: number;
    other: number;
    summary: string;
    criteria: { done: number; total: number } | undefined;
    compileVerdict: string;
}

export interface RelatedItem {
    label: string;
    open: OpenTarget;
}

export interface StatusHistoryItem {
    observedAt: string;
    old: string | null;
    new: string | null;
    rule: string | null;
    cause: string;
    flow: string;
}

export interface HistorySection {
    statusHistory: StatusHistoryItem[] | undefined;
    label: string;
    notAvailable: string | undefined;
}

export interface DetailSections {
    overview: OverviewSection;
    requirements: { open: OpenTarget; items: RequirementItem[] };
    criteria: { open: OpenTarget; items: CriterionItem[] };
    plan: PlanSection;
    verification: VerificationSection;
    related: RelatedItem[];
    history: HistorySection;
}

export interface NextStepLineView {
    text: string;
    label?: string;
}

export type NextStepView = { rule: string; lines: NextStepLineView[] } | { rule: string; text: string };

export type DetailView =
    | { kind: 'none' }
    | { kind: 'spec'; key: string; stem: string; number: string; title: string; nextStep: NextStepView; problems: DiagnosticLine[]; sections: DetailSections };

export interface OpenFileResultPayload {
    key: string;
    text: string;
}

const SECTION_KEYS = ['overview', 'requirements', 'criteria', 'plan', 'verification', 'related', 'history'];

function isNextStepView(value: unknown): value is NextStepView {
    if (!isRecord(value) || typeof value.rule !== 'string') {
        return false;
    }
    if (typeof value.text === 'string') {
        return true;
    }
    return (
        Array.isArray(value.lines) &&
        value.lines.every((line) => isRecord(line) && typeof line.text === 'string' && (line.label === undefined || typeof line.label === 'string'))
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
        isNextStepView(value.nextStep) &&
        Array.isArray(value.problems) &&
        isRecord(value.sections) &&
        SECTION_KEYS.every((key) => key in (value.sections as Record<string, unknown>))
    );
}

export function isOpenFileResultPayload(value: unknown): value is OpenFileResultPayload {
    return isRecord(value) && typeof value.key === 'string' && typeof value.text === 'string';
}
