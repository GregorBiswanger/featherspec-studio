import type { AgentCenterRequestType } from '../../shared/protocol/messages';
import type { RequestHandlers } from '../shell/messageRouter';
import type { AgentCenterService } from './agentCenterService';

export type AgentCenterHandlerService = Pick<
    AgentCenterService,
    'select' | 'clearFilter' | 'loadEarlier' | 'follow' | 'answerApproval' | 'answerInput' | 'cancel' | 'resume' | 'openFile'
>;

export function createAgentCenterHandlers(service: AgentCenterHandlerService): Pick<RequestHandlers, AgentCenterRequestType> {
    return {
        acSelect: async (payload) => service.select(payload.runId),
        acClearFilter: async () => service.clearFilter(),
        acLoadEarlier: async (payload) => service.loadEarlier(payload.runId),
        acFollow: async (payload) => service.follow(payload.runId, payload.on),
        acAnswer: async (payload) => {
            const { answer } = payload;
            if (answer.kind === 'input') {
                await service.answerInput(payload.runId, payload.requestId, answer.text);
            } else if (answer.reason === undefined) {
                await service.answerApproval(payload.runId, payload.requestId, answer.decision);
            } else {
                await service.answerApproval(payload.runId, payload.requestId, answer.decision, answer.reason);
            }
        },
        acCancel: async (payload) => service.cancel(payload.runId),
        acResume: async (payload) => service.resume(payload.runId),
        acOpenFile: async (payload) => service.openFile(payload.runId, payload.path),
    };
}
