import { describe, expect, it } from 'vitest';
import { planText, specText } from '../lifecycle/testing/projects';
import { parseStepTipSettings } from '../settings/stepTipSettings';
import { modelOf } from './testing/boardWorld';
import { NS5_THEN_INTENT, NS6_REPORT_INTENT, NS9_INTENT, NS9_THEN_INTENT, SESSION_PHRASES, STEP_GUIDES, thenContinueIntent } from '../../shared/protocol/nextStepTexts';
import { nextStep } from './nextStep';
import { stepTips } from './stepTips';
import { buildDetail } from './detail';
import { createSpecResolver } from '../overview/specRefs';
import { projectNow } from '../overview/rows';
import { modelFor } from '../overview/testing/projects';
import type { SpecDetailView } from '../../shared/protocol/detail';
import type { HistoryView } from '../lifecycle/statusHistory';

const SHOW = parseStepTipSettings(true, {});
const ACTIVE = '.specs/active/0007-x.md';
const PLAN = '.specs/active/0007-x.plan.md';
const PLAN_LINK = '[0007-x.plan.md](0007-x.plan.md)';
const BACKLOG = '.specs/backlog/0007-x.md';
const STEPS = (title: string): string => `${planText()}\n## Steps\n\n### T-001 — ${title}\n\n- [ ] **Verified (T-001):** —\n`;

describe('0032 AC-002: the session phrase for current or new chat has no comma', () => {
    it('0032 AC-002 sameOrNew and NS-6-open\'s Tip read literally', () => {
        expect(SESSION_PHRASES.sameOrNew).toBe('the current chat or a new one');
        expect(stepTips('NS-6-open', SHOW).coach).toBe('Tip: Use the current chat or a new one with a fast model.');
    });
});

describe('0032 AC-003: where a step writes a plan the session is new (PD-093)', () => {
    it('0032 AC-003 NS-10 and NS-6-plan read the new-chat Tip, Mode B cases keep theirs', () => {
        const tip = 'Tip: Use a new chat with a strong model, and allow web search.';
        expect(STEP_GUIDES['NS-10'].session).toBe('new');
        expect(STEP_GUIDES['NS-6-plan'].session).toBe('new');
        expect(stepTips('NS-10', SHOW).coach).toBe(tip);
        expect(stepTips('NS-6-plan', SHOW).coach).toBe(tip);
        for (const modeB of ['NS-4-plan', 'NS-6-report', 'NS-6-resume', 'NS-6-returned', 'NS-7'] as const) {
            expect(STEP_GUIDES[modeB].session, modeB).not.toBe('new');
        }
        expect(stepTips('NS-4-plan', SHOW).coach).toBe('Tip: Use any chat with a strong model.');
        expect(stepTips('NS-6-report', SHOW).coach).toBe('Tip: Use any chat with a fast model.');
    });

    it('0032 AC-003 the (?) of NS-10 gives the session reason of new', () => {
        expect(stepTips('NS-10', SHOW).about[1]).toMatch(/^New chat: a fresh session reads the files as a stranger would/);
    });
});

