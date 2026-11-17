import type { AgentStartRequestType } from '../../shared/protocol/messages';
import type { RequestHandlers } from '../shell/messageRouter';
import type { StartFlow } from './startFlow';

export function createAgentStartHandlers(flow: Pick<StartFlow, 'confirm' | 'cancel' | 'dismiss'>): Pick<RequestHandlers, AgentStartRequestType> {
    return {
        agentStartConfirm: async (payload) => flow.confirm(payload.token),
        agentStartCancel: async (payload) => flow.cancel(payload.token),
        agentStartDismiss: async (payload) => flow.dismiss(payload.which),
    };
}
