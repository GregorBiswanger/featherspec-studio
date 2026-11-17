import { describe, expect, it } from 'vitest';
import { profileCapabilities } from '../../adapters/providers/fake/fakeProvider';
import type { AgentCenterView } from '../../shared/protocol/agentCenter';
import { createCenterWorld, type CenterWorld } from './testing/centerWorld';
import { projectRelativeKey } from './filePath';

function detailOf(view: AgentCenterView | undefined) {
    if (view?.kind !== 'ready' || view.detail === undefined) {
        throw new Error(`no detail: ${JSON.stringify(view)}`);
    }
    return view.detail;
}

async function withApproval(world: CenterWorld) {
    const run = await world.addRun();
    await world.append(run.runId, 'approval.requested', { requestId: 'a1', actionKind: 'edit', summary: 'Edit README.md', outsideProject: false });
    world.service.select(run.runId);
    await world.flush();
    return run;
}

async function withInput(world: CenterWorld) {
    const run = await world.addRun();
    await world.append(run.runId, 'input.requested', { requestId: 'i1', question: 'Which file?' });
    world.service.select(run.runId);
    await world.flush();
    return run;
}

const handed = (world: CenterWorld, op: string) => world.recorder.calls.filter((call) => call.op === op);

describe('AC-016: approval answers', () => {
    it('lists the request with its kind of action and summary, hands nothing over without an activation', async () => {
        const world = await createCenterWorld();
        await withApproval(world);
        expect(detailOf(world.service.view()).requests).toEqual([
            { kind: 'approval', requestId: 'a1', actionKind: 'edit', summary: 'Edit README.md', question: '', outsideProject: false, pending: false, refusal: undefined },
        ]);
        expect(world.recorder.calls).toEqual([]);
    });

    it('"Approve once" hands run ID, request ID and the decision over exactly once; a second activation before the request closes hands nothing', async () => {
        const world = await createCenterWorld();
        const run = await withApproval(world);
        await world.service.answerApproval(run.runId, 'a1', 'approve-once');
        await world.service.answerApproval(run.runId, 'a1', 'approve-once');
        await world.service.answerApproval(run.runId, 'a1', 'reject', 'too late');
        await world.flush();
        expect(handed(world, 'approval')).toEqual([{ op: 'approval', args: [run.runId, 'a1', { decision: 'approve-once' }] }]);
        expect(detailOf(world.service.view()).requests[0]).toMatchObject({ pending: true, refusal: undefined });
    });

    it('"Reject" hands the decision with its optional reason; an empty reason is left out', async () => {
        const world = await createCenterWorld();
        const run = await withApproval(world);
        await world.service.answerApproval(run.runId, 'a1', 'reject', 'wrong file');
        expect(handed(world, 'approval')[0]?.args).toEqual([run.runId, 'a1', { decision: 'reject', reason: 'wrong file' }]);
        const other = await createCenterWorld();
        const second = await withApproval(other);
        await other.service.answerApproval(second.runId, 'a1', 'reject', '');
        expect(handed(other, 'approval')[0]?.args).toEqual([second.runId, 'a1', { decision: 'reject' }]);
    });

    it('if 0011 refuses, its reason shows at the control, the control is enabled again and a new activation hands over once more', async () => {
        const world = await createCenterWorld();
        const run = await withApproval(world);
        world.recorder.answers.approval = { kind: 'refused', code: 'request-not-open', reason: 'The request is no longer open.' };
        await world.service.answerApproval(run.runId, 'a1', 'approve-once');
        await world.flush();
        expect(detailOf(world.service.view()).requests[0]).toMatchObject({ pending: false, refusal: 'The request is no longer open.' });
        world.recorder.answers.approval = { kind: 'ok' };
        await world.service.answerApproval(run.runId, 'a1', 'approve-once');
        await world.flush();
        expect(handed(world, 'approval')).toHaveLength(2);
        expect(detailOf(world.service.view()).requests[0]).toMatchObject({ pending: true, refusal: undefined });
    });

    it('the request closes only on its .resolved event: the controls stay pending until then, then the request is gone', async () => {
        const world = await createCenterWorld();
        const run = await withApproval(world);
        await world.service.answerApproval(run.runId, 'a1', 'approve-once');
        await world.flush();
        expect(detailOf(world.service.view()).requests).toHaveLength(1);
        await world.append(run.runId, 'approval.resolved', { requestId: 'a1', decision: 'approve-once' });
        await world.flush();
        expect(detailOf(world.service.view()).requests).toEqual([]);
    });

    it('an answer for a request that is not open, or for a run that is not shown, hands nothing over', async () => {
        const world = await createCenterWorld();
        const run = await withApproval(world);
        await world.service.answerApproval(run.runId, 'ghost', 'approve-once');
        await world.service.answerApproval('other-run', 'a1', 'approve-once');
        expect(world.recorder.calls).toEqual([]);
    });
});

