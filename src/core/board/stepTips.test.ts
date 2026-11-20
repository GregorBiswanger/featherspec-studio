import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { STEP_GUIDES, TIP_CLOSING, type StepCase } from '../../shared/protocol/nextStepTexts';
import { tipClosingOf } from '../assistant/sendView';
import { parseStepTipSettings } from '../settings/stepTipSettings';
import { stepTips } from './stepTips';

const NONE = parseStepTipSettings(true, {});
const NAMED = parseStepTipSettings(true, { strong: 'X', fast: 'Y' });

const COACH: Record<StepCase, string> = {
    'NS-2': 'Tip: Use any chat with a fast model.',
    'NS-4': 'Tip: Use any chat with a fast model.',
    'NS-4-plan': 'Tip: Use any chat with a strong model.',
    'NS-5': 'Tip: Use a new chat with a strong model from another model family.',
    'NS-6-open': 'Tip: Use the current chat or a new one with a fast model.',
    'NS-6-report': 'Tip: Use any chat with a fast model.',
    'NS-6-resume': 'Tip: Use any chat with a fast model.',
    'NS-6-returned': 'Tip: Use the current chat or a new one with a fast model.',
    'NS-6-plan': 'Tip: Use a new chat with a strong model, and allow web search.',
    'NS-7': 'Tip: Use any chat with a fast model.',
    'NS-7-start': 'Tip: Use any chat with a fast model.',
    'NS-8': 'Tip: Use any chat with a strong model.',
    'NS-9': 'Tip: Use a new chat with a strong model.',
    'NS-10': 'Tip: Use a new chat with a strong model, and allow web search.',
};

const NAMED_COACH: Record<StepCase, string> = {
    'NS-2': 'Tip: Use any chat with a fast model (Y).',
    'NS-4': 'Tip: Use any chat with a fast model (Y).',
    'NS-4-plan': 'Tip: Use any chat with a strong model (X).',
    'NS-5': 'Tip: Use a new chat with a strong model (X) from another model family.',
    'NS-6-open': 'Tip: Use the current chat or a new one with a fast model (Y).',
    'NS-6-report': 'Tip: Use any chat with a fast model (Y).',
    'NS-6-resume': 'Tip: Use any chat with a fast model (Y).',
    'NS-6-returned': 'Tip: Use the current chat or a new one with a fast model (Y).',
    'NS-6-plan': 'Tip: Use a new chat with a strong model (X), and allow web search.',
    'NS-7': 'Tip: Use any chat with a fast model (Y).',
    'NS-7-start': 'Tip: Use any chat with a fast model (Y).',
    'NS-8': 'Tip: Use any chat with a strong model (X).',
    'NS-9': 'Tip: Use a new chat with a strong model (X).',
    'NS-10': 'Tip: Use a new chat with a strong model (X), and allow web search.',
};

describe('0021 AC-009, AC-012: the coach line of every case', () => {
    it.each(Object.keys(STEP_GUIDES).map((key) => [key as StepCase]))('%s: session and model words, with no name in the product', (stepCase) => {
        expect(stepTips(stepCase, NONE).coach).toBe(COACH[stepCase]);
    });

    it.each(Object.keys(STEP_GUIDES).map((key) => [key as StepCase]))('%s: a hint of the class follows the words `strong model` and `fast model`', (stepCase) => {
        expect(stepTips(stepCase, NAMED).coach).toBe(NAMED_COACH[stepCase]);
    });

    it('a hint for the other class changes nothing; hints are plain text', () => {
        expect(stepTips('NS-5', parseStepTipSettings(true, { fast: 'Y' })).coach).toBe(COACH['NS-5']);
        expect(stepTips('NS-7', parseStepTipSettings(true, { strong: 'X' })).coach).toBe(COACH['NS-7']);
        expect(stepTips('NS-7', parseStepTipSettings(true, { fast: '<b>x</b>' })).coach).toBe('Tip: Use any chat with a fast model (<b>x</b>).');
    });
});

