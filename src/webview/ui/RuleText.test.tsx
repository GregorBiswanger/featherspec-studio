import { afterEach, describe, expect, it } from 'vitest';
import { DERIVED_SENTENCES } from '../../shared/protocol/texts';
import { mount, type Mounted } from '../testing/dom';
import { RuleText } from './RuleText';

let mounted: Mounted | undefined;
afterEach(() => {
    mounted?.unmount();
    mounted = undefined;
});

describe('0013 AC-010 RuleText', () => {
    it('AC-010: shows the sentence as primary text and the rule ID as secondary text only', async () => {
        mounted = await mount(<RuleText text={DERIVED_SENTENCES['S-REVIEW']} id="S-REVIEW" />);
        const root = mounted.container.querySelector('.rule-text');
        expect(root?.querySelector('.rule-sentence')?.textContent).toBe('Derived: plan is Done, waiting for review');
        expect(root?.querySelector('.rule-id')?.textContent).toBe('S-REVIEW');
        expect(root?.firstElementChild?.className).toBe('rule-sentence');
    });

    it('§3.5: the three derived-rule sentences', () => {
        expect(DERIVED_SENTENCES).toEqual({
            'S-READY': 'Derived: draft with a plan that has not started',
            'S-REVIEW': 'Derived: plan is Done, waiting for review',
            'S-BLOCKED': 'Derived: plan or return note says Blocked',
        });
    });
});
