import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { STEP_GUIDES, type StepCase } from '../../shared/protocol/nextStepTexts';
import { ATTACH_UPDATE_TEXT, sendTipText } from '../../shared/protocol/assistantTexts';
import { buildDetail } from '../board/detail';
import { projectNow } from '../overview/rows';
import { parseStepTipSettings } from '../settings/stepTipSettings';
import type { Offer } from './offer';
import { sendViewOf } from './sendView';
import { CASE_WORLDS, caseModel } from './testing/caseWorlds';
import { createFakeOffer } from './testing/fakeOffer';

const CASES = Object.keys(STEP_GUIDES) as StepCase[];

describe('0024 AC-004 / 0026 AC-001: the default target is the new chat for every step', () => {
    it('there are thirteen step cases, and no offer gives no send view', () => {
        expect(CASES).toHaveLength(13);
        for (const stepCase of CASES) {
            expect(sendViewOf(undefined, stepCase), stepCase).toBeUndefined();
        }
    });

    for (const stepCase of CASES) {
        it(`0026 AC-001 ${stepCase}: Copilot sends to the new chat, with both targets`, () => {
            expect(sendViewOf({ assistant: 'copilot' }, stepCase)).toEqual({ assistant: 'copilot', target: 'new', targets: ['new', 'current'] });
        });

        it(`${stepCase}: Claude Code always sends to a new chat, the only target`, () => {
            expect(sendViewOf({ assistant: 'claudeCode' }, stepCase)).toEqual({ assistant: 'claudeCode', target: 'new', targets: ['new'] });
        });
    }

    it('0026 AC-001: no step case defaults to the current chat, whatever its session', () => {
        const current = CASES.filter((stepCase) => sendViewOf({ assistant: 'copilot' }, stepCase)?.target === 'current');
        expect(current).toEqual([]);
    });

    it('a returned send view does not share its targets array between calls', () => {
        const first = sendViewOf({ assistant: 'copilot' }, 'NS-5');
        first?.targets.push('current');
        expect(sendViewOf({ assistant: 'copilot' }, 'NS-5')?.targets).toEqual(['new', 'current']);
    });
});

describe('0024 AC-011: the assistant core needs neither trust nor a writer', () => {
    it('the core files that offer and choose name no trust, writer, Restricted Mode or reader window', async () => {
        for (const file of ['assistants.ts', 'offer.ts', 'sendView.ts', 'send.ts']) {
            const source = await fs.readFile(path.resolve(process.cwd(), 'src', 'core', 'assistant', file), 'utf8');
            expect(source, file).not.toMatch(/trust|writer|restricted|\breader\b/i);
        }
        expect('const restricted = true;').toMatch(/trust|writer|restricted|\breader\b/i);
    });
});

const SHOW = parseStepTipSettings(true, {});
const NO_HISTORY = { available: true, entries: [], label: '' } as never;
const NO_ATTACH: StepCase[] = ['NS-2', 'NS-4'];
const attachingOffer = (): Offer => createFakeOffer({ assistant: 'copilot' }, { attaching: () => true }).read()!;
const claudeShipped: Offer = { assistant: 'claudeCode' };
const plainOffer: Offer = { assistant: 'copilot' };

function detailOf(model: Awaited<ReturnType<typeof caseModel>>, key: string, offer: Offer) {
    const entry = model.lifecycle.entries.find((candidate) => candidate.key === key)!;
    const view = buildDetail({ selection: { stem: entry.stem, path: key }, model, history: NO_HISTORY, tips: SHOW, offer });
    if (view.kind !== 'spec' || !('lines' in view.nextStep)) {
        throw new Error('no next step lines');
    }
    return view.nextStep;
}

describe('0027 AC-001: the Send view carries the spec exactly for the cases §6.1 marks yes', () => {
    for (const stepCase of CASES) {
        const { key } = CASE_WORLDS[stepCase];
        const name = key.slice(key.lastIndexOf('/') + 1);
        for (const [label, offer] of [['Claude Code', claudeShipped], ['Copilot (attaching)', attachingOffer()]] as const) {
            it(`0027 AC-001 ${stepCase} ${label}: the detail's Send view ${NO_ATTACH.includes(stepCase) ? 'carries no attachment' : 'carries ' + name}`, async () => {
                const model = await caseModel(stepCase, '1.11.0');
                const next = detailOf(model, key, offer);
                expect(next.send?.assistant).toBe(offer.assistant);
                expect(next.send?.attach).toEqual(NO_ATTACH.includes(stepCase) ? undefined : { name, path: key });
                expect(next.send === undefined || NO_ATTACH.includes(stepCase) ? true : Object.keys(next.send).sort()).toEqual(NO_ATTACH.includes(stepCase) ? true : ['assistant', 'attach', 'target', 'targets']);
            });
        }
    }

    it('0027 AC-001: the first Now row carries the same view as the detail for the cases that sit in Now', async () => {
        for (const stepCase of ['NS-4-plan', 'NS-5', 'NS-6-open', 'NS-6-resume', 'NS-6-plan', 'NS-6-report', 'NS-6-returned', 'NS-2'] as const) {
            const { key } = CASE_WORLDS[stepCase];
            const model = await caseModel(stepCase, '1.11.0');
            const detail = detailOf(model, key, claudeShipped);
            const first = projectNow(model, { forEntry: (entry: { key: string }) => ({ key: entry.key }) } as never, SHOW, claudeShipped).rows[0];
            expect(first?.send, stepCase).toEqual(detail.send);
        }
    });

    it('0027 AC-001: without an offer no view carries an attachment', async () => {
        const model = await caseModel('NS-9', '1.11.0');
        const entry = model.lifecycle.entries[0]!;
        const view = buildDetail({ selection: { stem: entry.stem, path: entry.key }, model, history: NO_HISTORY, tips: SHOW });
        expect(view.kind === 'spec' && 'lines' in view.nextStep ? view.nextStep.send : 'x').toBeUndefined();
    });
});

