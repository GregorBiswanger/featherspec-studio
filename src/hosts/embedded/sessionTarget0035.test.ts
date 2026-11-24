import { describe, expect, it } from 'vitest';
import type { Offer } from '../../core/assistant/offer';
import { offerOf } from '../../core/assistant/offer';
import { ASSISTANTS } from '../../core/assistant/assistants';
import { plainSendViewOf, sendViewOf } from '../../core/assistant/sendView';
import { CASE_WORLDS, caseModel } from '../../core/assistant/testing/caseWorlds';
import { buildDetail } from '../../core/board/detail';
import { projectNow } from '../../core/overview/rows';
import { parseStepTipSettings } from '../../core/settings/stepTipSettings';
import { isSendView } from '../../shared/protocol/assistant';
import { SESSION_PHRASES, STEP_GUIDES, type StepCase } from '../../shared/protocol/nextStepTexts';
import { createJetBrainsAssistants } from './assistants';

const CASES = Object.keys(STEP_GUIDES) as StepCase[];
const NEW_SESSION: StepCase[] = ['NS-5', 'NS-6-plan', 'NS-9', 'NS-10'];
const SHOW = parseStepTipSettings(true, {});
const NO_HISTORY = { available: true, entries: [], label: '' } as never;
const NOW_SPECS = { forEntry: (entry: { key: string }) => ({ key: entry.key }) } as never;

function claudeOffer(): Offer {
    const offer = offerOf('claudeCode', ['cli:claude'], undefined, createJetBrainsAssistants());
    if (offer === undefined) {
        throw new Error('no offer');
    }
    return offer;
}

describe('0035 review 20 S-1 / AC-035: the main part of Send to Claude Code follows the session of the tip', () => {
    it('AC-035 the cases whose tip says a new chat are the four of the plan, and no other', () => {
        expect(CASES.filter((stepCase) => STEP_GUIDES[stepCase].session === 'new')).toEqual(NEW_SESSION);
        expect(SESSION_PHRASES.new).toBe('a new chat');
        expect(SESSION_PHRASES.sameOrNew).toBe('the current chat or a new one');
        expect(SESSION_PHRASES.any).toBe('any chat');
    });

    for (const stepCase of CASES) {
        const wantsNew = STEP_GUIDES[stepCase].session === 'new';
        it(`AC-035 ${stepCase} (${STEP_GUIDES[stepCase].session}): the main part targets ${wantsNew ? 'a new chat' : 'the current chat'}, the menu still offers both`, () => {
            const view = sendViewOf(claudeOffer(), stepCase);
            expect(view?.target).toBe(wantsNew ? 'new' : 'current');
            expect(view?.targets).toEqual(['current', 'new']);
            expect(isSendView(view)).toBe(true);
        });
    }

    for (const stepCase of CASES) {
        it(`AC-035 ${stepCase}: the detail and the first Now row carry the same target as the tip says`, async () => {
            const { key } = CASE_WORLDS[stepCase];
            const model = await caseModel(stepCase, '1.11.0');
            const entry = model.lifecycle.entries.find((candidate) => candidate.key === key)!;
            const offer = claudeOffer();
            const detail = buildDetail({ selection: { stem: entry.stem, path: key }, model, history: NO_HISTORY, tips: SHOW, offer });
            const send = detail.kind === 'spec' && 'lines' in detail.nextStep ? detail.nextStep.send : undefined;
            const row = projectNow(model, NOW_SPECS, SHOW, offer).rows[0]?.send;
            const expected = STEP_GUIDES[stepCase].session === 'new' ? 'new' : 'current';
            const vsCode = buildDetail({ selection: { stem: entry.stem, path: key }, model, history: NO_HISTORY, tips: SHOW, offer: { assistant: 'claudeCode' } });
            const vsCodeSend = vsCode.kind === 'spec' && 'lines' in vsCode.nextStep ? vsCode.nextStep.send : undefined;
            const vsCodeRow = projectNow(model, NOW_SPECS, SHOW, { assistant: 'claudeCode' }).rows[0]?.send;
            expect(send !== undefined).toBe(vsCodeSend !== undefined);
            expect(row !== undefined).toBe(vsCodeRow !== undefined);
            expect(send === undefined && row === undefined, 'a world with no step action at all would test nothing').toBe(false);
            for (const view of [send, row]) {
                if (view !== undefined) {
                    expect(view.target).toBe(expected);
                    expect(view.targets).toEqual(['current', 'new']);
                }
            }
        });
    }

    it('AC-035 the welcome and the empty state have no tip and keep the current chat', () => {
        expect(plainSendViewOf(claudeOffer())).toEqual({ assistant: 'claudeCode', terminal: true, target: 'current', targets: ['current', 'new'] });
    });

    it('AC-035 negative control: VS Code offers get the very same view as before for every case', () => {
        for (const assistant of ['copilot', 'claudeCode'] as const) {
            const offer: Offer = { assistant };
            for (const stepCase of CASES) {
                expect(sendViewOf(offer, stepCase)).toEqual(plainSendViewOf(offer));
            }
        }
        expect(ASSISTANTS.claudeCode.targets).toEqual(['new']);
        expect(sendViewOf({ assistant: 'copilot' }, 'NS-10')?.target).toBe('new');
        expect(sendViewOf({ assistant: 'copilot' }, 'NS-6-open')?.target).toBe('new');
    });

    it('AC-035 the main part of Send to Junie and Send to Copilot follows the session of the tip as Claude Code does', () => {
        for (const [assistant, presence] of [['junie', 'cli:junie'], ['copilot', 'cli:copilot']] as const) {
            const offer = offerOf(assistant, [presence], undefined, createJetBrainsAssistants())!;
            for (const stepCase of CASES) {
                const view = sendViewOf(offer, stepCase);
                expect(view?.target, `${assistant} ${stepCase}`).toBe(NEW_SESSION.includes(stepCase) ? 'new' : 'current');
                expect(view?.targets).toEqual(['current', 'new']);
                expect(isSendView(view)).toBe(true);
            }
        }
    });
});
