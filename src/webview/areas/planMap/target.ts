import type { ShellFocus } from '../../../shared/protocol/messages';

let appliedN = 0;

export function focusFor(focus: ShellFocus | undefined, stem: string, path: string | undefined): ShellFocus | undefined {
    if (focus === undefined || focus.n <= appliedN || focus.stem !== stem || (focus.path !== undefined && focus.path !== path)) {
        return undefined;
    }
    return focus;
}

export function markApplied(focus: ShellFocus): void {
    appliedN = Math.max(appliedN, focus.n);
}

export function forgetTarget(): void {
    appliedN = 0;
}

export const HIGHLIGHT_MS = 1500;
