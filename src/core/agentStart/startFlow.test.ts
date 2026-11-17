import { describe, expect, it } from 'vitest';
import { FULL_LABEL } from '../../adapters/providers/fake/fakeProvider';
import { FAKE_DISPLAY_NAME, FAKE_MODEL } from '../../adapters/providers/fake/scenarios';
import { isAgentStartView } from '../../shared/protocol/agentStart';
import { declaredAdapter } from '../providers/testing/adapters';
import { buildStartPrompt } from './startPrompt';
import { REQUEST, createFlowWorld } from './testing/flowWorld';
import { START_STEM } from './testing/startWorld';

const SPEC_PATH = `.specs/backlog/${START_STEM}.md`;
const PLAN_PATH = `.specs/backlog/${START_STEM}.plan.md`;

describe('start flow: hand-off, refusal, confirmation (AC-001, AC-002)', () => {
    it('resolves the hand-off at once and shows the checking line until the check ends', async () => {
        const world = await createFlowWorld();
        const returned = world.flow.start(REQUEST);
        await returned;
        expect(world.flow.view()).toEqual({ checking: { number: '0001' } });
        await world.flow.whenIdle();
        expect(world.flow.view().checking).toBeUndefined();
        expect(world.flow.view().confirmation).toBeDefined();
    });

    it('asks the UI to reveal the panel on every hand-off', async () => {
        const world = await createFlowWorld();
        await world.handOff();
        expect(world.startUi.reveals).toBe(1);
    });

    it('AC-002: the confirmation carries every item of the spec 6.2', async () => {
        const world = await createFlowWorld();
        world.orchestrator2.previous = { kind: 'run', runId: 'r-3', status: 'Failed', errorClass: 'auth', errorText: 'Rejected.' };
        await world.handOff();
        const confirmation = world.flow.view().confirmation;
        expect(confirmation).toMatchObject({
            spec: { number: '0001', stem: START_STEM },
            provider: { id: 'fake', displayName: FAKE_DISPLAY_NAME },
            model: FAKE_MODEL,
            permissionMode: FULL_LABEL,
            missing: [],
            previousRun: { kind: 'run', runId: 'r-3', status: 'Failed', errorClass: 'auth', errorText: 'Rejected.' },
            prompt: buildStartPrompt({ stem: START_STEM, specPath: SPEC_PATH, planPath: PLAN_PATH }),
            starting: false,
        });
        expect(confirmation?.token).toMatch(/^c-\d+$/);
        expect(confirmation?.spec.title.length).toBeGreaterThan(0);
        expect(confirmation?.disclosure).toBeUndefined();
        expect(world.orchestrator2.previousRuns).toEqual([START_STEM]);
    });

    it('AC-002: names approvals and userInput as missing for the minimal fake profile', async () => {
        const world = await createFlowWorld({ minimal: true });
        await world.handOff();
        expect(world.flow.view().confirmation?.missing).toEqual(['approvals', 'userInput']);
    });

    it('AC-002: shows the disclosure text and "no model" when the provider reports none', async () => {
        const world = await createFlowWorld();
        world.setup.registry.register(declaredAdapter('disclosing', { disclosure: 'Sends your prompt to a service.', displayName: 'Disclosing' }));
        world.setting.set('disclosing');
        await world.handOff();
        const confirmation = world.flow.view().confirmation;
        expect(confirmation?.disclosure).toBe('Sends your prompt to a service.');
        expect(confirmation?.model).toBeUndefined();
        expect(confirmation?.provider).toEqual({ id: 'disclosing', displayName: 'Disclosing' });
    });

    it('AC-001: a refusal lists every failing precondition, shows no confirmation, calls no orchestrator operation and stores nothing', async () => {
        const world = await createFlowWorld();
        await world.setSpecs([{ folder: 'backlog', stem: '0003-plain' }]);
        const created = await world.store.createRun({ providerId: 'fake', spec: { stem: '0002-old-feature', path: '.specs/active/0002-old-feature.md' } });
        const before = (await world.runs()).length;
        world.flow.handOff({ stem: '0003-plain', key: '.specs/backlog/0003-plain.md' });
        await world.flow.whenIdle();
        const view = world.flow.view();
        expect(view.confirmation).toBeUndefined();
        expect(view.checking).toBeUndefined();
        expect(view.refusal?.number).toBe('0003');
        expect(view.refusal?.items.map((item) => item.id)).toEqual(['P-1', 'P-5']);
        expect(view.refusal?.items[0]).toMatchObject({ id: 'P-1', kind: 'transition', refusal: 'not-ready' });
        expect(view.refusal?.items[1]).toEqual({ id: 'P-5', runId: created.runId, stem: '0002-old-feature' });
        expect(world.orchestrator2.starts).toEqual([]);
        expect(world.orchestrator2.previousRuns).toEqual([]);
        expect((await world.runs()).length).toBe(before);
    });

    it('AC-001: each precondition reaches the view with its parameters', async () => {
        const world = await createFlowWorld();
        world.files.hide('.claude/rules/plans.md');
        world.setting.set('nowhere');
        world.trust.trusted = false;
        world.session.use(world.store, { kind: 'read-only', reason: 'Another window writes.' });
        world.flow.handOff({ stem: '0001-Bad', key: 'x' });
        await world.flow.whenIdle();
        expect(world.flow.view().refusal?.items).toEqual([
            { id: 'P-1', kind: 'no-entry', stem: '0001-Bad' },
            { id: 'P-2', missing: ['.claude/rules/plans.md'] },
            { id: 'P-3', configured: 'nowhere' },
            { id: 'P-6', state: 'read-only', reason: 'Another window writes.' },
            { id: 'P-7' },
            { id: 'P-8', stem: '0001-Bad' },
        ]);
    });

    it('AC-001: P-4 names the provider and the result with its reason', async () => {
        const world = await createFlowWorld();
        world.controlled.adapter.checkAvailability = () => Promise.resolve({ result: 'not-signed-in', hint: 'Sign in.' });
        world.setting.set('controlled');
        await world.handOff();
        expect(world.flow.view().refusal?.items).toEqual([
            { id: 'P-4', provider: 'Provider controlled', result: 'not-signed-in', reason: 'You are not signed in to the provider.', hint: 'Sign in.' },
        ]);
    });

    it('every published view passes the strict contract guard (JSON round trip)', async () => {
        const world = await createFlowWorld({ minimal: true });
        const seen: unknown[] = [];
        world.flow.onDidChangeView(() => seen.push(JSON.parse(JSON.stringify(world.flow.view()))));
        await world.handOff();
        world.trust.trusted = false;
        await world.handOff();
        expect(seen.length).toBeGreaterThanOrEqual(3);
        seen.forEach((view) => expect(isAgentStartView(view)).toBe(true));
    });
});

