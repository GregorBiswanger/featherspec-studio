import type { AgentStartRequest, AgentStartUiPort, PreviousRunSummary, StartAnswer, StartOrchestratorPort } from '../../ports/agentStart';

export interface FakeStartOrchestrator extends StartOrchestratorPort {
    starts: AgentStartRequest[];
    previousRuns: string[];
    answer: StartAnswer | (() => Promise<StartAnswer>);
    previous: PreviousRunSummary;
}

export function createFakeStartOrchestrator(): FakeStartOrchestrator {
    const fake: FakeStartOrchestrator = {
        starts: [],
        previousRuns: [],
        answer: { kind: 'started', runId: 'run-1' },
        previous: { kind: 'none' },
        async start(request) {
            fake.starts.push(request);
            return typeof fake.answer === 'function' ? fake.answer() : fake.answer;
        },
        async previousRun(stem) {
            fake.previousRuns.push(stem);
            return fake.previous;
        },
    };
    return fake;
}

export interface FakeStartUi extends AgentStartUiPort {
    reveals: number;
}

export function createFakeStartUi(): FakeStartUi {
    const ui: FakeStartUi = {
        reveals: 0,
        reveal() {
            ui.reveals += 1;
        },
    };
    return ui;
}
