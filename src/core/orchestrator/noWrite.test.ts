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
import { createWorld } from './testing/world';

const temps = createTempDirectories();
afterEach(() => temps.removeAll());

const temp = (prefix: string): Promise<string> => temps.make(prefix);

const STEM = '0001-ready-feature';

async function scenarios(): Promise<{ copy: string; history: string }> {
    const copy = await temp('orchestrator-copy-');
    const history = await temp('orchestrator-history-');
    await fs.cp(fixturePath('fs110-ready-synthetic'), copy, { recursive: true });
    const project = await readProject(createNodeSpecSource(), copy, '1.10.0');
    const world = await createWorld({ medium: () => createFileRuntimeMedium(history) });
    temps.closeBeforeRemoval(async () => {
        await world.orchestrator.whenIdle();
        await world.store.dispose();
    });
    world.model.current = { project, lifecycle: deriveLifecycle(project) };
    const before = await snapshotTree(copy);
    const request = world.request({ stem: STEM, path: `.specs/backlog/${STEM}.md` });

    world.scenario.current = 'happy-path';
    await world.orchestrator.start(request);
    await world.advance(1_000);

    world.scenario.current = 'approval';
    const approval = await world.orchestrator.start(request);
    await world.advance(1_000);
    if (approval.kind === 'started') {
        await world.orchestrator.respondToApproval(approval.runId, 'fake-approval-1', { decision: 'approve-once' });
    }
    await world.advance(1_000);

    world.scenario.current = 'input';
    const input = await world.orchestrator.start(request);
    await world.advance(1_000);
    if (input.kind === 'started') {
        await world.orchestrator.respondToInput(input.runId, 'fake-input-1', 'the answer');
    }
    await world.advance(1_000);

    world.scenario.current = 'long-run';
    const long = await world.orchestrator.start(request);
    await world.advance(50);
    if (long.kind === 'started') {
        await world.orchestrator.stop(long.runId);
    }
    await world.advance(1_000);

    world.scenario.current = 'failure:auth';
    await world.orchestrator.start(request);
    await world.advance(1_000);

    world.scenario.current = 'long-run';
    const interrupted = await world.orchestrator.start(request);
    await world.advance(50);
    await world.reopen();
    if (interrupted.kind === 'started') {
        await world.orchestrator.resume(interrupted.runId);
    }
    await world.advance(1_000);
    expect((await world.runs()).length).toBeGreaterThanOrEqual(7);
    expect((await snapshotTree(history)).length).toBeGreaterThan(0);
    expect(await snapshotTree(copy)).toEqual(before);
    return { copy, history };
}

describe('no write inside the workspace', () => {
    it('AC-017: start, stop, resume and answers on a temp copy of a fixture project leave its tree unchanged, with the run history in a separate directory', async () => {
        await scenarios();
    });

    it('AC-017: negative control, a write into the copy changes the snapshot', async () => {
        const { copy } = await scenarios();
        const before = await snapshotTree(copy);
        await fs.writeFile(path.join(copy, 'stray.txt'), 'x');
        expect(await snapshotTree(copy)).not.toEqual(before);
    });
});
