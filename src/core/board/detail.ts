import type { DetailSections, DetailView, DiagnosticLine, HeaderLine, OpenTarget, StatusHistoryItem, StepItem } from '../../shared/protocol/detail';
import { successorText } from '../../shared/protocol/texts';
import type { LifecycleEntry } from '../lifecycle/model';
import type { HistoryCause, HistoryView } from '../lifecycle/statusHistory';
import type { ShellModel } from '../ports/shell';
import type { HeaderField } from '../specs/parseSpec';
import type { SpecEntry } from '../specs/readProject';
import { titleOf } from './cards';
import { needsOf } from './needs';
import { nextStep } from './nextStep';
import { withoutLeadingId, withoutListMarker } from './idText';
import { criteriaProgress } from './progress';

export interface DetailInput {
    selection: { stem: string; path?: string } | undefined;
    model: ShellModel | undefined;
    history: HistoryView;
}

const HEADER_LABELS: [string, 'status' | 'plan' | 'ticket' | 'origin' | 'validatedBy' | 'clarified'][] = [
    ['Status', 'status'],
    ['Plan', 'plan'],
    ['Ticket', 'ticket'],
    ['Origin', 'origin'],
    ['Validated by', 'validatedBy'],
    ['Clarified', 'clarified'],
];

function headerLines(spec: SpecEntry): HeaderLine[] {
    const parsed = spec.parsed;
    if (parsed === undefined) {
        return [];
    }
    const lines: HeaderLine[] = [];
    for (const [label, field] of HEADER_LABELS) {
        const value = (parsed[field] as HeaderField).value;
        if (value.state !== 'absent') {
            lines.push({ label, value: value.raw });
        }
    }
    parsed.unsupportedHeaderLines.forEach((line) => lines.push({ label: line.label, value: line.raw }));
    return lines;
}

function causeText(cause: HistoryCause): string {
    switch (cause.kind) {
        case 'files':
            return cause.paths.join(', ');
        case 'first-observed':
            return 'first observed';
        case 'changed-while-not-running':
            return 'changed while Studio was not running';
        case 'no-longer-observed':
            return 'no longer observed';
    }
}

function findEntry(model: ShellModel, selection: { stem: string; path?: string }): LifecycleEntry | undefined {
    const matches = model.lifecycle.entries.filter((entry) => entry.stem === selection.stem);
    return (selection.path === undefined ? undefined : matches.find((entry) => entry.key === selection.path)) ?? matches[0];
}

function diagnosticLine(diagnostic: LifecycleEntry['diagnostics'][number]): DiagnosticLine {
    const scope = diagnostic.scope;
    const file = scope === 'project' ? undefined : scope.file;
    const line = scope === 'project' || !('line' in scope) ? undefined : scope.line;
    return file === undefined ? { reason: diagnostic.reason } : { reason: diagnostic.reason, open: line === undefined ? { key: file } : { key: file, line } };
}

function baseName(key: string): string {
    return key.slice(key.lastIndexOf('/') + 1);
}

export function buildDetail(input: DetailInput): DetailView {
    const { model, selection } = input;
    if (model === undefined || selection === undefined) {
        return { kind: 'none' };
    }
    const entry = findEntry(model, selection);
    const spec = entry === undefined ? undefined : model.project.specs.find((candidate) => candidate.key === entry.key);
    if (entry === undefined || spec === undefined) {
        return { kind: 'none' };
    }
    const next = nextStep(model, entry.key);
    if (next === undefined) {
        return { kind: 'none' };
    }
    const parsed = spec.parsed;
    const specTarget: OpenTarget = { key: spec.key };
    const planEntry = entry.plan === undefined ? undefined : model.project.plans.find((plan) => plan.key === entry.plan);
    const planTarget: OpenTarget | undefined = planEntry === undefined ? undefined : { key: planEntry.key };

    const steps: StepItem[] = (planEntry?.parsed?.steps ?? []).map((step) => ({
        id: step.id,
        title: step.title,
        ticked: step.ticked,
        struck: step.struck,
        verified: step.verified.state === 'value' ? step.verified.raw : undefined,
    }));

    const related = [...spec.planKeys, ...spec.returnNoteKeys].map((key) => ({ label: baseName(key), open: { key } }));

    const historyItems: StatusHistoryItem[] | undefined =
        input.history.available
            ? input.history.entries
                  .filter((candidate) => candidate.stem === entry.stem)
                  .map((candidate) => ({
                      observedAt: candidate.observedAt,
                      old: candidate.old,
                      new: candidate.new,
                      rule: candidate.rule,
                      cause: causeText(candidate.cause),
                      flow: candidate.flow,
                  }))
            : undefined;

    const sections: DetailSections = {
        overview: {
            open: specTarget,
            headerLines: headerLines(spec),
            state: entry.state,
            rule: entry.rule,
            persistence: entry.persistence,
            deprecated: entry.deprecated !== undefined,
            successor: entry.deprecated === undefined ? undefined : successorText(entry.deprecated.successor),
            needs: needsOf(model.project, entry),
            notes: entry.diagnostics.filter((diagnostic) => diagnostic.tier === 'note').map(diagnosticLine),
        },
        requirements: { open: specTarget, items: (parsed?.requirements ?? []).map((item) => ({ id: item.id, text: withoutLeadingId(item.text, item.id), open: { key: spec.key, line: item.line } })) },
        criteria: {
            open: specTarget,
            items: (parsed?.criteria ?? []).map((item) => ({
                id: item.id,
                text: withoutLeadingId(item.text, item.id),
                illustration: item.illustration,
                uncertain: item.uncertain,
                struck: item.struck,
                open: { key: spec.key, line: item.line },
            })),
        },
        plan: { open: planTarget, stages: (planEntry?.parsed?.stages.stages ?? []).map((stage) => withoutListMarker(stage.raw)), steps },
        verification: {
            open: planTarget,
            openRows: entry.verification.counts.open,
            built: entry.verification.counts.built,
            verified: entry.verification.counts.verified,
            other: entry.verification.counts.other,
            summary: entry.verification.summary,
            criteria: criteriaProgress(entry.verification),
        },
        related,
        history: { statusHistory: historyItems, label: input.history.available ? input.history.label : 'Observed by Studio while it was running — not a reconstruction', notAvailable: input.history.available ? undefined : input.history.text },
    };
    return { kind: 'spec', key: entry.key, stem: entry.stem, number: entry.number, title: titleOf(spec) ?? entry.stem, nextStep: next, problems: entry.diagnostics.filter((diagnostic) => diagnostic.tier === 'problem').map(diagnosticLine), sections };
}
