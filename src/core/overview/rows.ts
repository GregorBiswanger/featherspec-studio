import type { BoardState } from '../../shared/protocol/boardFilter';
import type { OverviewRow, OverviewUpNext } from '../../shared/protocol/overview';
import { needsOf } from '../board/needs';
import { nextStep, stepView } from '../board/nextStep';
import { stepTips } from '../board/stepTips';
import type { Offer } from '../assistant/offer';
import { sendViewOf, tipClosingOf } from '../assistant/sendView';
import type { StepTipSettings } from '../settings/stepTipSettings';
import type { LifecycleEntry } from '../lifecycle/model';
import type { ShellModel } from '../ports/shell';
import { integrateIsQuiet } from '../planMap/returnedWork';
import type { SpecResolver } from './specRefs';

export const UP_NEXT_LIMIT = 3;

const NOW_ORDER: readonly BoardState[] = ['Blocked', 'Review', 'Active'];
const UP_NEXT_ORDER: readonly BoardState[] = ['Ready', 'Backlog'];

function compareText(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

function byNumber(left: LifecycleEntry, right: LifecycleEntry): number {
    return compareText(left.number, right.number) || compareText(left.key, right.key);
}

function inOrder(model: ShellModel, order: readonly BoardState[]): LifecycleEntry[] {
    return order.flatMap((state) => model.lifecycle.entries.filter((entry) => entry.state === state).sort(byNumber));
}

function statusOf(model: ShellModel, entry: LifecycleEntry): string {
    return entry.state === 'Backlog' ? (needsOf(model.project, entry)[0]?.text ?? 'Backlog') : entry.state;
}

function quietOf(model: ShellModel, entry: LifecycleEntry): { quiet?: true } {
    const spec = model.project.specs.find((candidate) => candidate.key === entry.key);
    return spec !== undefined && integrateIsQuiet(model, entry, spec) ? { quiet: true } : {};
}

function rowOf(model: ShellModel, specs: SpecResolver, entry: LifecycleEntry, first?: { tips?: StepTipSettings; offer?: Offer }): OverviewRow {
    const step = stepView(model, entry.key);
    const row: OverviewRow = {
        spec: specs.forEntry(entry),
        state: entry.state,
        status: statusOf(model, entry),
        problems: entry.diagnostics.filter((diagnostic) => diagnostic.tier === 'problem').length,
    };
    if (step === undefined) {
        return row;
    }
    const tips = first?.tips;
    const offer = first?.offer;
    const next = (tips === undefined || !tips.show) && offer === undefined ? undefined : nextStep(model, entry.key);
    if (next === undefined || !('case' in next)) {
        return { ...row, step, ...quietOf(model, entry) };
    }
    const send = sendViewOf(offer, next.case);
    return {
        ...row,
        step,
        ...quietOf(model, entry),
        ...(tips === undefined || !tips.show ? {} : { tips: stepTips(next.case, tips, tipClosingOf(offer), { version: model.project.version, ...(next.reason === undefined ? {} : { reason: next.reason }) }) }),
        ...(send === undefined ? {} : { send }),
    };
}

export function projectNow(model: ShellModel, specs: SpecResolver, tips?: StepTipSettings, offer?: Offer): OverviewRow[] {
    const first = { ...(tips === undefined ? {} : { tips }), ...(offer === undefined ? {} : { offer }) };
    return inOrder(model, NOW_ORDER).map((entry, index) => rowOf(model, specs, entry, index === 0 ? first : undefined));
}

export function projectUpNext(model: ShellModel, specs: SpecResolver): OverviewUpNext {
    const entries = inOrder(model, UP_NEXT_ORDER);
    return {
        rows: entries.slice(0, UP_NEXT_LIMIT).map((entry) => rowOf(model, specs, entry)),
        more: Math.max(0, entries.length - UP_NEXT_LIMIT),
        stems: [...new Set(entries.map((entry) => entry.stem))],
    };
}
