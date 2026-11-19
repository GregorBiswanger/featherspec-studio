import type { OverviewProblems, OverviewRow, ProblemLine } from '../../shared/protocol/overview';
import { projectFindings } from '../board/cards';
import { problemSentence } from '../lifecycle/problemSentence';
import { stepView } from '../board/nextStep';
import type { LifecycleEntry } from '../lifecycle/model';
import type { ShellModel } from '../ports/shell';
import type { SpecResolver } from './specRefs';

function compareText(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

function problemsOf(entry: LifecycleEntry): { sentence: string; reason: string }[] {
    return entry.diagnostics.filter((diagnostic) => diagnostic.tier === 'problem').map((diagnostic) => ({ sentence: problemSentence(diagnostic), reason: diagnostic.reason }));
}

function joined(values: string[]): string {
    return [...new Set(values)].join(' · ');
}

export function projectProblems(model: ShellModel, specs: SpecResolver): OverviewProblems {
    const rows: OverviewRow[] = [...model.lifecycle.entries]
        .filter((entry) => problemsOf(entry).length > 0)
        .sort((left, right) => compareText(left.number, right.number) || compareText(left.key, right.key))
        .map((entry) => {
            const found = problemsOf(entry);
            const step = stepView(model, entry.key);
            const row: OverviewRow = {
                spec: specs.forEntry(entry),
                state: entry.state,
                status: joined(found.map((problem) => problem.sentence)),
                problems: found.length,
                reasons: joined(found.map((problem) => problem.reason)),
            };
            return step === undefined ? row : { ...row, step };
        });
    const lines: ProblemLine[] = projectFindings(model.project, model.lifecycle).problems.map((line) => ({ where: line.where, reason: line.reason, sentence: line.sentence ?? line.reason }));
    return { rows, lines };
}
