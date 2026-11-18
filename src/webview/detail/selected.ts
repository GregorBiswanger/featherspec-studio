import type { SelectedSpec } from '../../shared/protocol/messages';

export function isSelectedSpec(selection: SelectedSpec | undefined, reference: { stem: string; path?: string | undefined }): boolean {
    if (selection === undefined || selection.stem !== reference.stem) {
        return false;
    }
    return selection.path === undefined || reference.path === undefined || selection.path === reference.path;
}
