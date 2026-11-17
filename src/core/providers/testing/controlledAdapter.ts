import type {
    AgentProviderPort,
    ProviderEventSink,
    ProviderResumeRequest,
    ProviderStartRequest,
} from '../../ports/agentProvider';
import { declaredAdapter } from './adapters';

export interface ControlledAdapter {
    adapter: AgentProviderPort;
    sink(runId: string): ProviderEventSink;
    calls: string[];
    started: ProviderStartRequest[];
    resumed: ProviderResumeRequest[];
}

export function createControlledAdapter(id: string, overrides: Partial<AgentProviderPort> = {}): ControlledAdapter {
    const sinks = new Map<string, ProviderEventSink>();
    const controlled: ControlledAdapter = {
        calls: [],
        started: [],
        resumed: [],
        sink(runId) {
            const sink = sinks.get(runId);
            if (sink === undefined) {
                throw new Error(`no sink for ${runId}`);
            }
            return sink;
        },
        adapter: declaredAdapter(id, {
            start(request, sink) {
                controlled.calls.push(`start:${request.runId}`);
                controlled.started.push(request);
                sinks.set(request.runId, sink);
                return Promise.resolve();
            },
            resume(request, sink) {
                controlled.calls.push(`resume:${request.runId}`);
                controlled.resumed.push(request);
                sinks.set(request.runId, sink);
                return Promise.resolve();
            },
            cancel(runId) {
                controlled.calls.push(`cancel:${runId}`);
                return Promise.resolve({ ok: true });
            },
            endSession(runId) {
                controlled.calls.push(`endSession:${runId}`);
            },
            ...overrides,
        }),
    };
    return controlled;
}
