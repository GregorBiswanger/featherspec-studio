import { ASSISTANT_NAMES, activatingFailedCause, attachMissingOutputText, commandFailedCause, commandNotFoundCause, extensionNotFoundCause, noResultCause, pasteKeyOf, sendOpenedText, sendOpenedWithoutText, sendOutputCopiedText, sendOutputNotCopiedText, sendWarnCopiedText, sendWarnNotCopiedText } from '../../shared/protocol/assistantTexts';
import type { SendOutcomeView, SendRequest } from '../../shared/protocol/assistant';
import { copyLine } from '../board/copyLine';
import type { AssistantHostPort } from '../ports/assistant';
import type { ClipboardPort } from '../ports/board';
import type { StepUiPort } from '../ports/copyNextStep';
import type { ClockPort, OutputPort } from '../ports/host';
import type { AssistantId } from '../../shared/protocol/assistant';
import { ASSISTANTS } from './assistants';
import type { AttachmentCheck } from './attachment';
import type { HandOverPort } from './handOver';

export const SEND_TIMEOUT_MS = 5000;

export interface SendDeps {
    host: AssistantHostPort;
    clipboard: ClipboardPort;
    ui: Pick<StepUiPort, 'warn'>;
    output: OutputPort;
    clock: ClockPort;
    platform: string;
    chosen: { read(): unknown };
    attachment?: AttachmentCheck;
    attaching?: (id: AssistantId) => boolean;
    handOver?: HandOverPort;
}

export interface Send {
    send(request: SendRequest): Promise<SendOutcomeView>;
}

class SendFailure extends Error {}

function messageOf(reason: unknown): string {
    return reason instanceof Error ? reason.message : String(reason);
}

export function createSend(deps: SendDeps): Send {
    async function copied(line: string): Promise<SendOutcomeView> {
        const outcome = await copyLine(deps.clipboard, line);
        return { outcome: outcome.ok ? 'copied' : 'copyFailed', text: outcome.text };
    }

    async function fallback(name: string, line: string, cause: string): Promise<SendOutcomeView> {
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

    async function run(request: SendRequest, isSettled: () => boolean): Promise<string | undefined> {
        const spec = ASSISTANTS[request.assistant];
        const plain = spec.callsFor(request.target, request.line);
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
                return undefined;
            }
        }
        let registered: readonly string[];
        try {
            registered = await deps.host.commands();
        } catch {
            registered = [];
        }
        if (isSettled()) {
            return undefined;
        }
        const missing = plain.find((call) => !registered.includes(call.command));
        if (missing !== undefined) {
            throw new SendFailure(commandNotFoundCause(missing.command));
        }
        let calls = plain;
        let unattached: string | undefined;
        if (request.attach !== undefined && (deps.attaching?.(request.assistant) ?? spec.attachesSpec)) {
            const target = deps.attachment === undefined ? undefined : await deps.attachment(request.attach);
            if (isSettled()) {
                return undefined;
            }
            if (target === undefined) {
                unattached = request.attach;
            } else {
                calls = spec.callsFor(request.target, request.line, target);
            }
        }
        for (const call of calls) {
            try {
                await deps.host.execute(call.command, call.args);
            } catch (reason) {
                throw new SendFailure(commandFailedCause(call.command, messageOf(reason)));
            }
            if (isSettled()) {
                return undefined;
            }
        }
        return unattached;
    }

    function attempt(request: SendRequest): Promise<SendOutcomeView> {
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
                (unattached) => {
                    if (settled) {
                        return;
                    }
                    settled = true;
                    timer.dispose();
                    if (unattached === undefined) {
                        resolve({ outcome: 'opened', text: sendOpenedText(name) });
                        return;
                    }
                    deps.output.appendBlock([attachMissingOutputText(name, unattached)]);
                    resolve({ outcome: 'opened', text: sendOpenedWithoutText(name, unattached.slice(unattached.lastIndexOf('/') + 1)) });
                },
                (reason: unknown) => fail(reason instanceof SendFailure ? reason.message : messageOf(reason)),
            );
        });
    }

    let tail: Promise<unknown> = Promise.resolve();

    return {
        send(request) {
            const handOver = deps.handOver?.begin(request.line);
            const settle = async (result: SendOutcomeView): Promise<SendOutcomeView> => {
                if (result.outcome !== 'copyFailed') {
                    await handOver?.commit();
                }
                return result;
            };
            if (deps.chosen.read() !== request.assistant) {
                const result = copied(request.line);
                return handOver === undefined ? result : result.then(settle);
            }
            const turn = tail.then(() => attempt(request));
            tail = turn.catch(() => undefined);
            return handOver === undefined ? turn : turn.then(settle);
        },
    };
}
