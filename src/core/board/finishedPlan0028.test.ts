import { describe, expect, it } from 'vitest';
import { STEP_GUIDES } from '../../shared/protocol/nextStepTexts';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import { ROOT, VERSION } from '../lifecycle/testing/projects';
import { readProject } from '../specs/readProject';
import { createMemorySpecSource } from '../specs/testing/memorySpecSource';
import { modelOf } from './testing/boardWorld';
import { parseStepTipSettings } from '../settings/stepTipSettings';
import { buildDetail } from './detail';
import { nextStep, stepView } from './nextStep';
import { CASE_FIXTURES, SPLITTER_BACKLOG_SPEC, SPLITTER_SPEC } from './testing/caseFixtures';
import { modelOfCase } from './testing/nextStepSnapshot';

const NO_HISTORY = { available: true, entries: [], label: '' } as never;
const SHOW = parseStepTipSettings(true, {});
const OFFERS = [undefined, { assistant: 'copilot' }, { assistant: 'claudeCode' }] as const;

const SECOND = '.specs/active/0001-tip-splitter.plan.md';

async function viewsOf(name: string, plan?: string) {
    const files = { ...CASE_FIXTURES[name]!, ...(plan === undefined ? {} : { [SECOND]: plan }) };
    const model = await modelOf(files);
    const entry = model.lifecycle.entries[0]!;
    return {
        entry,
        next: nextStep(model, entry.key),
        step: stepView(model, entry.key),
        details: OFFERS.map((offer) => buildDetail({ selection: { stem: entry.stem }, model, history: NO_HISTORY, tips: SHOW, ...(offer === undefined ? {} : { offer }) })),
    };
}

describe('0028 AC-001: a finished plan is Review whatever its status line says', () => {
    it.each(['ac001-plan-in-progress', 'ac001-plan-not-started', 'ac001-plan-no-status', 'ac001-in-progress-with-done-note'])(
        '%s: Review, S-REVIEW, derived; entry, next step and detail deep-equal those of plan Done, for each assistant value',
        async (name) => {
            const done = await viewsOf('ac001-plan-done');
            const finished = await viewsOf(name);
            expect(finished.entry).toMatchObject({ state: 'Review', rule: 'S-REVIEW', persistence: 'derived', derivedLabel: 'Derived (rule S-REVIEW)' });
            expect({ ...finished.entry, readiness: undefined }).toEqual({ ...done.entry, readiness: undefined });
            expect(finished.next).toEqual(done.next);
            expect(finished.step).toEqual(done.step);
            expect(finished.details.map((view) => (view as { nextStep: unknown }).nextStep)).toEqual(done.details.map((view) => (view as { nextStep: unknown }).nextStep));
        },
    );

    it('the example of the spec: /sdd-compile under Have the result verified, then /sdd-lifecycle; Verify; new chat, strong model, other family', async () => {
        const { next, step, details } = await viewsOf('ac001-plan-in-progress');
        expect(next).toEqual({
            rule: 'NS-5',
            case: 'NS-5',
            lines: [
                { intent: 'Have the result verified', text: `/sdd-compile ${SPLITTER_SPEC}` },
                { intent: 'Then, after a READY verdict: close the spec', text: `/sdd-lifecycle ${SPLITTER_SPEC}` },
            ],
        });
        expect(step?.short).toBe('/sdd-compile');
        expect(step?.intent).toBe('Verify');
        expect(details[0]).toMatchObject({ nextStep: { tips: { coach: 'new chat · strong model, other family' } } });
    });

    it('negative control: with one step not ticked the same plan stays Active with an open step', async () => {
        const files = { ...CASE_FIXTURES['ac001-plan-in-progress']!, [SECOND]: CASE_FIXTURES['ac001-plan-in-progress']![SECOND]!.replace('- [x] **Verified (T-006):** 2026-11-19 · npm test green', '- [ ] **Verified (T-006):** —') };
        const model = await modelOf(files);
        expect(model.lifecycle.entries[0]).toMatchObject({ state: 'Active', rule: 'S-ACTIVE' });
        expect(nextStep(model, SPLITTER_SPEC)).toMatchObject({ case: 'NS-6-open' });
    });
});

describe('0028 AC-002: a plan without a ticked step is not finished', () => {
    const TEXTS = {
        effect: 'The agent checks the plan against the code and reports where it stands.',
        then: 'The spec then shows its next step.',
    };

    it.each(['ac002-struck-only', 'ac002-no-step'])('%s: Active, and Plan without open step with the effect and then-sentence of the spec', async (name) => {
        const { entry, next, details } = await viewsOf(name);
        expect(entry.state).toBe('Active');
        expect(next).toEqual({ rule: 'NS-6', case: 'NS-6-resume', lines: [{ intent: 'Let the agent report where the plan stands', text: `/sdd-plan ${SPLITTER_SPEC}` }] });
        expect(STEP_GUIDES['NS-6-resume']).toMatchObject({ short: 'Resume', ...TEXTS });
        expect((details[0] as { nextStep: { tips: { about: string[] } } }).nextStep.tips.about[0]).toBe(`${TEXTS.effect} ${TEXTS.then}`);
    });

    it('an unreadable plan is Active, Plan without open step', async () => {
        const source = createMemorySpecSource();
        source.setFile(ROOT, SPLITTER_SPEC, CASE_FIXTURES['ac001-plan-in-progress']![SPLITTER_SPEC]!);
        source.setFile(ROOT, SECOND, new Uint8Array([0xff, 0xfe, 0x00, 0xc3, 0x28]));
        const project = await readProject(source, ROOT, VERSION);
        const model = { project, lifecycle: deriveLifecycle(project) };
        expect(model.lifecycle.entries[0]!.state).toBe('Active');
        expect(nextStep(model, SPLITTER_SPEC)).toMatchObject({ case: 'NS-6-resume' });
    });

    it('one undetermined tick, the rest ticked: Active, and the continue lines of that step', async () => {
        const { entry, next } = await viewsOf('ac002-one-undetermined');
        expect(entry.state).toBe('Active');
        expect(next).toMatchObject({ case: 'NS-6-open', lines: [{ text: `Implement T-006 of ${SECOND}` }, { text: `/sdd-plan ${SPLITTER_SPEC}` }] });
    });
});

describe('0028 AC-003: states that come before Review stay as they were', () => {
    const SNAPSHOTS: Array<[string, string, string]> = [
        ['ac003-plan-blocked', 'Blocked', 'NS-4'],
        ['ac003-note-blocked', 'Blocked', 'NS-4'],
        ['ac003-draft-in-active', 'Active', 'NS-2'],
        ['ac003-backlog', 'Backlog', 'NS-10'],
    ];

    it.each(SNAPSHOTS)('%s: %s and %s, as at the Baseline snapshot', async (name, state, rule) => {
        const model = await modelOfCase(name);
        const key = Object.keys(CASE_FIXTURES[name]!).find((file) => !file.endsWith('.plan.md') && file.startsWith('.specs/'))!;
        expect(model.lifecycle.entries[0]).toMatchObject({ state });
        expect(nextStep(model, key)).toMatchObject({ rule });
        expect(key === SPLITTER_SPEC || key === SPLITTER_BACKLOG_SPEC).toBe(true);
    });
});