describe('0021 AC-015: the four paragraphs of About this step', () => {
    it('NS-5: effect and then, the reasons of session and model, the two closing sentences, literally', () => {
        expect(stepTips('NS-5', NONE).about).toEqual([
            'A fresh reviewer checks every acceptance criterion against evidence and gives a verdict. Only after a READY verdict, close the spec with the second prompt.',
            'New chat: a fresh session reads the files as a stranger would; what the current chat knows cannot be unread. Strong model from another family than the one that built it: a reviewer tends to pass what its own family wrote.',
            'Choose the chat and the model in your AI assistant before you paste.',
            'Settings (gear in the Specs view): Show Step Tips hides these tips; Model Hints names your models; Assistant opens your AI assistant\'s chat with the prompt.',
        ]);
    });

    it('the reasons of every session and model value, literally', () => {
        const reasons = (stepCase: StepCase): string => stepTips(stepCase, NONE).about[1]!;
        expect(reasons('NS-6-open')).toBe('Current or new chat: the plan holds the state of the work; after a break, let the agent report first. Fast model: one small, well-described step.');
        expect(reasons('NS-2')).toBe('Any chat: the step reads everything it needs from the files. Fast model: one small, well-described step.');
        expect(reasons('NS-8')).toBe('Any chat: the step reads everything it needs from the files. Strong model: the step reasons over the whole spec or plan.');
        expect(reasons('NS-10')).toBe('New chat: a fresh session reads the files as a stranger would; what the current chat knows cannot be unread. Strong model with web search: the plan checks libraries, versions and APIs against current facts.');
    });

    it('a hint changes the coach line only, never the four paragraphs', () => {
        for (const stepCase of Object.keys(STEP_GUIDES) as StepCase[]) {
            expect(stepTips(stepCase, NAMED).about, stepCase).toEqual(stepTips(stepCase, NONE).about);
        }
    });

    it('the closing pair is a parameter that replaces the last two paragraphs and nothing else', () => {
        const replaced = stepTips('NS-8', NONE, ['One.', 'Two.']);
        expect(replaced.about.slice(2)).toEqual(['One.', 'Two.']);
        expect(replaced.about.slice(0, 2)).toEqual(stepTips('NS-8', NONE).about.slice(0, 2));
        expect(replaced.about).toHaveLength(4);
    });

    it('every case has four non-empty paragraphs and no name of a model', () => {
        for (const stepCase of Object.keys(STEP_GUIDES) as StepCase[]) {
            const { about, coach } = stepTips(stepCase, NONE);
            expect(about, stepCase).toHaveLength(4);
            expect(about.every((paragraph) => paragraph.length > 0), stepCase).toBe(true);
            expect(`${coach} ${about.join(' ')}`).not.toMatch(/opus|sonnet|haiku|gpt-|gemini|llama|mistral/i);
        }
    });
});

describe('0021 AC-018: the tips need neither trust nor a writer', () => {
    it('the core files that compose and read the tips name no trust, writer, Restricted Mode or reader window', async () => {
        for (const file of ['src/core/board/stepTips.ts', 'src/core/settings/stepTipSettings.ts', 'src/core/settings/settingsSource.ts']) {
            const source = await fs.readFile(path.resolve(process.cwd(), ...file.split('/')), 'utf8');
            expect(source, file).not.toMatch(/trust|writer|restricted|\breader\b/i);
        }
        expect('const restricted = true;').toMatch(/trust|writer|restricted|\breader\b/i);
    });

    it('the same snapshot and settings give equal tips however often and wherever they are built', () => {
        const first = stepTips('NS-5', NAMED);
        const second = stepTips('NS-5', parseStepTipSettings(true, { strong: 'X', fast: 'Y' }));
        expect(second).toEqual(first);
    });
});

describe('0023 AC-013: the coach line and the paragraphs of the integrate case', () => {
    it('current or new chat, fast model; effect, then-sentence and reasons literally', () => {
        expect(stepTips('NS-6-returned', NONE).coach).toBe('Tip: Use the current chat or a new one with a fast model.');
        expect(stepTips('NS-6-returned', NAMED).coach).toBe('Tip: Use the current chat or a new one with a fast model (Y).');
        expect(stepTips('NS-6-returned', NONE).about[0]).toBe(
            'The agent checks each returned step against its files, runs its check and the quality gates, then ticks the steps and removes the return notes. Paste it once every worker you started is back.',
        );
        expect(stepTips('NS-6-returned', NONE).about[1]).toBe(
            'Current or new chat: the plan holds the state of the work; after a break, let the agent report first. Fast model: one small, well-described step.',
        );
    });
});

