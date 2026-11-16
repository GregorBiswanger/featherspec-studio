import { DISMISS_LABEL, noticeText } from '../shared/protocol/texts';
import { useShell } from './shell';

export function NoticeBar() {
    const shell = useShell();
    const notice = shell.view?.notice;
    if (notice === undefined) {
        return null;
    }
    return (
        <div data-notice role="status" className="notice">
            <span>{noticeText(notice.number)}</span>
            <button type="button" onClick={() => shell.dismissNotice()}>
                {DISMISS_LABEL}
            </button>
        </div>
    );
}
