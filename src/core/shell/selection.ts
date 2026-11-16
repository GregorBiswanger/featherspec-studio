import type { ShellModel } from '../ports/shell';
import type { RememberedSelection } from './uiMemory';

export interface ReconcileInput {
    selection: RememberedSelection | undefined;
    activeRoot: string | undefined;
    model: ShellModel | undefined;
    sameRoot: (first: string, second: string) => boolean;
}

export interface Reconciled {
    selection: RememberedSelection | undefined;
    notice: { number: string } | undefined;
}

export function numberOfStem(stem: string): string {
    return /^\d+/.exec(stem)?.[0] ?? stem;
}

export function findSpec(model: ShellModel, stem: string, path: string | undefined): { stem: string; path: string } | undefined {
    const matches = model.lifecycle.entries.filter((entry) => entry.stem === stem);
    if (matches.length === 0) {
        return undefined;
    }
    const chosen = (path === undefined ? undefined : matches.find((entry) => entry.key === path)) ?? matches[0];
    return chosen === undefined ? undefined : { stem, path: chosen.key };
}

export function reconcileSelection(input: ReconcileInput): Reconciled {
    const { selection, activeRoot, model } = input;
    if (selection === undefined) {
        return { selection: undefined, notice: undefined };
    }
    if (activeRoot === undefined) {
        return { selection, notice: undefined };
    }
    if (!input.sameRoot(selection.projectRoot, activeRoot)) {
        return { selection: undefined, notice: undefined };
    }
    if (model === undefined || !input.sameRoot(model.project.root, activeRoot)) {
        return { selection, notice: undefined };
    }
    const found = findSpec(model, selection.stem, selection.path);
    if (found === undefined) {
        return { selection: undefined, notice: { number: numberOfStem(selection.stem) } };
    }
    const duplicated = model.lifecycle.entries.filter((entry) => entry.stem === selection.stem).length > 1;
    return {
        selection: duplicated
            ? { projectRoot: selection.projectRoot, stem: selection.stem, path: found.path }
            : { projectRoot: selection.projectRoot, stem: selection.stem },
        notice: undefined,
    };
}
