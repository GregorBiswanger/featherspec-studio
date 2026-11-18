import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { STEP_GUIDES, type StepCase } from '../../shared/protocol/nextStepTexts';
import { sendViewOf } from './sendView';

const CASES = Object.keys(STEP_GUIDES) as StepCase[];

describe('0024 AC-004: the default target of the step\'s session', () => {
    it('there are twelve step cases, and no offer gives no send view', () => {
        expect(CASES).toHaveLength(12);
        for (const stepCase of CASES) {
            expect(sendViewOf(undefined, stepCase), stepCase).toBeUndefined();
        }
    });

    for (const stepCase of CASES) {
        const fresh = stepCase === 'NS-5' || stepCase === 'NS-9';
        it(`${stepCase}: Copilot sends to the ${fresh ? 'new' : 'current'} chat, with both targets`, () => {
            expect(sendViewOf({ assistant: 'copilot' }, stepCase)).toEqual({ assistant: 'copilot', target: fresh ? 'new' : 'current', targets: ['new', 'current'] });
        });

        it(`${stepCase}: Claude Code always sends to a new chat, the only target`, () => {
            expect(sendViewOf({ assistant: 'claudeCode' }, stepCase)).toEqual({ assistant: 'claudeCode', target: 'new', targets: ['new'] });
        });
    }

    it('the new target is exactly the cases whose session is new', () => {
        const fresh = CASES.filter((stepCase) => sendViewOf({ assistant: 'copilot' }, stepCase)?.target === 'new');
        expect(fresh).toEqual(CASES.filter((stepCase) => STEP_GUIDES[stepCase].session === 'new'));
        expect(fresh).toEqual(['NS-5', 'NS-9']);
    });

    it('a returned send view does not share its targets array between calls', () => {
        const first = sendViewOf({ assistant: 'copilot' }, 'NS-5');
        first?.targets.push('current');
        expect(sendViewOf({ assistant: 'copilot' }, 'NS-5')?.targets).toEqual(['new', 'current']);
    });
});

describe('0024 AC-011: the assistant core needs neither trust nor a writer', () => {
    it('the core files that offer and choose name no trust, writer, Restricted Mode or reader window', async () => {
        for (const file of ['assistants.ts', 'offer.ts', 'sendView.ts']) {
            const source = await fs.readFile(path.resolve(process.cwd(), 'src', 'core', 'assistant', file), 'utf8');
            expect(source, file).not.toMatch(/trust|writer|restricted|\breader\b/i);
        }
        expect('const restricted = true;').toMatch(/trust|writer|restricted|\breader\b/i);
    });
});
