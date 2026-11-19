import type { AreaId } from '../../shared/protocol/areas';
import { BOARD_STATES, type BoardState } from '../../shared/protocol/boardFilter';
import type { StepLookKey } from '../../shared/protocol/planMapTexts';
import { STATE_LOOK } from '../../shared/protocol/stateLook';
import { STEP_LOOK } from '../../shared/protocol/stepLook';

const MOTIF_PATHS: Record<string, string> = {
    'list-flat': 'M2 3h12v2H2zM2 7h12v2H2zM2 11h8v2H2z',
    pass: 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm-1 10L4 8l1.4-1.4L7 8.2l3.6-3.6L12 6z',
    play: 'M4 2l10 6-10 6z',
    eye: 'M8 3C4 3 1.5 8 1.5 8S4 13 8 13s6.5-5 6.5-5S12 3 8 3zm0 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6z',
    check: 'M6 12L2 8l1.4-1.4L6 9.2l6.6-6.6L14 4z',
    'circle-slash': 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zM5.2 4.1l6.7 6.7-1.1 1.1-6.7-6.7z',
};

const PATHS: Record<string, string> = {
    diagnostic: 'M8 1l7 13H1zM7.2 6h1.6v4H7.2zM7.2 11h1.6v1.6H7.2z',
    derived: 'M8 1l2 5h5l-4 3 1.5 5L8 11l-4.5 3L5 9 1 6h5z',
    deprecated: 'M3 3l10 10M13 3L3 13',
    failed: 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm2.8 4.6L9.4 8l1.4 1.4-1.4 1.4L8 9.4l-1.4 1.4-1.4-1.4L6.6 8 5.2 6.6l1.4-1.4L8 6.6l1.4-1.4z',
    interrupted: 'M4 2h3v12H4zM9 2h3v12H9z',
    waiting: 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zM7.25 4v4.6l3.3 2 .8-1.3-2.6-1.5V4z',
    ticked: 'M3 2h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm4 9.4l5-5-1.1-1.1L7 9.2 5.1 7.3 4 8.4z',
    unticked: 'M3 2h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm.5 1.5v9h9v-9z',
    undetermined: 'M3 2h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm.5 1.5v9h9v-9zM5 7.25h6v1.5H5z',
    chevron: 'M5.7 3.3L10.4 8l-4.7 4.7-1.1-1.1L8.2 8 4.6 4.4z',
    chevronDown: 'M3.3 5.7L8 10.4l4.7-4.7 1.1 1.1L8 12.6 2.2 6.8z',
    folder: 'M1.5 2.5h5l1.5 1.5h6.5v9.5h-13zM3 5.5v6.5h10V5.5z',
    copy: 'M5.5 1.5h8v9h-2v-7.5h-6zM2.5 4.5h8v10h-8zm1.5 1.5v7h5v-7z',
    check: MOTIF_PATHS.check!,
    info: 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zM7.25 7h1.5v4.5h-1.5zM7.25 4.5h1.5V6h-1.5z',
    empty: 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zM5 7.25h6v1.5H5z',
};

export type GlyphKind = 'diagnostic' | 'derived' | 'deprecated' | 'failed' | 'interrupted' | 'waiting' | 'empty' | 'ticked' | 'unticked' | 'undetermined' | 'chevron' | 'chevronDown' | 'folder' | 'info' | 'copy' | 'check' | BoardState;

function isState(kind: GlyphKind): kind is BoardState {
    return (BOARD_STATES as readonly string[]).includes(kind);
}

function pathOf(kind: GlyphKind): string | undefined {
    return isState(kind) ? MOTIF_PATHS[STATE_LOOK[kind].motif] : PATHS[kind];
}

export function Glyph(props: { kind: GlyphKind }) {
    return (
        <svg className="icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" fillRule="evenodd" aria-hidden="true" focusable="false" data-icon={props.kind}>
            <path d={pathOf(props.kind)} />
        </svg>
    );
}

export function StateIcon(props: { state: BoardState }) {
    const look = STATE_LOOK[props.state];
    return (
        <svg className="icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" fillRule="evenodd" aria-hidden="true" focusable="false" data-icon={props.state} data-motif={look.motif} data-tint={look.colour}>
            <path d={MOTIF_PATHS[look.motif]} />
        </svg>
    );
}

const STEP_MOTIF_PATHS: Record<string, string> = {
    check: MOTIF_PATHS.check!,
    'circle-slash': MOTIF_PATHS['circle-slash']!,
    'debug-stackframe': 'M2 5h6V2l6 6-6 6v-3H2z',
    'circle-large-outline': 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z',
    reply: 'M6 2.5L1 7.5l5 5v-3c3.5 0 6 .8 8 3.5-.5-4.5-3-8-8-8.5z',
    question: 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zM7.25 10.5h1.5V12h-1.5zM6 6.4C6 5.1 6.9 4.3 8 4.3s2 .8 2 1.9c0 1.4-1.5 1.5-1.5 2.8H7.3c0-1.8 1.2-1.9 1.2-2.8 0-.4-.2-.6-.5-.6s-.5.3-.5.8z',
};

/** 0025 §5.5: the step's codicon motif, drawn as the panel's glyphs are (PD-054); a dropped step has none. */
export function StepIcon(props: { look: StepLookKey }) {
    const look = STEP_LOOK[props.look];
    if (look.motif === undefined) {
        return null;
    }
    return (
        <svg className="icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" fillRule="evenodd" aria-hidden="true" focusable="false" data-icon={`step-${props.look}`} data-motif={look.motif} data-tint={look.colour}>
            <path d={STEP_MOTIF_PATHS[look.motif]} />
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

const AREA_PATHS: Record<AreaId, string> = {
    overview: 'M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zm0 1.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zM10.6 4.7l.9.9-2.4 2.9a1.25 1.25 0 1 1-1-.8z',
    board: 'M2 2h5v12H2zm1.5 1.5v9h2v-9zM9 2h5v5H9zm1.5 1.5v2h2v-2zM9 9h5v5H9zm1.5 1.5v2h2v-2z',
    planMap: 'M2 2h5v3H2zM3.5 5h1.5v9H3.5zM7 7h7v3H7zM5 7.75h2v1.5H5zM7 11.5h7v3H7zM5 12.25h2v1.5H5z',
};

const AREA_MOTIFS: Partial<Record<AreaId, string>> = { planMap: 'type-hierarchy-sub' };

export function AreaIcon(props: { area: AreaId }) {
    return (
        <svg className="icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" fillRule="evenodd" aria-hidden="true" focusable="false" data-icon={props.area} {...(AREA_MOTIFS[props.area] === undefined ? {} : { 'data-motif': AREA_MOTIFS[props.area] })}>
            <path d={AREA_PATHS[props.area]} />
        </svg>
    );
}
