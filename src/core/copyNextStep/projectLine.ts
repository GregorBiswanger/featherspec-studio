import type { Disposable, StatusBarPort } from '../ports/host';

export type ProjectLineState = { visible: false } | { visible: true; text: string };

export interface ProjectLine extends StatusBarPort {
    current(): ProjectLineState;
    onDidChange(listener: () => void): Disposable;
}

export function createProjectLine(): ProjectLine {
    let state: ProjectLineState = { visible: false };
    const listeners = new Set<() => void>();

    function changed(next: ProjectLineState): void {
        state = next;
        for (const listener of [...listeners]) {
            try {
                listener();
            } catch {
                continue;
            }
        }
    }

    return {
        show(text) {
            changed({ visible: true, text });
        },
        hide() {
            changed({ visible: false });
        },
        current: () => state,
        onDidChange(listener) {
            listeners.add(listener);
            return { dispose: () => void listeners.delete(listener) };
        },
    };
}
