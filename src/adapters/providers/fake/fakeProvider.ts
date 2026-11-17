import type {
    AgentProviderPort,
    AvailabilityReport,
    OperationOutcome,
    ProviderEventSink,
    ProviderResumeRequest,
    ProviderStartRequest,
} from '../../../core/ports/agentProvider';
import type { RuntimeClock } from '../../../core/ports/runtimeMedium';
import { CAPABILITIES, type CapabilityDeclaration } from '../../../core/providers/vocabulary';
import {
    FAKE_DISPLAY_NAME,
    FAKE_MODEL,
    FAKE_PROVIDER_ID,
    FAKE_SAMPLE_CREDENTIAL,
    buildScenario,
    isFakeSessionRef,
    resolveScenario,
    type FakeScenarioId,
} from './scenarios';
import { runScript, type ScriptRun, type ScriptStep } from './script';

export type FakeProfile = 'full' | 'minimal';

export const FULL_LABEL = 'Asks before every tool action (fake approvals)';
export const MINIMAL_LABEL = 'Never asks (no approval support)';

export interface FakeCall {
    operation: string;
    runId?: string;
    detail?: string;
}

export interface FakeProviderOptions {
    clock: RuntimeClock;
    profile?: FakeProfile;
    scenario?: FakeScenarioId | (() => unknown);
    script?: readonly ScriptStep[];
    capabilities?: CapabilityDeclaration;
    availability?: AvailabilityReport | 'no-answer';
}

export interface FakeProvider extends AgentProviderPort {
    calls(): readonly FakeCall[];
}

export function profileCapabilities(profile: FakeProfile): CapabilityDeclaration {
    const declaration = {} as CapabilityDeclaration;
    const native = new Set(profile === 'full' ? CAPABILITIES.filter((c) => c !== 'mcp' && c !== 'customTools') : ['start', 'cancel', 'toolEvents']);
    for (const capability of CAPABILITIES) {
        declaration[capability] = { value: native.has(capability) ? 'native' : 'none' };
    }
    return declaration;
}

export function createFakeProvider(options: FakeProviderOptions): FakeProvider {
    const profile = options.profile ?? 'full';
    const capabilities = options.capabilities ?? profileCapabilities(profile);
    const calls: FakeCall[] = [];
    const runs = new Map<string, ScriptRun>();

    const scenarioNow = (): FakeScenarioId => {
        const raw = typeof options.scenario === 'function' ? options.scenario() : options.scenario;
        return resolveScenario(raw);
    };

    const launch = (runId: string, sink: ProviderEventSink, sessionRef?: string): void => {
        const steps = options.script ?? buildScenario(scenarioNow(), { runId, capabilities, ...(sessionRef === undefined ? {} : { sessionRef }) });
        runs.set(runId, runScript(steps, options.clock, sink));
    };

    const refused = (reason: string): OperationOutcome => ({ ok: false, reason });

    return {
        id: FAKE_PROVIDER_ID,
        displayName: FAKE_DISPLAY_NAME,
        capabilities,
        permissionModeLabel: profile === 'full' ? FULL_LABEL : MINIMAL_LABEL,
        calls: () => calls,
        checkAvailability() {
            calls.push({ operation: 'checkAvailability' });
            if (options.availability === 'no-answer') {
                return new Promise<AvailabilityReport>(() => undefined);
            }
            return Promise.resolve(options.availability ?? { result: 'available' });
        },
        start(request: ProviderStartRequest, sink) {
            calls.push({ operation: 'start', runId: request.runId });
            launch(request.runId, sink);
            return Promise.resolve();
        },
        resume(request: ProviderResumeRequest, sink) {
            calls.push({ operation: 'resume', runId: request.runId });
            if (isFakeSessionRef(request.sessionRef)) {
                runs.set(
                    request.runId,
                    runScript(buildScenario('happy-path', { runId: request.runId, capabilities, sessionRef: request.sessionRef }), options.clock, sink),
                );
            } else {
                runs.set(
                    request.runId,
                    runScript(
                        [
                            { type: 'emit', event: { kind: 'run.failed', payload: { category: 'unknown', providerMessage: 'Unknown session reference.' } } },
                            { type: 'close' },
                        ],
                        options.clock,
                        sink,
                    ),
                );
            }
            return Promise.resolve();
        },
        cancel(runId) {
            calls.push({ operation: 'cancel', runId });
            const outcome = runs.get(runId)?.cancel();
            return Promise.resolve(outcome === 'cancelled' || outcome === 'ignored' ? { ok: true } : refused('run is not active'));
        },
        respondToApproval(runId, requestId, answer) {
            calls.push({ operation: 'respondToApproval', runId });
            return Promise.resolve(runs.get(runId)?.answer('approval', requestId, answer.decision) === true ? { ok: true } : refused('no open approval request'));
        },
        respondToInput(runId, requestId) {
            calls.push({ operation: 'respondToInput', runId });
            return Promise.resolve(runs.get(runId)?.answer('input', requestId, 'answer') === true ? { ok: true } : refused('no open input request'));
        },
        endSession(runId) {
            calls.push({ operation: 'endSession', runId });
            runs.get(runId)?.dispose();
            runs.delete(runId);
        },
        listModels() {
            calls.push({ operation: 'listModels' });
            return Promise.resolve([FAKE_MODEL]);
        },
        nextStartModel: () => FAKE_MODEL,
        credentialValues: () => [FAKE_SAMPLE_CREDENTIAL],
    };
}
