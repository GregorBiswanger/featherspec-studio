import { describe, expect, it } from 'vitest';
import { planText, specText } from '../lifecycle/testing/projects';
import type { HistoryView } from '../lifecycle/statusHistory';
import { parseStepTipSettings } from '../settings/stepTipSettings';
import { STEP_ATTACHES } from '../assistant/attachment';
import { createSend } from '../assistant/send';
import { createFakeAssistantHost } from '../assistant/testing/fakeAssistantHost';
import { createHandOverWorld, projectOf } from '../assistant/testing/handOverWorld';
import { createSetupClock } from '../setup/testing/setupClock';
import { sendViewOf } from '../assistant/sendView';
import type { NextStepLineView, SpecDetailView } from '../../shared/protocol/detail';
import { buildDetail } from './detail';
import { nextStep } from './nextStep';
import { stepTips } from './stepTips';
import { modelOf } from './testing/boardWorld';
import { fixtureModel } from '../planMap/testing/plans';
import { TIP_CLOSING, type StepCase } from '../../shared/protocol/nextStepTexts';

const NO_HISTORY: HistoryView = { available: true, label: 'Only changes Studio saw while it was running.', entries: [] };
const SHOW = parseStepTipSettings(true, {});
const OFF = parseStepTipSettings(false, {});
const OFFER_A = { assistant: 'copilot' } as const;
const OFFER_B = { assistant: 'claudeCode' } as const;

const BACKLOG = '.specs/backlog/0007-x.md';
const ACTIVE = '.specs/active/0007-x.md';
const REVIEW = '.specs/active/0015-focus-on-visibility.md';
const PLAN = '.specs/active/0007-x.plan.md';
const PLAN_LINK = '[0007-x.plan.md](0007-x.plan.md)';
const STEPS = (first: string, second = '- [ ] **Verified (T-002):** —'): string => `${planText()}\n## Steps\n\n### T-001 — One\n\n${first}\n\n### T-002 — Two\n\n${second}\n`;

interface Case {
    name: string;
    files: Record<string, string> | string;
    key: string;
    first: StepCase;
    own: StepCase | undefined;
    attaches: boolean;
}

const CASES: Case[] = [
    { name: 'NS-9', files: { [BACKLOG]: specText() }, key: BACKLOG, first: 'NS-9', own: 'NS-10', attaches: true },
    { name: 'NS-6-open', files: { [ACTIVE]: specText({ status: 'In Progress', plan: PLAN_LINK }), [PLAN]: STEPS('- [ ] **Verified (T-001):** —') }, key: ACTIVE, first: 'NS-6-open', own: 'NS-6-report', attaches: true },
    { name: 'NS-6-report', files: { [ACTIVE]: specText({ status: 'In Progress', plan: PLAN_LINK }), [PLAN]: STEPS('- [ ] **Verified (T-001):** done 2026-11-20', '- [ ] **Verified (T-002):** —') }, key: ACTIVE, first: 'NS-6-report', own: 'NS-6-open', attaches: true },
    { name: 'NS-5', files: 'studio-0015', key: '.specs/active/0015-focus-on-visibility.md', first: 'NS-5', own: 'NS-2', attaches: false },
];

async function detailOf(files: Record<string, string> | string, key: string, extra: { offer?: typeof OFFER_A | typeof OFFER_B; tips?: typeof SHOW } = {}) {
    const model = typeof files === 'string' ? await fixtureModel(files) : await modelOf(files);
    const entry = model.lifecycle.entries.find((candidate) => candidate.key === key)!;
    const view = buildDetail({ selection: { stem: entry.stem }, model, history: NO_HISTORY, ...extra }) as SpecDetailView;
    const next = view.nextStep as { lines: NextStepLineView[]; send?: unknown; tips?: { coach: string } };
    return { model, next };
}

describe('0031 AC-002: each follow-up line carries its own Send view, attaching by its own case', () => {
    for (const row of CASES) {
        for (const offer of [OFFER_A, OFFER_B]) {
            it(`0031 AC-002 ${row.name} with ${offer.assistant}: the follow-up line's send view is that of its own case`, async () => {
                const { model, next } = await detailOf(row.files, row.key, { offer });
                const step = nextStep(model, row.key) as { case: StepCase };
                expect(step.case).toBe(row.first);
                expect(next.lines).toHaveLength(2);
                expect(next.lines[0]!.send).toBeUndefined();
                const expected = sendViewOf(offer, row.own!, { key: row.key });
                expect(next.lines[1]!.send).toEqual(expected);
                const attach = (next.lines[1]!.send as { attach?: { name: string; path: string } }).attach;
                expect(attach !== undefined).toBe(row.attaches);
                if (row.attaches) {
                    expect(attach).toEqual({ name: row.key.slice(row.key.lastIndexOf('/') + 1), path: row.key });
                }
                expect(STEP_ATTACHES[row.own!]).toBe(row.attaches);
            });
        }
    }

    it('0031 AC-002 Claude Code attaches nothing for a path with whitespace, Copilot still does', async () => {
        const key = '.specs/backlog/0007-x y.md';
        const files = { [key]: specText() };
        expect((await detailOf(files, key, { offer: OFFER_B })).next.lines[1]!.send).toEqual({ assistant: 'claudeCode', target: 'new', targets: ['new'] });
        expect((await detailOf(files, key, { offer: OFFER_A })).next.lines[1]!.send).toMatchObject({ attach: { name: '0007-x y.md', path: key } });
    });

    it('0031 AC-002 without an offer no line carries a send view', async () => {
        const { next } = await detailOf(CASES[0]!.files, BACKLOG);
        expect(next.lines.every((line) => line.send === undefined && line.coach === undefined)).toBe(true);
        expect('send' in next).toBe(false);
    });

    it('0031 AC-002 the view-level send stays the first line\'s', async () => {
        const { next } = await detailOf(CASES[0]!.files, BACKLOG, { offer: OFFER_A });
        expect(next.send).toEqual(sendViewOf(OFFER_A, 'NS-9', { key: BACKLOG }));
    });
});

