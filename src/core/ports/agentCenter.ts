import type { Disposable } from './host';
import type { Orchestrator } from '../orchestrator/orchestrator';
import type { RuntimeStore } from '../runtime/runtimeStore';

export type AgentCenterOrchestrator = Pick<Orchestrator, 'stop' | 'resumability' | 'resume' | 'respondToApproval' | 'respondToInput'>;

export interface AgentCenterUiPort {
    notify(text: string, action: string): Promise<boolean>;
    confirm(text: string, button: string): Promise<boolean>;
}

export interface StoreEvent {
    runId: string;
    seq: number;
    type: string;
}

export interface EventSignal {
    onDidStoreEvent(listener: (event: StoreEvent) => void): Disposable;
}

export type AgentCenterStore = Pick<RuntimeStore, 'state' | 'listRuns' | 'getRun' | 'readEvents' | 'onDidChangeRuns'> & Partial<EventSignal>;
