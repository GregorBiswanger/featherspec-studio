import type { SpecRow } from '../../shared/protocol/messages';
import { headerValue } from '../lifecycle/entryContext';
import type { ShellModel } from '../ports/shell';
import type { RememberedSelection } from './uiMemory';

function compare(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

export function buildSpecRows(model: ShellModel | undefined, selection: RememberedSelection | undefined): SpecRow[] {
    if (model === undefined) {
        return [];
    }
    const titles = new Map(model.project.specs.map((spec) => [spec.key, headerValue(spec.parsed?.title)]));
    const stemCounts = new Map<string, number>();
    for (const entry of model.lifecycle.entries) {
        stemCounts.set(entry.stem, (stemCounts.get(entry.stem) ?? 0) + 1);
    }
    return [...model.lifecycle.entries]
        .sort((left, right) => compare(left.number, right.number) || compare(left.key, right.key))
        .map((entry) => {
            const duplicated = (stemCounts.get(entry.stem) ?? 0) > 1;
            return {
                stem: entry.stem,
                path: entry.key,
                number: entry.number,
                title: titles.get(entry.key),
                state: entry.state,
                derivedLabel: entry.derivedLabel,
                showPath: duplicated,
                selected:
                    selection !== undefined &&
                    selection.stem === entry.stem &&
                    (!duplicated || selection.path === undefined || selection.path === entry.key),
            };
        });
}
