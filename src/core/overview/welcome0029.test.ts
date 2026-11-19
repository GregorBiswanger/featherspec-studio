import { describe, expect, it } from 'vitest';
import type { ShellModel } from '../ports/shell';
import { createBoardWorld } from '../board/testing/boardWorld';
import { createFakeOffer } from '../assistant/testing/fakeOffer';
import type { SetupRun } from '../discovery/setupSign';
import { buildOverviewView } from './overviewView';
import { modelFor } from './testing/projects';

const HISTORY = { available: true as const, label: 'Observed', entries: [] };

async function model(setupRun: SetupRun | undefined, withSpec = false): Promise<ShellModel> {
    const base = await modelFor(withSpec ? [{ number: '0001', kind: 'Active' }] : []);
    return { ...base, project: { ...base.project, ...(setupRun === undefined ? {} : { setupRun }) } };
}

describe('0029 AC-003: the Overview view carries the welcome while setup has not run and no spec exists', () => {
    it('0029 AC-003 with an offered assistant the welcome holds the plain Send view: target new, no attachment', async () => {
        const view = buildOverviewView({ model: await model('not run'), history: HISTORY, offer: { assistant: 'claudeCode' } });
        expect(view.figures).toEqual({ kind: 'empty' });
        expect(view.welcome).toEqual({ send: { assistant: 'claudeCode', target: 'new', targets: ['new'] } });
    });

    it('0029 AC-003 with Copilot the Send view carries both targets and still no attachment', async () => {
        const view = buildOverviewView({ model: await model('not run'), history: HISTORY, offer: { assistant: 'copilot' } });
        expect(view.welcome).toEqual({ send: { assistant: 'copilot', target: 'new', targets: ['new', 'current'] } });
    });

    it('0029 AC-003 without an offered assistant the welcome has no Send view (Copy prompt only)', async () => {
        const view = buildOverviewView({ model: await model('not run'), history: HISTORY });
        expect(view.welcome).toEqual({});
    });

    it('0029 AC-006 negative control: setup run or unknown, or no sign at all, carries no welcome', async () => {
        for (const sign of ['run or unknown', undefined] as const) {
            const view = buildOverviewView({ model: await model(sign), history: HISTORY, offer: { assistant: 'claudeCode' } });
            expect('welcome' in view).toBe(false);
        }
    });

    it('0029 AC-007 negative control: with a spec, setup not run shows no welcome', async () => {
        const view = buildOverviewView({ model: await model('not run', true), history: HISTORY, offer: { assistant: 'claudeCode' } });
        expect('welcome' in view).toBe(false);
        expect(view.figures.kind).toBe('counts');
    });
});

describe('0029 AC-004: the Board view carries the same welcome', () => {
    it('0029 AC-004 no spec and setup not run: welcome with the plain Send view, noSpecs stays true', async () => {
        const world = createBoardWorld(await model('not run'), undefined, undefined, createFakeOffer({ assistant: 'copilot' }));
        await world.service.whenIdle();
        const view = world.service.view();
        expect(view?.noSpecs).toBe(true);
        expect(view?.welcome).toEqual({ send: { assistant: 'copilot', target: 'new', targets: ['new', 'current'] } });
    });

    it('0029 AC-004 without an offered assistant the welcome is empty', async () => {
        const world = createBoardWorld(await model('not run'));
        await world.service.whenIdle();
        expect(world.service.view()?.welcome).toEqual({});
    });

    it('0029 AC-006 negative control: setup run or unknown and a spec each leave the Board without a welcome', async () => {
        for (const candidate of [await model('run or unknown'), await model(undefined), await model('not run', true)]) {
            const world = createBoardWorld(candidate, undefined, undefined, createFakeOffer({ assistant: 'copilot' }));
            await world.service.whenIdle();
            expect(world.service.view() !== undefined && 'welcome' in world.service.view()!).toBe(false);
        }
    });
});
