import { afterEach, describe, expect, it } from 'vitest';
import { DERIVED_SENTENCES, derivedTooltip, persistedTooltip } from '../../shared/protocol/texts';
import { mount, type Mounted } from '../testing/dom';
import { RuleText } from './RuleText';

let mounted: Mounted | undefined;
afterEach(() => {
    mounted?.unmount();
    mounted = undefined;
});

describe('0013 AC-010, 0016 AC-011 RuleText', () => {
    it('AC-011: shows the sentence only; the rule ID is in the tooltip, never in the text', async () => {
        mounted = await mount(<RuleText text={DERIVED_SENTENCES['S-REVIEW']} tooltip={derivedTooltip('S-REVIEW')} />);
        const root = mounted.container.querySelector('.rule-text');
        expect(root?.querySelector('.rule-sentence')?.textContent).toBe('Plan done, waiting for review');
        expect(root?.getAttribute('title')).toBe('Derived from the files · rule S-REVIEW');
        expect(root?.textContent).not.toMatch(/S-REVIEW/);
        expect(root?.querySelector('.rule-id')).toBeNull();
    });

    it('T-08, T-10: the two tooltips read as the spec says', () => {
        expect(derivedTooltip('S-READY')).toBe('Derived from the files · rule S-READY');
        expect(persistedTooltip('S-BACKLOG')).toBe('Read from the files · rule S-BACKLOG');
    });

    it('§3.5: the three derived-rule sentences', () => {
        expect(DERIVED_SENTENCES).toEqual({
            'S-READY': 'Plan written, not started yet',
            'S-REVIEW': 'Plan done, waiting for review',
            'S-BLOCKED': 'Plan or return note says Blocked',
        });
    });
});
