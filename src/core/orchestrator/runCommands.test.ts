import { describe, expect, it } from 'vitest';
import { createControlledAdapter } from '../providers/testing/controlledAdapter';
import { declarationWith } from '../providers/testing/adapters';
import { NO_RUN_OPEN, NO_RUN_RESUMABLE, RESUME_BUTTON, RESUME_PICK_PLACEHOLDER, STOP_BUTTON, noStopText, resumeConfirmText, stopConfirmText } from './texts';
import { createRunCommands } from './runCommands';
import { createWorld, type World } from './testing/world';

function commands(world: World) {
    return createRunCommands({ orchestrator: world.orchestrator, session: world.session, ui: world.ui });
}

async function openRun(world: World, providerId = 'controlled'): Promise<string> {
    const result = await world.orchestrator.start(world.request({ providerId }));
    if (result.kind !== 'started') {
        throw new Error(result.reason);
    }
    return result.runId;
}

describe('Stop Run', () => {
    it('AC-022: with no run open it shows the message and changes nothing', async () => {
        const world = await createWorld();
        await commands(world).stopRun();
        expect(world.ui.infos).toEqual([NO_RUN_OPEN]);
        expect(world.ui.confirmations).toEqual([]);
        world.session.use(undefined);
        await commands(world).stopRun();
        expect(world.ui.infos).toEqual([NO_RUN_OPEN, NO_RUN_OPEN]);
    });

    it('AC-022: asks one confirmation naming the stem and, on yes, stops the run once', async () => {
        const world = await createWorld();
        const runId = await openRun(world);
        await commands(world).stopRun();
        expect(world.ui.confirmations).toEqual([{ message: stopConfirmText('0007-board'), button: STOP_BUTTON }]);
        expect(world.controlled.calls).toEqual([`start:${runId}`, `cancel:${runId}`]);
    });

    it('AC-022: on no it stops nothing', async () => {
        const world = await createWorld();
        const runId = await openRun(world);
        world.ui.confirmAnswer = false;
        await commands(world).stopRun();
        expect(world.controlled.calls).toEqual([`start:${runId}`]);
        expect(world.ui.infos).toEqual([]);
    });

    it('AC-022: a refusal of the stop is shown', async () => {
        const world = await createWorld();
        const quiet = createControlledAdapter('quiet', { capabilities: declarationWith({ cancel: 'none' }) });
        world.setup.registry.register(quiet.adapter);
        await openRun(world, 'quiet');
        await commands(world).stopRun();
        expect(world.ui.infos).toEqual([noStopText('Provider quiet')]);
    });
});

async function interrupted(world: World, stem: string): Promise<string> {
    const run = await world.store.createRun({ providerId: 'controlled', spec: { stem, path: `.specs/active/${stem}.md` } });
    await world.store.reportStatus(run.runId, 'Running', { sessionRef: `s-${stem}` });
    return run.runId;
}

describe('Resume Run', () => {
    it('AC-022: where no run can be resumed it shows the message and changes nothing', async () => {
        const world = await createWorld();
        await commands(world).resumeRun();
        expect(world.ui.infos).toEqual([NO_RUN_RESUMABLE]);
        await world.setSpecs([{ folder: 'active', stem: '0007-board' }]);
        await interrupted(world, '0007-board');
        await world.setSpecs([]);
        await world.reopen();
        await commands(world).resumeRun();
        expect(world.ui.infos).toEqual([NO_RUN_RESUMABLE, NO_RUN_RESUMABLE]);
        expect(world.controlled.calls).toEqual([]);
    });

    it('AC-022: a single resumable run is resumed without a pick list, through the confirmation of AC-016', async () => {
        const world = await createWorld();
        await world.setSpecs([{ folder: 'active', stem: '0007-board' }]);
        const runId = await interrupted(world, '0007-board');
        await world.reopen();
        await commands(world).resumeRun();
        expect(world.ui.picks).toEqual([]);
        expect(world.ui.confirmations).toEqual([{ message: resumeConfirmText(runId, '0007-board'), button: RESUME_BUTTON }]);
        expect(world.controlled.resumed).toHaveLength(1);
    });

    it('AC-022: several resumable runs are offered by stem with the run ID, and the chosen one is resumed', async () => {
        const world = await createWorld();
        await world.setSpecs([
            { folder: 'active', stem: '0007-board' },
            { folder: 'active', stem: '0008-start' },
        ]);
        const first = await interrupted(world, '0007-board');
        const second = await interrupted(world, '0008-start');
        await world.reopen();
        world.ui.pickAnswer = (items) => items.find((item) => item.label === '0007-board')?.id;
        await commands(world).resumeRun();
        expect(world.ui.picks).toHaveLength(1);
        expect(world.ui.picks[0]?.placeholder).toBe(RESUME_PICK_PLACEHOLDER);
        expect(world.ui.picks[0]?.items.map((item) => [item.label, item.description]).sort()).toEqual(
            [
                ['0007-board', first],
                ['0008-start', second],
            ].sort(),
        );
        expect(world.controlled.resumed.map((request) => request.sessionRef)).toEqual(['s-0007-board']);
    });

    it('AC-022: a cancelled pick changes nothing; a refusal of the resume is shown', async () => {
        const world = await createWorld();
        await world.setSpecs([
            { folder: 'active', stem: '0007-board' },
            { folder: 'active', stem: '0008-start' },
        ]);
        await interrupted(world, '0007-board');
        await interrupted(world, '0008-start');
        await world.reopen();
        world.ui.pickAnswer = () => undefined;
        await commands(world).resumeRun();
        expect(world.controlled.calls).toEqual([]);
        expect(world.ui.confirmations).toEqual([]);
        world.ui.pickAnswer = (items) => items[0]?.id;
        world.ui.confirmAnswer = async () => {
            await world.store.createRun({ providerId: 'fake', spec: { stem: '0009-other', path: '.specs/active/0009-other.md' } });
            return true;
        };
        await commands(world).resumeRun();
        expect(world.ui.infos).toHaveLength(1);
        expect(world.ui.infos[0]).toContain('is still open');
    });
});
