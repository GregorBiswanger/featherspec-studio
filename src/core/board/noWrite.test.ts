import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createNodeSpecSource } from '../../adapters/node/nodeSpecSource';
import { fixturePath } from '../discovery/testing/fixtures';
import { snapshotTree } from '../discovery/testing/snapshotTree';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import { readProject } from '../specs/readProject';
import { createOpenFile } from './openFile';
import { createBoardWorld } from './testing/boardWorld';
import { buildDetail } from './detail';
import { projectNow, projectUpNext } from '../overview/rows';
import { createSpecResolver } from '../overview/specRefs';

let temp: string | undefined;
afterEach(async () => {
    if (temp !== undefined) {
        await fs.rm(temp, { recursive: true, force: true });
    }
});

describe('AC-016, AC-028: the board writes no file', () => {
    it('every board action on a temp copy of the Ready fixture leaves the project tree unchanged', async () => {
        temp = await fs.mkdtemp(path.join(os.tmpdir(), 'board-nowrite-'));
        await fs.cp(fixturePath('fs110-ready-synthetic'), temp, { recursive: true });
        const project = await readProject(createNodeSpecSource(), temp, '1.10.0');
        const model = { project, lifecycle: deriveLifecycle(project) };
        const before = await snapshotTree(temp);
        const world = createBoardWorld(model);
        await world.service.whenIdle();
        const opened: string[] = [];
        const openFile = createOpenFile({ source: world.source, editor: { open: async (_root, key) => {
                    opened.push(key);
                    return 'opened';
                } } });
        world.service.setFilter({ states: ['Ready'] });
        world.service.setSort('lastChange');
        world.service.setDone(true);
        world.service.setDone(false);
        world.service.applyNavigationFilter({ set: { label: 'x', stems: ['0001-ready-feature'] } });
        world.service.clearFilters();
        for (const entry of model.lifecycle.entries) {
            await openFile.open(entry.key, 3);
        }
        expect(opened.length).toBeGreaterThan(0);
        expect(await snapshotTree(temp)).toEqual(before);
        expect(world.memory.writes).toEqual([{ v: 1, done: 'expanded' }, { v: 1, done: 'collapsed' }]);
        world.service.dispose();
    });

    it('0025 AC-018: the detail with its step links, the header and the hint, and the Overview rows with their links, write nothing on a temp copy of fs110-parallel-synthetic', async () => {
        temp = await fs.mkdtemp(path.join(os.tmpdir(), 'board-nowrite-0025-'));
        await fs.cp(fixturePath('fs110-parallel-synthetic'), temp, { recursive: true });
        const project = await readProject(createNodeSpecSource(), temp, '1.10.0');
        const model = { project, lifecycle: deriveLifecycle(project) };
        const before = await snapshotTree(temp);
        const history = { available: true as const, label: '', entries: [] };
        for (const entry of model.lifecycle.entries) {
            buildDetail({ selection: { stem: entry.stem, path: entry.key }, model, history });
        }
        const rows = [...projectNow(model, createSpecResolver(model)), ...projectUpNext(model, createSpecResolver(model)).rows];
        expect(rows.length).toBeGreaterThan(0);
        expect(await snapshotTree(temp)).toEqual(before);
    });
});
