import { describe, expect, it } from 'vitest';
import { declaredAdapter } from '../providers/testing/adapters';
import type { StartAnswer } from '../ports/agentStart';
import { createFlowWorld, type FlowWorld } from './testing/flowWorld';
import { START_STEM } from './testing/startWorld';

const SPEC_PATH = `.specs/backlog/${START_STEM}.md`;

async function confirmed(world: FlowWorld): Promise<string> {
    await world.handOff();
    const token = world.flow.view().confirmation?.token;
    if (token === undefined) {
        throw new Error(`no confirmation: ${JSON.stringify(world.flow.view())}`);
    }
    return token;
}

async function startOf(world: FlowWorld, token: string): Promise<void> {
    world.flow.confirm(token);
    await world.flow.whenIdle();
}

describe('start flow: Start and the start request (AC-004, AC-005, AC-011)', () => {
    it('AC-005: Start hands 0011 exactly one request with the values the confirmation showed', async () => {
        const world = await createFlowWorld();
        const token = await confirmed(world);
        const shown = world.flow.view().confirmation;
        await startOf(world, token);
        expect(world.orchestrator2.starts).toEqual([
            { providerId: 'fake', model: 'fake-model', spec: { stem: START_STEM, path: SPEC_PATH }, prompt: shown?.prompt, projectRoot: world.root },
        ]);
        expect(world.flow.view()).toEqual({});
    });

    it('AC-005: a provider that reports no model gives a request without a model key', async () => {
        const world = await createFlowWorld();
        world.setup.registry.register(declaredAdapter('nomodel'));
        world.setting.set('nomodel');
        await startOf(world, await confirmed(world));
        expect(world.orchestrator2.starts).toHaveLength(1);
        expect(world.orchestrator2.starts[0]).not.toHaveProperty('model');
        expect(world.orchestrator2.starts[0]?.providerId).toBe('nomodel');
    });

    it('AC-005: a stale, unknown or repeated Start sends nothing more', async () => {
        const world = await createFlowWorld();
        const token = await confirmed(world);
        world.flow.confirm('c-999');
        await world.flow.whenIdle();
        expect(world.orchestrator2.starts).toHaveLength(0);
        world.flow.confirm(token);
        world.flow.confirm(token);
        await world.flow.whenIdle();
        expect(world.orchestrator2.starts).toHaveLength(1);
        world.flow.confirm(token);
        await world.flow.whenIdle();
        expect(world.orchestrator2.starts).toHaveLength(1);
    });

    it('marks the confirmation as starting while the preconditions run again and 0011 answers, refuses a hand-off as pending and ignores Cancel', async () => {
        const world = await createFlowWorld();
        let answer: (value: StartAnswer) => void = () => undefined;
        world.orchestrator2.answer = () => new Promise<StartAnswer>((resolve) => (answer = resolve));
        const token = await confirmed(world);
        world.flow.confirm(token);
        expect(world.flow.view().confirmation?.starting).toBe(true);
        await new Promise((resolve) => setTimeout(resolve, 60));
        expect(world.orchestrator2.starts).toHaveLength(1);
        world.flow.handOff({ stem: START_STEM, key: SPEC_PATH });
        expect(world.flow.view().refusal?.items).toEqual([{ id: 'pending' }]);
        world.flow.cancel(token);
        expect(world.flow.view().confirmation?.starting).toBe(true);
        answer({ kind: 'started', runId: 'run-1' });
        await world.flow.whenIdle();
        expect(world.flow.view().confirmation).toBeUndefined();
        expect(world.orchestrator2.starts).toHaveLength(1);
    });

    it('AC-004: a precondition failing on Start refuses it and hands 0011 nothing, for P-1 and P-7', async () => {
        const world = await createFlowWorld();
        const token = await confirmed(world);
        await world.setSpecs([{ folder: 'active', stem: START_STEM }]);
        await startOf(world, token);
        expect(world.flow.view().confirmation).toBeUndefined();
        expect(world.flow.view().refusal?.items[0]).toMatchObject({ id: 'P-1', kind: 'transition', refusal: 'lifecycle-move' });
        expect(world.orchestrator2.starts).toEqual([]);

        const second = await createFlowWorld();
        const secondToken = await confirmed(second);
        second.trust.trusted = false;
        await startOf(second, secondToken);
        expect(second.flow.view().refusal?.items).toEqual([{ id: 'P-7' }]);
        expect(second.orchestrator2.starts).toEqual([]);
    });

    it('AC-004: the default provider changed since the confirmation opened is "confirmation outdated"', async () => {
        const world = await createFlowWorld();
        const token = await confirmed(world);
        world.setting.set('controlled');
        await startOf(world, token);
        expect(world.flow.view().refusal?.items).toEqual([{ id: 'outdated' }]);
        expect(world.flow.view().confirmation).toBeUndefined();
        expect(world.orchestrator2.starts).toEqual([]);
    });

    it('AC-004: the model the provider reports changed is "confirmation outdated"', async () => {
        const world = await createFlowWorld();
        const token = await confirmed(world);
        world.fake.nextStartModel = () => 'another-model';
        await startOf(world, token);
        expect(world.flow.view().refusal?.items).toEqual([{ id: 'outdated' }]);
        expect(world.orchestrator2.starts).toEqual([]);
    });

    it('AC-004: the permission mode the provider reports changed is "confirmation outdated"', async () => {
        const world = await createFlowWorld();
        world.setup.registry.register(declaredAdapter('controlled-two', { permissionModeLabel: 'Asks before every action' }));
        world.setting.set('controlled-two');
        const token = await confirmed(world);
        world.setup.registry.unregister('controlled-two');
        world.setup.registry.register(declaredAdapter('controlled-two', { permissionModeLabel: 'Never asks' }));
        await startOf(world, token);
        expect(world.flow.view().refusal?.items).toEqual([{ id: 'outdated' }]);
        expect(world.orchestrator2.starts).toEqual([]);
    });

    it('AC-004: nothing changed is no refusal (negative control for the three outdated causes)', async () => {
        const world = await createFlowWorld();
        await startOf(world, await confirmed(world));
        expect(world.flow.view().refusal).toBeUndefined();
        expect(world.orchestrator2.starts).toHaveLength(1);
    });

    it('AC-011: the request has no permission field and only availability checks reach the provider', async () => {
        const world = await createFlowWorld();
        await startOf(world, await confirmed(world));
        expect(Object.keys(world.orchestrator2.starts[0] ?? {}).sort()).toEqual(['model', 'projectRoot', 'prompt', 'providerId', 'spec']);
        expect(world.fakeCalls()).toEqual(['checkAvailability', 'checkAvailability']);
        expect(world.orchestrator2.previousRuns).toEqual([START_STEM]);
    });

    it('AC-014: after a confirmed start whose run has ended the next hand-off shows the confirmation again', async () => {
        const world = await createFlowWorld();
        world.orchestrator2.answer = async () => {
            const run = await world.store.createRun({ providerId: 'fake', spec: { stem: START_STEM, path: SPEC_PATH } });
            return { kind: 'started', runId: run.runId };
        };
        await startOf(world, await confirmed(world));
        await world.handOff();
        expect(world.flow.view().refusal?.items.map((item) => item.id)).toEqual(['P-5']);
        const [run] = await world.runs();
        await world.store.reportStatus(run?.runId ?? '', 'Running');
        await world.store.reportStatus(run?.runId ?? '', 'Completed');
        await world.handOff();
        expect(world.flow.view().confirmation).toBeDefined();
        expect(world.flow.view().refusal).toBeUndefined();
    });
});

