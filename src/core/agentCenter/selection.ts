import { acRunNotInHistory } from '../../shared/protocol/agentCenterTexts';
import { isRecord } from '../../shared/protocol/envelope';
import type { NavigationTarget } from '../../shared/protocol/messages';
import type { ShellModel } from '../ports/shell';
import { isSpecNotFound } from '../orchestrator/specLink';
import { numberOfStem } from '../shell/selection';
import type { RunView } from '../runtime/model';
import { createSpecResolver } from '../missionControl/specRefs';

export interface Selection {
    runId: string | undefined;
    stem: string | undefined;
}

export interface Applied {
    selection: Selection;
    notice: string | undefined;
}

export function visibleRuns(runs: readonly RunView[], stem: string | undefined): RunView[] {
    return stem === undefined ? [...runs] : runs.filter((run) => run.spec.stem === stem);
}

export function applyTarget(current: Selection, target: NavigationTarget | undefined, runs: readonly RunView[]): Applied {
    if (target?.kind === 'run') {
        const exists = runs.some((run) => run.runId === target.id);
        return {
            selection: { runId: exists ? target.id : undefined, stem: undefined },
            notice: exists ? undefined : acRunNotInHistory(target.id),
        };
    }
    if (target?.kind === 'spec') {
        const hidden = current.runId !== undefined && !visibleRuns(runs, target.stem).some((run) => run.runId === current.runId);
        return { selection: { runId: hidden ? undefined : current.runId, stem: target.stem }, notice: undefined };
    }
    return { selection: current, notice: undefined };
}

export function reconcileSelection(current: Selection, runs: readonly RunView[]): Applied {
    if (current.runId === undefined || runs.some((run) => run.runId === current.runId)) {
        return { selection: current, notice: undefined };
    }
    return { selection: { runId: undefined, stem: current.stem }, notice: acRunNotInHistory(current.runId) };
}

export function filterLabel(stem: string, model: ShellModel | undefined): string {
    if (model === undefined) {
        return numberOfStem(stem);
    }
    return isSpecNotFound(stem, model) ? stem : createSpecResolver(model).forStem(stem).number;
}

interface MemoryEntry {
    runId?: string;
    stem?: string;
}

function readProjects(value: unknown): Record<string, MemoryEntry> | undefined {
    if (!isRecord(value) || value['v'] !== 1 || !isRecord(value['projects'])) {
        return undefined;
    }
    const projects: Record<string, MemoryEntry> = {};
    for (const [root, entry] of Object.entries(value['projects'])) {
        if (!isRecord(entry) || (entry['runId'] !== undefined && typeof entry['runId'] !== 'string') || (entry['stem'] !== undefined && typeof entry['stem'] !== 'string')) {
            return undefined;
        }
        const read: MemoryEntry = {};
        if (typeof entry['runId'] === 'string') {
            read.runId = entry['runId'];
        }
        if (typeof entry['stem'] === 'string') {
            read.stem = entry['stem'];
        }
        projects[root] = read;
    }
    return projects;
}

export function parseMemory(value: unknown, root: string): Selection {
    const entry = readProjects(value)?.[root];
    return { runId: entry?.runId, stem: entry?.stem };
}

export function serializeMemory(value: unknown, root: string, selection: Selection): unknown {
    const projects = { ...(readProjects(value) ?? {}) };
    delete projects[root];
    const entry: MemoryEntry = {};
    if (selection.runId !== undefined) {
        entry.runId = selection.runId;
    }
    if (selection.stem !== undefined) {
        entry.stem = selection.stem;
    }
    if (entry.runId !== undefined || entry.stem !== undefined) {
        projects[root] = entry;
    }
    return { v: 1, projects };
}
