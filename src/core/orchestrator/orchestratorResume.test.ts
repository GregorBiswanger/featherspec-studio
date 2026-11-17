import { describe, expect, it } from 'vitest';
import { createControlledAdapter } from '../providers/testing/controlledAdapter';
import { declarationWith } from '../providers/testing/adapters';
import {
    READER_TEXT,
    RESUME_BUTTON,
    START_TIMEOUT_MS,
    continuationText,
    noResumeText,
    noSessionRefText,
    notInterruptedText,
    notLatestText,
    notRegisteredText,
    resumeConfirmText,
    resumedCause,
    runOpenText,
    specAmbiguousText,
    specDoneText,
    specMissingText,
} from './texts';
import { createWorld, type World } from './testing/world';

const STEM = '0007-board';
const ACTIVE = [{ folder: 'active', stem: STEM }] as const;

async function interruptedRun(world: World, options: { stem?: string; providerId?: string; sessionRef?: string | null; model?: string } = {}): Promise<string> {
    const stem = options.stem ?? STEM;
    const run = await world.store.createRun({
        providerId: options.providerId ?? 'controlled',
        spec: { stem, path: `.specs/backlog/${stem}.md` },
        ...(options.model === undefined ? {} : { model: options.model }),
    });
    const sessionRef = options.sessionRef === null ? undefined : (options.sessionRef ?? 's-old');
    await world.store.reportStatus(run.runId, 'Running', sessionRef === undefined ? {} : { sessionRef });
    return run.runId;
}

async function resumable(options: Parameters<typeof interruptedRun>[1] = {}): Promise<{ world: World; runId: string }> {
    const world = await createWorld();
    await world.setSpecs(ACTIVE);
    const runId = await interruptedRun(world, options);
    await world.reopen();
    return { world, runId };
}

