import type { SelectionSource } from '../ports/board';
import type { ShellService } from '../shell/shellService';

export function createShellSelection(service: Pick<ShellService, 'view' | 'onDidChangeView'>): SelectionSource {
    return {
        selection() {
            const selected = service.view().selection;
            if (selected === undefined) {
                return undefined;
            }
            return selected.path === undefined ? { stem: selected.stem } : { stem: selected.stem, path: selected.path };
        },
        onDidChange: (listener) => service.onDidChangeView(() => listener()),
    };
}
