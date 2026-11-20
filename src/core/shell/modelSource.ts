import type { HandOverEntry, ShellModel, ShellModelSource } from '../ports/shell';
import type { Disposable } from '../ports/host';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import type { SpecRepository } from '../specs/specRepository';

export interface HandOverReader {
    read(root: string): Readonly<Record<string, HandOverEntry>>;
    onDidChange(listener: () => void): Disposable;
}

function sameEntries(a: Readonly<Record<string, HandOverEntry>> | undefined, b: Readonly<Record<string, HandOverEntry>>): boolean {
    if (a === undefined) {
        return false;
    }
    const keys = Object.keys(b);
    return keys.length === Object.keys(a).length && keys.every((key) => a[key] !== undefined && a[key].modifiedMs === b[key].modifiedMs && a[key].size === b[key].size);
}

export function createModelSource(repository: Pick<SpecRepository, 'snapshot' | 'readAt' | 'onDidChange'>, handOvers?: HandOverReader): ShellModelSource {
    let cached: ShellModel | undefined;
    let remembered: Readonly<Record<string, HandOverEntry>> | undefined;
    return {
        current() {
            const project = repository.snapshot();
            if (project === undefined) {
                cached = undefined;
                return undefined;
            }
            const entries = handOvers?.read(project.root);
            if (cached?.project !== project) {
                cached = { project, lifecycle: deriveLifecycle(project), ...(entries === undefined ? {} : { handOvers: entries }) };
                remembered = entries;
            } else if (entries !== undefined && !sameEntries(remembered, entries)) {
                cached = { ...cached, handOvers: entries };
                remembered = entries;
            }
            return cached;
        },
        updatedAt: () => repository.readAt() ?? '',
        onDidChange(listener) {
            const subscriptions = [repository.onDidChange(() => listener()), ...(handOvers === undefined ? [] : [handOvers.onDidChange(() => listener())])];
            return { dispose: () => subscriptions.forEach((subscription) => subscription.dispose()) };
        },
    };
}