describe('start flow: cancel, hide, project change (AC-003)', () => {
    it('Cancel with the token closes the confirmation and sends nothing', async () => {
        const world = await createFlowWorld();
        await world.handOff();
        const token = world.flow.view().confirmation?.token ?? '';
        world.flow.cancel(token);
        expect(world.flow.view()).toEqual({});
        expect(world.orchestrator2.starts).toEqual([]);
        expect((await world.runs()).length).toBe(0);
    });

    it('a Cancel with a stale or unknown token is ignored', async () => {
        const world = await createFlowWorld();
        await world.handOff();
        world.flow.cancel('c-999');
        expect(world.flow.view().confirmation).toBeDefined();
        const first = world.flow.view().confirmation?.token ?? '';
        world.flow.cancel(first);
        await world.handOff();
        world.flow.cancel(first);
        expect(world.flow.view().confirmation).toBeDefined();
        expect(world.flow.view().confirmation?.token).not.toBe(first);
    });

    it('hiding the panel counts as Cancel', async () => {
        const world = await createFlowWorld();
        await world.handOff();
        world.flow.panelHidden();
        expect(world.flow.view().confirmation).toBeUndefined();
        expect(world.orchestrator2.starts).toEqual([]);
    });

    it('hiding the panel while the check runs shows no confirmation afterwards', async () => {
        const world = await createFlowWorld();
        world.flow.handOff(REQUEST);
        world.flow.panelHidden();
        await world.flow.whenIdle();
        expect(world.flow.view()).toEqual({});
    });

    it('another project becoming active cancels an open confirmation and clears a refusal', async () => {
        const world = await createFlowWorld();
        await world.handOff();
        const current = world.model.current;
        if (current === undefined) {
            throw new Error('no model');
        }
        world.model.current = { ...current, project: { ...current.project, root: 'other-project' } };
        world.notifyModel();
        expect(world.flow.view()).toEqual({});
        world.trust.trusted = false;
        await world.handOff();
        expect(world.flow.view().refusal).toBeDefined();
        world.model.current = current;
        world.notifyModel();
        expect(world.flow.view().refusal).toBeUndefined();
    });

    it('a model change within the same project keeps the confirmation open', async () => {
        const world = await createFlowWorld();
        await world.handOff();
        world.notifyModel();
        expect(world.flow.view().confirmation).toBeDefined();
    });

    it('dismiss clears the refusal line', async () => {
        const world = await createFlowWorld();
        world.trust.trusted = false;
        await world.handOff();
        expect(world.flow.view().refusal).toBeDefined();
        world.flow.dismiss('refusal');
        expect(world.flow.view()).toEqual({});
    });
});

