import type { BannerLine, CardView } from '../../shared/protocol/board';
import type { LifecycleEntry, LifecycleModel } from '../lifecycle/model';
import type { ProjectRead, SpecEntry } from '../specs/readProject';
import { describeSpec } from './description';
import { criteriaProgress, lastChange, taskProgress } from './progress';
import { cardRun, type RunIndex } from './runs';

function titleOf(entry: SpecEntry): string | undefined {
    const value = entry.parsed?.title.value;
    return value !== undefined && value.state === 'value' ? value.raw : undefined;
}

function blockedLines(entry: LifecycleEntry): string[] {
    if (entry.blockedBy === undefined) {
        return [];
    }
    return [
        ...(entry.blockedBy.plan ? ['Blocked: plan status Blocked'] : []),
        ...entry.blockedBy.returnNotes.map((name) => `Blocked: return note ${name}`),
    ];
}

function readinessLine(entry: LifecycleEntry): string | undefined {
    if (entry.state !== 'Backlog') {
        return undefined;
    }
    const lowest = [...entry.readiness.failing].sort()[0];
    const check = entry.readiness.checks.find((candidate) => candidate.id === lowest);
    return lowest === undefined || check === undefined || check.result === 'pass' ? undefined : `${lowest}: ${check.reason}`;
}

export function buildCards(project: ProjectRead, lifecycle: LifecycleModel, runs: RunIndex = { available: true, latest: new Map() }): CardView[] {
    const plans = new Map(project.plans.map((plan) => [plan.key, plan]));
    const entries = new Map(project.specs.map((spec) => [spec.key, spec]));
    const stems = new Map<string, number>();
    lifecycle.entries.forEach((entry) => stems.set(entry.stem, (stems.get(entry.stem) ?? 0) + 1));
    return lifecycle.entries.map((entry) => {
        const spec = entries.get(entry.key);
        const title = spec === undefined ? undefined : titleOf(spec);
        const plan = entry.plan === undefined ? undefined : plans.get(entry.plan);
        return {
            key: entry.key,
            stem: entry.stem,
            number: entry.number,
            title: title ?? entry.stem,
            titleIsStem: title === undefined,
            path: (stems.get(entry.stem) ?? 0) > 1 ? entry.key : undefined,
            state: entry.state,
            derivedLabel: entry.derivedLabel,
            deprecated: entry.deprecated !== undefined,
            diagnostics: entry.diagnostics.length,
            blocked: blockedLines(entry),
            readiness: readinessLine(entry),
            summary: spec?.parsed === undefined ? undefined : describeSpec(spec.parsed.sections),
            tasks: taskProgress(plan),
            criteria: criteriaProgress(entry.verification),
            lastChangeMs: lastChange(spec?.modifiedMs, plan?.modifiedMs),
            run: cardRun(runs, entry.stem),
        };
    });
}

export function buildBanner(project: ProjectRead, lifecycle: LifecycleModel): BannerLine[] {
    const owned = new Set<string>();
    project.specs.forEach((spec) => [spec.key, ...spec.planKeys, ...spec.returnNoteKeys].forEach((key) => owned.add(key)));
    const lines: BannerLine[] = lifecycle.projectDiagnostics.map((diagnostic) => ({ where: 'project', reason: diagnostic.reason }));
    for (const diagnostic of project.diagnostics) {
        if (diagnostic.scope !== 'project' && !owned.has(diagnostic.scope.file)) {
            lines.push({ where: diagnostic.scope.file, reason: diagnostic.reason });
        }
    }
    return lines;
}
