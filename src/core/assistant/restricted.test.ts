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

describe('0026 AC-014: Now and the Send target need neither trust nor a writer', () => {
    it('the core files of the cap, the order, the day and the target name no trust, writer, Restricted Mode or reader window', async () => {
        const { promises: fs } = await import('node:fs');
        const path = await import('node:path');
        for (const file of ['overview/rows.ts', 'board/lastChange.ts', 'assistant/sendView.ts']) {
            const source = await fs.readFile(path.resolve(process.cwd(), 'src', 'core', ...file.split('/')), 'utf8');
            expect(source, file).not.toMatch(/trust|writer|restricted|\breader\b/i);
        }
        expect('const restricted = true;').toMatch(/restricted/i);
    });
});
