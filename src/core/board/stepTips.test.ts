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
    'NS-2': 'any chat · fast model',
    'NS-4': 'any chat · fast model',
    'NS-4-plan': 'any chat · strong model',
    'NS-5': 'new chat · strong model, other family',
    'NS-6-open': 'same chat or new chat · fast model',
    'NS-6-report': 'any chat · fast model',
    'NS-6-resume': 'any chat · fast model',
    'NS-6-returned': 'same chat or new chat · fast model',
    'NS-6-plan': 'any chat · strong model, allow web search',
    'NS-7': 'any chat · fast model',
    'NS-8': 'any chat · strong model',
    'NS-9': 'new chat · strong model',
    'NS-10': 'any chat · strong model, allow web search',
};

const NAMED_COACH: Record<StepCase, string> = {
    'NS-2': 'any chat · fast model (Y)',
    'NS-4': 'any chat · fast model (Y)',
    'NS-4-plan': 'any chat · strong model (X)',
    'NS-5': 'new chat · strong model (X), other family',
    'NS-6-open': 'same chat or new chat · fast model (Y)',
    'NS-6-report': 'any chat · fast model (Y)',
    'NS-6-resume': 'any chat · fast model (Y)',
    'NS-6-returned': 'same chat or new chat · fast model (Y)',
    'NS-6-plan': 'any chat · strong model (X), allow web search',
    'NS-7': 'any chat · fast model (Y)',
    'NS-8': 'any chat · strong model (X)',
    'NS-9': 'new chat · strong model (X)',
    'NS-10': 'any chat · strong model (X), allow web search',
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
        expect(stepTips('NS-7', parseStepTipSettings(true, { fast: '<b>x</b>' })).coach).toBe('any chat · fast model (<b>x</b>)');
    });
});

describe('0021 AC-015: the four paragraphs of About this step', () => {
    it('NS-5: effect and then, the reasons of session and model, the two closing sentences, literally', () => {
        expect(stepTips('NS-5', NONE).about).toEqual([
            'A fresh reviewer checks every acceptance criterion against evidence and gives a verdict. Only after a READY verdict, close the spec with the second prompt.',
            'New chat: a fresh session reads the files as a stranger would; what this chat knows cannot be unread. Strong model from another family than the one that built it: a reviewer tends to pass what its own family wrote.',
            'Choose the chat and the model in your AI assistant before you paste.',
            'Settings (gear in the Specs view): Show Step Tips hides these tips; Model Hints names your models; Assistant opens your AI assistant\'s chat with the prompt.',
        ]);
    });

    it('the reasons of every session and model value, literally', () => {
        const reasons = (stepCase: StepCase): string => stepTips(stepCase, NONE).about[1]!;
        expect(reasons('NS-6-open')).toBe('Same chat or new chat: the plan holds the state of the work; after a break, let the agent report first. Fast model: one small, well-described step.');
        expect(reasons('NS-2')).toBe('Any chat: the step reads everything it needs from the files. Fast model: one small, well-described step.');
        expect(reasons('NS-8')).toBe('Any chat: the step reads everything it needs from the files. Strong model: the step reasons over the whole spec or plan.');
        expect(reasons('NS-10')).toBe('Any chat: the step reads everything it needs from the files. Strong model with web search: the plan checks libraries, versions and APIs against current facts.');
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
    it('same chat or new chat, fast model; effect, then-sentence and reasons literally', () => {
        expect(stepTips('NS-6-returned', NONE).coach).toBe('same chat or new chat · fast model');
        expect(stepTips('NS-6-returned', NAMED).coach).toBe('same chat or new chat · fast model (Y)');
        expect(stepTips('NS-6-returned', NONE).about[0]).toBe(
            'The agent checks each returned step against its files, runs its check and the quality gates, then ticks the steps and removes the return notes. Paste it once every worker you started is back.',
        );
        expect(stepTips('NS-6-returned', NONE).about[1]).toBe(
            'Same chat or new chat: the plan holds the state of the work; after a break, let the agent report first. Fast model: one small, well-described step.',
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

