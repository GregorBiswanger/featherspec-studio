import { describe, expect, it } from 'vitest';
import { TREE_BUDGET, TITLE_FLOOR, treeLabel } from './treeLabel';

const SHORT_FORMS = ['/sdd-lifecycle', '/sdd-overview', '/sdd-plan', '/sdd-compile', '/sdd-specify', '/sdd-clarify', 'Start T-003', 'Start T-12', 'Implement', 'Backlog', 'Ready', 'Active', 'Review', 'Blocked', 'Done', 'Deprecated'];
const WORDS = 'Restaurant Rechnung mit Trinkgeld Aufteilung fuer Gruppen und einzelne Gaeste im Lokal heute';

function titleOf(length: number): string {
    return WORDS.repeat(2).slice(0, length).trimEnd() || 'A';
}

describe('0022 AC-005: the label budget of a tree row', () => {
    it('gives the title 32 minus the number, its space and the description, and cuts a longer title at a word', () => {
        const result = treeLabel({ number: '0001', title: 'Restaurant-Rechnung mit Trinkgeld', description: '/sdd-compile' });
        expect(TREE_BUDGET).toBe(32);
        expect(result).toEqual({ label: '0001 Restaurant-Rec…', description: '/sdd-compile' });
        expect(treeLabel({ number: '0002', title: 'Alpha Beta Gamma Delta Epsilon', description: '/sdd-plan' })).toEqual({ label: '0002 Alpha Beta Gamma…', description: '/sdd-plan' });
    });

    it('does not cut a title that fits its room exactly, and cuts one that is a character longer', () => {
        const room = TREE_BUDGET - 5 - '/sdd-plan'.length;
        const fits = 'a'.repeat(room);
        expect(treeLabel({ number: '0001', title: fits, description: '/sdd-plan' }).label).toBe(`0001 ${fits}`);
        expect(treeLabel({ number: '0001', title: `${fits}b`, description: '/sdd-plan' }).label).not.toBe(`0001 ${fits}b`);
    });

    it('raises a room below 12 to 12 and cuts nothing shorter', () => {
        const description = 'a description of twenty-four';
        const result = treeLabel({ number: '0001', title: 'Restaurant Rechnung mit Trinkgeld', description });
        expect(TITLE_FLOOR).toBe(12);
        expect(result.description).toBe(description);
        expect(result.label).toBe('0001 Restaurant…');
        expect(result.label.length - '0001 '.length).toBeLessThanOrEqual(TITLE_FLOOR + 1);
    });

    it('swaps a description that carries an intent for the command short form alone when the room is below 12, and recomputes the room', () => {
        const result = treeLabel({ number: '0001', title: 'Restaurant Rechnung mit Trinkgeld', description: 'Plan the spec first /sdd-plan', command: '/sdd-plan' });
        expect(result.description).toBe('/sdd-plan');
        expect(result.label).toBe('0001 Restaurant…');
    });

    it('keeps an intent that leaves a room of 12 or more', () => {
        const result = treeLabel({ number: '0001', title: 'Alpha Beta Gamma', description: 'Plan /sdd-plan', command: '/sdd-plan' });
        expect(result.description).toBe('Plan /sdd-plan');
    });

    it('never cuts the description', () => {
        for (const description of SHORT_FORMS) {
            expect(treeLabel({ number: '0001', title: titleOf(80), description }).description).toBe(description);
        }
    });

    it('sweeps titles of 1 to 80 characters against every step short form: at most 32 characters unless the room was raised to 12, and a fitting title is not cut', () => {
        for (const number of ['0001', '0123', '9999']) {
            for (const description of SHORT_FORMS) {
                for (let length = 1; length <= 80; length += 1) {
                    const title = titleOf(length);
                    const result = treeLabel({ number, title, description });
                    const room = TREE_BUDGET - (number.length + 1) - description.length;
                    const shown = result.label.slice(number.length + 1);
                    const where = `${number} ${description} ${length}`;
                    if (room >= TITLE_FLOOR) {
                        expect(result.label.length + result.description.length, where).toBeLessThanOrEqual(TREE_BUDGET);
                    } else {
                        expect(shown.length, where).toBeLessThanOrEqual(TITLE_FLOOR);
                    }
                    if (title.length <= Math.max(room, TITLE_FLOOR)) {
                        expect(shown, where).toBe(title);
                    }
                    expect(result.description, where).toBe(description);
                }
            }
        }
    });

    it('a four-digit number with an intent of 20 or more characters falls back to the command', () => {
        const result = treeLabel({ number: '0001', title: 'Title', description: 'Sketch the plan now /sdd-plan', command: '/sdd-plan' });
        expect(result.description).toBe('/sdd-plan');
    });
});

describe('0021 AC-006: the step short form in a tree row', () => {
    it('keeps the step short form where its room stays at 12 or more and drops the intent for the command where it does not', () => {
        expect(treeLabel({ number: '1', title: 'Alpha Beta Gamma Delta', description: 'Plan · /sdd-plan', command: '/sdd-plan' }).description).toBe('Plan · /sdd-plan');
        expect(treeLabel({ number: '0001', title: 'Alpha Beta Gamma Delta', description: 'Plan · /sdd-plan', command: '/sdd-plan' }).description).toBe('/sdd-plan');
        expect(treeLabel({ number: '0004', title: 'Reviewing', description: 'Verify · /sdd-compile', command: '/sdd-compile' }).description).toBe('/sdd-compile');
    });
});
