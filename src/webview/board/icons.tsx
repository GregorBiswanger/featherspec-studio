import type { BoardState } from '../../shared/protocol/boardFilter';

const PATHS: Record<string, string> = {
    Backlog: 'M2 3h12v2H2zM2 7h12v2H2zM2 11h8v2H2z',
    Ready: 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm-1 10L4 8l1.4-1.4L7 8.2l3.6-3.6L12 6z',
    Active: 'M4 2l10 6-10 6z',
    Review: 'M8 3C4 3 1.5 8 1.5 8S4 13 8 13s6.5-5 6.5-5S12 3 8 3zm0 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6z',
    Done: 'M6 12L2 8l1.4-1.4L6 9.2l6.6-6.6L14 4z',
    Blocked: 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM4 7h8v2H4z',
    diagnostic: 'M8 1l7 13H1zM7.2 6h1.6v4H7.2zM7.2 11h1.6v1.6H7.2z',
    derived: 'M8 1l2 5h5l-4 3 1.5 5L8 11l-4.5 3L5 9 1 6h5z',
    deprecated: 'M3 3l10 10M13 3L3 13',
};

export function StateIcon(props: { state: BoardState }) {
    return (
        <svg className="icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false" data-icon={props.state}>
            <path d={PATHS[props.state]} />
        </svg>
    );
}

export function BadgeIcon(props: { kind: 'diagnostic' | 'derived' | 'deprecated' }) {
    return (
        <svg className="icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false" data-icon={props.kind}>
            <path d={PATHS[props.kind]} />
        </svg>
    );
}
