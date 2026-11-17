import type { AgentProviderPort, AvailabilityReport, DeliveredEvent, OperationOutcome, ProviderEventSink, ProviderResumeRequest, ProviderStartRequest } from '../../../core/ports/agentProvider';
import type { Disposable } from '../../../core/ports/host';
import type { RuntimeClock } from '../../../core/ports/runtimeMedium';
import { isEndKind, type CapabilityDeclaration, type ErrorCategory } from '../../../core/providers/vocabulary';
import type { CopilotClient, CopilotClientFactory, CopilotElicitationRequest, CopilotEvent, CopilotPermissionAnswer, CopilotSession, CopilotSessionConfig } from './client';
import { CLI_PATH_SETTING, INSTALL_URL, MIN_CLI_VERSION, type CliLocation } from './cliLocator';
import { createEventMapper, isSingleTextField, locateInProject, SIGN_IN_HINT, type EventMapper } from './mapping';

export const COPILOT_PROVIDER_ID = 'copilot';
export const COPILOT_DISPLAY_NAME = 'GitHub Copilot';
export const COPILOT_PERMISSION_LABEL = 'Asks before every tool action (Copilot manual mode)';
export const COPILOT_DISCLOSURE =
    'Runs with GitHub Copilot send the prompt, every file the agent reads, command output and your answers to GitHub, and each prompt counts against your Copilot plan.';
export const COPILOT_CAPABILITIES: CapabilityDeclaration = {
    start: { value: 'native' },
    cancel: { value: 'native' },
    resume: { value: 'native' },
    streamText: { value: 'native' },
    toolEvents: { value: 'native' },
    fileChanges: { value: 'native', experimental: true },
    approvals: { value: 'native' },
    userInput: { value: 'native' },
    planUpdates: { value: 'native' },
    usage: { value: 'native' },
    modelList: { value: 'native' },
    mcp: { value: 'none' },
    customTools: { value: 'none' },
    typedErrors: { value: 'derived' },
};

export interface CopilotProviderOptions {
    clock: RuntimeClock;
    clientFactory: CopilotClientFactory;
    locate(): Promise<CliLocation>;
    settings: { model(): string };
    baseDirectory?: string;
    workspaceFolders(): readonly string[];
    platform: string;
    isTrusted(): boolean;
}

export interface CopilotProvider extends AgentProviderPort {
    dispose(): void;
}

export const STARTED_WAIT_MS = 2_000;

interface RunState {
    runId: string;
    sink: ProviderEventSink;
    client?: CopilotClient;
    session?: CopilotSession;
    mapper?: EventMapper;
    queue: Promise<void>;
    ended: boolean;
    dropped: boolean;
    startedDelivered: boolean;
    startedWaiters: (() => void)[];
    cancelRequested: boolean;
    forceTimer?: Disposable;
    pendingPermissions: ((answer: CopilotPermissionAnswer) => void)[];
    pendingInputs: ((text: string) => void)[];
    pendingElicitations: ((text: string) => void)[];
    open: Map<string, { type: 'approval' | 'input'; settle(value: unknown): void }>;
    answered: Set<string>;
}

export const FORCE_STOP_AFTER_MS = 10_000;

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const PROTOCOL_MISMATCH = /protocol version/i;

const protocolHint = (location: Extract<CliLocation, { kind: 'found' }>, message: string): string =>
    `The installed Copilot CLI ${location.version} and Studio's Copilot SDK do not share a protocol. ${message}`;

