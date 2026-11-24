import { attachesInTarget } from '../../shared/protocol/assistant';
import { ASSISTANT_NAMES, activatingFailedCause, attachMissingOutputText, commandFailedCause, commandNotFoundCause, extensionNotFoundCause, noResultCause, pasteKeyOf, sendOpenedText, sendOpenedWithoutText, sendOutputCopiedText, sendOutputNotCopiedText, sendWarnCopiedText, sendWarnNotCopiedText } from '../../shared/protocol/assistantTexts';
import type { SendOutcomeView, SendRequest } from '../../shared/protocol/assistant';
import { copyLine } from '../board/copyLine';
import type { AssistantHostPort } from '../ports/assistant';
import type { ClipboardPort } from '../ports/board';
import type { StepUiPort } from '../ports/copyNextStep';
import type { ClockPort, OutputPort } from '../ports/host';
import type { AssistantId } from '../../shared/protocol/assistant';
import { ASSISTANTS, type AssistantSpec, type AssistantTable } from './assistants';
import type { AttachmentCheck, AttachmentTarget } from './attachment';
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
    table?: AssistantTable;
}

export interface Send {
    send(request: SendRequest): Promise<SendOutcomeView>;
}

class SendFailure extends Error {
    constructor(
        message: string,
        readonly notice?: string,
    ) {
        super(message);
    }
}

function messageOf(reason: unknown): string {
    return reason instanceof Error ? reason.message : String(reason);
}

export function createSend(deps: SendDeps): Send {
    const table: AssistantTable = deps.table ?? ASSISTANTS;

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

    async function noticeFallback(name: string, line: string, cause: string, notice: string): Promise<SendOutcomeView> {
        const result = await copied(line);
        if (result.outcome !== 'copied') {
            deps.ui.warn(sendWarnNotCopiedText(name));
            deps.output.appendBlock([sendOutputNotCopiedText(name, cause)]);
            return result;
        }
        deps.ui.warn(notice);
        deps.output.appendBlock([sendOutputCopiedText(name, cause)]);
        return { outcome: 'copied', text: notice };
    }

    async function run(request: SendRequest, spec: AssistantSpec, isSettled: () => boolean): Promise<string[] | undefined> {
        const plain = spec.callsFor(request.target, request.line);
        let found: ReturnType<AssistantHostPort['extension']>;
        try {
            found = deps.host.extension(spec.extensionId);
        } catch {
            found = undefined;
        }
        if (found === undefined) {
            throw new SendFailure(spec.causes?.unavailable ?? extensionNotFoundCause(spec.extensionId));
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
        const unattached: string[] = [];
        if (request.attach !== undefined && attachesInTarget(request.assistant, request.target, spec.terminal === true) && (deps.attaching?.(request.assistant) ?? spec.attachesSpec)) {
            const found: AttachmentTarget[] = [];
            for (const path of [request.attach, ...(request.attachAlso ?? [])]) {
                const target = deps.attachment === undefined ? undefined : await deps.attachment(path);
                if (isSettled()) {
                    return undefined;
                }
                if (target === undefined) {
                    unattached.push(path);
                } else {
                    found.push(target);
                }
            }
            if (found.length > 0) {
                calls = spec.callsFor(request.target, request.line, found);
            }
        }
        for (const call of calls) {
            try {
                await deps.host.execute(call.command, call.args);
            } catch (reason) {
                const message = messageOf(reason);
                throw new SendFailure(spec.causes === undefined ? commandFailedCause(call.command, message) : spec.causes.failed(message), spec.causes?.notice?.(message));
            }
            if (isSettled()) {
                return undefined;
            }
        }
        return unattached;
    }

    function attempt(request: SendRequest, spec: AssistantSpec): Promise<SendOutcomeView> {
        const budget = spec.timeoutMs ?? SEND_TIMEOUT_MS;
        const name = ASSISTANT_NAMES[request.assistant];
        return new Promise((resolve) => {
            let settled = false;
            const fail = (cause: string, notice?: string): void => {
                if (settled) {
                    return;
                }
                settled = true;
                timer.dispose();
                void (notice === undefined ? fallback(name, request.line, cause) : noticeFallback(name, request.line, cause, notice)).then(resolve);
            };
            const timer = deps.clock.setTimeout(() => fail(noResultCause(budget)), budget);
            run(request, spec, () => settled).then(
                (unattached) => {
                    if (settled) {
                        return;
                    }
                    settled = true;
                    timer.dispose();
                    if (unattached === undefined || unattached.length === 0) {
                        resolve({ outcome: 'opened', text: sendOpenedText(name) });
                        return;
                    }
                    deps.output.appendBlock(unattached.map((path) => attachMissingOutputText(name, path)));
                    resolve({ outcome: 'opened', text: sendOpenedWithoutText(name, unattached.map((path) => path.slice(path.lastIndexOf('/') + 1)).join(', ')) });
                },
                (reason: unknown) => (reason instanceof SendFailure ? fail(reason.message, reason.notice) : fail(messageOf(reason))),
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
            const row = table[request.assistant];
            if (row === undefined || deps.chosen.read() !== request.assistant) {
                const result = copied(request.line);
                return handOver === undefined ? result : result.then(settle);
            }
            const turn = tail.then(() => attempt(request, row));
            tail = turn.catch(() => undefined);
            return handOver === undefined ? turn : turn.then(settle);
        },
    };
}