describe('AC-017: input answers', () => {
    it('"Send" hands run ID, request ID and the text over once; a blank text hands nothing', async () => {
        const world = await createCenterWorld();
        const run = await withInput(world);
        await world.service.answerInput(run.runId, 'i1', '   ');
        expect(world.recorder.calls).toEqual([]);
        await world.service.answerInput(run.runId, 'i1', 'README.md');
        await world.service.answerInput(run.runId, 'i1', 'again');
        expect(handed(world, 'input')).toEqual([{ op: 'input', args: [run.runId, 'i1', 'README.md'] }]);
    });

    it('a request closes on its run\'s end state too, without any answer being handed over', async () => {
        const world = await createCenterWorld();
        const run = await withInput(world);
        await world.world.store.reportStatus(run.runId, 'Cancelled');
        await world.flush();
        expect(detailOf(world.service.view()).requests).toEqual([]);
        expect(world.recorder.calls.filter((call) => call.op !== 'resumability')).toEqual([]);
    });
});

describe('AC-021: cancel', () => {
    it('is offered on an open run whose provider declares cancel, not on an ended run', async () => {
        const world = await createCenterWorld();
        const run = await world.addRun();
        world.service.select(run.runId);
        await world.flush();
        expect(detailOf(world.service.view()).actions).toMatchObject({ cancel: 'offer', cancelNote: undefined });
        await world.world.store.reportStatus(run.runId, 'Completed');
        await world.flush();
        expect(detailOf(world.service.view()).actions).toMatchObject({ cancel: 'none', cancelNote: undefined });
    });

    it('where the provider declares cancel as none the detail says so in its place', async () => {
        const world = await createCenterWorld({ fakeCapabilities: { ...profileCapabilities('full'), cancel: { value: 'none' } } });
        const run = await world.addRun();
        world.service.select(run.runId);
        await world.flush();
        expect(detailOf(world.service.view()).actions).toMatchObject({ cancel: 'unsupported', cancelNote: 'Cancel: not supported by Fake provider (no agent, no network)' });
    });

    it('asks one confirmation that names the spec number and says changes stay; on confirmation hands the run ID to the stop, on decline nothing', async () => {
        const world = await createCenterWorld();
        const run = await world.addRun();
        world.service.select(run.runId);
        await world.flush();
        world.confirmAnswer.current = false;
        await world.service.cancel(run.runId);
        expect(world.confirmations).toEqual([{ text: 'Cancel the agent run for spec 0007? The agent stops; changes it already made stay.', button: 'Cancel run' }]);
        expect(handed(world, 'stop')).toEqual([]);
        world.confirmAnswer.current = true;
        await world.service.cancel(run.runId);
        expect(world.confirmations).toHaveLength(2);
        expect(handed(world, 'stop')).toEqual([{ op: 'stop', args: [run.runId] }]);
    });

    it('a cancel on an ended run asks nothing and hands nothing over; a refusal of the stop shows its reason at the control', async () => {
        const world = await createCenterWorld();
        const ended = await world.addRun();
        await world.world.store.reportStatus(ended.runId, 'Completed');
        world.service.select(ended.runId);
        await world.flush();
        await world.service.cancel(ended.runId);
        expect(world.confirmations).toEqual([]);
        const open = await world.addRun();
        world.service.select(open.runId);
        await world.flush();
        world.recorder.answers.stop = { kind: 'refused', code: 'not-open', reason: 'The run has ended.' };
        await world.service.cancel(open.runId);
        await world.flush();
        expect(detailOf(world.service.view()).actions.refusal).toBe('The run has ended.');
    });

    it('the spec number of a run without a spec is its stem in the confirmation', async () => {
        const world = await createCenterWorld();
        await world.world.setSpecs([]);
        const run = await world.addRun();
        world.service.select(run.runId);
        await world.flush();
        await world.service.cancel(run.runId);
        expect(world.confirmations[0]?.text).toBe('Cancel the agent run for spec 0007-board? The agent stops; changes it already made stay.');
    });
});

