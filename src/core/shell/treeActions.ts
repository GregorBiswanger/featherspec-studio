import { fileNotFoundText } from '../../shared/protocol/texts';
import type { OpenFile } from '../board/openFile';
import type { StudioPanelPort } from '../ports/shell';
import type { ShellService, SpecReference } from './shellService';
import type { SpecRowModel } from './specTree';

export interface TreeActionsDeps {
    shell: Pick<ShellService, 'open' | 'select'>;
    panel: StudioPanelPort;
    copy: (line: string) => Promise<void>;
    openFile: Pick<OpenFile, 'open'>;
    warn: (text: string) => void;
}

export interface TreeActions {
    select(reference: SpecReference): void;
    copy(row: Pick<SpecRowModel, 'line'>): Promise<void>;
    open(row: Pick<SpecRowModel, 'specKey' | 'planKey'>, which: 'spec' | 'plan'): Promise<void>;
}

export function createTreeActions(deps: TreeActionsDeps): TreeActions {
    return {
        select(reference) {
            if (!deps.panel.isOpen()) {
                deps.shell.open({ via: 'start' });
            }
            deps.shell.select(reference);
            deps.panel.show({ preserveFocus: true });
        },
        async copy(row) {
            if (row.line !== undefined) {
                await deps.copy(row.line);
            }
        },
        async open(row, which) {
            const key = which === 'spec' ? row.specKey : row.planKey;
            if (key === undefined) {
                return;
            }
            const result = await deps.openFile.open(key, 1, 'activeGroup');
            if (result.kind === 'not-found') {
                deps.warn(result.text);
            } else if (result.kind === 'refused') {
                deps.warn(fileNotFoundText(key));
            }
        },
    };
}
