import { useId, useLayoutEffect } from 'react';
import type { SendPromptPayload, SendResultEventPayload, SendView } from '../../shared/protocol/assistant';
import { AttachmentLine } from './AttachmentLine';
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
    const lineId = useId();
    useLayoutEffect(() => {
        handoff.clear();
    });
    return props.send === undefined ? (
        <CopyButton look={props.look} line={props.line} copyResult={props.copyResult} onCopy={props.onCopy} handoff={handoff} />
    ) : (
        <>
            <SendButton look={props.look === 'secondary' ? 'secondary' : 'primary'} send={props.send} line={props.line} sendResult={props.sendResult} onSend={props.onSend} copyResult={props.copyResult} onCopy={props.onCopy} onLeaveWithFocus={handoff.offer} {...(props.send.attach === undefined ? {} : { describedBy: lineId })} />
            {props.send.attach === undefined ? null : <AttachmentLine id={lineId} attach={props.send.attach} assistant={props.send.assistant} />}
        </>
    );
}
