import { describe, expect, it } from 'vitest';
import { buildDetail } from '../board/detail';
import { projectNow } from '../overview/rows';
import { createSpecResolver } from '../overview/specRefs';
import { createModelSource } from '../shell/modelSource';
import { addProject, createShellWorld, SPEC_HEADER } from '../shell/testing/world';
import { parseStepTipSettings } from '../settings/stepTipSettings';
import { createFakeOffer } from './testing/fakeOffer';

describe('0024 AC-011: the views hold for the value the host returns, in a trusted and in a Restricted window alike', () => {
    async function views(trusted: boolean, assistant: 'copilot' | 'claudeCode') {
        const world = createShellWorld({ trusted });
        try {
            addProject(world, 'proj', { '.specs/active/0001-a.md': SPEC_HEADER('In Progress'), '.specs/backlog/0002-b.md': SPEC_HEADER('Draft') });
            await world.controller.start();
            await world.settle();
            const model = createModelSource(world.repository).current();
            if (model === undefined) {
                throw new Error('no model');
            }
            const offer = createFakeOffer({ assistant }).read();
            const tips = parseStepTipSettings(true, {});
            const detail = buildDetail({ selection: { stem: '0001-a' }, model, history: { available: true, label: 'x', entries: [] }, tips, ...(offer === undefined ? {} : { offer }) });
            const now = projectNow(model, createSpecResolver(model), tips, offer);
            return { detail, now };
        } finally {
            world.dispose();
        }
    }

    for (const assistant of ['copilot', 'claudeCode'] as const) {
        it(`${assistant}: detail and first Now row are equal with trust on and off, and both carry the send view`, async () => {
            const trusted = await views(true, assistant);
            const restricted = await views(false, assistant);
            expect(restricted).toEqual(trusted);
            expect(trusted.detail.kind === 'spec' && 'send' in trusted.detail.nextStep).toBe(true);
            expect(trusted.now.rows[0]?.send?.assistant).toBe(assistant);
        });
    }

    it('negative control: another assistant gives another view', async () => {
        expect(await views(true, 'copilot')).not.toEqual(await views(true, 'claudeCode'));
    });
});