describe('0027 AC-002: below the gate the view holds exactly assistant, target and targets', () => {
    it.each(['1.10.0', '1.9.9', '1.11.0-rc.1', '1.11', 'v1.11.0', 'unknown'])('%s: NS-9, detail and first Now row', async (version) => {
        const model = await caseModel('NS-9', version);
        const next = detailOf(model, CASE_WORLDS['NS-9'].key, claudeShipped);
        expect(Object.keys(next.send ?? {}).sort()).toEqual(['assistant', 'target', 'targets']);
        const active = await caseModel('NS-6-open', version);
        const row = projectNow(active, { forEntry: (entry: { key: string }) => ({ key: entry.key }) } as never, SHOW, claudeShipped).rows[0];
        expect(Object.keys(row?.send ?? {}).sort()).toEqual(['assistant', 'target', 'targets']);
    });
});

describe('0027 AC-011: the toggletip names the update only where the gate withholds the attachment', () => {
    it('below the gate, the third paragraph is 0024\'s Send sentence, one space and the update sentence, literally', async () => {
        const model = await caseModel('NS-9', '1.10.0');
        const next = detailOf(model, CASE_WORLDS['NS-9'].key, claudeShipped);
        expect(next.tips?.about[2]).toBe(`${sendTipText('Claude Code')} With FeatherSpec 1.11.0 or later, Send also attaches the spec; update with /sdd-featherspec-update.`);
        expect(ATTACH_UPDATE_TEXT).toBe('With FeatherSpec 1.11.0 or later, Send also attaches the spec; update with /sdd-featherspec-update.');
    });

    it('at 1.11.0, in a case that never attaches and for Copilot (shipped table) it is 0024\'s alone', async () => {
        const model = await caseModel('NS-9', '1.11.0');
        expect(detailOf(model, CASE_WORLDS['NS-9'].key, claudeShipped).tips?.about[2]).toBe(sendTipText('Claude Code'));
        const old = await caseModel('NS-2', '1.10.0');
        expect(detailOf(old, CASE_WORLDS['NS-2'].key, claudeShipped).tips?.about[2]).toBe(sendTipText('Claude Code'));
        const oldModel = await caseModel('NS-9', '1.10.0');
        expect(detailOf(oldModel, CASE_WORLDS['NS-9'].key, plainOffer).tips?.about[2]).toBe(sendTipText('Copilot'));
    });

    it('the first Now row\'s toggletip follows the same rule', async () => {
        const model = await caseModel('NS-6-open', '1.10.0');
        const row = projectNow(model, { forEntry: (entry: { key: string }) => ({ key: entry.key }) } as never, SHOW, claudeShipped).rows[0];
        expect(row?.tips?.about[2]).toBe(`${sendTipText('Claude Code')} ${ATTACH_UPDATE_TEXT}`);
    });
});

describe('0027 AC-019: the shipped table gives Copilot no attachment and no update sentence', () => {
    it.each(['1.10.0', '1.11.0', '2.0.0', 'unknown'])('%s: Copilot\'s view has no attach and its toggletip no update sentence in every case', async (version) => {
        for (const stepCase of CASES) {
            const model = await caseModel(stepCase, version);
            const next = detailOf(model, CASE_WORLDS[stepCase].key, plainOffer);
            expect(next.send?.attach, stepCase).toBeUndefined();
            expect(JSON.stringify(next.tips), stepCase).not.toContain('attaches the spec');
        }
    });

    it('Claude Code attaches NS-9 at 1.11.0 and Copilot does not (the example)', async () => {
        const model = await caseModel('NS-9', '1.11.0');
        const key = CASE_WORLDS['NS-9'].key;
        expect(detailOf(model, key, claudeShipped).send?.attach).toEqual({ name: '0007-x.md', path: key });
        expect(detailOf(model, key, plainOffer).send?.attach).toBeUndefined();
    });
});
