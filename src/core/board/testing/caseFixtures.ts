import { specText } from '../../lifecycle/testing/projects';

export const TIP_SPLITTER_STEPS: ReadonlyArray<readonly [string, string]> = [
    ['T-001', 'Parse the bill'],
    ['T-002', 'Split evenly'],
    ['T-003', 'Reject money values'],
    ['T-004', 'Round tips'],
    ['T-005', 'Format the output'],
    ['T-006', 'Wire the command'],
];

export interface TipSplitterOptions {
    ticked?: readonly string[];
    struck?: readonly string[];
    verified?: Readonly<Record<string, string>>;
    status?: string | null;
    currentStep?: string | null;
    folder?: 'active' | 'backlog';
    specStatus?: string;
    note?: string;
    steps?: ReadonlyArray<readonly [string, string]>;
    stages?: string;
}

export const SPLITTER_SPEC = '.specs/active/0001-tip-splitter.md';
export const SPLITTER_PLAN = '.specs/active/0001-tip-splitter.plan.md';
export const SPLITTER_BACKLOG_SPEC = '.specs/backlog/0001-tip-splitter.md';
export const SPLITTER_BACKLOG_PLAN = '.specs/backlog/0001-tip-splitter.plan.md';

function stepBlock(id: string, title: string, options: TipSplitterOptions): string {
    const ticked = options.ticked?.includes(id) === true;
    const struck = options.struck?.includes(id) === true;
    const verified = options.verified?.[id] ?? (ticked ? '2026-11-19 · npm test green' : '—');
    const heading = struck ? `### ~~${id} — ${title}~~` : `### ${id} — ${title}`;
    return `${heading}\n\n- **Verify:** \`npm test\`\n- [${ticked ? 'x' : ' '}] **Verified (${id}):** ${verified}\n- **Notes:** —\n`;
}

export function splitterPlan(options: TipSplitterOptions = {}): string {
    const steps = options.steps ?? TIP_SPLITTER_STEPS;
    const header = ['# Plan — Tip splitter', '', '**Spec:** [0001-tip-splitter.md](0001-tip-splitter.md)'];
    if (options.status !== null) {
        header.push(`**Status:** ${options.status ?? 'In Progress'}`);
    }
    if (options.currentStep !== null && options.currentStep !== undefined) {
        header.push(`**Current step:** ${options.currentStep}`);
    }
    const stages = `## Stages\n\n${options.stages ?? '1. T-001 → T-002\n2. T-003 → T-004\n3. T-005 → T-006'}\n`;
    const body = steps.map(([id, title]) => stepBlock(id, title, options)).join('\n');
    return `${header.join('\n')}\n\n${stages}\n## Steps\n\n${body}`;
}

export function splitterFiles(options: TipSplitterOptions = {}): Record<string, string> {
    const folder = options.folder ?? 'active';
    const spec = `.specs/${folder}/0001-tip-splitter.md`;
    const files: Record<string, string> = {
        [spec]: specText({ status: options.specStatus ?? (folder === 'active' ? 'In Progress' : 'Draft'), plan: '[0001-tip-splitter.plan.md](0001-tip-splitter.plan.md)' }),
        [`.specs/${folder}/0001-tip-splitter.plan.md`]: splitterPlan(options),
    };
    if (options.note !== undefined) {
        files['.memory-bank/activeContext.0001-T-004.md'] = `# Return note\n\n- **Status:** ${options.note}\n- **Files:** —\n- **Verified:** —\n- **Notes:** —\n`;
    }
    return files;
}

const ALL = TIP_SPLITTER_STEPS.map(([id]) => id);
const TWO = ['T-001', 'T-002'];

export const CURRENT_STEP_VALUES: Readonly<Record<string, string | null>> = {
    absent: null,
    empty: '',
    dash: '—',
    'none-all-ticked': 'none (all steps ticked)',
    'open-alone': 'T-003',
    'open-with-parallel': 'T-003 ‖ T-004',
    'open-and-t005': 'T-003 and T-005',
    'ticked-only': 'T-002',
    'unknown-ids': 'T-099',
};

export const CASE_FIXTURES: Readonly<Record<string, Record<string, string>>> = {
    'ac001-plan-in-progress': splitterFiles({ ticked: ALL, status: 'In Progress', currentStep: 'none (all steps ticked)' }),
    'ac001-plan-not-started': splitterFiles({ ticked: ALL, status: 'Not started' }),
    'ac001-plan-no-status': splitterFiles({ ticked: ALL, status: null }),
    'ac001-plan-done': splitterFiles({ ticked: ALL, status: 'Done' }),
    'ac001-in-progress-with-done-note': splitterFiles({ ticked: ALL, status: 'In Progress', note: 'DONE' }),
    'ac001-done-with-done-note': splitterFiles({ ticked: ALL, status: 'Done', note: 'DONE' }),
    'ac002-struck-only': splitterFiles({ struck: ALL, status: 'In Progress' }),
    'ac002-no-step': splitterFiles({ steps: [], status: 'In Progress' }),
    'ac002-one-undetermined': {
        ...splitterFiles({ ticked: ['T-001', 'T-002', 'T-003', 'T-004', 'T-005'], status: 'In Progress' }),
        [SPLITTER_PLAN]: splitterPlan({ ticked: ['T-001', 'T-002', 'T-003', 'T-004', 'T-005'], status: 'In Progress' }).replace(
            /- \[ \] \*\*Verified \(T-006\):\*\* —\n/,
            'plain text, no tick line\n',
        ),
    },
    'ac003-plan-blocked': splitterFiles({ ticked: ALL, status: 'Blocked' }),
    'ac003-note-blocked': splitterFiles({ ticked: ALL, status: 'In Progress', note: 'BLOCKED' }),
    'ac003-draft-in-active': splitterFiles({ ticked: ALL, status: 'In Progress', specStatus: 'Draft' }),
    'ac003-backlog': splitterFiles({ ticked: ALL, status: 'In Progress', folder: 'backlog' }),
    'ac004-report-first': splitterFiles({ ticked: TWO, currentStep: 'T-004' }),
    'ac004-verified-no-tick': splitterFiles({ ticked: TWO, currentStep: 'T-003', verified: { 'T-003': '2026-11-19 · npm test green' } }),
    'ac016-ready-with-step': splitterFiles({ ticked: TWO, folder: 'backlog', status: 'Not started' }),
    'ac016-ready-without-step': splitterFiles({ ticked: ALL, folder: 'backlog', status: 'Not started' }),
    'ac016-ready-all-struck': splitterFiles({ struck: ALL, folder: 'backlog', status: 'Not started' }),
    ...Object.fromEntries(
        Object.entries(CURRENT_STEP_VALUES).map(([name, value]) => [`ac005-${name}`, splitterFiles({ ticked: TWO, currentStep: value })]),
    ),
};
