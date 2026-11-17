import type { AgentProviderPort, DeliveredEvent, OperationOutcome, ProviderEventSink, ProviderResumeRequest, ProviderStartRequest } from '../../../core/ports/agentProvider';
import type { RuntimeClock } from '../../../core/ports/runtimeMedium';
import { isEndKind, type CapabilityDeclaration } from '../../../core/providers/vocabulary';
import type { CopilotClient, CopilotClientFactory, CopilotEvent, CopilotSession, CopilotSessionConfig } from './client';
import type { CliLocation } from './cliLocator';
import { createEventMapper, locateInProject, type EventMapper } from './mapping';

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
}

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

    const openRuntime = async (run: RunState, workingDirectory: string): Promise<CopilotClient> => {
        const location = await options.locate();
        if (location.kind !== 'found') {
            throw new Error('Not implemented');
        }
        const client = options.clientFactory({ cliPath: location.path, workingDirectory, ...baseDirectoryOption() });
        run.client = client;
        await client.start();
        return client;
    };

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

    const launch = async (
        runId: string,
        sink: ProviderEventSink,
        workingDirectory: string,
        text: string,
        how: { model?: string } | { sessionRef: string },
    ): Promise<void> => {
        const run: RunState = { runId, sink, queue: Promise.resolve(), ended: false, dropped: false, startedDelivered: false, startedWaiters: [] };
        runs.set(runId, run);
        const client = await openRuntime(run, workingDirectory);
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
        run.mapper.promptSent();
        await run.session.send(text);
    };

    const withRuntime = async <T>(use: (client: CopilotClient) => Promise<T>): Promise<T> => {
        const location = await options.locate();
        if (location.kind !== 'found') {
            throw new Error('Not implemented');
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
        checkAvailability: notImplemented,
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
