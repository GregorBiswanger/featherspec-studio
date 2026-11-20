import type { WelcomeView } from '../../shared/protocol/overview';
import { SETUP_LINE, WELCOME_BODY, WELCOME_HEADING } from '../../shared/protocol/texts';
import { useBoard } from '../board/boardStore';
import { EmptyState } from './EmptyState';
import { StepAction } from './StepAction';

export function Welcome(props: { welcome: WelcomeView; className?: string }) {
    const { copyResult, copyText, sendResult, sendPrompt } = useBoard();
    return (
        <EmptyState icon="feather" data-welcome {...(props.className === undefined ? {} : { className: props.className })}>
            <h2>{WELCOME_HEADING}</h2>
            <p className="welcome-body">{WELCOME_BODY}</p>
            <div className="welcome-action">
                <StepAction send={props.welcome.send} look="primary" line={SETUP_LINE} sendResult={sendResult} onSend={sendPrompt} copyResult={copyResult} onCopy={copyText} />
                {props.welcome.coach === undefined ? null : <p className="step-coach">{props.welcome.coach}</p>}
            </div>
        </EmptyState>
    );
}
