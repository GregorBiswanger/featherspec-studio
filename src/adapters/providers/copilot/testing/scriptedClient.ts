import type { Disposable } from '../../../../core/ports/host';
import type { RuntimeClock } from '../../../../core/ports/runtimeMedium';
import type {
    CopilotClient,
    CopilotClientFactory,
    CopilotClientOptions,
    CopilotElicitationAnswer,
    CopilotPermissionAnswer,
    CopilotRuntimeExit,
    CopilotSession,
    CopilotSessionConfig,
    CopilotTodo,
    CopilotUserInputAnswer,
} from '../client';
import type { ScriptStep } from './recorded';

export type ScriptedCall =
    | { call: 'factory'; options: CopilotClientOptions }
    | { call: 'start' | 'stop' | 'forceStop' | 'getStatus' | 'getAuthStatus' | 'listModels' | 'abort' | 'disconnect' }
    | { call: 'createSession'; workingDirectory: string; model: string | undefined; trustWorkingDirectory: boolean }
    | { call: 'resumeSession'; sessionId: string; workingDirectory: string; model: string | undefined; trustWorkingDirectory: boolean }
    | { call: 'send'; prompt: string }
    | { call: 'answer.permission'; answer: CopilotPermissionAnswer }
    | { call: 'answer.userInput'; answer: CopilotUserInputAnswer }
    | { call: 'answer.elicitation'; answer: CopilotElicitationAnswer };

export interface ScriptedClientOptions {
    clock: RuntimeClock;
    status?: { version: string; protocolVersion: number };
    auth?: { isAuthenticated: boolean; authType?: string };
    models?: readonly string[];
    sessionId?: string;
    startError?: Error;
    authError?: Error;
    sendError?: Error;
    abortError?: Error;
    createError?: Error;
    resumeError?: Error;
    onCreate?: readonly ScriptStep[];
    onResume?: readonly ScriptStep[];
    onSend?: readonly ScriptStep[] | ((prompt: string) => readonly ScriptStep[]);
    onAbort?: readonly ScriptStep[] | 'silent';
    todos?: readonly CopilotTodo[];
}

export interface ScriptedClient {
    factory: CopilotClientFactory;
    log: ScriptedCall[];
    count(call: ScriptedCall['call']): number;
    answers(): ScriptedCall[];
    exit(exit: CopilotRuntimeExit): void;
    setScript(onSend: ScriptedClientOptions['onSend']): void;
}

export function createScriptedClient(options: ScriptedClientOptions): ScriptedClient {
    const log: ScriptedCall[] = [];
    const exitListeners = new Set<(exit: CopilotRuntimeExit) => void>();
    let onSend = options.onSend;
    const sessionId = options.sessionId ?? 'scripted-session-1';

    const play = (steps: readonly ScriptStep[], config: CopilotSessionConfig, immediate = false): void => {
        let elapsed = 0;
        for (const step of steps) {
            elapsed += step.afterMs ?? 0;
            const run = (): void => {
                if (step.kind === 'event') {
                    config.onEvent(step.event);
                } else if (step.kind === 'permission') {
                    void config.onPermission(step.request).then((answer) => void log.push({ call: 'answer.permission', answer }));
                } else if (step.kind === 'userInput') {
                    void config.onUserInput(step.request).then((answer) => void log.push({ call: 'answer.userInput', answer }));
                } else {
                    void config.onElicitation(step.request).then((answer) => void log.push({ call: 'answer.elicitation', answer }));
                }
            };
            if (immediate) {
                run();
            } else {
                options.clock.setTimeout(run, elapsed);
            }
        }
    };

    const makeSession = (id: string, config: CopilotSessionConfig): CopilotSession => ({
        sessionId: id,
        send(prompt) {
            log.push({ call: 'send', prompt });
            if (options.sendError !== undefined) {
                return Promise.reject(options.sendError);
            }
            const steps = typeof onSend === 'function' ? onSend(prompt) : (onSend ?? []);
            play(steps, config);
            return Promise.resolve();
        },
        abort() {
            log.push({ call: 'abort' });
            if (options.abortError !== undefined) {
                return Promise.reject(options.abortError);
            }
            if (options.onAbort !== 'silent') {
                play(options.onAbort ?? [], config);
            }
            return Promise.resolve();
        },
        disconnect() {
            log.push({ call: 'disconnect' });
            return Promise.resolve();
        },
        readTodos: () => Promise.resolve(options.todos ?? []),
    });

    const factory: CopilotClientFactory = (clientOptions) => {
        log.push({ call: 'factory', options: clientOptions });
        const client: CopilotClient = {
            start() {
                log.push({ call: 'start' });
                return options.startError === undefined ? Promise.resolve() : Promise.reject(options.startError);
            },
            stop() {
                log.push({ call: 'stop' });
                return Promise.resolve();
            },
            forceStop() {
                log.push({ call: 'forceStop' });
                return Promise.resolve();
            },
            getStatus() {
                log.push({ call: 'getStatus' });
                return Promise.resolve(options.status ?? { version: '1.0.87', protocolVersion: 3 });
            },
            getAuthStatus() {
                log.push({ call: 'getAuthStatus' });
                if (options.authError !== undefined) {
                    return Promise.reject(options.authError);
                }
                return Promise.resolve(options.auth ?? { isAuthenticated: true, authType: 'gh-cli' });
            },
            listModels() {
                log.push({ call: 'listModels' });
                return Promise.resolve(options.models ?? ['auto', 'claude-sonnet-5']);
            },
            createSession(config) {
                log.push({ call: 'createSession', workingDirectory: config.workingDirectory, model: config.model, trustWorkingDirectory: config.trustWorkingDirectory });
                if (options.createError !== undefined) {
                    return Promise.reject(options.createError);
                }
                play(options.onCreate ?? [], config, true);
                return Promise.resolve(makeSession(sessionId, config));
            },
            resumeSession(id, config) {
                log.push({ call: 'resumeSession', sessionId: id, workingDirectory: config.workingDirectory, model: config.model, trustWorkingDirectory: config.trustWorkingDirectory });
                if (options.resumeError !== undefined) {
                    return Promise.reject(options.resumeError);
                }
                play(options.onResume ?? [], config, true);
                return Promise.resolve(makeSession(id, config));
            },
            onExit(listener): Disposable {
                exitListeners.add(listener);
                return { dispose: () => void exitListeners.delete(listener) };
            },
        };
        return client;
    };

    return {
        factory,
        log,
        count: (call) => log.filter((entry) => entry.call === call).length,
        answers: () => log.filter((entry) => entry.call.startsWith('answer.')),
        exit(exit) {
            for (const listener of [...exitListeners]) {
                listener(exit);
            }
        },
        setScript(next) {
            onSend = next;
        },
    };
}
