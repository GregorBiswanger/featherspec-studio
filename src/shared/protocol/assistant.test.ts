import { describe, expect, it } from 'vitest';
import { ASSISTANT_IDS, ASSISTANT_TARGETS, isAssistantId, isSendPromptPayload, isSendView } from './assistant';
import { ASSISTANT_NAMES } from './assistantTexts';

describe('0024 AC-002: the assistant ids, targets and names', () => {
    it('three assistants with the targets of §6.2 and the names of §7', () => {
        expect([...ASSISTANT_IDS]).toEqual(['copilot', 'claudeCode', 'junie']);
        expect(ASSISTANT_TARGETS).toEqual({ 'copilot': ['new', 'current'], claudeCode: ['new'], junie: ['new'] });
        expect(ASSISTANT_NAMES).toEqual({ 'copilot': 'Copilot', claudeCode: 'Claude Code', junie: 'Junie' });
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

describe('0027 AC-007: the guards for the attachment', () => {
    const claude = { assistant: 'claudeCode', target: 'new', targets: ['new'] };
    const attach = { name: '0002-x.md', path: '.specs/backlog/0002-x.md' };
    const request = { assistant: 'copilot', target: 'new', line: '/sdd-clarify .specs/backlog/0002-x.md', token: 'a-1' };

    it('a view accepts an attach of exactly name and path, the name the last segment of the path', () => {
        expect(isSendView({ ...claude, attach })).toBe(true);
        expect(isSendView({ ...claude })).toBe(true);
    });

    it('a view refuses an attach with another key, a missing key, an empty or non-string value, or a name that is not the last segment', () => {
        for (const bad of [{ ...attach, uri: 'x' }, { name: attach.name }, { path: attach.path }, { name: '', path: attach.path }, { name: attach.name, path: '' }, { name: 1, path: attach.path }, { name: 'other.md', path: attach.path }, null, 'x', [attach]]) {
            expect(isSendView({ ...claude, attach: bad }), JSON.stringify(bad)).toBe(false);
        }
        expect(isSendView({ ...claude, attach: undefined })).toBe(false);
    });

    it('a request accepts an optional non-empty string attach and refuses anything else', () => {
        expect(isSendPromptPayload(request)).toBe(true);
        expect(isSendPromptPayload({ ...request, attach: '.specs/backlog/0002-x.md' })).toBe(true);
        for (const bad of ['', 1, null, undefined, ['x'], { path: 'x' }]) {
            expect(isSendPromptPayload({ ...request, attach: bad }), JSON.stringify(bad)).toBe(false);
        }
        expect(isSendPromptPayload({ ...request, attach: 'x', uri: 'y' })).toBe(false);
        expect(isSendPromptPayload({ ...request, preserveInput: true })).toBe(false);
        expect(isSendPromptPayload({ ...request, modelSelector: 'x' })).toBe(false);
    });
});