describe('start flow: 0011 answers (AC-008, AC-010)', () => {
    it('AC-008: 0011 refusing for an open run shows the refusal with run ID and stem and no notice', async () => {
        const world = await createFlowWorld();
        world.orchestrator2.answer = { kind: 'refused', text: 'Run r-7 of spec 0002-b is still open.', run: { runId: 'r-7', stem: '0002-b' } };
        await startOf(world, await confirmed(world));
        expect(world.flow.view()).toEqual({
            refusal: { number: '0001', items: [{ id: 'orchestrator', text: 'Run r-7 of spec 0002-b is still open.', run: { runId: 'r-7', stem: '0002-b' } }] },
        });
    });

    it('AC-010: 0011 refusing with another reason shows its text as a refusal and no notice', async () => {
        const world = await createFlowWorld();
        world.orchestrator2.answer = { kind: 'refused', text: 'Provider nowhere is not registered.' };
        await startOf(world, await confirmed(world));
        expect(world.flow.view().refusal?.items).toEqual([{ id: 'orchestrator', text: 'Provider nowhere is not registered.' }]);
        expect(world.flow.view().notice).toBeUndefined();
    });

    it('AC-010: a run going from Starting to Failed shows the notice with run ID and error class and sends no further request', async () => {
        const world = await createFlowWorld();
        let runId = '';
        world.orchestrator2.answer = async () => {
            const run = await world.store.createRun({ providerId: 'fake', spec: { stem: START_STEM, path: SPEC_PATH } });
            runId = run.runId;
            return { kind: 'started', runId };
        };
        await startOf(world, await confirmed(world));
        expect(world.flow.view().notice).toBeUndefined();
        await world.store.reportStatus(runId, 'Failed', { errorClass: 'runtime_missing', errorMessage: 'No runtime.' });
        await world.flow.whenIdle();
        expect(world.flow.view().notice).toEqual({ runId, errorClass: 'runtime_missing' });
        expect(world.orchestrator2.starts).toHaveLength(1);
        world.flow.dismiss('notice');
        expect(world.flow.view().notice).toBeUndefined();
    });

    it('AC-010: a run already Failed when 0011 answers still gives the notice', async () => {
        const world = await createFlowWorld();
        world.orchestrator2.answer = async () => {
            const run = await world.store.createRun({ providerId: 'fake', spec: { stem: START_STEM, path: SPEC_PATH } });
            await world.store.reportStatus(run.runId, 'Failed', { errorClass: 'auth' });
            return { kind: 'started', runId: run.runId };
        };
        await startOf(world, await confirmed(world));
        await world.flow.whenIdle();
        expect(world.flow.view().notice).toMatchObject({ errorClass: 'auth' });
    });

    it('AC-010: a run that leaves Starting for Running and fails later gives no notice (only Starting to Failed does)', async () => {
        const world = await createFlowWorld();
        let runId = '';
        world.orchestrator2.answer = async () => {
            const run = await world.store.createRun({ providerId: 'fake', spec: { stem: START_STEM, path: SPEC_PATH } });
            runId = run.runId;
            return { kind: 'started', runId };
        };
        await startOf(world, await confirmed(world));
        await world.store.reportStatus(runId, 'Running');
        await world.flow.whenIdle();
        await world.store.reportStatus(runId, 'Failed', { errorClass: 'network_or_server' });
        await world.flow.whenIdle();
        expect(world.flow.view().notice).toBeUndefined();
    });

    it('AC-010: a run first read as Failed after passing through Running gives no notice (coalesced read)', async () => {
        const world = await createFlowWorld();
        world.orchestrator2.answer = async () => {
            const run = await world.store.createRun({ providerId: 'fake', spec: { stem: START_STEM, path: SPEC_PATH } });
            await world.store.reportStatus(run.runId, 'Running');
            await world.store.reportStatus(run.runId, 'Failed', { errorClass: 'network_or_server' });
            return { kind: 'started', runId: run.runId };
        };
        await startOf(world, await confirmed(world));
        await world.flow.whenIdle();
        expect(world.flow.view().notice).toBeUndefined();
    });

    it('AC-010: another project becoming active drops the watch and the notice', async () => {
        const world = await createFlowWorld();
        let runId = '';
        world.orchestrator2.answer = async () => {
            const run = await world.store.createRun({ providerId: 'fake', spec: { stem: START_STEM, path: SPEC_PATH } });
            runId = run.runId;
            return { kind: 'started', runId };
        };
        await startOf(world, await confirmed(world));
        const current = world.model.current;
        if (current === undefined) {
            throw new Error('no model');
        }
        world.model.current = { ...current, project: { ...current.project, root: 'other-project' } };
        world.notifyModel();
        await world.store.reportStatus(runId, 'Failed', { errorClass: 'auth' });
        await world.flow.whenIdle();
        expect(world.flow.view().notice).toBeUndefined();
    });

    it('a throwing orchestrator ends as a refusal, not as a stuck confirmation', async () => {
        const world = await createFlowWorld();
        world.orchestrator2.answer = () => Promise.reject(new Error('boom'));
        await startOf(world, await confirmed(world));
        expect(world.flow.view().confirmation).toBeUndefined();
        expect(world.flow.view().refusal?.items[0]).toMatchObject({ id: 'orchestrator' });
        await world.handOff();
        expect(world.flow.view().confirmation).toBeDefined();
    });
});
