import type { CardView } from '../../shared/protocol/board';
import type { PlanSpecView } from '../../shared/protocol/planMap';
import { problemSentence } from '../lifecycle/problemSentence';
import type { ShellModel } from '../ports/shell';
import { compareRows, GROUP_ORDER, STATE_GROUP } from '../shell/specTree';
import { planOf } from './planMap';

export function buildPlanSpecs(model: ShellModel, cards: readonly CardView[]): PlanSpecView[] {
    const listed = cards.flatMap((card) => {
        const entry = model.lifecycle.entries.find((candidate) => candidate.key === card.key);
        const spec = model.project.specs.find((candidate) => candidate.key === card.key);
        if (entry === undefined || spec === undefined || planOf(model, entry, spec)?.kind !== 'plan') {
            return [];
        }
        const problems = entry.diagnostics.filter((diagnostic) => diagnostic.tier === 'problem').map((diagnostic) => ({ sentence: problemSentence(diagnostic), reason: diagnostic.reason }));
        return [{ card, view: { stem: card.stem, ...(card.path === undefined ? {} : { path: card.path }), number: card.number, title: card.title, problems } }];
    });
    return GROUP_ORDER.flatMap((group) =>
        listed
            .filter((item) => STATE_GROUP[item.card.state] === group)
            .sort((left, right) => compareRows(left.card, right.card))
            .map((item) => item.view),
    );
}
