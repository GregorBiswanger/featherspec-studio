import type { RunRowView } from '../../shared/protocol/agentCenter';
import type { SpecRef } from '../../shared/protocol/missionControl';
import { isEndStatus, type RunView } from '../runtime/model';
import type { ShellModel } from '../ports/shell';
import { createSpecResolver } from '../missionControl/specRefs';
import { isSpecNotFound } from '../orchestrator/specLink';
import type { ProviderRegistry } from '../providers/registry';
import { numberOfStem } from '../shell/selection';

export interface ListContext {
    model: ShellModel | undefined;
    providers: Pick<ProviderRegistry, 'entry'>;
    selectedRunId: string | undefined;
}

export function specRefOf(run: RunView, model: ShellModel | undefined): SpecRef {
    const { stem, path } = run.spec;
    if (model === undefined) {
        return { stem, number: numberOfStem(stem), title: null, found: true };
    }
    if (isSpecNotFound(stem, model)) {
        return { stem, number: numberOfStem(stem), title: null, found: false };
    }
    const resolver = createSpecResolver(model);
    const entries = resolver.entriesOf(stem);
    if (entries.length <= 1) {
        return resolver.forStem(stem);
    }
    const exact = entries.find((entry) => entry.key === path);
    return exact === undefined ? { stem, number: stem, title: null, found: true } : resolver.forEntry(exact);
}

export function providerName(providers: Pick<ProviderRegistry, 'entry'>, id: string): string {
    const found = providers.entry(id);
    return found.kind === 'ok' ? found.entry.displayName : id;
}

function compareRuns(left: RunView, right: RunView): number {
    const leftOpen = !isEndStatus(left.status);
    const rightOpen = !isEndStatus(right.status);
    if (leftOpen !== rightOpen) {
        return leftOpen ? -1 : 1;
    }
    if (left.created !== right.created) {
        return left.created < right.created ? 1 : -1;
    }
    return left.runId < right.runId ? 1 : left.runId > right.runId ? -1 : 0;
}

export function projectRunRows(runs: readonly RunView[], context: ListContext): RunRowView[] {
    return [...runs].sort(compareRuns).map((run) => ({
        runId: run.runId,
        spec: specRefOf(run, context.model),
        provider: providerName(context.providers, run.providerId),
        status: run.status,
        started: run.started,
        ended: run.ended,
        historyIncomplete: run.historyIncomplete,
        historyUnreadable: run.historyUnreadable,
        selected: run.runId === context.selectedRunId,
    }));
}
