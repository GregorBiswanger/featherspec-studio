import { describe, expect, it } from 'vitest';
import { sendTipText } from '../../shared/protocol/assistantTexts';
import { TIP_CLOSING } from '../../shared/protocol/nextStepTexts';
import { tipClosingOf } from './sendView';

describe('0035 T-006 / AC-022: the toggletip closing for Copy for', () => {
    it('AC-022 a Copy for offer gives §7 sentence with the place; the settings sentence stays', () => {
        expect(tipClosingOf({ assistant: 'copilot', handover: 'copyFor', place: 'GitHub Copilot Chat' })).toEqual([
            'Copy for Copilot copies the prompt with the file paths and sends nothing: paste it into GitHub Copilot Chat, choose the model there, check the prompt, then send it.',
            TIP_CLOSING[1],
        ]);
        expect(tipClosingOf({ assistant: 'junie', handover: 'copyFor', place: 'Junie in AI Chat' })[0]).toBe(
            'Copy for Junie copies the prompt with the file paths and sends nothing: paste it into Junie in AI Chat, choose the model there, check the prompt, then send it.',
        );
    });

    it('AC-022 an offer without handover keeps 0024 sentence', () => {
        expect(tipClosingOf({ assistant: 'claudeCode' })).toEqual([sendTipText('Claude Code'), TIP_CLOSING[1]]);
        expect(tipClosingOf({ assistant: 'copilot' })).toEqual([sendTipText('Copilot'), TIP_CLOSING[1]]);
        expect(tipClosingOf(undefined)).toEqual(TIP_CLOSING);
    });
});
