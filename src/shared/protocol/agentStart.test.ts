import { describe, expect, it } from 'vitest';
import { isAgentStartView, type AgentStartView, type RefusalItem } from './agentStart';

function confirmation(): NonNullable<AgentStartView['confirmation']> {
    return {
        token: 'c-1',
        spec: { number: '0001', title: 'Ready feature', stem: '0001-ready-feature' },
        provider: { id: 'fake', displayName: 'Fake provider' },
        model: 'fake-model',
        permissionMode: 'Asks before every action',
        disclosure: 'Sends the prompt on.',
        missing: ['approvals', 'userInput'],
        previousRun: { kind: 'run', runId: 'r-1', status: 'Failed', errorClass: 'auth', errorText: 'Rejected.' },
        prompt: 'Read AGENTS.md first.',
        starting: false,
    };
}

const ITEMS: RefusalItem[] = [
    { id: 'P-1', kind: 'transition', refusal: 'not-ready', ids: ['R-4'], text: 'The spec is not Ready: R-4.' },
    { id: 'P-1', kind: 'no-entry', stem: '0001-a' },
    { id: 'P-1', kind: 'several', stem: '0001-a' },
    { id: 'P-2', missing: ['.claude/rules/plans.md'] },
    { id: 'P-3' },
    { id: 'P-3', configured: 'x' },
    { id: 'P-4', provider: 'Fake provider', result: 'unknown', reason: 'No answer.', hint: 'Retry.' },
    { id: 'P-5', runId: 'r-7', stem: '0002-b' },
    { id: 'P-6', state: 'read-only', reason: 'Another window.' },
    { id: 'P-6', state: 'unavailable' },
    { id: 'P-7' },
    { id: 'P-8', stem: 'bad' },
    { id: 'pending' },
    { id: 'outdated' },
    { id: 'orchestrator', text: 'A run is open.', run: { runId: 'r-7', stem: '0002-b' } },
    { id: 'orchestrator', text: 'Refused.' },
];

describe('agent start view contract', () => {
    it('accepts the empty view, a checking view, a full confirmation, every refusal item and a notice', () => {
        expect(isAgentStartView({})).toBe(true);
        expect(isAgentStartView({ checking: { number: '0001' } })).toBe(true);
        expect(isAgentStartView({ confirmation: confirmation() })).toBe(true);
        expect(isAgentStartView({ confirmation: { ...confirmation(), model: undefined, disclosure: undefined, previousRun: { kind: 'none' }, missing: [] } })).toBe(true);
        expect(isAgentStartView({ refusal: { number: '0001', items: ITEMS } })).toBe(true);
        expect(isAgentStartView({ refusal: { items: [{ id: 'P-7' }] } })).toBe(true);
        expect(isAgentStartView({ notice: { runId: 'r-1', errorClass: 'runtime_missing' } })).toBe(true);
        expect(isAgentStartView({ confirmation: confirmation(), refusal: { items: [{ id: 'pending' }] } })).toBe(true);
        expect(isAgentStartView({ confirmation: { ...confirmation(), previousRun: { kind: 'not-available', reason: 'x' } } })).toBe(true);
    });

    it('survives a JSON round trip', () => {
        const view: AgentStartView = { confirmation: confirmation(), refusal: { items: ITEMS }, notice: { runId: 'r', errorClass: 'unknown' } };
        expect(isAgentStartView(JSON.parse(JSON.stringify(view)))).toBe(true);
    });

    it('refuses extra keys anywhere (negative control: the same view without the extra key passes)', () => {
        expect(isAgentStartView({ extra: 1 })).toBe(false);
        expect(isAgentStartView({ confirmation: { ...confirmation(), extra: 1 } })).toBe(false);
        expect(isAgentStartView({ confirmation: { ...confirmation(), spec: { ...confirmation().spec, extra: 1 } } })).toBe(false);
        expect(isAgentStartView({ refusal: { items: [{ id: 'P-7', extra: 1 }] } })).toBe(false);
        expect(isAgentStartView({ notice: { runId: 'r', errorClass: 'x', extra: 1 } })).toBe(false);
        expect(isAgentStartView({ confirmation: confirmation() })).toBe(true);
    });

    it('refuses wrong types, unknown words and missing keys', () => {
        expect(isAgentStartView(null)).toBe(false);
        expect(isAgentStartView([])).toBe(false);
        expect(isAgentStartView({ checking: { number: 1 } })).toBe(false);
        expect(isAgentStartView({ confirmation: { ...confirmation(), starting: 'no' } })).toBe(false);
        expect(isAgentStartView({ confirmation: { ...confirmation(), missing: ['mcp'] } })).toBe(false);
        expect(isAgentStartView({ confirmation: { ...confirmation(), previousRun: { kind: 'run', runId: 'r', status: 'Nope', errorClass: '', errorText: '' } } })).toBe(false);
        expect(isAgentStartView({ confirmation: { ...confirmation(), token: undefined } })).toBe(false);
        expect(isAgentStartView({ refusal: { items: [{ id: 'P-9' }] } })).toBe(false);
        expect(isAgentStartView({ refusal: { items: [{ id: 'P-4', provider: 'x', result: 'fine' }] } })).toBe(false);
        expect(isAgentStartView({ refusal: { items: [{ id: 'P-1', kind: 'transition', refusal: 'unknown-kind', ids: [], text: '' }] } })).toBe(false);
        expect(isAgentStartView({ refusal: { items: [{ id: 'P-6', state: 'writable' }] } })).toBe(false);
        expect(isAgentStartView({ refusal: { items: 'P-7' } })).toBe(false);
        expect(isAgentStartView({ notice: { runId: 'r' } })).toBe(false);
    });
});
