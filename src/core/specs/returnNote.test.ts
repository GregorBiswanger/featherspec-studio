import { describe, expect, it } from 'vitest';
import { parseReturnNote } from './returnNote';

const KEY = '.memory-bank/activeContext.0007-T-003.md';

describe('parseReturnNote', () => {
    it('AC-010: reads the status and the other fields of a DONE note', () => {
        const note = parseReturnNote(
            ['# Return note — 0007 · T-003', '', '- **Status:** DONE', '- **Files:** `a.ts`', '- **Verified:** 2026-11-16 · ok', '- **Notes:** —'].join('\n'),
            KEY,
        );
        expect(note.status).toEqual({ value: { state: 'value', raw: 'DONE' }, line: 3 });
        expect(note.files.value).toEqual({ state: 'value', raw: '`a.ts`' });
        expect(note.notes.value).toEqual({ state: 'placeholder', raw: '—' });
        expect(note.blockedOn.value).toEqual({ state: 'absent' });
        expect(note.diagnostics).toEqual([]);
    });

    it('AC-010: BLOCKED is a known status and Blocked on is read', () => {
        const note = parseReturnNote('- **Status:** BLOCKED\n- **Blocked on:** a question', KEY);
        expect(note.status.value).toEqual({ state: 'value', raw: 'BLOCKED' });
        expect(note.blockedOn.value).toEqual({ state: 'value', raw: 'a question' });
        expect(note.diagnostics).toEqual([]);
    });

    it('AC-014: a status that is not DONE or BLOCKED is kept as written with a diagnostic', () => {
        const note = parseReturnNote('- **Status:** DONE (one finding below)', KEY);
        expect(note.status.value).toEqual({ state: 'value', raw: 'DONE (one finding below)' });
        expect(note.diagnostics).toEqual([
            { kind: 'unknown-content', tier: 'problem', scope: { file: KEY, line: 1 }, reason: 'unknown status value "DONE (one finding below)"' },
        ]);
    });

    it('AC-019: a note without a Status line has the status absent and no default', () => {
        const note = parseReturnNote('# Return note\n\n- **Files:** x', KEY);
        expect(note.status.value).toEqual({ state: 'absent' });
        expect(note.diagnostics).toEqual([]);
    });
});
