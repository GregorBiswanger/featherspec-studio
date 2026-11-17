import type { AgentProviderPort, AvailabilityReport, DeliveredEvent, OperationOutcome, ProviderEventSink, ProviderResumeRequest, ProviderStartRequest } from '../../../core/ports/agentProvider';
import type { RuntimeClock } from '../../../core/ports/runtimeMedium';
import { isEndKind, type CapabilityDeclaration, type ErrorCategory } from '../../../core/providers/vocabulary';
import type { CopilotClient, CopilotClientFactory, CopilotEvent, CopilotSession, CopilotSessionConfig } from './client';
import { CLI_PATH_SETTING, INSTALL_URL, type CliLocation } from './cliLocator';
import { createEventMapper, locateInProject, SIGN_IN_HINT, type EventMapper } from './mapping';

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
    baseDirectory: string;
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
}

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const neverAnswered = (): Promise<never> => new Promise<never>(() => undefined);

export function createCopilotProvider(options: CopilotProviderOptions): CopilotProvider {
    const runs = new Map<string, RunState>();

    const baseDirectoryOption = (): { baseDirectory?: string } =>
        options.workspaceFolders().every((folder) => locateInProject(options.baseDirectory, folder, options.platform).outsideProject) ? { baseDirectory: options.baseDirectory } : {};

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
            finalize(run);
            run.sink.close();
        }
    };

    const handleEvent = async (run: RunState, event: CopilotEvent): Promise<void> => {
        if (run.mapper === undefined) {
            return;
        }
        for (const delivered of await run.mapper.map(event)) {
            deliver(run, delivered);
        }
    };

    const sessionConfig = (run: RunState, workingDirectory: string, model: string | undefined): CopilotSessionConfig => ({
        workingDirectory,
        ...(model === undefined ? {} : { model }),
        trustWorkingDirectory: options.isTrusted(),
        onEvent: (event) => void enqueue(run, () => handleEvent(run, event)),
        onPermission: neverAnswered,
        onUserInput: neverAnswered,
        onElicitation: neverAnswered,
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
        const run: RunState = { runId, sink, queue: Promise.resolve(), ended: false, dropped: false, startedDelivered: false, startedWaiters: [], cancelRequested: false };
        runs.set(runId, run);
        let location: CliLocation;
        try {
            location = await options.locate();
        } catch (error) {
            location = { kind: 'unknown', reason: messageOf(error) };
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
            await failRun(run, 'runtime_missing', messageOf(error), undefined);
            return;
        }
        try {
            const auth = await client.getAuthStatus();
            if (!auth.isAuthenticated) {
                await failRun(run, 'auth', undefined, SIGN_IN_HINT);
                return;
            }
            if ('model' in how && how.model !== undefined) {
                const offered = await client.listModels();
                if (!offered.includes(how.model)) {
                    await failRun(run, 'model_unavailable', `Copilot does not offer the model "${how.model}".`, modelHint(how.model, offered));
                    return;
                }
            }
        } catch (error) {
            await failRun(run, 'unknown', messageOf(error), undefined);
            return;
        }
        try {
            if ('sessionRef' in how) {
                run.mapper = createEventMapper({ workingDirectory, platform: options.platform, sessionId: how.sessionRef, readTodos: () => run.session?.readTodos() ?? Promise.resolve([]), isAnswered: () => false });
                run.session = await client.resumeSession(how.sessionRef, sessionConfig(run, workingDirectory, undefined));
                await waitForStarted(run);
                const mapper = run.mapper;
                await enqueue(run, () => void mapper.started(how.sessionRef).forEach((event) => deliver(run, event)));
            } else {
                run.mapper = createEventMapper({ workingDirectory, platform: options.platform, readTodos: () => run.session?.readTodos() ?? Promise.resolve([]), isAnswered: () => false });
                run.session = await client.createSession(sessionConfig(run, workingDirectory, how.model));
                const mapper = run.mapper;
                const sessionId = run.session.sessionId;
                await enqueue(run, () => void mapper.started(sessionId).forEach((event) => deliver(run, event)));
            }
        } catch (error) {
            await failRun(run, 'unknown', messageOf(error), undefined);
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
        if (/protocol version/i.test(message)) {
            return { result: 'unknown', hint: `The installed Copilot CLI ${location.version} and Studio's Copilot SDK do not share a protocol. ${message}` };
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
        const client = options.clientFactory({ cliPath: location.path, workingDirectory: options.workspaceFolders()[0] ?? options.baseDirectory, ...baseDirectoryOption() });
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
        const client = options.clientFactory({ cliPath: location.path, workingDirectory: options.workspaceFolders()[0] ?? options.baseDirectory, ...baseDirectoryOption() });
        try {
            await client.start();
            return await use(client);
        } finally {
            await client.stop().catch(() => undefined);
        }
    };

    const notImplemented = (): never => {
        throw new Error('Not implemented');
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
        cancel: notImplemented as () => Promise<OperationOutcome>,
        respondToApproval: notImplemented as () => Promise<OperationOutcome>,
        respondToInput: notImplemented as () => Promise<OperationOutcome>,
        endSession: notImplemented,
        listModels: () => withRuntime((client) => client.listModels()),
        nextStartModel: () => options.settings.model().trim() || undefined,
        credentialValues: () => [],
        dispose() {
            for (const run of runs.values()) {
                if (!run.ended) {
                    run.dropped = true;
                    void run.client?.forceStop().catch(() => undefined);
                }
            }
            runs.clear();
        },
    };
}
