import { Activity } from './Activity';
import { Attention } from './Attention';
import { Header } from './Header';
import { RunSection } from './RunSection';
import { SpecFigures } from './SpecFigures';
import { useMissionControl } from './store';
import { MC_ZERO_SPECS } from './texts';

export function MissionControl() {
    const view = useMissionControl();
    if (view === undefined) {
        return <div data-mission-control-empty className="mission-control" />;
    }
    return (
        <div data-mission-control className="mission-control">
            <Header header={view.header} />
            {view.specs.kind === 'empty' ? <p data-zero-specs>{MC_ZERO_SPECS}</p> : <SpecFigures specs={view.specs} />}
            <RunSection runs={view.runs} />
            {view.specs.kind === 'empty' ? null : <Attention attention={view.attention} />}
            <Activity activity={view.activity} />
        </div>
    );
}
