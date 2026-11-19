import { useSyncExternalStore } from 'react';
import { NARROW_QUERY } from '../../shared/protocol/layout';

function media(): MediaQueryList | undefined {
    return typeof window.matchMedia === 'function' ? window.matchMedia(NARROW_QUERY) : undefined;
}

function subscribe(listener: () => void): () => void {
    const list = media();
    list?.addEventListener('change', listener);
    return () => list?.removeEventListener('change', listener);
}

function snapshot(): boolean {
    return media()?.matches ?? false;
}

export function useNarrow(): boolean {
    return useSyncExternalStore(subscribe, snapshot);
}
