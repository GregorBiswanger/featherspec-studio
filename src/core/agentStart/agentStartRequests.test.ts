import { describe, expect, it } from 'vitest';
import { createAgentStartHandlers } from './agentStartRequests';

describe('agent start request handlers', () => {
    it('route confirm, cancel and dismiss to the flow', async () => {
        const calls: string[] = [];
        const handlers = createAgentStartHandlers({
            confirm: (token) => void calls.push(`confirm:${token}`),
            cancel: (token) => void calls.push(`cancel:${token}`),
            dismiss: (which) => void calls.push(`dismiss:${which}`),
        });
        await handlers.agentStartConfirm({ token: 'c-1' });
        await handlers.agentStartCancel({ token: 'c-2' });
        await handlers.agentStartDismiss({ which: 'refusal' });
        expect(calls).toEqual(['confirm:c-1', 'cancel:c-2', 'dismiss:refusal']);
    });
});
