import type { ShellModel } from '../ports/shell';

export function isSpecNotFound(stem: string, model: ShellModel | undefined): boolean {
    return model !== undefined && !model.lifecycle.entries.some((entry) => entry.stem === stem);
}
