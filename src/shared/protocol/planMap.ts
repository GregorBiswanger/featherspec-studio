import type { LineTarget } from './detail';

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