describe('resumability', () => {
    it('AC-015: reports a run resumable when all eight conditions hold', async () => {
        const { world, runId } = await resumable();
        expect(await world.orchestrator.resumability(runId)).toEqual({ resumable: true });
    });

    it('AC-015: (1) a reader window and a store that is not writable come first', async () => {
        const { world, runId } = await resumable();
        world.session.use(await world.openStoreOn());
        expect(await world.orchestrator.resumability(runId)).toEqual({ resumable: false, reason: READER_TEXT });
        world.session.use(undefined);
        expect(await world.orchestrator.resumability(runId)).toMatchObject({ resumable: false, reason: expect.stringContaining('The run history is not writable') });
    });

    it('AC-015: (2) a run that is not Interrupted, or unknown', async () => {
        const world = await createWorld();
        await world.setSpecs(ACTIVE);
        const runId = await interruptedRun(world);
        expect(await world.orchestrator.resumability(runId)).toEqual({ resumable: false, reason: notInterruptedText(runId) });
        await world.store.reportStatus(runId, 'Completed');
        expect(await world.orchestrator.resumability(runId)).toEqual({ resumable: false, reason: notInterruptedText(runId) });
        expect(await world.orchestrator.resumability('run-unknown')).toEqual({ resumable: false, reason: notInterruptedText('run-unknown') });
    });

    it('AC-015: (3) only the latest run of its spec is resumable', async () => {
        const world = await createWorld();
        await world.setSpecs(ACTIVE);
        const older = await interruptedRun(world);
        await world.reopen();
        await world.advance(1_000);
        const newer = await interruptedRun(world);
        await world.reopen();
        expect(await world.orchestrator.resumability(older)).toEqual({ resumable: false, reason: notLatestText(older, STEM) });
        expect(await world.orchestrator.resumability(newer)).toEqual({ resumable: true });
    });

    it('AC-015: (4) a run of the project that is open blocks, naming it', async () => {
        const { world, runId } = await resumable();
        const other = await world.store.createRun({ providerId: 'fake', spec: { stem: '0008-start', path: '.specs/active/0008-start.md' } });
        expect(await world.orchestrator.resumability(runId)).toEqual({ resumable: false, reason: runOpenText(other.runId, '0008-start') });
    });

    it('AC-015: (5) a provider that is not registered, or declares no resume', async () => {
        const world = await createWorld();
        await world.setSpecs(ACTIVE);
        const missing = await interruptedRun(world, { providerId: 'gone' });
        const quiet = createControlledAdapter('quiet', { capabilities: declarationWith({ resume: 'none' }) });
        world.setup.registry.register(quiet.adapter);
        await world.reopen();
        expect(await world.orchestrator.resumability(missing)).toEqual({ resumable: false, reason: notRegisteredText('gone') });
        await world.advance(1_000);
        const noResume = await interruptedRun(world, { providerId: 'quiet' });
        await world.reopen();
        expect(await world.orchestrator.resumability(noResume)).toEqual({ resumable: false, reason: noResumeText('Provider quiet') });
    });

    it('AC-015: (6) no stored session reference', async () => {
        const { world, runId } = await resumable({ sessionRef: null });
        expect(await world.orchestrator.resumability(runId)).toEqual({ resumable: false, reason: noSessionRefText(runId) });
    });

    it('AC-015: (7) no entry or several entries carry the stem', async () => {
        const { world, runId } = await resumable();
        await world.setSpecs([]);
        expect(await world.orchestrator.resumability(runId)).toEqual({ resumable: false, reason: specMissingText(STEM) });
        world.model.current = undefined;
        expect(await world.orchestrator.resumability(runId)).toEqual({ resumable: false, reason: specMissingText(STEM) });
        await world.setSpecs([
            { folder: 'active', stem: STEM },
            { folder: 'backlog', stem: STEM },
        ]);
        expect(await world.orchestrator.resumability(runId)).toEqual({ resumable: false, reason: specAmbiguousText(STEM) });
    });

    it('AC-015: (8) a spec that is Done', async () => {
        const { world, runId } = await resumable();
        await world.setSpecs([{ folder: 'done', stem: STEM }]);
        expect(await world.orchestrator.resumability(runId)).toEqual({ resumable: false, reason: specDoneText(STEM) });
    });

    it('AC-015: when several conditions fail the first in BR-005 order is the reason', async () => {
        const { world, runId } = await resumable({ sessionRef: null });
        await world.setSpecs([]);
        expect(await world.orchestrator.resumability(runId)).toEqual({ resumable: false, reason: noSessionRefText(runId) });
    });
});

