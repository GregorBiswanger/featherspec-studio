import type { OverviewView } from '../../shared/protocol/overview';
import type { HistoryView } from '../lifecycle/statusHistory';
import type { ShellModel } from '../ports/shell';
import { projectActivity } from './activity';
import { projectAttention } from './attention';
import { projectHeader, projectSpecFigures } from './specFigures';
import { projectNow, projectUpNext } from './rows';
import { createSpecResolver } from './specRefs';

export interface ViewInput {
    model: ShellModel;
    active: { name: string; version: string };
    updatedAt: string;
    history: HistoryView;
}

export function buildOverviewView(input: ViewInput): OverviewView {
    const { model, history } = input;
    const specs = createSpecResolver(model);
    return {
        now: projectNow(model, specs),
        upNext: projectUpNext(model, specs),
        header: projectHeader(input.active, model, input.updatedAt),
        specs: projectSpecFigures(model),
        attention: projectAttention(model, specs),
        activity: projectActivity(history, specs),
    };
}