export function createCopilotProvider(options: CopilotProviderOptions): CopilotProvider {
    const runs = new Map<string, RunState>();

    const baseDirectoryOption = (): { baseDirectory?: string } => {
        const base = options.baseDirectory;
        return base !== undefined && options.workspaceFolders().every((folder) => locateInProject(base, folder, options.platform).outsideProject) ? { baseDirectory: base } : {};
    };

    const idleDirectory = (): string => options.workspaceFolders()[0] ?? options.baseDirectory ?? process.cwd();

    const enqueue = (run: RunState, job: () => Promise<void> | void): Promise<void> => {
        run.queue = run.queue.then(job).catch(() => undefined);
        return run.queue;
    };

    const finalize = (run: RunState): void => {
        void (async () => {
            await run.session?.disconnect().catch(() => undefined);
            await run.client?.stop().catch(() => undefined);
        })();
    };

    const deliver = (run: RunState, event: DeliveredEvent): void => {
        if (run.dropped || run.ended) {
            return;
        }
        if (event.kind === 'session.started') {
            run.startedDelivered = true;
        }
        if (isEndKind(event.kind)) {
            run.ended = true;
        }
        run.sink.emit(event);
        if (event.kind === 'session.started') {
            const waiters = run.startedWaiters.splice(0);
            for (const wake of waiters) {
                wake();
            }
        }
        if (run.ended) {
            run.forceTimer?.dispose();
            run.open.clear();
            finalize(run);
            run.sink.close();
        }
    };

    const pair = (run: RunState, event: CopilotEvent): void => {
        const requestId = typeof event.data.requestId === 'string' ? event.data.requestId : undefined;
        if (requestId === undefined || run.ended) {
            return;
        }
        if (event.type === 'permission.requested') {
            const settle = run.pendingPermissions.shift();
            if (settle !== undefined) {
                run.open.set(requestId, { type: 'approval', settle: settle as (value: unknown) => void });
            }
        } else if (event.type === 'user_input.requested') {
            const settle = run.pendingInputs.shift();
            if (settle !== undefined) {
                run.open.set(requestId, { type: 'input', settle: settle as (value: unknown) => void });
            }
        } else if (event.type === 'elicitation.requested' && isSingleTextField({ message: '', mode: typeof event.data.mode === 'string' ? event.data.mode : undefined, requestedSchema: event.data.requestedSchema } as CopilotElicitationRequest)) {
            const settle = run.pendingElicitations.shift();
            if (settle !== undefined) {
                run.open.set(requestId, { type: 'input', settle: settle as (value: unknown) => void });
            }
        }
    };

    const handleEvent = async (run: RunState, event: CopilotEvent): Promise<void> => {
        if (run.mapper === undefined) {
            return;
        }
        pair(run, event);
        for (const delivered of await run.mapper.map(event)) {
            deliver(run, delivered);
        }
    };

    const sessionConfig = (run: RunState, workingDirectory: string, model: string | undefined): CopilotSessionConfig => ({
        workingDirectory,
        ...(model === undefined ? {} : { model }),
        trustWorkingDirectory: options.isTrusted(),
        onEvent: (event) => void enqueue(run, () => handleEvent(run, event)),
        onPermission: () => new Promise<CopilotPermissionAnswer>((resolve) => void run.pendingPermissions.push(resolve)),
        onUserInput: () => new Promise((resolve) => void run.pendingInputs.push((answer) => resolve({ answer, wasFreeform: true }))),
        onElicitation: (request) => {
            if (!isSingleTextField(request)) {
                return Promise.resolve({ action: 'decline' });
            }
            const field = Object.keys(request.requestedSchema?.properties ?? {})[0] ?? 'value';
            return new Promise((resolve) => void run.pendingElicitations.push((answer) => resolve({ action: 'accept', content: { [field]: answer } })));
        },
    });

    const waitForStarted = async (run: RunState): Promise<void> => {
        await run.queue;
        return new Promise<void>((resolve) => {
            if (run.startedDelivered) {
                resolve();
                return;
            }
            const timer = options.clock.setTimeout(resolve, STARTED_WAIT_MS);
            run.startedWaiters.push(() => {
                timer.dispose();
                resolve();
            });
        });
    };

    const failRun = (run: RunState, category: ErrorCategory, providerMessage: string | undefined, hint: string | undefined, source: 'provider' | 'derived' = 'provider'): Promise<void> =>
        enqueue(run, () =>
            deliver(run, {
                kind: 'run.failed',
                source,
                payload: { category, ...(providerMessage === undefined ? {} : { providerMessage }), ...(hint === undefined ? {} : { hint }) },
            }),
        );

    const watchExit = (run: RunState, client: CopilotClient): void => {
        client.onExit((exit) => {
            if (run.ended || run.dropped || run.cancelRequested) {
                return;
            }
            const code = exit.code === undefined ? '' : ` (exit code ${exit.code})`;
            void failRun(run, 'unknown', `Copilot runtime stopped unexpectedly${code}`, undefined, 'derived');
        });
    };

    const modelHint = (model: string, offered: readonly string[]): string =>
        `The model "${model}" is not available. Offered models: ${offered.join(', ')}. Change the setting featherspec-studio.copilot.model.`;

    const launch = async (
        runId: string,
        sink: ProviderEventSink,
        workingDirectory: string,
        text: string,
        how: { model?: string } | { sessionRef: string },
    ): Promise<void> => {
        const run: RunState = { runId, sink, queue: Promise.resolve(), ended: false, dropped: false, startedDelivered: false, startedWaiters: [], cancelRequested: false, pendingPermissions: [], pendingInputs: [], pendingElicitations: [], open: new Map(), answered: new Set() };
        runs.set(runId, run);
        let location: CliLocation;
        try {
            location = await options.locate();
        } catch (error) {
            location = { kind: 'unknown', reason: messageOf(error) };
        }
        if (run.ended) {
            return;
        }
        if (location.kind !== 'found') {
            await failRun(run, 'runtime_missing', undefined, location.kind === 'not-installed' ? location.hint : location.reason);
            return;
        }
        const client = options.clientFactory({ cliPath: location.path, workingDirectory, ...baseDirectoryOption() });
        run.client = client;
        watchExit(run, client);
        try {
            await client.start();
        } catch (error) {
            const message = messageOf(error);
            if (PROTOCOL_MISMATCH.test(message)) {
                await failRun(run, 'unknown', message, protocolHint(location, message));
            } else {
                await failRun(
                    run,
                    'runtime_missing',
                    message,
                    `GitHub Copilot CLI ${location.version} at ${location.path} could not be started (required: ${MIN_CLI_VERSION} or newer). Install it (${INSTALL_URL}) or set ${CLI_PATH_SETTING}.`,
                );
            }
            return;
        }
        if (run.ended) {
            finalize(run);
            return;
        }
        try {
            const auth = await client.getAuthStatus();
            if (run.ended) {
                return;
            }
            if (!auth.isAuthenticated) {
                await failRun(run, 'auth', undefined, SIGN_IN_HINT);
                return;
            }
            if ('model' in how && how.model !== undefined) {
                const offered = await client.listModels();
                if (run.ended) {
                    return;
                }
                if (!offered.includes(how.model)) {
                    await failRun(run, 'model_unavailable', `Copilot does not offer the model "${how.model}".`, modelHint(how.model, offered));
                    return;
                }
            }
        } catch (error) {
            await failRun(run, 'unknown', messageOf(error), undefined);
            return;
        }
        if (run.ended) {
            finalize(run);
            return;
        }
        try {
            if ('sessionRef' in how) {
                run.mapper = createEventMapper({ workingDirectory, platform: options.platform, sessionId: how.sessionRef, readTodos: () => run.session?.readTodos() ?? Promise.resolve([]), isAnswered: (requestId) => run.answered.has(requestId) });
                run.session = await client.resumeSession(how.sessionRef, sessionConfig(run, workingDirectory, undefined));
                await waitForStarted(run);
                const mapper = run.mapper;
                await enqueue(run, () => void mapper.started(how.sessionRef).forEach((event) => deliver(run, event)));
            } else {
                run.mapper = createEventMapper({ workingDirectory, platform: options.platform, readTodos: () => run.session?.readTodos() ?? Promise.resolve([]), isAnswered: (requestId) => run.answered.has(requestId) });
                run.session = await client.createSession(sessionConfig(run, workingDirectory, how.model));
                const mapper = run.mapper;
                const sessionId = run.session.sessionId;
                await enqueue(run, () => void mapper.started(sessionId).forEach((event) => deliver(run, event)));
            }
        } catch (error) {
            await failRun(run, 'unknown', messageOf(error), undefined);
            return;
        }
        if (run.ended) {
            finalize(run);
            return;
        }
        run.mapper.promptSent();
        try {
            await run.session.send(text);
        } catch (error) {
            await failRun(run, 'unknown', messageOf(error), undefined);
        }
    };

    const startupFailure = (location: Extract<CliLocation, { kind: 'found' }>, error: unknown): AvailabilityReport => {
        const message = messageOf(error);
        if (PROTOCOL_MISMATCH.test(message)) {
            return { result: 'unknown', hint: protocolHint(location, message) };
        }
        if (/ENOENT|EACCES|EPERM|spawn/i.test(message)) {
            return { result: 'not-installed', hint: `The GitHub Copilot CLI at ${location.path} could not be started: ${message}. Install it (${INSTALL_URL}) or set ${CLI_PATH_SETTING}.` };
        }
        return { result: 'unknown', hint: message };
    };

    const checkAvailability = async (): Promise<AvailabilityReport> => {
        let location: CliLocation;
        try {
            location = await options.locate();
        } catch (error) {
            return { result: 'unknown', hint: messageOf(error) };
        }
        if (location.kind === 'not-installed') {
            return { result: 'not-installed', hint: location.hint };
        }
        if (location.kind === 'unknown') {
            return { result: 'unknown', hint: location.reason };
        }
        const client = options.clientFactory({ cliPath: location.path, workingDirectory: idleDirectory(), ...baseDirectoryOption() });
        try {
            try {
                await client.start();
            } catch (error) {
                return startupFailure(location, error);
            }
            try {
                const auth = await client.getAuthStatus();
                return auth.isAuthenticated ? { result: 'available' } : { result: 'not-signed-in', hint: SIGN_IN_HINT };
            } catch (error) {
                return { result: 'unknown', hint: messageOf(error) };
            }
        } finally {
            await client.stop().catch(() => undefined);
        }
    };

    const withRuntime = async <T>(use: (client: CopilotClient) => Promise<T>): Promise<T> => {
        const location = await options.locate();
        if (location.kind !== 'found') {
            throw new Error(location.kind === 'not-installed' ? location.hint : location.reason);
        }
        const client = options.clientFactory({ cliPath: location.path, workingDirectory: idleDirectory(), ...baseDirectoryOption() });
        try {
            await client.start();
            return await use(client);
        } finally {
            await client.stop().catch(() => undefined);
        }
    };

    const liveRun = (runId: string): RunState | undefined => {
        const run = runs.get(runId);
        return run === undefined || run.ended || run.dropped ? undefined : run;
    };

    const answer = (runId: string, requestId: string, type: 'approval' | 'input', value: unknown, resolved: DeliveredEvent): OperationOutcome => {
        const run = liveRun(runId);
        const request = run?.open.get(requestId);
        if (run === undefined || request === undefined || request.type !== type || run.answered.has(requestId)) {
            return { ok: false, reason: 'no open request with that ID' };
        }
        run.answered.add(requestId);
        run.open.delete(requestId);
        request.settle(value);
        void enqueue(run, () => deliver(run, resolved));
        return { ok: true };
    };

    const cancel = async (runId: string): Promise<OperationOutcome> => {
        const run = liveRun(runId);
        if (run === undefined) {
            return { ok: false, reason: runs.has(runId) ? 'the run has already ended' : 'no such run' };
        }
        if (run.cancelRequested) {
            return { ok: true };
        }
        run.cancelRequested = true;
        const session = run.session;
        if (session === undefined) {
            await enqueue(run, () => deliver(run, { kind: 'run.cancelled', source: 'derived', payload: {} }));
            return { ok: true };
        }
        run.forceTimer = options.clock.setTimeout(() => {
            if (run.ended || run.dropped) {
                return;
            }
            void run.client?.forceStop().catch(() => undefined);
            void enqueue(run, () => deliver(run, { kind: 'run.cancelled', source: 'derived', payload: { cause: 'forced stop' } }));
        }, FORCE_STOP_AFTER_MS);
        try {
            await session.abort();
        } catch (error) {
            return { ok: false, reason: messageOf(error) };
        }
        return { ok: true };
    };

    const endRun = (run: RunState): void => {
        run.dropped = true;
        run.forceTimer?.dispose();
        run.open.clear();
        void run.client?.forceStop().catch(() => undefined);
    };

    return {
        id: COPILOT_PROVIDER_ID,
        displayName: COPILOT_DISPLAY_NAME,
        capabilities: COPILOT_CAPABILITIES,
        permissionModeLabel: COPILOT_PERMISSION_LABEL,
        disclosure: COPILOT_DISCLOSURE,
        checkAvailability,
        start: (request: ProviderStartRequest, sink: ProviderEventSink) => launch(request.runId, sink, request.workingDirectory, request.prompt, request.model === undefined ? {} : { model: request.model }),
        resume: (request: ProviderResumeRequest, sink: ProviderEventSink) => launch(request.runId, sink, request.workingDirectory, request.continuationText, { sessionRef: request.sessionRef }),
        cancel,
        respondToApproval: (runId, requestId, decision) =>
            Promise.resolve(
                answer(
                    runId,
                    requestId,
                    'approval',
                    decision.decision === 'approve-once' ? { kind: 'approve-once' } : { kind: 'reject', ...(decision.reason === undefined ? {} : { feedback: decision.reason }) },
                    { kind: 'approval.resolved', source: 'derived', payload: { requestId, decision: decision.decision } },
                ),
            ),
        respondToInput: (runId, requestId, text) => Promise.resolve(answer(runId, requestId, 'input', text, { kind: 'input.resolved', source: 'derived', payload: { requestId } })),
        endSession(runId) {
            const run = runs.get(runId);
            if (run !== undefined) {
                endRun(run);
                runs.delete(runId);
            }
        },
        listModels: () => withRuntime((client) => client.listModels()),
        nextStartModel: () => options.settings.model().trim() || undefined,
        credentialValues: () => [],
        dispose() {
            for (const run of runs.values()) {
                if (!run.ended && !run.dropped) {
                    endRun(run);
                }
            }
            runs.clear();
        },
    };
}
