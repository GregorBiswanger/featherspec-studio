import type { AgentProviderPort } from '../../../core/ports/agentProvider';
import { runProviderContract, type ContractCase } from '../../../core/providers/testing/contract';
import type { CopilotEvent } from './client';
import { createCopilotProvider } from './copilotProvider';
import { recordedRows, syntheticRows, toSteps, type ScriptStep } from './testing/recorded';
import { createScriptedClient } from './testing/scriptedClient';
import { flush } from './testing/world';

const PROJECT = { root: '/project', outside: '/elsewhere' };
const textOnly = (): ScriptStep[] => toSteps(recordedRows('M-03'), PROJECT);
const event = (type: string, data: Record<string, unknown>, afterMs = 0, id = `c-${type}`): ScriptStep => ({ kind: 'event', event: { type, id, data } as CopilotEvent, afterMs });
const finish: ScriptStep[] = [event('assistant.turn_end', {}, 100), event('session.idle', {}, 100)];

const CASES: Partial<Record<ContractCase, { onSend: ScriptStep[]; afterAnswer?: ScriptStep[]; onAbort?: ScriptStep[] }>> = {
    happy: { onSend: textOnly() },
    approval: {
        onSend: toSteps(syntheticRows('S-approvals'), PROJECT).filter((step) => step.kind === 'permission' || (step.kind === 'event' && step.event.type === 'permission.requested')).slice(0, 2),
        afterAnswer: finish,
    },
    input: {
        onSend: toSteps(syntheticRows('S-input'), PROJECT).slice(0, 2),
        afterAnswer: finish,
    },
    'unknown-event': { onSend: [event('assistant.turn_start', {}), ...toSteps(syntheticRows('S-unknown'), PROJECT), ...finish] },
    'no-end': { onSend: [event('assistant.turn_start', {}), { kind: 'exit', exit: { code: 9, message: 'CLI server exited unexpectedly with code 9' }, afterMs: 10 }] },
    'long-run': { onSend: [event('assistant.turn_start', {})], onAbort: [event('abort', { reason: 'user_initiated' }, 34), event('session.idle', { aborted: true }, 1)] },
    'failure-unknown': { onSend: [event('assistant.turn_start', {}), event('session.error', { errorType: 'mystery', message: 'who knows' }, 10)] },
    'credential-in-text': { onSend: textOnly() },
};

runProviderContract('GitHub Copilot adapter on the scripted client', {
    create(clock) {
        const scripted = createScriptedClient({ clock, models: ['auto', 'claude-sonnet-5'], sessionId: 'contract-session' });
        let failing = false;
        const real = createCopilotProvider({
            clock,
            clientFactory: scripted.factory,
            locate: () => Promise.resolve({ kind: 'found', path: '/usr/bin/copilot', version: '1.0.87' }),
            settings: { model: () => '' },
            baseDirectory: '/storage/copilot-home',
            workspaceFolders: () => ['/project'],
            platform: 'linux',
            isTrusted: () => true,
        });
        const adapter: AgentProviderPort = {
            ...real,
            cancel: (runId) => (failing ? Promise.resolve({ ok: false, reason: 'cancel failed' }) : real.cancel(runId)),
            listModels: () => (failing ? Promise.reject(new Error('models failed')) : real.listModels()),
            respondToApproval: (runId, requestId, answer) => (failing ? Promise.reject(new Error('answer failed')) : real.respondToApproval(runId, requestId, answer)),
            respondToInput: (runId, requestId, text) => (failing ? Promise.resolve({ ok: false, reason: 'answer failed' }) : real.respondToInput(runId, requestId, text)),
        };
        return {
            adapter,
            arrange(contractCase) {
                if (contractCase === 'failing-operation') {
                    failing = true;
                    return;
                }
                const arranged = CASES[contractCase] ?? CASES.happy;
                scripted.configure({ onSend: arranged?.onSend ?? [], afterAnswer: arranged?.afterAnswer ?? [], onAbort: arranged?.onAbort ?? [] });
            },
            async settle() {
                await flush();
                clock.advance(0);
                await flush();
            },
        };
    },
});

import { expect, it } from 'vitest';
import { createFakeRuntimeClock } from '../../../core/runtime/testing/fakes';

it('AC-001 BR-02: the adapter holds no credential, so the suite\'s credential case has nothing to register', () => {
    const clock = createFakeRuntimeClock();
    const adapter = createCopilotProvider({
        clock,
        clientFactory: createScriptedClient({ clock }).factory,
        locate: () => Promise.resolve({ kind: 'not-installed', hint: 'h' }),
        settings: { model: () => '' },
        baseDirectory: '/b',
        workspaceFolders: () => [],
        platform: 'linux',
        isTrusted: () => true,
    });
    expect(adapter.credentialValues()).toEqual([]);
});
