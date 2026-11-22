import { attachesInTarget } from '../../shared/protocol/assistant';
import { ASSISTANT_NAMES, activatingFailedCause, attachMissingOutputText, commandFailedCause, commandNotFoundCause, copyForDoneText, copyForMissingOutputText, copyForOpenText, copyForWithoutText, extensionNotFoundCause, noResultCause, pasteKeyOf, sendOpenedText, sendOpenedWithoutText, sendOutputCopiedText, sendOutputNotCopiedText, sendWarnCopiedText, sendWarnNotCopiedText } from '../../shared/protocol/assistantTexts';
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
import { placeOf } from './offer';

export const SEND_TIMEOUT_MS = 5000;

export const OPEN_CHAT_COMMAND = 'featherspec.openChat';

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

class SendFailure extends Error {}

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

    async function run(request: SendRequest, spec: AssistantSpec, isSettled: () => boolean): Promise<string[] | undefined> {
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
        const unattached: string[] = [];
        if (request.attach !== undefined && attachesInTarget(request.assistant, request.target) && (deps.attaching?.(request.assistant) ?? spec.attachesSpec)) {
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
                throw new SendFailure(commandFailedCause(call.command, messageOf(reason)));
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
            const fail = (cause: string): void => {
                if (settled) {
                    return;
                }
                settled = true;
                timer.dispose();
                void fallback(name, request.line, cause).then(resolve);
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
                (reason: unknown) => fail(reason instanceof SendFailure ? reason.message : messageOf(reason)),
            );
        });
    }

    function openChat(assistant: AssistantId, spec: AssistantSpec): Promise<boolean> {
        return new Promise((resolve) => {
            const timer = deps.clock.setTimeout(() => resolve(false), spec.timeoutMs ?? SEND_TIMEOUT_MS);
            deps.host.execute(OPEN_CHAT_COMMAND, [assistant]).then(
                (answer) => {
                    timer.dispose();
                    resolve(answer !== 'notFound');
                },
                () => {
                    timer.dispose();
                    resolve(false);
                },
            );
        });
    }

    async function copyFor(request: SendRequest, spec: AssistantSpec): Promise<SendOutcomeView> {
        const name = ASSISTANT_NAMES[request.assistant];
        const paths: string[] = [];
        const unattached: string[] = [];
        if (request.attach !== undefined && attachesInTarget(request.assistant, request.target) && (deps.attaching?.(request.assistant) ?? spec.attachesSpec)) {
            for (const path of [request.attach, ...(request.attachAlso ?? [])]) {
                const target = deps.attachment === undefined ? undefined : await deps.attachment(path);
                if (target === undefined) {
                    unattached.push(path);
                } else {
                    paths.push(target.path);
                }
            }
        }
        if (unattached.length > 0) {
            deps.output.appendBlock(unattached.map((path) => copyForMissingOutputText(name, path)));
        }
        const written = await copyLine(deps.clipboard, spec.text === undefined ? request.line : spec.text(request.line, paths));
        if (!written.ok) {
            return { outcome: 'copyFailed', text: written.text };
        }
        const place = placeOf(request.assistant, spec);
        const key = pasteKeyOf(deps.platform);
        const opened = await openChat(request.assistant, spec);
        if (unattached.length > 0) {
            return { outcome: 'copied', text: copyForWithoutText(unattached.map((path) => path.slice(path.lastIndexOf('/') + 1)).join(', '), place, key, opened) };
        }
        return { outcome: 'copied', text: opened ? copyForDoneText(place, key) : copyForOpenText(place, key) };
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
            const turn = tail.then(() => (row.handover === 'copyFor' ? copyFor(request, row) : attempt(request, row)));
            tail = turn.catch(() => undefined);
            return handOver === undefined ? turn : turn.then(settle);
        },
    };
}
