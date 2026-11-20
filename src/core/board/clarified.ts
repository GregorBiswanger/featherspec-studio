import type { HandOverEntry, ShellModel } from '../ports/shell';

function entryOf(model: ShellModel, key: string): HandOverEntry | undefined {
    const handOvers = model.handOvers;
    if (typeof handOvers !== 'object' || handOvers === null || !Object.prototype.hasOwnProperty.call(handOvers, key)) {
        return undefined;
    }
    const entry: unknown = handOvers[key];
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
        return undefined;
    }
    const { modifiedMs, size } = entry as Record<string, unknown>;
    const valid = (value: unknown): value is number | undefined => value === undefined || (typeof value === 'number' && Number.isFinite(value));
    if (!valid(modifiedMs) || !valid(size)) {
        return undefined;
    }
    return { modifiedMs, size };
}

export function clarifiedOf(model: ShellModel, key: string): boolean {
    const entry = entryOf(model, key);
    const spec = model.project.specs.find((candidate) => candidate.key === key);
    if (entry === undefined || spec === undefined) {
        return false;
    }
    return entry.modifiedMs !== spec.modifiedMs || entry.size !== spec.size;
}
