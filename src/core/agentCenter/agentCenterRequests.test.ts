import { describe, expect, it } from 'vitest';
import { createAgentCenterHandlers, type AgentCenterHandlerService } from './agentCenterRequests';

function recorder(): { calls: unknown[][]; service: AgentCenterHandlerService } {
    const calls: unknown[][] = [];
    const note =
        (name: string) =>
        (...args: unknown[]) => {
            calls.push([name, ...args]);
            return Promise.resolve();
        };
    return {
        calls,
        service: {
            select: (runId) => void calls.push(['select', runId]),
            clearFilter: () => void calls.push(['clearFilter']),
            loadEarlier: (runId) => void calls.push(['loadEarlier', runId]),
            follow: (runId, on) => void calls.push(['follow', runId, on]),
            answerApproval: note('answerApproval'),
            answerInput: note('answerInput'),
            cancel: note('cancel'),
            resume: note('resume'),
            openFile: note('openFile'),
        },
    };
}

describe('0012 Agent Center request handlers', () => {
    it('route each request to the service with the payload fields', async () => {
        const { calls, service } = recorder();
        const handlers = createAgentCenterHandlers(service);
        await handlers.acSelect({ runId: 'r1' });
        await handlers.acClearFilter({});
        await handlers.acLoadEarlier({ runId: 'r1' });
        await handlers.acFollow({ runId: 'r1', on: false });
        await handlers.acCancel({ runId: 'r1' });
        await handlers.acResume({ runId: 'r1' });
        await handlers.acOpenFile({ runId: 'r1', path: 'src/a.ts' });
        expect(calls).toEqual([
            ['select', 'r1'],
            ['clearFilter'],
            ['loadEarlier', 'r1'],
            ['follow', 'r1', false],
            ['cancel', 'r1'],
            ['resume', 'r1'],
            ['openFile', 'r1', 'src/a.ts'],
        ]);
    });

    it('hands an approval over with the decision and the optional reason, an input answer with its text', async () => {
        const { calls, service } = recorder();
        const handlers = createAgentCenterHandlers(service);
        await handlers.acAnswer({ runId: 'r1', requestId: 'q1', answer: { kind: 'approval', decision: 'reject', reason: 'too broad' } });
        await handlers.acAnswer({ runId: 'r1', requestId: 'q2', answer: { kind: 'approval', decision: 'approve-once' } });
        await handlers.acAnswer({ runId: 'r1', requestId: 'q3', answer: { kind: 'input', text: 'yes' } });
        expect(calls).toEqual([
            ['answerApproval', 'r1', 'q1', 'reject', 'too broad'],
            ['answerApproval', 'r1', 'q2', 'approve-once'],
            ['answerInput', 'r1', 'q3', 'yes'],
        ]);
    });
});
