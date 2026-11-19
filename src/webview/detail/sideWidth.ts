import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { clampSideWidth, isSideFraction, maxSideWidth, sideWidthOf } from '../../shared/protocol/layout';

export interface SideWidth {
    frame: number;
    width: number;
    max: number;
    right(): number;
    preview(width: number): void;
    commit(width: number): void;
    reset(): void;
}

export interface SideWidthRequests {
    set(fraction: number): void;
    reset(): void;
}

function useFrameWidth(element: HTMLElement | null): number {
    const [width, setWidth] = useState(0);
    useLayoutEffect(() => {
        if (element === null) {
            setWidth(0);
            return undefined;
        }
        const measure = (): void => setWidth(Math.round(element.getBoundingClientRect().width));
        measure();
        if (typeof ResizeObserver === 'function') {
            const observer = new ResizeObserver(measure);
            observer.observe(element);
            return () => observer.disconnect();
        }
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [element]);
    return width;
}

export function useSideWidth(frameElement: HTMLElement | null, remembered: number | undefined, requests: SideWidthRequests): SideWidth {
    const frame = useFrameWidth(frameElement);
    const [local, setLocal] = useState<{ fraction: number | undefined } | undefined>(undefined);
    const pending = useRef<(number | undefined)[]>([]);
    const previewing = useRef(false);
    useEffect(() => {
        const index = pending.current.indexOf(remembered);
        if (index < 0) {
            pending.current = [];
            previewing.current = false;
            setLocal(undefined);
            return;
        }
        pending.current = pending.current.slice(index + 1);
        if (pending.current.length === 0 && !previewing.current) {
            setLocal(undefined);
        }
    }, [remembered]);
    const width = sideWidthOf(local === undefined ? remembered : local.fraction, frame);
    const { set, reset: sendReset } = requests;
    const preview = useCallback(
        (next: number): void => {
            const fraction = clampSideWidth(next, frame) / frame;
            if (isSideFraction(fraction)) {
                previewing.current = true;
                setLocal({ fraction });
            }
        },
        [frame],
    );
    const commit = useCallback(
        (next: number): void => {
            const fraction = clampSideWidth(next, frame) / frame;
            if (isSideFraction(fraction)) {
                previewing.current = false;
                pending.current.push(fraction);
                setLocal({ fraction });
                set(fraction);
            }
        },
        [frame, set],
    );
    const reset = useCallback((): void => {
        previewing.current = false;
        pending.current.push(undefined);
        setLocal({ fraction: undefined });
        sendReset();
    }, [sendReset]);
    const right = useCallback((): number => frameElement?.getBoundingClientRect().right ?? 0, [frameElement]);
    return { frame, width, max: maxSideWidth(frame), right, preview, commit, reset };
}
