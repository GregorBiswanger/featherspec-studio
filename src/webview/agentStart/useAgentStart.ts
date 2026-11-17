import { useContext, useSyncExternalStore } from 'react';
import type { AgentStartView } from '../../shared/protocol/agentStart';
import { ClientContext } from '../shell';

export interface AgentStartApi {
    view: AgentStartView;
    confirm(token: string): void;
    cancel(token: string): void;
    dismiss(which: 'refusal' | 'notice'): void;
    openRun(runId: string): void;
}

const EMPTY: AgentStartView = {};

export function useAgentStart(): AgentStartApi {
    const client = useContext(ClientContext);
    if (client === undefined) {
        throw new Error('useAgentStart needs a ShellProvider');
    }
    const snapshot = useSyncExternalStore(client.subscribe, client.getSnapshot);
    return {
        view: snapshot.agentStart ?? EMPTY,
        confirm: client.confirmStart,
        cancel: client.cancelStart,
        dismiss: client.dismissStart,
        openRun: (runId) => client.navigate({ area: 'agentCenter', target: { kind: 'run', id: runId } }),
    };
}
