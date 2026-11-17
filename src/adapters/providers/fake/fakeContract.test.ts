import type { AgentProviderPort } from '../../../core/ports/agentProvider';
import { runProviderContract, type ContractCase } from '../../../core/providers/testing/contract';
import { createFakeProvider, type FakeProfile } from './fakeProvider';
import type { FakeScenarioId } from './scenarios';

const SCENARIOS: Partial<Record<ContractCase, FakeScenarioId>> = {
    happy: 'happy-path',
    approval: 'approval',
    input: 'input',
    'unknown-event': 'unknown-event',
    'no-end': 'no-end',
    'long-run': 'long-run',
    'failure-unknown': 'failure:unknown',
    'credential-in-text': 'failure:auth',
};

for (const profile of ['full', 'minimal'] as FakeProfile[]) {
    runProviderContract(`fake provider, profile ${profile}`, {
        create(clock) {
            let scenario: FakeScenarioId = 'happy-path';
            let failing = false;
            const fake = createFakeProvider({ clock, profile, scenario: () => scenario });
            const adapter: AgentProviderPort = {
                ...fake,
                cancel: (runId) => (failing ? Promise.resolve({ ok: false, reason: 'cancel failed' }) : fake.cancel(runId)),
                listModels: () => (failing ? Promise.reject(new Error('models failed')) : fake.listModels()),
                respondToApproval: (runId, requestId, answer) =>
                    failing ? Promise.reject(new Error('answer failed')) : fake.respondToApproval(runId, requestId, answer),
                respondToInput: (runId, requestId, text) =>
                    failing ? Promise.resolve({ ok: false, reason: 'answer failed' }) : fake.respondToInput(runId, requestId, text),
            };
            return {
                adapter,
                arrange(contractCase) {
                    if (contractCase === 'failing-operation') {
                        failing = true;
                        return;
                    }
                    scenario = SCENARIOS[contractCase] ?? 'happy-path';
                },
            };
        },
    });
}
