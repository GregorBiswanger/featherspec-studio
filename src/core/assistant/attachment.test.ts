import { describe, expect, it } from 'vitest';
import { STEP_GUIDES, type StepCase } from '../../shared/protocol/nextStepTexts';
import type { AssistantId } from '../../shared/protocol/assistant';
import { ASSISTANTS } from './assistants';
import { attachmentOf, STEP_ATTACHES } from './attachment';
import { offerOf } from './offer';

const CASES = Object.keys(STEP_GUIDES) as StepCase[];
const NO: StepCase[] = ['NS-2', 'NS-4'];
const KEY = '.specs/backlog/0002-x.md';
const PLAN = '.specs/backlog/0002-x.plan.md';
const SPEC_FILE = { name: '0002-x.md', path: KEY };
const PLAN_FILE = { name: '0002-x.plan.md', path: PLAN };
/** 0033 §6.3: Implement attaches the plan, the start step the spec and the plan, every other case the spec. */
const FILES_OF = (stepCase: StepCase) => (stepCase === 'NS-6-open' || stepCase === 'NS-7' ? [PLAN_FILE] : stepCase === 'NS-7-start' ? [SPEC_FILE, PLAN_FILE] : [SPEC_FILE]);
const ALL = (): boolean => true;
const offerFor = (assistant: AssistantId) => ({ assistant, attaches: true });

describe('0027 AC-001: which steps attach (§6.1)', () => {
    it('0027 AC-001: every step case has a row, and exactly NS-2 and NS-4 do not attach', () => {
        expect(Object.keys(STEP_ATTACHES).sort()).toEqual([...CASES].sort());
        expect(CASES.filter((stepCase) => !STEP_ATTACHES[stepCase]).sort()).toEqual(NO);
    });

    for (const assistant of ['copilot', 'claudeCode'] as const) {
        for (const stepCase of CASES) {
            it(`0027 AC-001 ${assistant} ${stepCase}: ${NO.includes(stepCase) ? 'no attachment' : 'the file names and paths of 0033 §6.3'}`, () => {
                const decision = attachmentOf(offerFor(assistant), stepCase, { key: KEY, plan: PLAN });
                const [first, ...rest] = FILES_OF(stepCase);
                expect(decision).toEqual(NO.includes(stepCase) ? {} : { attach: first, ...(rest.length === 0 ? {} : { attachAlso: rest }) });
            });
        }
    }

    it('0027 AC-001: without an offer no case carries an attachment', () => {
        for (const stepCase of CASES) {
            expect(attachmentOf(undefined, stepCase, { key: KEY }), stepCase).toEqual({});
        }
    });

    it('0027 AC-001: the name is the last segment of the path', () => {
        expect(attachmentOf(offerFor('claudeCode'), 'NS-9', { key: '.specs/active/0024-send-next-step-to-assistant.md' }).attach).toEqual({ name: '0024-send-next-step-to-assistant.md', path: '.specs/active/0024-send-next-step-to-assistant.md' });
    });
});

describe('0027 AC-002 (amended by PD-091): no version gate, every version attaches', () => {
    it.each(['1.11.0', '1.10.0', '1.9.9', '1.11.0-rc.1', 'unknown', ''])('0027 AC-002: a project at %j attaches on NS-9 for both assistants', (version) => {
        for (const assistant of ['claudeCode', 'copilot'] as const) {
            expect(attachmentOf(offerFor(assistant), 'NS-9', { key: KEY } as never)).toEqual({ attach: { name: '0002-x.md', path: KEY } });
        }
    });

    it('0027 AC-002 (A-009): a path with whitespace gives Claude Code none; Copilot attaches by URI', () => {
        const key = '.specs/active/0002 x.md';
        expect(attachmentOf(offerFor('claudeCode'), 'NS-9', { key })).toEqual({});
        expect(attachmentOf(offerFor('copilot'), 'NS-9', { key })).toEqual({ attach: { name: '0002 x.md', path: key } });
    });
});

describe('0027 AC-019: the per-assistant table (§6.2)', () => {
    it('0027 AC-019: both assistants attach, literally (PD-091)', () => {
        expect({ 'copilot': ASSISTANTS['copilot'].attachesSpec, claudeCode: ASSISTANTS.claudeCode.attachesSpec }).toEqual({ 'copilot': true, claudeCode: true });
    });

    it('0027 AC-019: an offer from the shipped table gives both assistants the spec in every case that attaches', () => {
        const plain = offerOf('copilot', [ASSISTANTS['copilot'].extensionId]);
        const claude = offerOf('claudeCode', [ASSISTANTS.claudeCode.extensionId]);
        for (const offer of [plain, claude]) {
            for (const stepCase of CASES) {
                expect(attachmentOf(offer, stepCase, { key: KEY, plan: PLAN }).attach?.name, stepCase).toBe(NO.includes(stepCase) ? undefined : FILES_OF(stepCase)[0]!.name);
            }
        }
    });

    it('0027 AC-019: an injected table decides, so flipping the data flips the behaviour (negative control)', () => {
        const present = [ASSISTANTS['copilot'].extensionId];
        expect(attachmentOf(offerOf('copilot', present, ALL), 'NS-9', { key: KEY }).attach).toBeDefined();
        expect(attachmentOf(offerOf('copilot', present, () => false), 'NS-9', { key: KEY }).attach).toBeUndefined();
    });
});
