import { describe, expect, it } from 'vitest';
import { planText, specText } from '../lifecycle/testing/projects';
import type { ShellModel } from '../ports/shell';
import { buildDetail } from './detail';
import { projectNow, projectUpNext } from '../overview/rows';
import { createSpecResolver } from '../overview/specRefs';
import { stepLinkOf } from './stepLinks';
import { modelOf } from './testing/boardWorld';

const ACTIVE = '.specs/active/0007-x.md';
const ACTIVE_PLAN = '.specs/active/0007-x.plan.md';
const READY = '.specs/backlog/0008-y.md';
const READY_PLAN = '.specs/backlog/0008-y.plan.md';
const DONE = '.specs/done/0009-z.md';
const NO_HISTORY = { available: true as const, label: '', entries: [] };

function plan(steps: Array<[string, string]>, status = 'In Progress'): string {
    return `${planText({ status })}\n## Steps\n\n${steps.map(([id, mark]) => `### ${id} — Step\n\n- ${mark} **Verified (${id}):** —\n`).join('\n')}`;
}

async function world(extra: Record<string, string> = {}): Promise<ShellModel> {
    return modelOf({
        [ACTIVE]: specText({ status: 'In Progress', plan: '[0007-x.plan.md](0007-x.plan.md)' }),
        [ACTIVE_PLAN]: plan([['T-001', '[x]'], ['T-002', '[ ]'], ['T-003', '[ ]']]),
        [READY]: specText({ plan: '[0008-y.plan.md](0008-y.plan.md)' }),
        [READY_PLAN]: plan([['T-001', '[ ]']], 'Not started'),
        [DONE]: specText({ status: 'Implemented' }),
        ...extra,
    });
}

function entryOf(model: ShellModel, key: string) {
    return model.lifecycle.entries.find((entry) => entry.key === key)!;
}

describe('0025 AC-027: the first plan step ID of a text is a step link for a map-able spec', () => {
    it('0025 AC-027: names the ID and the plan line of its heading', async () => {
        const model = await world();
        const link = stepLinkOf(model, entryOf(model, ACTIVE), 'Continue with T-002 Step');
        expect(link).toEqual({ id: 'T-002', open: { key: ACTIVE_PLAN, line: expect.any(Number) } });
        expect(link!.open.line).toBeGreaterThan(1);
    });

    it('0025 AC-027: skips an ID the plan does not hold and takes the first one that it holds', async () => {
        const model = await world();
        expect(stepLinkOf(model, entryOf(model, ACTIVE), 'T-099 then T-003')?.id).toBe('T-003');
        expect(stepLinkOf(model, entryOf(model, ACTIVE), 'T-099 only')).toBeUndefined();
        expect(stepLinkOf(model, entryOf(model, ACTIVE), 'XT-002 and T-0021')).toBeUndefined();
        expect(stepLinkOf(model, entryOf(model, ACTIVE), '/sdd-compile')).toBeUndefined();
    });

    it('0025 AC-027: a spec without a readable plan, and a Done spec, give no link', async () => {
        const model = await world({ [ACTIVE_PLAN]: 'not a plan' });
        expect(stepLinkOf(model, entryOf(model, ACTIVE), 'Continue with T-002')).toBeUndefined();
        const plain = await world();
        expect(stepLinkOf(plain, entryOf(plain, DONE), 'Continue with T-002')).toBeUndefined();
    });

    it('0025 AC-027: the detail lines carry the link in their intent, the Now and Up next rows in their short form', async () => {
        const model = await world();
        const detail = buildDetail({ selection: { stem: '0007-x', path: ACTIVE }, model, history: NO_HISTORY });
        if (detail.kind !== 'spec' || !('lines' in detail.nextStep)) {
            throw new Error('expected lines');
        }
        expect(detail.nextStep.lines[0]?.step?.id).toBe('T-002');
        expect(detail.nextStep.lines[0]?.text).toContain('Implement T-002');
        const now = projectNow(model, createSpecResolver(model)).rows;
        expect(now.find((row) => row.spec.stem === '0007-x')?.link?.id).toBe('T-002');
        expect(now.find((row) => row.spec.stem === '0007-x')?.step?.short).toBe('Implement T-002');
        expect(projectUpNext(model, createSpecResolver(model)).rows.find((row) => row.spec.stem === '0008-y')?.link?.id).toBe('T-001');
    });

    it('0025 AC-027: a line without a plan step in its intent has no step, and the 0028 views stay byte-identical', async () => {
        const model = await world();
        const detail = buildDetail({ selection: { stem: '0007-x', path: ACTIVE }, model, history: NO_HISTORY });
        if (detail.kind !== 'spec' || !('lines' in detail.nextStep)) {
            throw new Error('expected lines');
        }
        expect(detail.nextStep.lines.slice(1).every((line) => line.step === undefined || /\bT-\d+\b/.test(line.intent))).toBe(true);
        const row = projectNow(model, createSpecResolver(model)).rows.find((candidate) => candidate.spec.stem === '0007-x')!;
        expect(Object.keys(row.step!).sort()).toEqual(['intent', 'line', 'lines', 'short']);
    });
});
