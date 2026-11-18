import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StatusHistoryItem } from './detail';
import { HISTORY_LABEL, historyEntryText, historyTooltip, updatedText, whenText } from './texts';

const NOW = new Date(2026, 10, 17, 22, 30);
const at = (day: number, hour: number, minute: number, month = 10) => new Date(2026, month, day, hour, minute).toISOString();

function item(overrides: Partial<StatusHistoryItem>): StatusHistoryItem {
    return { observedAt: at(17, 21, 56), old: null, new: 'Review', rule: 'S-REVIEW', cause: { kind: 'first-observed', paths: [] }, flow: 'not checked', ...overrides };
}

afterEach(() => {
    vi.useRealTimers();
});

describe('0016 AC-015: times as sentences (T-02, T-17, §6.4)', () => {
    it('says Today HH:MM, Yesterday HH:MM by calendar day, else the full date', () => {
        expect(whenText(at(17, 21, 56), NOW)).toBe('Today 21:56');
        expect(whenText(at(16, 23, 59), NOW)).toBe('Yesterday 23:59');
        expect(whenText(at(15, 9, 5), NOW)).toBe('2026-11-15 09:05');
    });

    it('Q-9: yesterday is the previous calendar day, not 24 hours; across midnight it flips', () => {
        const justAfterMidnight = new Date(2026, 10, 17, 0, 10);
        expect(whenText(at(16, 23, 50), justAfterMidnight)).toBe('Yesterday 23:50');
        expect(whenText(at(16, 0, 5), new Date(2026, 10, 17, 23, 59))).toBe('Yesterday 00:05');
        expect(whenText(at(16, 0, 5), new Date(2026, 10, 18, 0, 1))).toBe('2026-11-16 00:05');
        expect(whenText(at(31, 8, 0, 9), new Date(2026, 10, 1, 8, 0))).toBe('Yesterday 08:00');
    });

    it('leaves an unparsable value as it is stored', () => {
        expect(whenText('not a time', NOW)).toBe('not a time');
        expect(updatedText('not a time', NOW)).toBe('Updated not a time');
    });

    it('T-02: the header reads Updated HH:MM today, else Updated with the full date', () => {
        expect(updatedText(at(17, 9, 5), NOW)).toBe('Updated 09:05');
        expect(updatedText(at(16, 9, 5), NOW)).toBe('Updated 2026-11-16 09:05');
        expect(updatedText(at(1, 9, 5), NOW)).toBe('Updated 2026-11-01 09:05');
    });
});

describe('0016 AC-015: history entries (T-14, T-15, §6.4)', () => {
    it('first observed reads "first seen as <new>"', () => {
        expect(historyEntryText(item({}), NOW)).toBe('Today 21:56 — first seen as Review');
    });

    it('files changed reads "<old> → <new>"', () => {
        const entry = item({ old: 'Active', cause: { kind: 'files', paths: ['.specs/active/0001-a.plan.md'] } });
        expect(historyEntryText(entry, NOW)).toBe('Today 21:56 — Active → Review');
    });

    it('a change while Studio was not running says so', () => {
        const entry = item({ old: 'Active', cause: { kind: 'changed-while-not-running', paths: [] } });
        expect(historyEntryText(entry, NOW)).toBe('Today 21:56 — Active → Review (changed while Studio was not running)');
    });

    it('a spec that left the project reads "no longer in the project"', () => {
        const entry = item({ old: 'Done', new: null, rule: null, cause: { kind: 'no-longer-observed', paths: [] } });
        expect(historyEntryText(entry, NOW)).toBe('Today 21:56 — Done → no longer in the project');
    });

    it('only the flow marker "outside the FeatherSpec flow" adds a suffix', () => {
        const base = { old: 'Active', cause: { kind: 'files' as const, paths: ['a'] } };
        expect(historyEntryText(item({ ...base, flow: 'outside the FeatherSpec flow' }), NOW)).toBe('Today 21:56 — Active → Review (outside the FeatherSpec flow)');
        expect(historyEntryText(item({ ...base, flow: 'in flow' }), NOW)).toBe('Today 21:56 — Active → Review');
        expect(historyEntryText(item({ ...base, flow: 'not checked' }), NOW)).toBe('Today 21:56 — Active → Review');
    });

    it('the visible entry text holds no rule ID, ISO time, "observed" or "not checked"', () => {
        const entry = item({ old: 'Active', cause: { kind: 'files', paths: ['x.md'] } });
        expect(historyEntryText(entry, NOW)).not.toMatch(/S-REVIEW|T\d\d:\d\d:\d\d|observed|not checked|Z\b/);
    });

    it('Q-2: the tooltip holds the stored time, the rule ID and the changed paths; empty parts are left out', () => {
        const entry = item({ old: 'Active', cause: { kind: 'files', paths: ['a.md', 'b.md'] } });
        expect(historyTooltip(entry)).toBe(`${entry.observedAt} · rule S-REVIEW · a.md, b.md`);
        expect(historyTooltip(item({}))).toBe(`${at(17, 21, 56)} · rule S-REVIEW`);
        expect(historyTooltip(item({ rule: null, cause: { kind: 'no-longer-observed', paths: [] } }))).toBe(at(17, 21, 56));
    });

    it('T-15: the label', () => {
        expect(HISTORY_LABEL).toBe('Only changes Studio saw while it was running.');
    });
});
