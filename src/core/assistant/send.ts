import { ASSISTANT_NAMES, activatingFailedCause, commandFailedCause, commandNotFoundCause, extensionNotFoundCause, noResultCause, pasteKeyOf, sendOpenedText, sendOutputCopiedText, sendOutputNotCopiedText, sendWarnCopiedText, sendWarnNotCopiedText } from '../../shared/protocol/assistantTexts';
import type { SendPromptPayload, SendResultEventPayload } from '../../shared/protocol/assistant';
import { copyLine } from '../board/copyLine';
import type { AssistantHostPort } from '../ports/assistant';
import type { ClipboardPort } from '../ports/board';
import type { StepUiPort } from '../ports/copyNextStep';
import type { ClockPort, OutputPort } from '../ports/host';
import { ASSISTANTS } from './assistants';

export const SEND_TIMEOUT_MS = 5000;

export interface SendDeps {
    host: AssistantHostPort;
    clipboard: ClipboardPort;
    ui: Pick<StepUiPort, 'warn'>;
    output: OutputPort;
    clock: ClockPort;
    platform: string;
    chosen: { read(): unknown };
}

export interface Send {
    send(request: SendPromptPayload): Promise<SendResultEventPayload>;
}

class SendFailure extends Error {}

function messageOf(reason: unknown): string {
    return reason instanceof Error ? reason.message : String(reason);
}

export function createSend(deps: SendDeps): Send {
    async function copied(line: string): Promise<SendResultEventPayload> {
        const outcome = await copyLine(deps.clipboard, line);
        return { outcome: outcome.ok ? 'copied' : 'copyFailed', text: outcome.text };
    }

    async function fallback(name: string, line: string, cause: string): Promise<SendResultEventPayload> {
        const result = await copied(line);
        if (result.outcome === 'copied') {
            deps.ui.warn(sendWarnCopiedText(name, pasteKeyOf(deps.platform)));
            deps.output.appendBlock([sendOutputCopiedText(name, cause)]);
        } else {
            deps.ui.warn(sendWarnNotCopiedText(name));
            deps.output.appendBlock([sendOutputNotCopiedText(name, cause)]);
        }
        return result;
    }

    async function run(request: SendPromptPayload, isSettled: () => boolean): Promise<void> {
        const spec = ASSISTANTS[request.assistant];
        const calls = spec.callsFor(request.target, request.line);
        let found: ReturnType<AssistantHostPort['extension']>;
        try {
            found = deps.host.extension(spec.extensionId);
        } catch {
            found = undefined;
        }
        if (found === undefined) {
            throw new SendFailure(extensionNotFoundCause(spec.extensionId));
        }
        if (!found.active) {
            try {
                await deps.host.activate(spec.extensionId);
            } catch (reason) {
                throw new SendFailure(activatingFailedCause(spec.extensionId, messageOf(reason)));
            }
            if (isSettled()) {
                return;
            }
        }
        let registered: readonly string[];
        try {
            registered = await deps.host.commands();
        } catch {
            registered = [];
        }
        if (isSettled()) {
            return;
        }
        const missing = calls.find((call) => !registered.includes(call.command));
        if (missing !== undefined) {
            throw new SendFailure(commandNotFoundCause(missing.command));
        }
        for (const call of calls) {
            try {
                await deps.host.execute(call.command, call.args);
            } catch (reason) {
                throw new SendFailure(commandFailedCause(call.command, messageOf(reason)));
            }
            if (isSettled()) {
                return;
            }
        }
    }

    return {
        send(request) {
            if (deps.chosen.read() !== request.assistant) {
                return copied(request.line);
            }
            const name = ASSISTANT_NAMES[request.assistant];
            return new Promise((resolve) => {
                let settled = false;
                const fail = (cause: string): void => {
                    if (settled) {
                        return;
                    }
                    settled = true;
                    timer.dispose();
                    void fallback(name, request.line, cause).then(resolve);
                };
                const timer = deps.clock.setTimeout(() => fail(noResultCause(SEND_TIMEOUT_MS)), SEND_TIMEOUT_MS);
                run(request, () => settled).then(
                    () => {
                        if (settled) {
                            return;
                        }
                        settled = true;
                        timer.dispose();
                        resolve({ outcome: 'opened', text: sendOpenedText(name) });
                    },
                    (reason: unknown) => fail(reason instanceof SendFailure ? reason.message : messageOf(reason)),
                );
            });
        },
    };
}
