import type { OverviewView } from '../../shared/protocol/overview';
import type { Offer } from '../assistant/offer';
import { emptySendOf, welcomeOf } from '../assistant/welcome';
import type { HistoryView } from '../lifecycle/statusHistory';
import type { ShellModel } from '../ports/shell';
import type { StepTipSettings } from '../settings/stepTipSettings';
import { projectActivity } from './activity';
import { projectFigures } from './figures';
import { projectProblems } from './problems';
import { projectNow, projectUpNext } from './rows';
import { createSpecResolver } from './specRefs';

export interface ViewInput {
    model: ShellModel;
    history: HistoryView;
    activityOpen?: boolean;
    tips?: StepTipSettings;
    offer?: Offer;
}

export function buildOverviewView(input: ViewInput): OverviewView {
    const { model, history } = input;
    const specs = createSpecResolver(model);
    const figures = projectFigures(model);
    const welcome = figures.kind === 'empty' ? welcomeOf(model, input.offer, input.tips) : undefined;
    const start = figures.kind === 'empty' && welcome === undefined ? emptySendOf(model, input.offer) : undefined;
    return {
        ...(welcome === undefined ? {} : { welcome }),
        ...(start === undefined ? {} : { start }),
        now: projectNow(model, specs, input.tips, input.offer),
        upNext: projectUpNext(model, specs),
        problems: projectProblems(model, specs),
        figures,
        activity: projectActivity(history, specs, input.activityOpen ?? false),
    };
}
