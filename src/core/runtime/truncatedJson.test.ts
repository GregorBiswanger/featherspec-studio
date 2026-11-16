import { describe, expect, it } from 'vitest';
import { isTruncatedJson } from './truncatedJson';

const RECORDS = [
    { v: 1, k: 'created', runId: 'r-1', providerId: 'fake', spec: { stem: '0011-x', path: '.specs/a.md' }, at: '2026-11-16T10:00:00.000Z' },
    { v: 1, k: 'status', status: 'Failed', at: '2026-11-16T10:00:00.000Z', errorMessage: 'say "no" \\ ä\n', result: [1, -2.5e3, true, false, null, { a: [] }] },
    { v: 1, seq: 4, runId: 'r-1', receivedAt: 'x', type: 'message', payload: { text: '\u0001 tab\t' } },
];

describe('isTruncatedJson (AC-021)', () => {
    it('is true for every strict prefix of every kind of record the store writes', () => {
        for (const record of RECORDS) {
            const text = JSON.stringify(record);
            for (let length = 1; length < text.length; length += 1) {
                expect(isTruncatedJson(text.slice(0, length)), text.slice(0, length)).toBe(true);
            }
        }
    });

    it('is false for a complete record, damaged text and text that is not an object', () => {
        const complete = JSON.stringify(RECORDS[0]);
        for (const text of [complete, `${complete}x`, '{{ this is not json', 'garbage', '{"v":1,]', '{"a":tru3}', '{"a":01}', '[1,2', '"abc', '', '   ']) {
            expect(isTruncatedJson(text), text).toBe(false);
        }
    });
});
