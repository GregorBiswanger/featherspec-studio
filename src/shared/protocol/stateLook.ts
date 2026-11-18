import type { BoardState } from './boardFilter';

export interface StateLook {
    motif: string;
    colour: string;
}

export const STATE_LOOK: Record<BoardState, StateLook> = {
    Backlog: { motif: 'list-flat', colour: 'descriptionForeground' },
    Ready: { motif: 'pass', colour: 'charts.blue' },
    Active: { motif: 'play', colour: 'charts.green' },
    Review: { motif: 'eye', colour: 'charts.orange' },
    Blocked: { motif: 'circle-slash', colour: 'charts.red' },
    Done: { motif: 'check', colour: 'descriptionForeground' },
};
