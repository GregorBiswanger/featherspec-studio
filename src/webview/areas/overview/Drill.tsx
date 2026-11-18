import type { ReactNode } from 'react';

export function Drill(props: { id: string; onActivate: () => void; children: ReactNode; className?: string; state?: string; title?: string; describedBy?: string }) {
    return (
        <button
            type="button"
            className={props.className ?? 'ov-drill'}
            data-drill={props.id}
            data-board-state={props.state}
            title={props.title}
            aria-describedby={props.describedBy}
            onClick={props.onActivate}
        >
            {props.children}
        </button>
    );
}