describe('start flow: pending and a later hand-off (AC-009, AC-014)', () => {
    it('AC-009: while the check runs a second hand-off is refused as pending and shows no second confirmation', async () => {
        const world = await createFlowWorld();
        world.flow.handOff(REQUEST);
        world.flow.handOff(REQUEST);
        expect(world.flow.view().refusal?.items).toEqual([{ id: 'pending' }]);
        await world.flow.whenIdle();
        expect(world.flow.view().confirmation).toBeDefined();
        expect(world.orchestrator2.previousRuns).toEqual([START_STEM]);
    });

    it('AC-009: while the confirmation is open a second hand-off is refused as pending and the confirmation stays', async () => {
        const world = await createFlowWorld();
        await world.handOff();
        const token = world.flow.view().confirmation?.token;
        await world.handOff();
        expect(world.flow.view().refusal?.items).toEqual([{ id: 'pending' }]);
        expect(world.flow.view().confirmation?.token).toBe(token);
        expect(world.orchestrator2.previousRuns).toHaveLength(1);
    });

    it('AC-009: a hand-off after Cancel is not refused as pending', async () => {
        const world = await createFlowWorld();
        await world.handOff();
        world.flow.cancel(world.flow.view().confirmation?.token ?? '');
        await world.handOff();
        expect(world.flow.view().confirmation).toBeDefined();
        expect(world.flow.view().refusal).toBeUndefined();
    });

    it('AC-014: after an earlier run has ended the hand-off shows the confirmation again', async () => {
        const world = await createFlowWorld();
        const created = await world.store.createRun({ providerId: 'fake', spec: { stem: START_STEM, path: SPEC_PATH } });
        await world.store.reportStatus(created.runId, 'Running');
        await world.handOff();
        expect(world.flow.view().refusal?.items.map((item) => item.id)).toEqual(['P-5']);
        await world.store.reportStatus(created.runId, 'Completed');
        world.flow.dismiss('refusal');
        await world.handOff();
        expect(world.flow.view().confirmation).toBeDefined();
        expect(world.flow.view().refusal).toBeUndefined();
    });

    it('a new hand-off replaces an earlier refusal', async () => {
        const world = await createFlowWorld();
        world.trust.trusted = false;
        await world.handOff();
        world.trust.trusted = true;
        await world.handOff();
        expect(world.flow.view().refusal).toBeUndefined();
        expect(world.flow.view().confirmation).toBeDefined();
    });

    it('notifies its listener for every change of the view and not after dispose', async () => {
        const world = await createFlowWorld();
        await world.handOff();
        expect(world.changes).toBeGreaterThanOrEqual(2);
        world.flow.dispose();
        const count = world.changes;
        world.flow.cancel(world.flow.view().confirmation?.token ?? '');
        expect(world.changes).toBe(count);
    });
});
