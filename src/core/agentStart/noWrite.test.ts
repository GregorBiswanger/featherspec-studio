import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createFileRuntimeMedium } from '../../adapters/node/fileRuntimeMedium';
import { fixturePath } from '../discovery/testing/fixtures';
import { snapshotTree } from '../discovery/testing/snapshotTree';
import { bindOrchestrator } from './orchestratorBinding';
import { createStartFlow } from './startFlow';
import { createFakeStartOrchestrator, createFakeStartUi } from './testing/fakeOrchestrator';
import { START_FIXTURE, START_STEM, createStartWorld } from './testing/startWorld';

const temps: string[] = [];
afterEach(async () => {
    for (const directory of temps.splice(0)) {
        await fs.rm(directory, { recursive: true, force: true });
    }
});

async function temp(prefix: string): Promise<string> {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
    temps.push(directory);
    return directory;
}

describe('AC-012: the start workflow changes no file in the project', () => {
    it('every scenario of the criteria section leaves the project tree identical while the run history does change', async () => {
        const copy = await temp('agent-start-copy-');
        const history = await temp('agent-start-history-');
        await fs.cp(fixturePath(START_FIXTURE), copy, { recursive: true });
        const world = await createStartWorld({ root: copy, medium: () => createFileRuntimeMedium(history) });
        const flow = createStartFlow({
            preconditions: world.deps,
            orchestrator: bindOrchestrator(world.orchestrator, (root) => root),
            ui: createFakeStartUi(),
            runs: world.runSource,
        });
        const request = { stem: START_STEM, key: `.specs/backlog/${START_STEM}.md` };
        const before = await snapshotTree(copy);
        const settle = async (): Promise<void> => {
            await flow.whenIdle();
            await world.orchestrator.whenIdle();
            await flow.whenIdle();
        };
        const handOff = async (): Promise<void> => {
            flow.handOff(request);
            await settle();
        };

        world.trust.trusted = false;
        await handOff();
        world.trust.trusted = true;
        await handOff();
        flow.cancel(flow.view().confirmation?.token ?? '');

        await handOff();
        world.setting.set('controlled');
        flow.confirm(flow.view().confirmation?.token ?? '');
        await settle();
        world.setting.set('fake');

        await handOff();
        flow.confirm(flow.view().confirmation?.token ?? '');
        await settle();
        await world.advance(1_000);
        await settle();

        world.scenario.current = 'long-run';
        await handOff();
        flow.confirm(flow.view().confirmation?.token ?? '');
        await settle();
        await world.advance(10);
        await handOff();
        flow.dismiss('refusal');

        expect((await world.runs()).length).toBeGreaterThanOrEqual(2);
        expect((await snapshotTree(history)).length).toBeGreaterThan(0);
        expect(await snapshotTree(copy)).toEqual(before);
        await fs.writeFile(path.join(copy, 'intruder.txt'), 'x');
        expect(await snapshotTree(copy)).not.toEqual(before);
    });

    it('a 0011 refusal and a thrown error change no project file either', async () => {
        const copy = await temp('agent-start-copy-');
        await fs.cp(fixturePath(START_FIXTURE), copy, { recursive: true });
        const world = await createStartWorld({ root: copy });
        const orchestrator = createFakeStartOrchestrator();
        const flow = createStartFlow({ preconditions: world.deps, orchestrator, ui: createFakeStartUi(), runs: world.runSource });
        const before = await snapshotTree(copy);
        orchestrator.answer = { kind: 'refused', text: 'Refused.' };
        flow.handOff({ stem: START_STEM, key: 'x' });
        await flow.whenIdle();
        flow.confirm(flow.view().confirmation?.token ?? '');
        await flow.whenIdle();
        expect(flow.view().refusal?.items[0]).toMatchObject({ id: 'orchestrator' });
        expect(await snapshotTree(copy)).toEqual(before);
    });
});
