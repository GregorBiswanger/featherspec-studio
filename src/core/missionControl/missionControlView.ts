import type { MissionControlView } from '../../shared/protocol/missionControl';
import type { HistoryView } from '../lifecycle/statusHistory';
import type { ShellModel } from '../ports/shell';
import { projectActivity } from './activity';
import { projectAttention } from './attention';
import { projectRuns } from './runFigures';
import type { RunsRead } from './runSource';
import { projectHeader, projectSpecFigures } from './specFigures';
import { createSpecResolver } from './specRefs';

export interface ViewInput {
    model: ShellModel;
    active: { name: string; version: string };
    updatedAt: string;
    runs: RunsRead;
    history: HistoryView;
}

export function buildMissionControlView(input: ViewInput): MissionControlView {
    const { model, runs, history } = input;
    const specs = createSpecResolver(model);
    const facts = projectRuns(runs, model, (stem) => specs.forStem(stem));
    return {
        header: projectHeader(input.active, model, input.updatedAt),
        specs: projectSpecFigures(model),
        runs: facts.view,
        attention: projectAttention(model, facts, specs),
        activity: projectActivity(history, runs, specs),
    };
}
