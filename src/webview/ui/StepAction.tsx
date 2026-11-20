import { useLayoutEffect } from 'react';
import type { SendPromptPayload, SendResultEventPayload, SendView } from '../../shared/protocol/assistant';
import { CopyButton, type CopyLook, type CopyResult } from './CopyButton';
import { useFocusHandoff } from './focusHandoff';
import { SendButton } from './SendButton';

export function StepAction(props: {
    send: SendView | undefined;
    look: CopyLook;
    line: string;
    copyResult: CopyResult | undefined;
    onCopy(line: string): void;
    sendResult: SendResultEventPayload | undefined;
    onSend(request: SendPromptPayload): void;
}) {
    const handoff = useFocusHandoff();
    useLayoutEffect(() => {
        handoff.clear();
    });
    return props.send === undefined ? (
        <CopyButton look={props.look} line={props.line} copyResult={props.copyResult} onCopy={props.onCopy} handoff={handoff} />
    ) : (
        <SendButton look={props.look === 'secondary' ? 'secondary' : 'primary'} send={props.send} line={props.line} sendResult={props.sendResult} onSend={props.onSend} copyResult={props.copyResult} onCopy={props.onCopy} onLeaveWithFocus={handoff.offer} />
    );
}
