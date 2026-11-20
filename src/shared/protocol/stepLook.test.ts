import { describe, expect, it } from 'vitest';
import { STEP_LOOK } from './stepLook';

describe('0025 AC-014 STEP_LOOK', () => {
    it('0025 AC-014: U-01 literally, with colours from theme variable IDs', () => {
        expect(STEP_LOOK).toEqual({
            done: { motif: 'check', colour: 'descriptionForeground' },
            next: { motif: 'debug-stackframe', colour: 'focusBorder' },
            open: { motif: 'circle-large-outline', colour: 'descriptionForeground' },
            returned: { motif: 'reply', colour: 'descriptionForeground' },
            returnedBlocked: { motif: 'circle-slash', colour: 'charts.red' },
            notFound: { motif: 'question', colour: 'descriptionForeground' },
            dropped: { motif: undefined, colour: 'descriptionForeground' },
        });
    });
});
