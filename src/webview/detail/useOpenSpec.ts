import { useCallback } from 'react';
import { useShell } from '../shell';
import { rememberOpener } from './opener';

export interface SpecReference {
    stem: string;
    path?: string | undefined;
}

export function useOpenSpec(): (reference: SpecReference, opener: HTMLElement | undefined) => void {
    const shell = useShell();
    const select = shell.select;
    return useCallback(
        (reference, opener) => {
            rememberOpener(opener);
            select(reference.path === undefined ? { stem: reference.stem } : { stem: reference.stem, path: reference.path });
        },
        [select],
    );
}
