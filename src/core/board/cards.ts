import type { BannerLine, CardView } from '../../shared/protocol/board';
import type { LifecycleEntry, LifecycleModel } from '../lifecycle/model';
import { problemSentence } from '../lifecycle/problemSentence';
import type { Diagnostic } from '../specs/diagnostics';
import type { ProjectRead, SpecEntry } from '../specs/readProject';
import { describeSpec } from './description';
import { needsOf } from './needs';
import { stepView } from './nextStep';
import { cardLastChange } from './lastChange';
import { criteriaProgress, taskProgress } from './progress';

export function titleOf(entry: SpecEntry): string | undefined {
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

export function buildCards(project: ProjectRead, lifecycle: LifecycleModel): CardView[] {
    const plans = new Map(project.plans.map((plan) => [plan.key, plan]));
    const entries = new Map(project.specs.map((spec) => [spec.key, spec]));
    const stems = new Map<string, number>();
    lifecycle.entries.forEach((entry) => stems.set(entry.stem, (stems.get(entry.stem) ?? 0) + 1));
    const model = { project, lifecycle };
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
            deprecated: entry.deprecated !== undefined,
            problems: entry.diagnostics.filter((diagnostic) => diagnostic.tier === 'problem').length,
            blocked: blockedLines(entry),
            need: needsOf(project, entry)[0],
            step: stepView(model, entry.key),
            summary: spec?.parsed === undefined ? undefined : describeSpec(spec.parsed.sections),
            tasks: taskProgress(plan),
            criteria: criteriaProgress(entry.verification),
            lastChange: cardLastChange(plan?.parsed?.lastUpdated.value, spec?.modifiedMs, plan?.modifiedMs),
        };
    });
}

export interface ProjectFindings {
    problems: BannerLine[];
    notes: BannerLine[];
}

function bannerLine(where: string, diagnostic: Diagnostic): BannerLine {
    return diagnostic.tier === 'problem' ? { where, reason: diagnostic.reason, sentence: problemSentence(diagnostic) } : { where, reason: diagnostic.reason };
}

export function projectFindings(project: ProjectRead, lifecycle: LifecycleModel): ProjectFindings {
    const owned = new Set<string>();
    project.specs.forEach((spec) => [spec.key, ...spec.planKeys, ...spec.returnNoteKeys].forEach((key) => owned.add(key)));
    const found: ProjectFindings = { problems: [], notes: [] };
    for (const diagnostic of lifecycle.projectDiagnostics) {
        found[diagnostic.tier === 'problem' ? 'problems' : 'notes'].push(bannerLine('project', diagnostic));
    }
    for (const diagnostic of project.diagnostics) {
        if (diagnostic.scope !== 'project' && !owned.has(diagnostic.scope.file)) {
            found[diagnostic.tier === 'problem' ? 'problems' : 'notes'].push(bannerLine(diagnostic.scope.file, diagnostic));
        }
    }
    return found;
}

export function buildBanner(project: ProjectRead, lifecycle: LifecycleModel): ProjectFindings {
    return projectFindings(project, lifecycle);
}
