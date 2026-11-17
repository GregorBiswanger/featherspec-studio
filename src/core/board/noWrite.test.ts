import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createNodeSpecSource } from '../../adapters/node/nodeSpecSource';
import { fixturePath } from '../discovery/testing/fixtures';
import { snapshotTree } from '../discovery/testing/snapshotTree';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import { readProject } from '../specs/readProject';
import type { MoveResult } from '../../shared/protocol/board';
import { BOARD_STATES } from '../../shared/protocol/boardFilter';
import { createMoves } from './moves';
import { createOpenFile } from './openFile';
import { createBoardWorld } from './testing/boardWorld';

let temp: string | undefined;
afterEach(async () => {
    if (temp !== undefined) {
        await fs.rm(temp, { recursive: true, force: true });
    }
});

describe('AC-016: the board writes no file', () => {
    it('every board action on a temp copy of the Ready fixture leaves the project tree unchanged', async () => {
        temp = await fs.mkdtemp(path.join(os.tmpdir(), 'board-nowrite-'));
        await fs.cp(fixturePath('fs110-ready-synthetic'), temp, { recursive: true });
        const project = await readProject(createNodeSpecSource(), temp, '1.10.0');
        const model = { project, lifecycle: deriveLifecycle(project) };
        const before = await snapshotTree(temp);
        const world = createBoardWorld(model);
        await world.service.whenIdle();
        const opened: string[] = [];
        const results: MoveResult[] = [];
        const moves = createMoves({
            source: world.source,
            picks: { pickSpec: async (items) => items[0]?.key, pickTarget: async () => 'Active' },
            sink: { show: () => undefined },
            selection: { selection: () => undefined, onDidChange: () => ({ dispose: () => undefined }) },
            focused: () => world.service.focused(),
        });
        const openFile = createOpenFile({ source: world.source, editor: { open: async (_root, key) => {
                    opened.push(key);
                    return 'opened';
                } } });
        world.service.setFilter({ states: ['Ready'] });
        world.service.setSort('lastChange');
        world.service.applyNavigationFilter({ set: { label: 'x', stems: ['0001-ready-feature'] } });
        world.service.clearFilters();
        for (const entry of model.lifecycle.entries) {
            for (const target of BOARD_STATES) {
                results.push(await moves.requestMove(entry.key, target));
            }
            await openFile.open(entry.key, 3);
        }
        await moves.runMoveCommand();
        expect(opened.length).toBeGreaterThan(0);
        expect(results.some((result) => result.kind === 'nextStep')).toBe(true);
        expect(await snapshotTree(temp)).toEqual(before);
        world.service.dispose();
    });
});
