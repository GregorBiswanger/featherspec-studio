import type { AssistantId, SendAttachment } from '../../shared/protocol/assistant';
import { ASSISTANT_NAMES, ATTACHED_WHEN_SENT, attachTooltipText } from '../../shared/protocol/assistantTexts';
import { Glyph } from '../board/icons';
import { PathText } from './PathText';

export function AttachmentLine(props: { id: string; attach: SendAttachment; assistant: AssistantId }) {
    return (
        <p id={props.id} className="send-attach" title={attachTooltipText(props.attach.path, ASSISTANT_NAMES[props.assistant])}>
            <span className="send-attach-chip">
                <Glyph kind="file" />
                <PathText path={props.attach.name} />
            </span>{' '}
            {ATTACHED_WHEN_SENT}
        </p>
    );
}
