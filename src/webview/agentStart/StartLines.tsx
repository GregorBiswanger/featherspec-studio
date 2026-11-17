import { DISMISS_LABEL } from '../../shared/protocol/texts';
import { OPEN_RUN_LABEL, checkingText, noticeText, refusalLines } from './texts';
import { useAgentStart } from './useAgentStart';

export function StartLines() {
    const start = useAgentStart();
    const { checking, refusal, notice } = start.view;
    if (checking === undefined && refusal === undefined && notice === undefined) {
        return null;
    }
    return (
        <div className="start-lines">
            {checking === undefined ? null : (
                <div data-start-line data-start-checking role="status" className="start-line">
                    {checkingText(checking.number)}
                </div>
            )}
            {refusal === undefined ? null : (
                <div data-start-line data-start-refusal role="alert" className="start-line start-refusal">
                    <ul>
                        {refusal.items.flatMap((item, itemIndex) => refusalLines(item).map((line, lineIndex) => <li key={`${itemIndex}-${lineIndex}`}>{line}</li>))}
                    </ul>
                    <button type="button" onClick={() => start.dismiss('refusal')}>
                        {DISMISS_LABEL}
                    </button>
                </div>
            )}
            {notice === undefined ? null : (
                <div data-start-line data-start-notice role="alert" className="start-line start-notice">
                    <span>{noticeText(notice.runId, notice.errorClass)}</span>
                    <button type="button" onClick={() => start.openRun(notice.runId)}>
                        {OPEN_RUN_LABEL}
                    </button>
                    <button type="button" onClick={() => start.dismiss('notice')}>
                        {DISMISS_LABEL}
                    </button>
                </div>
            )}
        </div>
    );
}
