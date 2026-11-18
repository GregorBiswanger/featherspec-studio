import { describe, expect, it } from 'vitest';
import { copyLine } from './copyLine';

const LINE = 'Start T-001 of .specs/backlog/0002-r.plan.md';

describe('copyLine', () => {
    it('0015 AC-005, AC-009: copyLine reports the panel texts for success and failure', async () => {
        const written: string[] = [];
        expect(await copyLine({ writeText: async (text) => void written.push(text) }, LINE)).toEqual({ ok: true, text: 'Copied to the clipboard.' });
        expect(written).toEqual([LINE]);
        expect(await copyLine({ writeText: async () => Promise.reject(new Error('no')) }, LINE)).toEqual({ ok: false, text: 'Could not copy to the clipboard.' });
    });
});