describe('AC-022: resume', () => {
    it('is offered only where 0011 reports the run resumable, hands the run ID over without a confirmation of its own and selects the new run', async () => {
        const world = await createCenterWorld();
        const run = await world.addRun();
        await world.world.store.reportStatus(run.runId, 'Interrupted');
        world.service.select(run.runId);
        await world.flush();
        expect(detailOf(world.service.view()).actions.resume).toBe(false);
        world.recorder.answers.resumability = { resumable: true };
        world.service.reread();
        await world.flush();
        expect(detailOf(world.service.view()).actions.resume).toBe(true);
        const fresh = await world.addRun();
        world.recorder.answers.resume = { kind: 'resumed', runId: fresh.runId };
        await world.service.resume(run.runId);
        await world.flush();
        expect(handed(world, 'resume')).toEqual([{ op: 'resume', args: [run.runId] }]);
        expect(world.confirmations).toEqual([]);
        expect(detailOf(world.service.view()).header.runId).toBe(fresh.runId);
    });

    it('a declined resume changes nothing; a refusal shows its reason at the control; an open run is never asked for resumability', async () => {
        const world = await createCenterWorld();
        const run = await world.addRun();
        world.service.select(run.runId);
        await world.flush();
        expect(handed(world, 'resumability')).toEqual([]);
        await world.world.store.reportStatus(run.runId, 'Interrupted');
        world.recorder.answers.resumability = { resumable: true };
        await world.flush();
        await world.service.resume(run.runId);
        await world.flush();
        expect(detailOf(world.service.view()).header.runId).toBe(run.runId);
        world.recorder.answers.resume = { kind: 'refused', code: 'not-resumable', reason: 'A newer run exists.' };
        await world.service.resume(run.runId);
        await world.flush();
        expect(detailOf(world.service.view()).actions.refusal).toBe('A newer run exists.');
    });
});

describe('AC-024: Open file', () => {
    it('offers it for a changed path only when the file exists inside the project at the time the entry is shown', async () => {
        const world = await createCenterWorld();
        const run = await world.addRun();
        world.files.set('README.md', 'file');
        world.files.set('docs', 'directory');
        for (const [path, outsideProject] of [['README.md', false], ['missing.md', false], ['docs', false], ['../escape.md', false], ['/etc/passwd', false], ['C:\\x\\y.md', false], ['README.md', true]] as const) {
            await world.append(run.runId, 'file.changed', { path, operation: 'update', confidence: 'reported', outsideProject });
        }
        world.service.select(run.runId);
        await world.flush();
        expect(detailOf(world.service.view()).files.map((file) => [file.path, file.canOpen, file.outsideProject])).toEqual([
            ['README.md', true, false],
            ['missing.md', false, false],
            ['docs', false, false],
            ['../escape.md', false, false],
            ['/etc/passwd', false, false],
            ['C:\\x\\y.md', false, false],
            ['README.md', false, true],
        ]);
    });

    it('opens the file on activation after checking again; a file that has gone meanwhile opens nothing; a path no event attributed opens nothing', async () => {
        const world = await createCenterWorld();
        const run = await world.addRun();
        world.files.set('README.md', 'file');
        await world.append(run.runId, 'file.changed', { path: 'README.md', operation: 'update', confidence: 'reported', outsideProject: false });
        world.service.select(run.runId);
        await world.flush();
        await world.service.openFile(run.runId, 'README.md');
        expect(world.opened).toHaveLength(1);
        expect(world.opened[0]?.key).toBe('README.md');
        world.files.delete('README.md');
        await world.service.openFile(run.runId, 'README.md');
        await world.service.openFile(run.runId, 'package.json');
        expect(world.opened).toHaveLength(1);
    });

    it('path keys: backslashes become slashes; absolute, drive, parent and empty paths are refused', () => {
        expect(projectRelativeKey('src\\a.ts')).toBe('src/a.ts');
        expect(projectRelativeKey('./src/a.ts')).toBe('src/a.ts');
        for (const bad of ['', '/a', 'C:/a', '../a', 'a/../../b', '..']) {
            expect(projectRelativeKey(bad), bad).toBeUndefined();
        }
    });
});

