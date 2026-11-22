import type { OutputPort } from '../ports/host';
import { isSendPromptPayload, type AssistantId, type AssistantTarget } from '../../shared/protocol/assistant';
import { PROTOCOL_VERSION, readEnvelope, type Envelope } from '../../shared/protocol/envelope';
import { isRequestType, REQUEST_GUARDS, type RequestPayloads, type RequestType, type ResponsePayload } from '../../shared/protocol/messages';
import { ignoredMessageLine } from '../../shared/protocol/texts';

export type RequestHandlers = {
    [Type in RequestType]: (payload: RequestPayloads[Type]) => Promise<void>;
};

export interface MessageRouterDeps {
    handlers: RequestHandlers;
    output: OutputPort;
    post: (message: Envelope) => void;
    sendTargets?: Readonly<Record<AssistantId, readonly AssistantTarget[]>>;
}

export interface MessageRouter {
    receive(raw: unknown): Promise<void>;
}

const SAFE_TYPE = /^[A-Za-z][A-Za-z0-9]{0,31}$/;

function typeLabel(type: string | undefined): string {
    return type !== undefined && SAFE_TYPE.test(type) ? type : '<invalid>';
}

export function createMessageRouter(deps: MessageRouterDeps): MessageRouter {
    function ignore(type: string | undefined, reason: string): void {
        deps.output.appendBlock([ignoredMessageLine(typeLabel(type), reason)]);
    }

    function respond(request: Envelope, payload: ResponsePayload): void {
        const response: Envelope = { v: PROTOCOL_VERSION, kind: 'res', type: request.type, payload };
        if (request.id !== undefined) {
            response.id = request.id;
        }
        deps.post(response);
    }

    return {
        async receive(raw) {
            const read = readEnvelope(raw);
            if (!read.ok) {
                ignore(undefined, read.reason);
                return;
            }
            const { envelope } = read;
            if (envelope.v !== PROTOCOL_VERSION) {
                deps.post({ v: PROTOCOL_VERSION, kind: 'evt', type: 'versionMismatch', payload: {} });
                return;
            }
            if (envelope.kind !== 'req') {
                ignore(envelope.type, 'not a request');
                return;
            }
            if (!isRequestType(envelope.type)) {
                ignore(envelope.type, 'unknown message type');
                return;
            }
            const type = envelope.type;
            const guard = REQUEST_GUARDS[type] as (value: unknown) => boolean;
            const valid = type === 'sendPrompt' && deps.sendTargets !== undefined ? isSendPromptPayload(envelope.payload, deps.sendTargets) : guard(envelope.payload);
            if (!valid) {
                ignore(type, 'invalid payload');
                return;
            }
            const handler = deps.handlers[type] as (payload: unknown) => Promise<void>;
            try {
                await handler(envelope.payload);
                respond(envelope, { ok: true });
            } catch {
                respond(envelope, { ok: false, error: 'The request failed.' });
            }
        },
    };
}
