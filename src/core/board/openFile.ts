import * as path from 'path';
import { fileNotFoundText } from '../../shared/protocol/texts';
import type { EditorPort } from '../ports/board';
import type { ShellModelSource } from '../ports/shell';

export type OpenFileResult = { kind: 'opened' } | { kind: 'refused' } | { kind: 'not-found'; text: string };

export interface OpenFile {
    open(key: string, line?: number): Promise<OpenFileResult>;
}

export function createOpenFile(deps: { source: ShellModelSource; editor: EditorPort }): OpenFile {
    return {
        async open(key, line) {
            const model = deps.source.current();
            const keys = new Set<string>();
            model?.project.specs.forEach((spec) => keys.add(spec.key));
            model?.project.plans.forEach((plan) => keys.add(plan.key));
            model?.project.returnNotes.forEach((note) => keys.add(note.key));
            const inside = key !== '' && !path.posix.isAbsolute(key) && path.posix.normalize(key) === key && !key.startsWith('../') && key !== '..';
            if (model === undefined || !inside || !keys.has(key)) {
                return { kind: 'refused' };
            }
            const outcome = await (line === undefined ? deps.editor.open(model.project.root, key) : deps.editor.open(model.project.root, key, line));
            return outcome === 'opened' ? { kind: 'opened' } : { kind: 'not-found', text: fileNotFoundText(key) };
        },
    };
}
