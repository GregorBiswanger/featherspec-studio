import { NOT_AVAILABLE, isEndStatus, type JsonValue, type RunView } from '../runtime/model';
import type { ChangedFile, RunTrack } from './runTrack';

export type StoredResult = {
    finalMessage: string;
    usage: Record<string, number> | string;
    changedFiles: ChangedFile[] | string;
};

export interface RunResult {
    finalMessage: string;
    usage: Record<string, number> | string;
    changedFiles: ChangedFile[] | string;
    durationMs: number | string;
}

export function storedResult(track: RunTrack): StoredResult {
    return {
        finalMessage: track.finalMessage ?? track.lastMessage ?? NOT_AVAILABLE,
        usage: track.usage ?? NOT_AVAILABLE,
        changedFiles: track.changedFiles.length > 0 ? track.changedFiles.map((file) => ({ ...file })) : NOT_AVAILABLE,
    };
}

function isObject(value: JsonValue | undefined): value is { [key: string]: JsonValue } {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function usageOf(value: JsonValue | undefined): Record<string, number> | string {
    if (!isObject(value)) {
        return NOT_AVAILABLE;
    }
    const totals: Record<string, number> = {};
    for (const [name, amount] of Object.entries(value)) {
        if (typeof amount === 'number') {
            totals[name] = amount;
        }
    }
    return totals;
}

function filesOf(value: JsonValue | undefined): ChangedFile[] | string {
    if (!Array.isArray(value)) {
        return NOT_AVAILABLE;
    }
    const files: ChangedFile[] = [];
    for (const entry of value) {
        if (isObject(entry) && typeof entry['path'] === 'string' && typeof entry['operation'] === 'string') {
            files.push({ path: entry['path'], operation: entry['operation'] });
        }
    }
    return files;
}

export function readRunResult(run: RunView): RunResult {
    const stored = isObject(run.result) ? run.result : {};
    const message = stored['finalMessage'];
    const created = Date.parse(run.created);
    const ended = run.ended === undefined ? Number.NaN : Date.parse(run.ended);
    return {
        finalMessage: typeof message === 'string' ? message : NOT_AVAILABLE,
        usage: usageOf(stored['usage']),
        changedFiles: filesOf(stored['changedFiles']),
        durationMs: isEndStatus(run.status) && Number.isFinite(created) && Number.isFinite(ended) ? ended - created : NOT_AVAILABLE,
    };
}
