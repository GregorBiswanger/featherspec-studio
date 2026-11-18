import type { ReactNode } from 'react';

export function Drill(props: { id: string; onActivate: (element: HTMLButtonElement) => void; current?: boolean; children: ReactNode; className?: string; state?: string; title?: string; describedBy?: string }) {
    return (
        <button
            type="button"
            className={props.className ?? 'ov-drill'}
            data-drill={props.id}
            data-board-state={props.state}
            title={props.title}
            aria-describedby={props.describedBy}
            {...(props.current === true ? { 'aria-current': 'true' as const } : {})}
            onClick={(event) => props.onActivate(event.currentTarget)}
        >
            {props.children}
        </button>
    );
}