describe('0024 AC-013: the toggletip names Send and the settings', () => {
    const SEND_SENTENCE = (name: string) => `Send to ${name} puts the prompt into its chat and sends nothing: choose the model there, check the prompt, then send it.`;
    const SETTINGS = "Settings (gear in the Specs view): Show Step Tips hides these tips; Model Hints names your models; Assistant opens your AI assistant's chat with the prompt.";

    it('without an offer the third paragraph stays 0021\'s and the fourth is the settings sentence', () => {
        expect(tipClosingOf(undefined)).toEqual(['Choose the chat and the model in your AI assistant before you paste.', SETTINGS]);
        expect(TIP_CLOSING[1]).toBe(SETTINGS);
        expect(stepTips('NS-5', NONE).about.slice(2)).toEqual(['Choose the chat and the model in your AI assistant before you paste.', SETTINGS]);
    });

    it('with an offer the third paragraph is the Send sentence of the assistant, the fourth stays the settings sentence', () => {
        expect(tipClosingOf({ assistant: 'copilot' })).toEqual([SEND_SENTENCE('Copilot'), SETTINGS]);
        expect(tipClosingOf({ assistant: 'claudeCode' })).toEqual([SEND_SENTENCE('Claude Code'), SETTINGS]);
        for (const stepCase of Object.keys(STEP_GUIDES) as StepCase[]) {
            const plain = stepTips(stepCase, NONE);
            const sent = stepTips(stepCase, NONE, tipClosingOf({ assistant: 'copilot' }));
            expect(sent.about.slice(0, 2), stepCase).toEqual(plain.about.slice(0, 2));
            expect(sent.about.slice(2), stepCase).toEqual([SEND_SENTENCE('Copilot'), SETTINGS]);
            expect(sent.coach, stepCase).toBe(plain.coach);
        }
    });
});


describe('0028 AC-020: the session reason of the current or new chat follows the version, the reason of a guard opens paragraph 1', () => {
    const OLD = 'Current or new chat: the plan holds the state of the work; after a break, let the agent report first. Fast model: one small, well-described step.';
    const LEVELLED = 'Current or new chat: the plan holds the state of the work; after a break, the step first brings the plan up to date. Fast model: one small, well-described step.';

    it.each(['1.11.0', '1.11.1', '1.12.0'])('%s: the 1.11.0 reason, literally', (version) => {
        expect(stepTips('NS-6-open', NONE, undefined, { version }).about[1]).toBe(LEVELLED.replace('Current or new chat:', 'Current or new chat:'));
        expect(stepTips('NS-6-returned', NONE, undefined, { version }).about[1]).toBe(LEVELLED.replace('Current or new chat:', 'Current or new chat:'));
    });

    it.each(['1.10.0', '1.11.0-rc.1', 'next', 'unknown'])('%s: the earlier reason, literally', (version) => {
        expect(stepTips('NS-6-open', NONE, undefined, { version }).about[1]).toBe(OLD);
    });

    it('without a version the earlier reason; other sessions and models do not change; each reason is in the text modules once', async () => {
        expect(stepTips('NS-6-open', NONE).about[1]).toBe(OLD);
        expect(stepTips('NS-5', NONE, undefined, { version: '1.12.0' }).about[1]).toBe(stepTips('NS-5', NONE).about[1]);
        const text = await fs.readFile(path.join(process.cwd(), 'src', 'shared', 'protocol', 'nextStepTexts.ts'), 'utf8');
        for (const reason of ['after a break, let the agent report first.', 'after a break, the step first brings the plan up to date.']) {
            expect(text.split(reason).length - 1, reason).toBe(1);
        }
    });

    it('a reason opens paragraph 1, then one space and the effect; none leaves paragraph 1 as it was', () => {
        const withReason = stepTips('NS-6-report', NONE, undefined, { reason: 'T-003 has a Verified line but no tick.' }).about[0];
        expect(withReason).toBe(`T-003 has a Verified line but no tick. ${stepTips('NS-6-report', NONE).about[0]}`);
    });
});

