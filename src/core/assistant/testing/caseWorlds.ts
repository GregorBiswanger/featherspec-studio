import { planText, readMemory, specText } from '../../lifecycle/testing/projects';
import { deriveLifecycle } from '../../lifecycle/deriveLifecycle';
import type { ShellModel } from '../../ports/shell';
import { splitterFiles } from '../../board/testing/caseFixtures';
import type { StepCase } from '../../../shared/protocol/nextStepTexts';

const BACKLOG = '.specs/backlog/0007-x.md';
const BACKLOG_PLAN = '.specs/backlog/0007-x.plan.md';
const LINK = '[0007-x.plan.md](0007-x.plan.md)';
const ACTIVE = '.specs/active/0007-x.md';
const ACTIVE_PLAN = '.specs/active/0007-x.plan.md';
const ACTIVE_LINK = '[0007-x.plan.md](0007-x.plan.md)';
const ARCHIVE = '[0007-x.2026-11-01.plan.md](../plan-archive/0007-x.2026-11-01.plan.md)';
const TWO = ['T-001', 'T-002'];

function steps(rows: Array<[string, string, string]>, status = 'In Progress'): string {
    return `${planText({ status })}\n## Steps\n\n${rows.map(([id, title, mark]) => `### ${id} — ${title}\n\n- ${mark} **Verified (${id}):** —\n`).join('\n')}`;
}

export interface CaseWorld {
    key: string;
    files: Record<string, string>;
}

export const CASE_WORLDS: Readonly<Record<StepCase, CaseWorld>> = {
    'NS-2': { key: ACTIVE, files: { [ACTIVE]: specText({ status: 'Draft', plan: ACTIVE_LINK }), [ACTIVE_PLAN]: planText({ status: 'In Progress' }) } },
    'NS-4': { key: BACKLOG, files: { [BACKLOG]: specText(), '.memory-bank/activeContext.0007-T-002.md': '# Return note\n\n- **Status:** BLOCKED\n- **Files:** —\n- **Verified:** —\n- **Notes:** —\n' } },
    'NS-4-plan': { key: ACTIVE, files: { [ACTIVE]: specText({ status: 'In Progress', plan: ACTIVE_LINK }), [ACTIVE_PLAN]: planText({ status: 'Blocked' }) } },
    'NS-5': { key: ACTIVE, files: { [ACTIVE]: specText({ status: 'In Progress', plan: ACTIVE_LINK }), [ACTIVE_PLAN]: planText({ status: 'Done' }) } },
    'NS-6-open': { key: ACTIVE, files: { [ACTIVE]: specText({ status: 'In Progress', plan: ACTIVE_LINK }), [ACTIVE_PLAN]: steps([['T-001', 'Done one', '[x]'], ['T-002', 'Reject money values', '[ ]']]) } },
    'NS-6-report': { key: '.specs/active/0001-tip-splitter.md', files: splitterFiles({ ticked: TWO, currentStep: 'T-003', verified: { 'T-003': '2026-11-19 · npm test green' } }) },
    'NS-6-resume': { key: ACTIVE, files: { [ACTIVE]: specText({ status: 'In Progress', plan: ACTIVE_LINK }), [ACTIVE_PLAN]: `${planText({ status: 'In Progress' })}\n## Steps\n\n### ~~T-001 — Done one~~\n\n- [ ] **Verified (T-001):** —\n` } },
    'NS-6-returned': { key: '.specs/active/0001-tip-splitter.md', files: splitterFiles({ ticked: TWO, currentStep: 'T-003 ‖ T-004', note: 'DONE' }) },
    'NS-6-plan': { key: ACTIVE, files: { [ACTIVE]: specText({ status: 'In Progress', plan: ARCHIVE }) } },
    'NS-7': { key: BACKLOG, files: { [BACKLOG]: specText({ plan: LINK }), [BACKLOG_PLAN]: steps([['T-001', 'Step', '[ ]']], 'Not started') } },
    'NS-8': { key: BACKLOG, files: { [BACKLOG]: specText({ criteria: false }) } },
    'NS-9': { key: BACKLOG, files: { [BACKLOG]: specText() } },
    'NS-10': { key: BACKLOG, files: { [BACKLOG]: specText({ plan: LINK }), [BACKLOG_PLAN]: planText({ status: 'In Progress' }) } },
};

export async function caseModel(stepCase: StepCase, version: string): Promise<ShellModel> {
    const project = await readMemory(CASE_WORLDS[stepCase].files, version);
    return { project, lifecycle: deriveLifecycle(project) };
}
