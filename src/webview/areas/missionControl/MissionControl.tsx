import { useState } from 'react';
import type { NavigationRequest } from '../../../shared/protocol/messages';
import type { ActivityEntry } from '../../../shared/protocol/missionControl';
import { DISMISS_LABEL, noticeText } from '../../../shared/protocol/texts';
import { useShell } from '../../shell';
import { Activity } from './Activity';
import { Attention } from './Attention';
import { Header } from './Header';
import { activityRequest } from './requests';
import { RunSection } from './RunSection';
import { SpecFigures } from './SpecFigures';
import { useMissionControl } from './store';
import { MC_ZERO_SPECS } from './texts';

export function MissionControl() {
    const view = useMissionControl();
    const shell = useShell();
    const [notice, setNotice] = useState<string | undefined>(undefined);
    if (view === undefined) {
        return <div data-mission-control-empty className="mission-control" />;
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
        <div data-mission-control className="mission-control">
            {notice === undefined ? null : (
                <div data-mc-notice role="status" className="notice">
                    <span>{noticeText(notice)}</span>
                    <button type="button" onClick={() => setNotice(undefined)}>
                        {DISMISS_LABEL}
                    </button>
                </div>
            )}
            <Header header={view.header} navigate={navigate} />
            {view.specs.kind === 'empty' ? <p data-zero-specs>{MC_ZERO_SPECS}</p> : <SpecFigures specs={view.specs} navigate={navigate} />}
            {view.specs.kind === 'empty' ? null : <Attention attention={view.attention} navigate={navigate} />}
            <div className="mc-panels">
                <RunSection runs={view.runs} navigate={navigate} />
                <Activity activity={view.activity} onActivate={openActivity} />
            </div>
        </div>
    );
}