describe('0032 AC-004: Then and Or on every follow-up line', () => {
    it('0032 AC-004 the intents read literally and the then-intents stay', () => {
        expect(NS6_REPORT_INTENT).toBe('Or: not sure where it stands? Let the agent report first');
        expect(NS9_INTENT).toBe('Have the spec challenged');
        expect(NS9_THEN_INTENT).toBe('Then: write the plan');
        expect(NS5_THEN_INTENT).toBe('Then, after a READY verdict: close the spec');
        expect(thenContinueIntent('T-003', 'Reject money')).toBe('Then: continue with T-003 Reject money');
        expect(thenContinueIntent('T-003', '')).toBe('Then: continue with T-003');
    });

    it('0032 AC-004 NS-6-report\'s second line reads Then: continue with <ID> <title>; untitled without trailing space', async () => {
        const report = (title: string) => ({ [ACTIVE]: specText({ status: 'In Progress', plan: PLAN_LINK }), [PLAN]: STEPS(title).replace('- [ ] **Verified (T-001):** —', '- [ ] **Verified (T-001):** done 2026-11-20') });
        const titled = nextStep(await modelOf(report('Reject money')), ACTIVE) as { case: string; lines: Array<{ intent: string }> };
        expect(titled.case).toBe('NS-6-report');
        expect(titled.lines[1]!.intent).toBe('Then: continue with T-001 Reject money');
        const bare = nextStep(await modelOf(report('')), ACTIVE) as { lines: Array<{ intent: string }> };
        expect(bare.lines[1]!.intent).toBe('Then: continue with T-001');
    });

    it('0032 AC-004 NS-6-open keeps Continue with on line 1 and Or: on line 2; NS-9 line 1 has no then-plan', async () => {
        const open = nextStep(await modelOf({ [ACTIVE]: specText({ status: 'In Progress', plan: PLAN_LINK }), [PLAN]: STEPS('Reject money') }), ACTIVE) as { case: string; lines: Array<{ intent: string }> };
        expect(open.case).toBe('NS-6-open');
        expect(open.lines.map((line) => line.intent)).toEqual(['Continue with T-001 Reject money', NS6_REPORT_INTENT]);
        const nine = nextStep(await modelOf({ [BACKLOG]: specText() }), BACKLOG) as { case: string; lines: Array<{ intent: string }> };
        expect(nine.case).toBe('NS-9');
        expect(nine.lines.map((line) => line.intent)).toEqual(['Have the spec challenged', 'Then: write the plan']);
    });
});

describe('0032 AC-008: the (?) asks for the update where Send attaches below 1.11.0', () => {
    const UPDATE = 'Update to FeatherSpec 1.11.0 with /sdd-featherspec-update so the attached spec is not read twice.';
    const about = (version: string, attaches: boolean): string => stepTips('NS-9', SHOW, undefined, { version, send: true, ...(attaches ? { attaches: true as const } : {}) }).about[0]!;

    it.each(['1.10.0', '1.11.0-rc.1', 'unknown', 'next'])('0032 AC-008 %s: the update sentence stands in the first paragraph', (version) => {
        expect(about(version, true)).toContain(UPDATE);
    });

    it.each(['1.11.0', '1.12.0'])('0032 AC-008 %s: no update sentence', (version) => {
        expect(about(version, true)).not.toContain(UPDATE);
    });

    it('0032 AC-008 where Send attaches nothing there is no update sentence', () => {
        expect(about('1.10.0', false)).not.toContain(UPDATE);
    });
});

describe('0032 AC-008: the real surfaces carry the update sentence', () => {
    const UPDATE = 'Update to FeatherSpec 1.11.0 with /sdd-featherspec-update so the attached spec is not read twice.';
    const NO_HISTORY: HistoryView = { available: true, label: '', entries: [] };

    it('0032 AC-008 the detail (?) of a Backlog spec sent with Copilot holds the update sentence, without an offer it does not', async () => {
        const model = await modelOf({ [BACKLOG]: specText() });
        const entry = model.lifecycle.entries.find((candidate) => candidate.key === BACKLOG)!;
        const aboutOf = (offer?: { assistant: 'copilot' }): string => {
            const view = buildDetail({ selection: { stem: entry.stem }, model, history: NO_HISTORY, tips: SHOW, ...(offer === undefined ? {} : { offer }) }) as SpecDetailView;
            return (view.nextStep as { tips: { about: string[] } }).tips.about[0]!;
        };
        expect(aboutOf({ assistant: 'copilot' })).toContain(UPDATE);
        expect(aboutOf()).not.toContain(UPDATE);
    });

    it('0032 AC-008 the first Now row sent with Copilot holds the update sentence in its (?), without an offer it does not', async () => {
        const model = await modelFor([{ number: '0001', kind: 'Review' }]);
        const resolver = createSpecResolver(model);
        const aboutOf = (offer?: { assistant: 'copilot' }): string => projectNow(model, resolver, SHOW, offer).rows[0]!.tips!.about[0]!;
        expect(aboutOf({ assistant: 'copilot' })).toContain(UPDATE);
        expect(aboutOf()).not.toContain(UPDATE);
    });
});
