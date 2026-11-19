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
import { buildOverviewView } from '../overview/overviewView';
import { createSend } from '../assistant/send';
import { createFakeAssistantHost } from '../assistant/testing/fakeAssistantHost';
import { parseStepTipSettings } from '../settings/stepTipSettings';
import { createSetupClock } from '../setup/testing/setupClock';
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
        const rows = [...projectNow(model, createSpecResolver(model)).rows, ...projectUpNext(model, createSpecResolver(model)).rows];
        expect(rows.length).toBeGreaterThan(0);
        expect(await snapshotTree(temp)).toEqual(before);
    });
});

describe('0026 AC-014: Send, both menu items, a way, the (?) and + n more write nothing', () => {
    it('on a temp copy of fs110-parallel-synthetic the Overview view with tips and an offer, both Send targets and the named set Now leave the tree and the settings unchanged', async () => {
        temp = await fs.mkdtemp(path.join(os.tmpdir(), 'board-nowrite-0026-'));
        await fs.cp(fixturePath('fs110-parallel-synthetic'), temp, { recursive: true });
        const project = await readProject(createNodeSpecSource(), temp, '1.10.0');
        const model = { project, lifecycle: deriveLifecycle(project) };
        const before = await snapshotTree(temp);
        const view = buildOverviewView({ model, history: { available: true, label: '', entries: [] }, tips: parseStepTipSettings(true, {}), offer: { assistant: 'copilot' } });
        expect(view.now.rows[0]?.send?.target).toBe('new');
        const host = createFakeAssistantHost(['workbench.action.chat.newChat', 'workbench.action.chat.open']);
        host.install('GitHub.copilot-chat');
        const written: string[] = [];
        const sender = createSend({
            host,
            clipboard: { writeText: async (text) => void written.push(text) },
            ui: { warn: () => undefined },
            output: { appendBlock: () => undefined },
            clock: createSetupClock(),
            platform: 'win32',
            chosen: { read: () => 'copilot' },
        });
        const line = view.now.rows[0]?.step?.line ?? '/sdd-plan x';
        expect((await sender.send({ assistant: 'copilot', target: 'new', line })).outcome).toBe('opened');
        expect((await sender.send({ assistant: 'copilot', target: 'current', line })).outcome).toBe('opened');
        expect(host.calls.map((call) => call.command)).toEqual(['workbench.action.chat.newChat', 'workbench.action.chat.open', 'workbench.action.chat.open']);
        const world = createBoardWorld(model);
        await world.service.whenIdle();
        world.service.applyNavigationFilter({ set: { label: 'Now', stems: view.now.stems } });
        expect(written).toEqual([]);
        expect(world.memory.writes).toEqual([]);
        expect(await snapshotTree(temp)).toEqual(before);
        world.service.dispose();
    });

    it('negative control: the snapshot sees a file written into the temp copy', async () => {
        temp = await fs.mkdtemp(path.join(os.tmpdir(), 'board-nowrite-0026c-'));
        const before = await snapshotTree(temp);
        await fs.writeFile(path.join(temp, 'x.txt'), 'x');
        expect(await snapshotTree(temp)).not.toEqual(before);
    });
});
