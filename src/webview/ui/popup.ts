import { useSyncExternalStore } from 'react';

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
