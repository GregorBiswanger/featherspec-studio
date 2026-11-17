import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createFileRuntimeMedium } from '../../adapters/node/fileRuntimeMedium';
import { createNodeSpecSource } from '../../adapters/node/nodeSpecSource';
import { fixturePath } from '../discovery/testing/fixtures';
import { snapshotTree } from '../discovery/testing/snapshotTree';
import { createTempDirectories } from '../runtime/testing/tempDirectories';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import { readProject } from '../specs/readProject';
import { createCenterWorld } from './testing/centerWorld';

const temps = createTempDirectories();
afterEach(() => temps.removeAll());

const temp = (prefix: string): Promise<string> => temps.make(prefix);

const STEM = '0001-ready-feature';

async function scenarios(): Promise<{ copy: string }> {
    const copy = await temp('center-copy-');
    const history = await temp('center-history-');
    await fs.cp(fixturePath('fs110-ready-synthetic'), copy, { recursive: true });
    const project = await readProject(createNodeSpecSource(), copy, '1.10.0');
    const world = await createCenterWorld({ medium: () => createFileRuntimeMedium(history) });
    temps.closeBeforeRemoval(async () => {
        await world.flush();
        await world.world.orchestrator.whenIdle();
        await world.world.store.dispose();
    });
    world.world.model.current = { project, lifecycle: deriveLifecycle(project) };
    const before = await snapshotTree(copy);
    const request = world.world.request({ stem: STEM, path: `.specs/backlog/${STEM}.md` });

    world.world.scenario.current = 'approval';
    const started = await world.world.orchestrator.start(request);
    await world.world.advance(1_000);
    await world.flush();
    if (started.kind === 'started') {
        world.service.select(started.runId);
        await world.flush();
        world.service.loadEarlier(started.runId);
        world.service.follow(started.runId, false);
        world.service.reread();
        await world.flush();
        expect(world.service.timeline()?.rows.length).toBeGreaterThan(0);
        await world.world.orchestrator.respondToApproval(started.runId, 'fake-approval-1', { decision: 'approve-once' });
    }
    await world.world.advance(1_000);
    world.world.scenario.current = 'failure:auth';
    await world.world.orchestrator.start(request);
    await world.world.advance(1_000);
    world.navigation.send({ area: 'agentCenter', target: { kind: 'spec', stem: STEM } });
    await world.flush();
    expect((await world.world.runs()).length).toBe(2);
    expect((await snapshotTree(history)).length).toBeGreaterThan(0);
    expect(await snapshotTree(copy)).toEqual(before);
    return { copy };
}

describe('AC-030: no write inside the workspace', () => {
    it('showing, selecting, paging, following, re-reading and updating on a temp copy of a fixture project leave its tree unchanged', async () => {
        await scenarios();
    });

    it('negative control: a write into the copy changes the snapshot', async () => {
        const { copy } = await scenarios();
        const before = await snapshotTree(copy);
        await fs.writeFile(path.join(copy, 'stray.txt'), 'x');
        expect(await snapshotTree(copy)).not.toEqual(before);
    });
});
