import { describe, expect, it } from 'vitest';
import { COPY_FOR_PLACES, JUNIE_WINDOW_PLACE, copyForDoneText, copyForOpenText, copyForTipText, copyForWithoutText } from '../../shared/protocol/assistantTexts';
import { tipClosingOf } from './sendView';

describe('0035 review 20 S-4 / AC-034: Copy for Junie tells to choose Junie in AI Chat, because AI Chat starts with its recommended agent', () => {
    it('AC-034 the done text for Junie in AI Chat is literal and follows the paste key of the platform', () => {
        expect(copyForDoneText(COPY_FOR_PLACES.junie, 'Ctrl+V')).toBe('Copied. In AI Chat, choose Junie and paste it with Ctrl+V.');
        expect(copyForDoneText(COPY_FOR_PLACES.junie, 'Cmd+V')).toBe('Copied. In AI Chat, choose Junie and paste it with Cmd+V.');
    });

    it('AC-034 the done text with a file left out keeps its first part and names AI Chat and Junie', () => {
        expect(copyForWithoutText('a.md', COPY_FOR_PLACES.junie, 'Ctrl+V', true)).toBe('Copied without a.md: the file was not found. In AI Chat, choose Junie and paste it with Ctrl+V.');
    });

    it('AC-034 the tip names AI Chat with Junie as the agent', () => {
        expect(copyForTipText('Junie', COPY_FOR_PLACES.junie)).toBe('Copy for Junie copies the prompt with the file paths and sends nothing: paste it into AI Chat with Junie as the agent, choose the model there, check the prompt, then send it.');
        expect(tipClosingOf({ assistant: 'junie', handover: 'copyFor', place: COPY_FOR_PLACES.junie })[0]).toBe(copyForTipText('Junie', COPY_FOR_PLACES.junie));
    });

    it('AC-034 negative control: Copilot and the Junie tool window keep the texts of before', () => {
        expect(copyForDoneText(COPY_FOR_PLACES['copilot'], 'Ctrl+V')).toBe('Copied. Paste it into GitHub Copilot Chat with Ctrl+V.');
        expect(copyForDoneText(JUNIE_WINDOW_PLACE, 'Ctrl+V')).toBe('Copied. Paste it into the Junie tool window with Ctrl+V.');
        expect(copyForWithoutText('a.md', JUNIE_WINDOW_PLACE, 'Ctrl+V', true)).toBe('Copied without a.md: the file was not found. Paste it into the Junie tool window with Ctrl+V.');
        expect(copyForTipText('Copilot', COPY_FOR_PLACES['copilot'])).toBe('Copy for Copilot copies the prompt with the file paths and sends nothing: paste it into GitHub Copilot Chat, choose the model there, check the prompt, then send it.');
        expect(copyForTipText('Junie', JUNIE_WINDOW_PLACE)).toBe('Copy for Junie copies the prompt with the file paths and sends nothing: paste it into the Junie tool window, choose the model there, check the prompt, then send it.');
    });

    it('AC-034 negative control: the window is not found, the text still says to open it and paste', () => {
        expect(copyForOpenText(COPY_FOR_PLACES.junie, 'Cmd+V')).toBe('Copied. Open Junie in AI Chat and paste it with Cmd+V.');
    });
});
