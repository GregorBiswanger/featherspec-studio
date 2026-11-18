import type { SpecRef } from '../../shared/protocol/overview';
import { titleOf } from '../board/cards';
import type { LifecycleEntry } from '../lifecycle/model';
import type { ShellModel } from '../ports/shell';
import { numberOfStem } from '../shell/selection';

export interface SpecResolver {
    forEntry(entry: LifecycleEntry): SpecRef;
    forStem(stem: string): SpecRef;
    entriesOf(stem: string): LifecycleEntry[];
}

export function createSpecResolver(model: ShellModel): SpecResolver {
    const titles = new Map(model.project.specs.map((spec) => [spec.key, titleOf(spec) ?? null]));
    const byStem = new Map<string, LifecycleEntry[]>();
    for (const entry of [...model.lifecycle.entries].sort((left, right) => (left.key < right.key ? -1 : left.key > right.key ? 1 : 0))) {
        byStem.set(entry.stem, [...(byStem.get(entry.stem) ?? []), entry]);
    }
    return {
        forEntry(entry) {
            const duplicated = (byStem.get(entry.stem)?.length ?? 0) > 1;
            const ref: SpecRef = { stem: entry.stem, number: entry.number, title: titles.get(entry.key) ?? null, found: true };
            if (duplicated) {
                ref.path = entry.key;
            }
            return ref;
        },
        forStem(stem) {
            const first = byStem.get(stem)?.[0];
            if (first === undefined) {
                return { stem, number: numberOfStem(stem), title: null, found: false };
            }
            return { stem, number: first.number, title: titles.get(first.key) ?? null, found: true };
        },
        entriesOf: (stem) => byStem.get(stem) ?? [],
    };
}
