import type { DetailView, DiagnosticLine, StatusHistoryItem } from '../../shared/protocol/detail';
import { HISTORY_LABEL, successorText } from '../../shared/protocol/texts';
import type { LifecycleEntry } from '../lifecycle/model';
import type { HistoryCause, HistoryView } from '../lifecycle/statusHistory';
import type { ShellModel } from '../ports/shell';
import { titleOf } from './cards';
import { nextStep } from './nextStep';
import { filesOf, progressOf } from './situation';

export interface DetailInput {
    selection: { stem: string; path?: string } | undefined;
    model: ShellModel | undefined;
    history: HistoryView;
}

function causeView(cause: HistoryCause): StatusHistoryItem['cause'] {
    return { kind: cause.kind, paths: cause.kind === 'files' ? [...cause.paths] : [] };
}

function findEntry(model: ShellModel, selection: { stem: string; path?: string }): LifecycleEntry | undefined {
    const matches = model.lifecycle.entries.filter((entry) => entry.stem === selection.stem);
    return (selection.path === undefined ? undefined : matches.find((entry) => entry.key === selection.path)) ?? matches[0];
}

function diagnosticLine(diagnostic: LifecycleEntry['diagnostics'][number]): DiagnosticLine {
    const scope = diagnostic.scope;
    const file = scope === 'project' ? undefined : scope.file;
    const line = scope === 'project' || !('line' in scope) ? undefined : scope.line;
    return file === undefined ? { reason: diagnostic.reason } : { reason: diagnostic.reason, open: { key: file, line: line === undefined || line < 1 ? 1 : line } };
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
    const historyItems: StatusHistoryItem[] | undefined = input.history.available
        ? input.history.entries
              .filter((candidate) => candidate.stem === entry.stem)
              .map((candidate) => ({
                  observedAt: candidate.observedAt,
                  old: candidate.old,
                  new: candidate.new,
                  rule: candidate.rule,
                  cause: causeView(candidate.cause),
                  flow: candidate.flow,
              }))
        : undefined;
    const duplicated = model.lifecycle.entries.filter((candidate) => candidate.stem === entry.stem).length > 1;
    const progress = progressOf(model, entry, spec);
    return {
        kind: 'spec',
        key: entry.key,
        stem: entry.stem,
        ...(duplicated ? { path: entry.key } : {}),
        number: entry.number,
        title: titleOf(spec) ?? entry.stem,
        state: entry.state,
        rule: entry.rule,
        persistence: entry.persistence,
        ...(entry.deprecated === undefined ? {} : { successor: successorText(entry.deprecated.successor) }),
        nextStep: next,
        problems: entry.diagnostics.filter((diagnostic) => diagnostic.tier === 'problem').map(diagnosticLine),
        notes: entry.diagnostics.filter((diagnostic) => diagnostic.tier === 'note').map(diagnosticLine),
        ...(progress === undefined ? {} : { progress }),
        files: filesOf(model, spec),
        history: { statusHistory: historyItems, label: input.history.available ? input.history.label : HISTORY_LABEL, notAvailable: input.history.available ? undefined : input.history.text },
    };
}
