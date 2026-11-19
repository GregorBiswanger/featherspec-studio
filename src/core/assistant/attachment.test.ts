import { describe, expect, it } from 'vitest';
import { STEP_GUIDES, type StepCase } from '../../shared/protocol/nextStepTexts';
import type { AssistantId } from '../../shared/protocol/assistant';
import { ASSISTANTS } from './assistants';
import { attachmentOf, STEP_ATTACHES } from './attachment';
import { offerOf } from './offer';

const CASES = Object.keys(STEP_GUIDES) as StepCase[];
const NO: StepCase[] = ['NS-2', 'NS-4'];
const KEY = '.specs/backlog/0002-x.md';
const ALL = (): boolean => true;
const offerFor = (assistant: AssistantId) => ({ assistant, attaches: true });

describe('0027 AC-001: which steps attach (§6.1)', () => {
    it('0027 AC-001: every step case has a row, and exactly NS-2 and NS-4 do not attach', () => {
        expect(Object.keys(STEP_ATTACHES).sort()).toEqual([...CASES].sort());
        expect(CASES.filter((stepCase) => !STEP_ATTACHES[stepCase]).sort()).toEqual(NO);
    });

    for (const assistant of ['copilot', 'claudeCode'] as const) {
        for (const stepCase of CASES) {
            it(`0027 AC-001 ${assistant} ${stepCase}: ${NO.includes(stepCase) ? 'no attachment' : 'the spec name and path'} at 1.11.0`, () => {
                const decision = attachmentOf(offerFor(assistant), stepCase, { version: '1.11.0', key: KEY });
                expect(decision).toEqual(NO.includes(stepCase) ? { withheld: false } : { attach: { name: '0002-x.md', path: KEY }, withheld: false });
            });
        }
    }

    it('0027 AC-001: without an offer no case carries an attachment', () => {
        for (const stepCase of CASES) {
            expect(attachmentOf(undefined, stepCase, { version: '1.11.0', key: KEY }), stepCase).toEqual({ withheld: false });
        }
    });

    it('0027 AC-001: the name is the last segment of the path', () => {
        expect(attachmentOf(offerFor('claudeCode'), 'NS-9', { version: '1.11.0', key: '.specs/active/0024-send-next-step-to-assistant.md' }).attach).toEqual({ name: '0024-send-next-step-to-assistant.md', path: '.specs/active/0024-send-next-step-to-assistant.md' });
    });
});

describe('0027 AC-002: the version gate (§6.2)', () => {
    it.each(['1.11.0', '1.11.1', '1.12.0', '2.0.0'])('0027 AC-002: %s attaches on NS-9', (version) => {
        expect(attachmentOf(offerFor('claudeCode'), 'NS-9', { version, key: KEY })).toEqual({ attach: { name: '0002-x.md', path: KEY }, withheld: false });
    });

    it.each(['1.10.0', '1.9.9', '1.11.0-rc.1', '1.11', 'v1.11.0', 'unknown', ''])('0027 AC-002: %j gives none and is withheld', (version) => {
        expect(attachmentOf(offerFor('claudeCode'), 'NS-9', { version, key: KEY })).toEqual({ withheld: true });
    });

    it('0027 AC-002: a case that never attaches is not withheld below the gate', () => {
        for (const stepCase of NO) {
            expect(attachmentOf(offerFor('claudeCode'), stepCase, { version: '1.10.0', key: KEY })).toEqual({ withheld: false });
        }
    });

    it('0027 AC-002 (A-009): a path with whitespace gives Claude Code none and no update sentence; Copilot may attach by URI', () => {
        const key = '.specs/active/0002 x.md';
        expect(attachmentOf(offerFor('claudeCode'), 'NS-9', { version: '1.11.0', key })).toEqual({ withheld: false });
        expect(attachmentOf(offerFor('copilot'), 'NS-9', { version: '1.11.0', key })).toEqual({ attach: { name: '0002 x.md', path: key }, withheld: false });
    });
});

describe('0027 AC-019: the per-assistant table (§6.2)', () => {
    it('0027 AC-019: Claude Code attaches and Copilot does not, literally', () => {
        expect({ 'copilot': ASSISTANTS['copilot'].attachesSpec, claudeCode: ASSISTANTS.claudeCode.attachesSpec }).toEqual({ 'copilot': false, claudeCode: true });
    });

    it('0027 AC-019: an offer from the shipped table gives Claude Code the spec and Copilot none, in every case and version', () => {
        const plain = offerOf('copilot', [ASSISTANTS['copilot'].extensionId]);
        const claude = offerOf('claudeCode', [ASSISTANTS.claudeCode.extensionId]);
        expect(attachmentOf(claude, 'NS-9', { version: '1.11.0', key: KEY }).attach?.name).toBe('0002-x.md');
        for (const stepCase of CASES) {
            for (const version of ['1.10.0', '1.11.0', '2.0.0', 'unknown']) {
                expect(attachmentOf(plain, stepCase, { version, key: KEY }), `${stepCase} ${version}`).toEqual({ withheld: false });
            }
        }
    });

    it('0027 AC-019: an injected table decides, so flipping the data flips the behaviour (negative control)', () => {
        const present = [ASSISTANTS['copilot'].extensionId];
        expect(attachmentOf(offerOf('copilot', present, ALL), 'NS-9', { version: '1.11.0', key: KEY }).attach).toBeDefined();
        expect(attachmentOf(offerOf('copilot', present, () => false), 'NS-9', { version: '1.11.0', key: KEY }).attach).toBeUndefined();
    });
});