describe('0031 AC-011: the follow-up Tip is the Tip of its own case', () => {
    for (const row of CASES) {
        it(`0031 AC-011 ${row.name}: the coach equals that of the own case's first line`, async () => {
            const { next } = await detailOf(row.files, row.key, { offer: OFFER_A, tips: SHOW });
            expect(next.lines[1]!.coach).toBe(stepTips(row.own!, SHOW, TIP_CLOSING, { version: '1.0.0', send: true }).coach);
            expect(next.lines[0]!.coach).toBeUndefined();
        });
    }

    it('0031 AC-011 NS-9\'s /sdd-plan line reads NS-10\'s sentence, and its first line keeps NS-9\'s', async () => {
        const { next } = await detailOf(CASES[0]!.files, BACKLOG, { offer: OFFER_B, tips: SHOW });
        expect(next.lines[1]!.coach).toBe('Tip: Use a new chat with a strong model, and allow web search.');
        expect(next.tips?.coach).toBe('Tip: Use a new chat with a strong model.');
    });

    it('0031 AC-011 with tips off no follow-up coach exists, the send view stays', async () => {
        const { next } = await detailOf(CASES[0]!.files, BACKLOG, { offer: OFFER_A, tips: OFF });
        expect(next.lines[1]!.coach).toBeUndefined();
        expect(next.lines[1]!.send).toBeDefined();
    });

    it('0031 AC-011 without tips settings no coach exists', async () => {
        const { next } = await detailOf(CASES[0]!.files, BACKLOG, { offer: OFFER_A });
        expect(next.lines[1]!.coach).toBeUndefined();
    });
});

describe('0031 AC-005: a follow-up Send records no hand-over, the first /sdd-clarify still does', () => {
    async function world() {
        const project = await projectOf({ [BACKLOG]: specText() }, { modifiedMs: 1_000, size: 100 });
        const handOver = createHandOverWorld(project);
        const host = createFakeAssistantHost(['workbench.action.chat.newChat', 'workbench.action.chat.open']);
        host.install('GitHub.copilot-chat');
        const sender = createSend({
            host,
            clipboard: { async writeText() {} },
            ui: { warn: () => undefined },
            output: { appendBlock: () => undefined },
            clock: createSetupClock(),
            platform: 'win32',
            chosen: { read: () => 'copilot' as const },
            handOver: handOver.handOvers,
        });
        return { handOver, send: (line: string) => sender.send({ assistant: 'copilot', target: 'new', line }) };
    }

    it('0031 AC-005 sending the /sdd-plan, /sdd-lifecycle and Implement lines writes no memory', async () => {
        const { handOver, send } = await world();
        for (const line of [`/sdd-plan ${BACKLOG}`, `/sdd-lifecycle ${BACKLOG}`, `Implement T-001 of ${PLAN}`]) {
            expect((await send(line)).outcome).toBe('opened');
        }
        expect(handOver.memory.writes).toBe(0);
    });

    it('0031 AC-005 sending the first line /sdd-clarify still writes one entry', async () => {
        const { handOver, send } = await world();
        await send(`/sdd-clarify ${BACKLOG}`);
        expect(handOver.memory.writes).toBe(1);
    });
});

describe('0031 AC-006: one-line surfaces and nextStep() are unchanged', () => {
    it('0031 AC-006 nextStep() keeps its plain lines (no send, no coach)', async () => {
        for (const row of CASES) {
            const step = nextStep(typeof row.files === 'string' ? await fixtureModel(row.files) : await modelOf(row.files), row.key) as unknown as { lines: Array<Record<string, unknown>> };
            expect(step.lines.every((line) => Object.keys(line).sort().join() === 'intent,text')).toBe(true);
        }
    });

    it('0031 AC-006 a one-line step gets no per-line fields', async () => {
        const { next } = await detailOf({ [BACKLOG]: specText({ criteria: false }) }, BACKLOG, { offer: OFFER_A, tips: SHOW });
        expect(next.lines).toHaveLength(1);
        expect(next.lines[0]!.send).toBeUndefined();
        expect(next.lines[0]!.coach).toBeUndefined();
    });
});
