import type { MissionControlView } from '../../shared/protocol/missionControl';
import type { HistoryView } from '../lifecycle/statusHistory';
import type { ShellModel } from '../ports/shell';
import { projectActivity } from './activity';
import { projectAttention } from './attention';
import { projectHeader, projectSpecFigures } from './specFigures';
import { createSpecResolver } from './specRefs';

export interface ViewInput {
    model: ShellModel;
    active: { name: string; version: string };
    updatedAt: string;
    history: HistoryView;
}

export function buildMissionControlView(input: ViewInput): MissionControlView {
    const { model, history } = input;
    const specs = createSpecResolver(model);
    return {
        header: projectHeader(input.active, model, input.updatedAt),
        specs: projectSpecFigures(model),
        attention: projectAttention(model, specs),
        activity: projectActivity(history, specs),
    };
}
