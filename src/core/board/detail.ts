import type { Offer } from '../assistant/offer';
import { sendViewOf, tipClosingOf, withheldOf } from '../assistant/sendView';
import { problemSentence } from '../lifecycle/problemSentence';
import { integrateIsQuiet } from '../planMap/returnedWork';
import type { DetailView, DiagnosticLine, NextStepView, StatusHistoryItem } from '../../shared/protocol/detail';
import type { StepLinkView } from '../../shared/protocol/stepView';
import { HISTORY_LABEL, successorText } from '../../shared/protocol/texts';
import type { LifecycleEntry } from '../lifecycle/model';
import type { HistoryCause, HistoryView } from '../lifecycle/statusHistory';
import type { ShellModel } from '../ports/shell';
import { titleOf } from './cards';
import type { StepTipSettings } from '../settings/stepTipSettings';
import { nextStep, type NextStep } from './nextStep';
import { stepTips } from './stepTips';
import { filesOf, progressOf } from './situation';
import { planOf } from '../planMap/planMap';
import { stepLinkOf } from './stepLinks';

export interface DetailInput {
    selection: { stem: string; path?: string } | undefined;
    model: ShellModel | undefined;
    history: HistoryView;
    tips?: StepTipSettings;
    offer?: Offer;
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
    const base = diagnostic.tier === 'problem' ? { sentence: problemSentence(diagnostic), reason: diagnostic.reason } : { reason: diagnostic.reason };
    return file === undefined ? base : { ...base, open: { key: file, line: line === undefined || line < 1 ? 1 : line } };
}

function nextStepView(next: NextStep, tips: StepTipSettings | undefined, offer: Offer | undefined, version: string, key: string, quiet: boolean, link: (intent: string) => StepLinkView | undefined, parallel: number | undefined): NextStepView {
    if (!('lines' in next)) {
        return next;
    }
    const lines = next.lines.map((line) => {
        const step = link(line.intent);
        return { text: line.text, intent: line.intent, ...(step === undefined ? {} : { step }) };
    });
    const send = sendViewOf(offer, next.case, { version, key });
    return {
        rule: next.rule,
        lines,
        ...(tips === undefined || !tips.show ? {} : { tips: stepTips(next.case, tips, tipClosingOf(offer, withheldOf(offer, next.case, { version, key })), { version, ...(send === undefined ? {} : { send: true as const }), ...(next.reason === undefined ? {} : { reason: next.reason }) }) }),
        ...(send === undefined ? {} : { send }),
        ...(quiet ? { quiet: true as const } : {}),
        ...(parallel === undefined ? {} : { parallel: { stage: parallel } }),
    };
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
    const plan = planOf(model, entry, spec);
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
        nextStep: nextStepView(next, input.tips, input.offer, model.project.version, entry.key, integrateIsQuiet(model, entry, spec), (intent) => stepLinkOf(model, entry, intent), plan?.kind === 'plan' ? plan.stages.find((stage) => stage.ways !== undefined)?.number : undefined),
        problems: entry.diagnostics.filter((diagnostic) => diagnostic.tier === 'problem').map(diagnosticLine),
        notes: entry.diagnostics.filter((diagnostic) => diagnostic.tier === 'note').map(diagnosticLine),
        ...(progress === undefined ? {} : { progress }),
        ...(plan === undefined ? {} : { plan }),
        files: filesOf(model, spec),
        history: { statusHistory: historyItems, label: input.history.available ? input.history.label : HISTORY_LABEL, notAvailable: input.history.available ? undefined : input.history.text },
    };
}
