import { useState } from 'react';
import type { NavigationRequest } from '../../../shared/protocol/messages';
import type { ActivityEntry } from '../../../shared/protocol/overview';
import { DISMISS_LABEL, noticeText } from '../../../shared/protocol/texts';
import { useShell } from '../../shell';
import { Activity } from './Activity';
import { Attention } from './Attention';
import { Header } from './Header';
import { activityRequest } from './requests';
import { SpecFigures } from './SpecFigures';
import { useOverview } from './store';
import { EmptyState } from '../../ui/EmptyState';
import { NO_SPECS_START_TEXT, SDD_SPECIFY_LINE } from '../../../shared/protocol/texts';
import { useBoard } from '../../board/boardStore';
import { CopyButton } from '../../ui/CopyButton';
import { Now, UpNext } from './Now';

export function Overview() {
    const view = useOverview();
    const { copyResult, copyText } = useBoard();
    const shell = useShell();
    const [notice, setNotice] = useState<string | undefined>(undefined);
    if (view === undefined) {
        return <div data-overview-empty className="overview" />;
    }
    const navigate = (request: NavigationRequest): void => {
        setNotice(undefined);
        shell.navigate(request);
    };
    const openActivity = (entry: ActivityEntry): void => {
        const request = activityRequest(entry);
        if (request === undefined) {
            setNotice(entry.spec.number);
            return;
        }
        navigate(request);
    };
    return (
        <div data-overview className="overview">
            {notice === undefined ? null : (
                <div data-ov-notice role="status" className="notice">
                    <span>{noticeText(notice)}</span>
                    <button type="button" onClick={() => setNotice(undefined)}>
                        {DISMISS_LABEL}
                    </button>
                </div>
            )}
            {view.specs.kind === 'empty' ? (
                <EmptyState icon="Backlog" data-zero-specs>
                    {NO_SPECS_START_TEXT}
                    <CopyButton line={SDD_SPECIFY_LINE} copyResult={copyResult} onCopy={copyText} />
                </EmptyState>
            ) : (
                <>
                    <Now rows={view.now} navigate={navigate} />
                    <UpNext upNext={view.upNext} navigate={navigate} />
                </>
            )}
            <Header header={view.header} navigate={navigate} />
            {view.specs.kind === 'empty' ? null : <SpecFigures specs={view.specs} navigate={navigate} />}
            {view.specs.kind === 'empty' ? null : <Attention attention={view.attention} navigate={navigate} />}
            <div className="ov-panels">
                <Activity activity={view.activity} onActivate={openActivity} />
            </div>
        </div>
    );
}
