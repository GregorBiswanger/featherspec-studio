import type { RuntimeClock } from '../../../core/ports/runtimeMedium';
import type { Disposable } from '../../../core/ports/host';
import type {
    CopilotClient,
    CopilotClientFactory,
    CopilotClientOptions,
    CopilotRuntimeExit,
    CopilotSession,
    CopilotSessionConfig,
} from './client';

export interface SdkSessionLike {
    sessionId: string;
    send(prompt: string): Promise<string>;
    abort(): Promise<void>;
    disconnect(): Promise<void>;
    rpc: { plan: { readSqlTodosWithDependencies(): Promise<{ rows: { title: string; status: string }[] }> } };
}

export interface SdkClientLike {
    start(): Promise<void>;
    stop(): Promise<unknown>;
    forceStop(): Promise<void>;
    ping(message?: string): Promise<unknown>;
    getStatus(): Promise<{ version: string; protocolVersion: number }>;
    getAuthStatus(): Promise<{ isAuthenticated: boolean; authType?: string }>;
    listModels(): Promise<{ id: string }[]>;
    createSession(config: Record<string, unknown>): Promise<SdkSessionLike>;
    resumeSession(sessionId: string, config: Record<string, unknown>): Promise<SdkSessionLike>;
}

export interface SdkModule {
    CopilotClient: new (options: Record<string, unknown>) => SdkClientLike;
    RuntimeConnection: { forStdio(options: { path: string }): unknown };
}

export interface SdkClientDependencies {
    loadSdk(): Promise<SdkModule>;
    environment: Readonly<Record<string, string | undefined>>;
    clock: RuntimeClock;
}

export const PING_INTERVAL_MS = 5_000;

const TOKEN_VARIABLES = ['COPILOT_GITHUB_TOKEN', 'GH_TOKEN', 'GITHUB_TOKEN'];

export async function loadCopilotSdk(): Promise<SdkModule> {
    return (await import('@github/copilot-sdk')) as unknown as SdkModule;
}

function runtimeEnvironment(environment: SdkClientDependencies['environment']): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [name, value] of Object.entries(environment)) {
        if (value !== undefined && !TOKEN_VARIABLES.includes(name.toUpperCase())) {
            result[name] = value;
        }
    }
    result.COPILOT_TELEMETRY_DISABLED = 'true';
    return result;
}

function exitFrom(error: unknown): CopilotRuntimeExit {
    const message = error instanceof Error ? error.message : String(error);
    const code = /exited[^\n]*? with code (-?\d+)/.exec(message)?.[1];
    return code === undefined ? { message } : { code: Number(code), message };
}

function sdkSessionConfig(config: CopilotSessionConfig, create: boolean): Record<string, unknown> {
    const result: Record<string, unknown> = {
        workingDirectory: config.workingDirectory,
        permissionMode: 'manual',
        streaming: true,
        enableSessionTelemetry: false,
        onEvent: (event: Parameters<CopilotSessionConfig['onEvent']>[0]) => config.onEvent(event),
        onPermissionRequest: (request: Parameters<CopilotSessionConfig['onPermission']>[0]) => config.onPermission(request),
        onUserInputRequest: (request: Parameters<CopilotSessionConfig['onUserInput']>[0]) => config.onUserInput(request),
        onElicitationRequest: (context: Parameters<CopilotSessionConfig['onElicitation']>[0]) => config.onElicitation(context),
    };
    if (create) {
        if (config.model !== undefined) {
            result.model = config.model;
        }
        if (config.trustWorkingDirectory) {
            result.trustWorkingDirectory = 'session';
        }
    }
    return result;
}

export function createSdkClientFactory(dependencies: SdkClientDependencies): CopilotClientFactory {
    return (options: CopilotClientOptions): CopilotClient => {
        let sdkClient: Promise<SdkClientLike> | undefined;
        let stopped = false;
        let openSessions = 0;
        let watcher: Disposable | undefined;
        const listeners = new Set<(exit: CopilotRuntimeExit) => void>();

        const current = (): Promise<SdkClientLike> => {
            if (sdkClient === undefined) {
                return Promise.reject(new Error('The Copilot client was not started.'));
            }
            return sdkClient;
        };

        const stopWatching = (): void => {
            watcher?.dispose();
            watcher = undefined;
        };

        const watch = (): void => {
            stopWatching();
            if (stopped || openSessions === 0) {
                return;
            }
            watcher = dependencies.clock.setTimeout(() => {
                watcher = undefined;
                void current()
                    .then((client) => client.ping())
                    .then(
                        () => watch(),
                        (error: unknown) => {
                            if (stopped || openSessions === 0) {
                                return;
                            }
                            stopped = true;
                            const exit = exitFrom(error);
                            for (const listener of [...listeners]) {
                                listener(exit);
                            }
                        },
                    );
            }, PING_INTERVAL_MS);
        };

        const wrap = (session: SdkSessionLike): CopilotSession => {
            openSessions++;
            watch();
            return {
                sessionId: session.sessionId,
                send: async (prompt) => {
                    await session.send(prompt);
                },
                abort: () => session.abort(),
                disconnect: async () => {
                    try {
                        await session.disconnect();
                    } finally {
                        openSessions = Math.max(0, openSessions - 1);
                        if (openSessions === 0) {
                            stopWatching();
                        }
                    }
                },
                readTodos: async () => (await session.rpc.plan.readSqlTodosWithDependencies()).rows.map((row) => ({ title: row.title, status: row.status })),
            };
        };

        return {
            async start() {
                stopped = false;
                sdkClient = (async () => {
                    const sdk = await dependencies.loadSdk();
                    const clientOptions: Record<string, unknown> = {
                        connection: sdk.RuntimeConnection.forStdio({ path: options.cliPath }),
                        workingDirectory: options.workingDirectory,
                        useLoggedInUser: true,
                        logLevel: 'error',
                        env: runtimeEnvironment(dependencies.environment),
                    };
                    if (options.baseDirectory !== undefined) {
                        clientOptions.baseDirectory = options.baseDirectory;
                    }
                    return new sdk.CopilotClient(clientOptions);
                })();
                await (await sdkClient).start();
            },
            async stop() {
                stopped = true;
                stopWatching();
                await (await current()).stop();
            },
            async forceStop() {
                stopped = true;
                stopWatching();
                await (await current()).forceStop();
            },
            getStatus: async () => {
                const status = await (await current()).getStatus();
                return { version: status.version, protocolVersion: status.protocolVersion };
            },
            getAuthStatus: async () => {
                const status = await (await current()).getAuthStatus();
                return status.authType === undefined ? { isAuthenticated: status.isAuthenticated } : { isAuthenticated: status.isAuthenticated, authType: status.authType };
            },
            listModels: async () => (await (await current()).listModels()).map((model) => model.id),
            createSession: async (config) => wrap(await (await current()).createSession(sdkSessionConfig(config, true))),
            resumeSession: async (sessionId, config) => wrap(await (await current()).resumeSession(sessionId, sdkSessionConfig(config, false))),
            onExit(listener) {
                listeners.add(listener);
                return { dispose: () => void listeners.delete(listener) };
            },
        };
    };
}
