import { useSyncExternalStore } from 'react';

// The one open popup of the webview: a toggletip or a split button's menu. Opening one closes the other.
let openId: string | undefined;
const listeners = new Set<() => void>();

export function currentPopup(): string | undefined {
    return openId;
}

export function setPopup(next: string | undefined): void {
    if (openId === next) {
        return;
    }
    openId = next;
    for (const listener of [...listeners]) {
        listener();
    }
}

export function closePopup(id: string): void {
    if (openId === id) {
        setPopup(undefined);
    }
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function useIsPopupOpen(id: string): boolean {
    return useSyncExternalStore(subscribe, currentPopup) === id;
}

// A split button that leaves with focus inside hands focus to the Copy prompt that takes its place (0024 AC-010).
let focusHandoff = false;

export function offerFocusHandoff(): void {
    focusHandoff = true;
    queueMicrotask(() => {
        focusHandoff = false;
    });
}

export function takeFocusHandoff(): boolean {
    const taken = focusHandoff;
    focusHandoff = false;
    return taken;
}