describe('0026 AC-002: one term for the open chat', () => {
    it('the coach line of NS-6 open and of returned work reads current or new chat · fast model', () => {
        expect(stepTips('NS-6-open', NONE).coach).toBe('Tip: Use the current chat or a new one with a fast model.');
        expect(stepTips('NS-6-returned', NONE).coach).toBe('Tip: Use the current chat or a new one with a fast model.');
    });

    it('the reasons are 0026 §7 literally: new-chat reason for NS-5 and NS-9, the current or new chat reason below 1.11.0', () => {
        const NEW = 'New chat: a fresh session reads the files as a stranger would; what the current chat knows cannot be unread.';
        expect(stepTips('NS-5', NONE).about[1]!.startsWith(`${NEW} `)).toBe(true);
        expect(stepTips('NS-9', NONE).about[1]!.startsWith(NEW)).toBe(true);
        expect(stepTips('NS-6-open', NONE, undefined, { version: '1.10.0' }).about[1]!.startsWith('Current or new chat: the plan holds the state of the work; after a break, let the agent report first. ')).toBe(true);
    });

    it('negative control: no wording of 0021 is left in any case', () => {
        for (const stepCase of Object.keys(STEP_GUIDES) as StepCase[]) {
            const { coach, about } = stepTips(stepCase, NONE);
            expect(`${coach} ${about.join(' ')}`, stepCase).not.toMatch(/same chat|this chat/i);
        }
        expect('Same chat or new chat').toMatch(/same chat/i);
    });
});

describe('0026 AC-021: Send, not Paste, beside a Send', () => {
    const BODY = 'The agent checks each returned step against its files, runs its check and the quality gates, then ticks the steps and removes the return notes.';

    it('with Send the then-sentence of returned work is Send it once every worker you started is back.', () => {
        expect(stepTips('NS-6-returned', NONE, undefined, { send: true }).about[0]).toBe(`${BODY} Send it once every worker you started is back.`);
    });

    it('with Copy prompt alone it stays Paste it once every worker you started is back.', () => {
        expect(stepTips('NS-6-returned', NONE).about[0]).toBe(`${BODY} Paste it once every worker you started is back.`);
    });

    it('the Send then-sentence replaces only the returned case; every other case reads as without Send', () => {
        for (const stepCase of Object.keys(STEP_GUIDES) as StepCase[]) {
            if (stepCase !== 'NS-6-returned') {
                expect(stepTips(stepCase, NONE, undefined, { send: true }).about[0], stepCase).toBe(stepTips(stepCase, NONE).about[0]);
            }
        }
    });
});

describe('0030 AC-008: the coach line is one Tip sentence', () => {
    const SESSIONS = { new: 'a new chat', sameOrNew: 'the current chat or a new one', any: 'any chat' } as const;
    const MODELS = {
        fast: (hint: string) => `a fast model${hint}`,
        strong: (hint: string) => `a strong model${hint}`,
        strongOtherFamily: (hint: string) => `a strong model${hint} from another model family`,
        strongWebSearch: (hint: string) => `a strong model${hint}, and allow web search`,
    } as const;

    it('0030 AC-008 every step case, with and without a model hint, reads Tip: Use <session> with <model>.', () => {
        for (const stepCase of Object.keys(STEP_GUIDES) as StepCase[]) {
            const guide = STEP_GUIDES[stepCase];
            const fast = guide.model === 'fast';
            expect(stepTips(stepCase, NONE).coach, stepCase).toBe(`Tip: Use ${SESSIONS[guide.session]} with ${MODELS[guide.model]('')}.`);
            expect(stepTips(stepCase, NAMED).coach, stepCase).toBe(`Tip: Use ${SESSIONS[guide.session]} with ${MODELS[guide.model](fast ? ' (Y)' : ' (X)')}.`);
        }
    });

    it('0030 AC-008 the four examples of the spec, literally', () => {
        expect(stepTips('NS-9', NONE).coach).toBe('Tip: Use a new chat with a strong model.');
        expect(stepTips('NS-6-open', NONE).coach).toBe('Tip: Use the current chat or a new one with a fast model.');
        expect(stepTips('NS-5', NONE).coach).toBe('Tip: Use a new chat with a strong model from another model family.');
        expect(stepTips('NS-10', NONE).coach).toBe('Tip: Use a new chat with a strong model, and allow web search.');
    });

    it('0030 AC-008 the hint stands after the word model', () => {
        expect(stepTips('NS-5', NAMED).coach).toBe('Tip: Use a new chat with a strong model (X) from another model family.');
        expect(stepTips('NS-10', NAMED).coach).toBe('Tip: Use a new chat with a strong model (X), and allow web search.');
    });
});
