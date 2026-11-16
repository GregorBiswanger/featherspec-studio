import type { ReactNode } from 'react';

export function Drill(props: { id: string; onActivate: () => void; children: ReactNode; className?: string; state?: string }) {
    return (
        <button type="button" className={props.className ?? 'mc-drill'} data-drill={props.id} data-board-state={props.state} onClick={props.onActivate}>
            {props.children}
        </button>
    );
}
