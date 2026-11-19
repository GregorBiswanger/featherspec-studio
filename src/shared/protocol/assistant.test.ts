import { describe, expect, it } from 'vitest';
import { ASSISTANT_IDS, ASSISTANT_TARGETS, isAssistantId, isSendView } from './assistant';
import { ASSISTANT_NAMES } from './assistantTexts';

describe('0024 AC-002: the assistant ids, targets and names', () => {
    it('two assistants with the targets of §6.2 and the names of §7', () => {
        expect([...ASSISTANT_IDS]).toEqual(['copilot', 'claudeCode']);
        expect(ASSISTANT_TARGETS).toEqual({ 'copilot': ['new', 'current'], claudeCode: ['new'] });
        expect(ASSISTANT_NAMES).toEqual({ 'copilot': 'Copilot', claudeCode: 'Claude Code' });
    });

    it('isAssistantId accepts the two ids and nothing else', () => {
        expect(isAssistantId('copilot')).toBe(true);
        expect(isAssistantId('claudeCode')).toBe(true);
        for (const value of ['codex', 'none', '', 'Copilot', 42, null, undefined, ['copilot']]) {
            expect(isAssistantId(value), String(value)).toBe(false);
        }
    });
});

describe('0024 AC-004: the send view guard', () => {
    const viewA = { assistant: 'copilot', target: 'new', targets: ['new', 'current'] };
    const claude = { assistant: 'claudeCode', target: 'new', targets: ['new'] };

    it('accepts both assistants, with either target for Copilot', () => {
        expect(isSendView(viewA)).toBe(true);
        expect(isSendView({ ...viewA, target: 'current' })).toBe(true);
        expect(isSendView(claude)).toBe(true);
    });

    it('refuses an extra key, a missing key, an unknown assistant and a wrong type', () => {
        expect(isSendView({ ...viewA, extra: 1 })).toBe(false);
        expect(isSendView({ assistant: 'copilot', target: 'new' })).toBe(false);
        expect(isSendView({ ...viewA, assistant: 'codex' })).toBe(false);
        expect(isSendView({ ...viewA, target: 1 })).toBe(false);
        expect(isSendView({ ...viewA, targets: 'new' })).toBe(false);
        for (const value of [null, undefined, 'copilot', 3, [], [viewA]]) {
            expect(isSendView(value)).toBe(false);
        }
    });

    it('refuses a target the assistant lacks, and a target list that is not the assistant\'s', () => {
        expect(isSendView({ ...claude, target: 'current' })).toBe(false);
        expect(isSendView({ ...claude, targets: ['new', 'current'] })).toBe(false);
        expect(isSendView({ ...viewA, targets: ['new'] })).toBe(false);
        expect(isSendView({ ...viewA, targets: ['current', 'new'] })).toBe(false);
        expect(isSendView({ ...viewA, targets: ['new', 'other'] })).toBe(false);
    });
});
