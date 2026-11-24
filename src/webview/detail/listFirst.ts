import { useSyncExternalStore } from 'react';

let listFirst = false;
const listeners = new Set<() => void>();

function set(value: boolean): void {
    if (listFirst !== value) {
        listFirst = value;
        listeners.forEach((listener) => listener());
    }
}

export function showList(): void {
    set(true);
}

export function showDetail(): void {
    set(false);
}

export function useListFirst(): boolean {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => void listeners.delete(listener);
        },
        () => listFirst,
    );
}