describe('resume', () => {
    it('AC-016: asks one confirmation naming stem and run ID; a decline changes nothing', async () => {
        const { world, runId } = await resumable();
        world.ui.confirmAnswer = false;
        const before = await world.runs();
        expect(await world.orchestrator.resume(runId)).toEqual({ kind: 'declined' });
        expect(world.ui.confirmations).toEqual([{ message: resumeConfirmText(runId, STEM), button: RESUME_BUTTON }]);
        expect(await world.runs()).toEqual(before);
        expect(world.controlled.calls).toEqual([]);
    });

    it('AC-016: a refusal asks nothing', async () => {
        const world = await createWorld();
        await world.setSpecs(ACTIVE);
        const runId = await interruptedRun(world);
        expect(await world.orchestrator.resume(runId)).toEqual({ kind: 'refused', code: 'not-resumable', reason: notInterruptedText(runId) });
        expect(world.ui.confirmations).toEqual([]);
    });

    it('AC-016: on yes it creates the new run and calls resume once with its ID, the stored session reference and the continuation text; the old run is untouched', async () => {
        const world = await createWorld();
        await world.setSpecs([{ folder: 'active', stem: STEM }]);
        const runId = await interruptedRun(world, { model: 'm-old' });
        await world.reopen();
        const oldBefore = await world.runOf(runId);
        const result = await world.orchestrator.resume(runId);
        expect(result.kind).toBe('resumed');
        const newId = result.kind === 'resumed' ? result.runId : '';
        expect(newId).not.toBe(runId);
        const fresh = await world.runOf(newId);
        expect(fresh).toMatchObject({ providerId: 'controlled', model: 'm-old', status: 'Starting', spec: { stem: STEM, path: `.specs/active/${STEM}.md` } });
        expect(fresh.statusHistory).toEqual([{ status: 'Starting', at: fresh.created, cause: resumedCause(runId) }]);
        expect(world.controlled.resumed).toEqual([{ runId: newId, workingDirectory: 'C:/project', sessionRef: 's-old', continuationText: continuationText(STEM) }]);
        expect(world.controlled.calls).toEqual([`resume:${newId}`]);
        expect(await world.runOf(runId)).toEqual(oldBefore);
        expect(oldBefore.status).toBe('Interrupted');
    });

    it('AC-016: the new run follows the normal event pipeline to its end', async () => {
        const world = await createWorld();
        await world.setSpecs(ACTIVE);
        const runId = await interruptedRun(world, { providerId: 'fake', sessionRef: 'fake-session-run-9' });
        await world.reopen();
        const result = await world.orchestrator.resume(runId);
        await world.advance(1_000);
        const newId = result.kind === 'resumed' ? result.runId : '';
        expect(await world.statusesOf(newId)).toEqual(['Starting', 'Running', 'Completed']);
        expect((await world.runOf(runId)).status).toBe('Interrupted');
    });

    it('AC-016: a condition that turns false while the confirmation is open refuses the resume and calls no provider', async () => {
        const { world, runId } = await resumable();
        world.ui.confirmAnswer = async () => {
            await world.store.createRun({ providerId: 'fake', spec: { stem: '0008-start', path: '.specs/active/0008-start.md' } });
            return true;
        };
        const result = await world.orchestrator.resume(runId);
        expect(result).toMatchObject({ kind: 'refused', code: 'run-open' });
        expect(world.controlled.calls).toEqual([]);
        expect((await world.runs()).filter((run) => run.spec.stem === STEM)).toHaveLength(1);
    });

    it('AC-008: a resumed run still Starting after 60 s is Failed/start_timeout; cancel once, then endSession once', async () => {
        const { world, runId } = await resumable();
        const result = await world.orchestrator.resume(runId);
        const newId = result.kind === 'resumed' ? result.runId : '';
        await world.advance(START_TIMEOUT_MS - 1);
        expect((await world.runOf(newId)).status).toBe('Starting');
        await world.advance(1);
        expect(await world.runOf(newId)).toMatchObject({ status: 'Failed', errorClass: 'start_timeout' });
        expect(world.controlled.calls).toEqual([`resume:${newId}`, `cancel:${newId}`, `endSession:${newId}`]);
    });

    it('AC-016: a port refusal without an end kind fails the new run with unknown and the reason', async () => {
        const world = await createWorld({ wrapProviders: (service) => ({ ...service, resume: () => Promise.resolve({ kind: 'failed', reason: 'boom' }) }) });
        await world.setSpecs(ACTIVE);
        const runId = await interruptedRun(world);
        await world.reopen();
        const result = await world.orchestrator.resume(runId);
        await world.orchestrator.whenIdle();
        expect(await world.runOf(result.kind === 'resumed' ? result.runId : '')).toMatchObject({ status: 'Failed', errorClass: 'unknown', errorMessage: 'boom' });
    });

    it('AC-020: in a reader window a resume is refused with the reader text and nothing is asked', async () => {
        const { world, runId } = await resumable();
        world.session.use(await world.openStoreOn());
        expect(await world.orchestrator.resume(runId)).toEqual({ kind: 'refused', code: 'reader-window', reason: READER_TEXT });
        expect(world.ui.confirmations).toEqual([]);
        expect(await world.orchestrator.previousRun(STEM)).toMatchObject({ kind: 'run', runId });
    });

    it('AC-016: no active project root refuses the resume', async () => {
        const { world, runId } = await resumable();
        world.workingDirectory.current = undefined;
        expect(await world.orchestrator.resume(runId)).toMatchObject({ kind: 'refused', code: 'store-not-writable' });
        expect(world.controlled.calls).toEqual([]);
    });
});
