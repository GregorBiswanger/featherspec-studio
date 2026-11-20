import { describe, expect, it } from 'vitest';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import { planText, readMemory, row } from '../lifecycle/testing/projects';
import { createSpecResolver } from '../overview/specRefs';
import { projectNow } from '../overview/rows';
import { parseStepTipSettings } from '../settings/stepTipSettings';
import { SAME_OR_NEW_REASON_LEVELLED, SESSION_REASONS, verifiedWithoutTickReason } from '../../shared/protocol/nextStepTexts';
import type { ShellModel } from '../ports/shell';
import { buildDetail } from './detail';
import { modelOfFixture } from './testing/nextStepSnapshot';

const SHOW = parseStepTipSettings(true, {});
const SELECTION = { stem: '0001-fixture-demo' };

const SPEC = ['# Board', '', '**Status:** In Progress', '**Plan:** [0001-a.plan.md](0001-a.plan.md)', '', '## 13. Acceptance criteria', '', '**AC-001** The board shall show cards.', ''].join('\n');
const PLAN = `${planText({ status: 'In Progress', rows: [row('AC-001', 'open')] })}\n## Steps\n\n### T-001 — First\n\n- [x] **Verified (T-001):** 2026-11-16 · green\n\n### T-002 — Second\n\n- [ ] **Verified (T-002):** —\n`;

async function openStepModel(version: string): Promise<ShellModel> {
    const project = await readMemory({ '.specs/active/0001-a.md': SPEC, '.specs/active/0001-a.plan.md': PLAN }, version);
    return { project, lifecycle: deriveLifecycle(project) } as ShellModel;
}

function detailAbout(model: ShellModel, selection: { stem: string }): string[] {
    const view = buildDetail({ selection, model, history: { available: true, label: '', entries: [] }, tips: SHOW });
    if (view.kind !== 'spec' || !('lines' in view.nextStep) || view.nextStep.tips === undefined) {
        throw new Error('expected a spec detail with tips');
    }
    return view.nextStep.tips.about;
}

function nowAbout(model: ShellModel): string[] {
    const about = projectNow(model, createSpecResolver(model), SHOW).rows[0]?.tips?.about;
    if (about === undefined) {
        throw new Error('expected tips on the first Now row');
    }
    return about;
}

describe('0028 F1: the version and the reason reach the tips of the detail and of the Overview Now row', () => {
    it('fs-verified-no-tick: about[0] starts with the reason of the guard, in the detail and in the Now row', async () => {
        const model = await modelOfFixture('fs-verified-no-tick');
        const reason = verifiedWithoutTickReason('T-003');
        expect(detailAbout(model, SELECTION)[0]?.startsWith(`${reason} `)).toBe(true);
        expect(nowAbout(model)[0]?.startsWith(`${reason} `)).toBe(true);
    });

    it('fs-version-1110: about[1] is the levelled session reason, in the detail and in the Now row', async () => {
        const model = await modelOfFixture('fs-version-1110');
        expect(detailAbout(model, SELECTION)[1]?.startsWith(SAME_OR_NEW_REASON_LEVELLED)).toBe(true);
        expect(nowAbout(model)[1]?.startsWith(SAME_OR_NEW_REASON_LEVELLED)).toBe(true);
    });

    it('1.10.0 with an open step and no sign: about[1] is the old session reason, in the detail and in the Now row', async () => {
        const model = await openStepModel('1.10.0');
        expect(detailAbout(model, { stem: '0001-a' })[1]?.startsWith(SESSION_REASONS.sameOrNew)).toBe(true);
        expect(nowAbout(model)[1]?.startsWith(SESSION_REASONS.sameOrNew)).toBe(true);
    });

    it('negative control: the same project at 1.11.0 gets the levelled reason, so the 1.10.0 check can fail', async () => {
        const model = await openStepModel('1.11.0');
        expect(detailAbout(model, { stem: '0001-a' })[1]?.startsWith(SAME_OR_NEW_REASON_LEVELLED)).toBe(true);
        expect(nowAbout(model)[1]?.startsWith(SESSION_REASONS.sameOrNew)).toBe(false);
    });
});
