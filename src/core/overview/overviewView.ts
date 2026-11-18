import type { OverviewView } from '../../shared/protocol/overview';
import type { HistoryView } from '../lifecycle/statusHistory';
import type { ShellModel } from '../ports/shell';
import { projectActivity } from './activity';
import { projectFigures } from './figures';
import { projectProblems } from './problems';
import { projectNow, projectUpNext } from './rows';
import { createSpecResolver } from './specRefs';

export interface ViewInput {
    model: ShellModel;
    history: HistoryView;
}

export function buildOverviewView(input: ViewInput): OverviewView {
    const { model, history } = input;
    const specs = createSpecResolver(model);
    return {
        now: projectNow(model, specs),
        upNext: projectUpNext(model, specs),
        problems: projectProblems(model, specs),
        figures: projectFigures(model),
        activity: projectActivity(history, specs),
    };
}
