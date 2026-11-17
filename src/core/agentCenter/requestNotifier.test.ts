import { describe, expect, it } from 'vitest';
import { createCenterWorld, type CenterWorld } from './testing/centerWorld';
import { createRequestNotifier } from './requestNotifier';

interface Notified {
    text: string;
    action: string;
}

function setup(world: CenterWorld, options: { shown?: boolean; accept?: boolean } = {}) {
    const notified: Notified[] = [];
    const opened: string[] = [];
    const flags = { shown: options.shown ?? false, accept: options.accept ?? true };
    const notifier = createRequestNotifier({
        session: world.world.session,
        model: { current: () => world.world.model.current, updatedAt: () => '', onDidChange: () => ({ dispose: () => undefined }) },
        ui: {
            async notify(text, action) {
                notified.push({ text, action });
                return flags.accept;
            },
        },
        trust: { isTrusted: () => world.trust.trusted },
        shownAndFocused: () => flags.shown,
        open: (runId) => void opened.push(runId),
    });
    return { notified, opened, flags, notifier };
}

async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('AC-018: one notification per request', () => {
    it('an approval request gives exactly one notification naming the spec number and approval, with "Open in Agent Center"; the action opens the run', async () => {
        const world = await createCenterWorld();
        const run = await world.addRun();
        const { notified, opened } = setup(world);
        await world.append(run.runId, 'approval.requested', { requestId: 'a1', actionKind: 'edit', summary: 'Edit', outsideProject: false });
        await settle();
        expect(notified).toEqual([{ text: 'Spec 0007: the agent asks for approval.', action: 'Open in Agent Center' }]);
        expect(opened).toEqual([run.runId]);
    });

    it('an input request names input; events that are no request give none; a dismissed notification opens nothing', async () => {
        const world = await createCenterWorld();
        const run = await world.addRun();
        const { notified, opened } = setup(world, { accept: false });
        await world.append(run.runId, 'turn.started');
        await world.append(run.runId, 'approval.resolved', { requestId: 'x', decision: 'reject' });
        await world.append(run.runId, 'input.requested', { requestId: 'i1', question: 'Which?' });
        await settle();
        expect(notified).toEqual([{ text: 'Spec 0007: the agent asks for input.', action: 'Open in Agent Center' }]);
        expect(opened).toEqual([]);
    });

    it('the stem stands in for the number of a run whose spec is not found', async () => {
        const world = await createCenterWorld();
        await world.world.setSpecs([]);
        const run = await world.addRun();
        const { notified } = setup(world);
        await world.append(run.runId, 'approval.requested', { requestId: 'a1', actionKind: 'edit', summary: 'Edit', outsideProject: false });
        await settle();
        expect(notified[0]?.text).toBe('Spec 0007-board: the agent asks for approval.');
    });

    it('none while that run is shown in the focused panel, none in a reader window, none in Restricted Mode', async () => {
        const world = await createCenterWorld();
        const run = await world.addRun();
        const { notified, flags } = setup(world, { shown: true });
        await world.append(run.runId, 'approval.requested', { requestId: 'a1', actionKind: 'edit', summary: 'Edit', outsideProject: false });
        await settle();
        expect(notified).toEqual([]);
        flags.shown = false;
        world.trust.trusted = false;
        await world.append(run.runId, 'approval.requested', { requestId: 'a2', actionKind: 'edit', summary: 'Edit', outsideProject: false });
        await settle();
        expect(notified).toEqual([]);
        world.trust.trusted = true;
        world.world.session.use(world.world.store, { kind: 'read-only', reason: 'reader' });
        await world.append(run.runId, 'approval.requested', { requestId: 'a3', actionKind: 'edit', summary: 'Edit', outsideProject: false });
        await settle();
        expect(notified).toEqual([]);
        world.world.session.use(world.world.store, { kind: 'writable', reason: undefined });
        await world.append(run.runId, 'approval.requested', { requestId: 'a4', actionKind: 'edit', summary: 'Edit', outsideProject: false });
        await settle();
        expect(notified).toHaveLength(1);
    });

    it('dispose stops the notifications; through the real orchestrator the approval scenario gives exactly one', async () => {
        const world = await createCenterWorld({ scenario: 'approval' });
        const { notified, notifier } = setup(world);
        const started = await world.world.orchestrator.start(world.world.request());
        await world.world.advance(1_000);
        await settle();
        expect(started.kind).toBe('started');
        expect(notified).toHaveLength(1);
        notifier.dispose();
        if (started.kind === 'started') {
            await world.world.orchestrator.respondToApproval(started.runId, 'fake-approval-1', { decision: 'approve-once' });
        }
        await world.world.advance(1_000);
        await settle();
        expect(notified).toHaveLength(1);
    });
});
