import { describe, expect, it } from 'vitest';
import { HISTORY_REASON_UNREADABLE, HISTORY_UNAVAILABLE_TEXT, historyUnavailableText } from './historyTexts';

describe('final check 7: the status history texts live in one module', () => {
    it('says Status history not available, with the reason when there is one', () => {
        expect(HISTORY_UNAVAILABLE_TEXT).toBe('Status history not available');
        expect(historyUnavailableText()).toBe('Status history not available');
        expect(historyUnavailableText('locked')).toBe('Status history not available: locked');
    });

    it('names an unknown reason in user language, with no implementation word', () => {
        expect(HISTORY_REASON_UNREADABLE).toBe('it could not be read');
        expect(HISTORY_REASON_UNREADABLE).not.toContain('store');
    });
});
