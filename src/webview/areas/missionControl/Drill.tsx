import type { ReactNode } from 'react';

export function Drill(props: { id: string; onActivate: () => void; children: ReactNode }) {
    return (
        <button type="button" className="mc-drill" data-drill={props.id} onClick={props.onActivate}>
            {props.children}
        </button>
    );
}