describe('AC-028: read-only window and Restricted Mode', () => {
    it('in a reader window cancel, resume and the answers are shown but disabled with the store\'s reason, and activating them hands nothing over; list, detail and Open spec keep working', async () => {
        const world = await createCenterWorld();
        const run = await withApproval(world);
        world.world.session.use(world.world.store, { kind: 'read-only', reason: 'Another VS Code window holds the write lock' });
        await world.flush();
        const view = world.service.view();
        expect(view?.kind === 'ready' && view.controls).toEqual({ kind: 'disabled', reason: 'Another VS Code window holds the write lock' });
        expect(detailOf(view).actions).toMatchObject({ cancel: 'offer', openSpec: true });
        expect(detailOf(view).requests).toHaveLength(1);
        await world.service.answerApproval(run.runId, 'a1', 'approve-once');
        await world.service.cancel(run.runId);
        await world.service.resume(run.runId);
        expect(world.recorder.calls).toEqual([]);
        expect(world.confirmations).toEqual([]);
    });

    it('in Restricted Mode none of the controls is offered and the area adds no text; the rest works', async () => {
        const world = await createCenterWorld({ fakeCapabilities: { ...profileCapabilities('full'), cancel: { value: 'none' } } });
        const run = await withApproval(world);
        world.trust.trusted = false;
        world.service.reread();
        await world.flush();
        const view = world.service.view();
        expect(view?.kind === 'ready' && view.controls).toEqual({ kind: 'none' });
        expect(detailOf(view).actions).toEqual({ cancel: 'none', cancelNote: undefined, resume: false, openSpec: true, refusal: undefined });
        expect(detailOf(view).requests).toHaveLength(1);
        await world.service.answerApproval(run.runId, 'a1', 'approve-once');
        await world.service.cancel(run.runId);
        expect(world.recorder.calls).toEqual([]);
        expect(view?.kind === 'ready' && view.rows).toHaveLength(1);
        expect(world.service.timeline()?.rows).toHaveLength(1);
    });
});

describe('AC-016, AC-017, AC-022: the real orchestrator with the fake provider\'s approval scenario', () => {
    it('the request is listed and nothing is answered until the developer activates; one activation answers it once and the run completes', async () => {
        const world = await createCenterWorld({ scenario: 'approval' });
        world.useRealOrchestrator.current = true;
        const started = await world.world.orchestrator.start(world.world.request());
        expect(started.kind).toBe('started');
        if (started.kind !== 'started') {
            return;
        }
        await world.world.advance(1_000);
        world.service.select(started.runId);
        await world.flush();
        expect(detailOf(world.service.view()).requests.map((request) => [request.requestId, request.kind])).toEqual([['fake-approval-1', 'approval']]);
        expect(detailOf(world.service.view()).activity).toBe('Waiting for approval: Edit README.md');
        await world.world.advance(5_000);
        expect(world.world.fakeCalls().filter((call) => call.startsWith('respondToApproval'))).toEqual([]);
        await world.service.answerApproval(started.runId, 'fake-approval-1', 'approve-once');
        await world.service.answerApproval(started.runId, 'fake-approval-1', 'approve-once');
        await world.world.advance(1_000);
        await world.flush();
        expect(world.world.fakeCalls().filter((call) => call.startsWith('respondToApproval'))).toHaveLength(1);
        const detail = detailOf(world.service.view());
        expect(detail.header.status).toBe('Completed');
        expect(detail.requests).toEqual([]);
        expect(detail.result?.text).toBe('Done (fake).');
    });
});
