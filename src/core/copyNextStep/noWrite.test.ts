import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createNodeSpecSource } from '../../adapters/node/nodeSpecSource';
import { createBoardRequests } from '../board/boardRequests';
import { createBoardWorld } from '../board/testing/boardWorld';
import { fixturePath } from '../discovery/testing/fixtures';
import { snapshotTree } from '../discovery/testing/snapshotTree';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import { parseStepTipSettings } from '../settings/stepTipSettings';
import { readProject } from '../specs/readProject';
import { createCopyNextStep } from './copyNextStep';
import { createFakeAssistantHost } from '../assistant/testing/fakeAssistantHost';
import { createSend } from '../assistant/send';
import { openSettings } from '../settings/openSettings';
import { createSetupClock } from '../setup/testing/setupClock';
import { createEntryWorld } from './testing/entryWorld';
import { createTreeActions } from '../shell/treeActions';
import { buildSpecTree, type GroupModel, type SpecRowModel } from '../shell/specTree';

let temp: string | undefined;

afterEach(async () => {
    if (temp !== undefined) {
        await fs.rm(temp, { recursive: true, force: true });
        temp = undefined;
    }
});

describe('0017 AC-023: no Copy, click or command writes a file', () => {
    it('card and row Copy, the entry and every path of the command leave a temp copy of fs110-ready-synthetic unchanged', async () => {
        temp = await fs.mkdtemp(path.join(os.tmpdir(), 'copy-nowrite-'));
        await fs.cp(fixturePath('fs110-ready-synthetic'), temp, { recursive: true });
        const project = await readProject(createNodeSpecSource(), temp, '1.10.0');
        const model = { project, lifecycle: deriveLifecycle(project) };
        const before = await snapshotTree(temp);

        const board = createBoardWorld(model);
        await board.service.whenIdle();
        const written: string[] = [];
        const requests = createBoardRequests({
            send: async () => ({ outcome: 'copied', text: 'Copied to the clipboard.' }),
            board: board.service,
            openFile: { open: async () => ({ kind: 'opened' }) } as never,
            clipboard: { writeText: async (text) => void written.push(text) },
        });
        const results: boolean[] = [];
        requests.onDidCopyResult((result) => results.push(result.ok));
        for (const entry of model.lifecycle.entries) {
            await requests.handlers.copyText({ text: `/sdd-plan ${entry.key}` });
        }

        const world = createEntryWorld();
        world.setProjects([{ name: 'fixture', root: temp }], 'fixture');
        world.setModel(model);
        const asked: string[] = [];
        let answer: 'first' | 'none' = 'first';
        const command = createCopyNextStep({
            entry: world.entry,
            clipboard: { writeText: async (text) => void written.push(text) },
            ui: {
                pick: async (items) => {
                    asked.push(...items.map((item) => item.key));
                    return answer === 'first' ? items[0] : undefined;
                },
                inform: async () => 'Copy prompt',
                warn: () => undefined,
            },
            actions: { selectProject: async () => void asked.push('select'), openStudio: async () => void asked.push('open') },
        });
        await command.run();
        answer = 'none';
        await command.run();
        world.select({ stem: '0001-ready-feature' });
        await command.run();
        world.setPanelState({ id: 'S4' });
        await command.run();
        world.setPanelState(undefined);
        world.clearActive();
        await command.run();
        await world.setSpecs([]);
        world.setProjects([{ name: 'fixture', root: temp }], 'fixture');
        await command.run();

        expect(results.length).toBeGreaterThan(0);
        expect(written.length).toBeGreaterThan(results.length);
        expect(asked).toEqual(expect.arrayContaining(['select', 'open']));
        expect(await snapshotTree(temp)).toEqual(before);
        board.service.dispose();
        world.dispose();
    });

    it('0021 AC-017: a settings change, a hint change and the Copy prompt of an NS-6 line write no file of the workspace', async () => {
        temp = await fs.mkdtemp(path.join(os.tmpdir(), 'copy-nowrite-'));
        await fs.cp(fixturePath('fs110-ready-synthetic'), temp, { recursive: true });
        const project = await readProject(createNodeSpecSource(), temp, '1.10.0');
        const model = { project, lifecycle: deriveLifecycle(project) };
        const before = await snapshotTree(temp);
        const board = createBoardWorld(model);
        await board.service.whenIdle();
        board.selection.set({ stem: model.lifecycle.entries[0]!.stem });
        const written: string[] = [];
        const requests = createBoardRequests({
            send: async () => ({ outcome: 'copied', text: 'Copied to the clipboard.' }),
            board: board.service,
            openFile: { open: async () => ({ kind: 'opened' }) } as never,
            clipboard: { writeText: async (text) => void written.push(text) },
        });
        board.tips.set(parseStepTipSettings(true, {}));
        await board.service.whenIdle();
        board.tips.set(parseStepTipSettings(true, { strong: 'X', fast: 'Y' }));
        await board.service.whenIdle();
        await requests.handlers.copyText({ text: 'Implement T-003 of .specs/active/0001-a.plan.md' });
        board.tips.set(parseStepTipSettings(false, {}));
        await board.service.whenIdle();
        expect(written).toEqual(['Implement T-003 of .specs/active/0001-a.plan.md']);
        expect(await snapshotTree(temp)).toEqual(before);
        board.service.dispose();
    });

    it('0023 AC-014: the Copy of a stage prompt and of a start line, and opening a step heading, leave a temp copy of fs110-parallel-synthetic unchanged', async () => {
        temp = await fs.mkdtemp(path.join(os.tmpdir(), 'copy-nowrite-'));
        await fs.cp(fixturePath('fs110-parallel-synthetic'), temp, { recursive: true });
        await fs.rm(path.join(temp, '.memory-bank', 'activeContext.0001-T-003.md'));
        await fs.rm(path.join(temp, '.memory-bank', 'activeContext.0001-T-004.md'));
        const planFile = path.join(temp, '.specs', 'active', '0001-parallel-demo.plan.md');
        await fs.writeFile(planFile, (await fs.readFile(planFile, 'utf8')).replace('**Status:** Blocked', '**Status:** In Progress'));
        const project = await readProject(createNodeSpecSource(), temp, '1.10.0');
        const model = { project, lifecycle: deriveLifecycle(project) };
        const before = await snapshotTree(temp);
        const board = createBoardWorld(model);
        board.selection.set({ stem: '0001-parallel-demo' });
        await board.service.whenIdle();
        const opened: Array<[string, number | undefined]> = [];
        const written: string[] = [];
        const requests = createBoardRequests({
            send: async () => ({ outcome: 'copied', text: 'Copied to the clipboard.' }),
            board: board.service,
            openFile: { open: async (key: string, line?: number) => (opened.push([key, line]), { kind: 'opened' }) } as never,
            clipboard: { writeText: async (text) => void written.push(text) },
        });
        const detail = board.service.detail();
        const plan = detail.kind === 'spec' ? detail.plan : undefined;
        expect(plan?.kind).toBe('plan');
        const step = plan?.kind === 'plan' ? plan.stages[1]!.groups[0]!.steps[0]! : undefined;
        const ways = plan?.kind === 'plan' ? plan.stages[1]!.ways : undefined;
        expect(ways).toBeDefined();
        for (const text of [...ways!.prompts, ...ways!.startLines]) {
            await requests.handlers.copyText({ text });
        }
        await requests.handlers.openFile({ key: step!.open!.key, line: step!.open!.line });
        expect(written).toEqual([...ways!.prompts, ...ways!.startLines]);
        expect(opened).toEqual([[step!.open!.key, step!.open!.line]]);
        expect(await snapshotTree(temp)).toEqual(before);
        board.service.dispose();
    });

    it('0024 AC-012: every Send outcome, the Copy item and Open Settings leave a temp copy of fs110-ready-synthetic unchanged and write no setting', async () => {
        temp = await fs.mkdtemp(path.join(os.tmpdir(), 'send-nowrite-'));
        await fs.cp(fixturePath('fs110-ready-synthetic'), temp, { recursive: true });
        const before = await snapshotTree(temp);
        const host = createFakeAssistantHost(['workbench.action.chat.newChat', 'workbench.action.chat.open', 'claude-vscode.editor.open']);
        host.install('GitHub.copilot-chat');
        host.install('anthropic.claude-code');
        const written: string[] = [];
        let clipboardFails = false;
        const sender = createSend({
            host,
            clipboard: {
                writeText: async (text) => {
                    if (clipboardFails) {
                        throw new Error('no clipboard');
                    }
                    written.push(text);
                },
            },
            ui: { warn: () => undefined },
            output: { appendBlock: () => undefined },
            clock: createSetupClock(),
            platform: 'linux',
            chosen: { read: () => 'copilot' },
        });
        const line = 'Implement T-003 of .specs/active/0001-a.plan.md';
        const outcomes = [
            (await sender.send({ assistant: 'copilot', target: 'new', line })).outcome,
            (await sender.send({ assistant: 'copilot', target: 'current', line })).outcome,
            (await sender.send({ assistant: 'claudeCode', target: 'new', line })).outcome,
        ];
        host.uninstall('GitHub.copilot-chat');
        outcomes.push((await sender.send({ assistant: 'copilot', target: 'new', line })).outcome);
        clipboardFails = true;
        outcomes.push((await sender.send({ assistant: 'copilot', target: 'new', line })).outcome);
        await openSettings(host);
        expect(outcomes).toEqual(['opened', 'opened', 'copied', 'copied', 'copyFailed']);
        expect(written).toEqual([line, line]);
        expect(host.calls.map((call) => call.command)).toEqual(['workbench.action.chat.newChat', 'workbench.action.chat.open', 'workbench.action.chat.open', 'workbench.action.openSettings']);
        expect(await snapshotTree(temp)).toEqual(before);
    });

    it('0024 AC-012: an offer change and the sends the views offer leave a temp copy of fs110-ready-synthetic unchanged', async () => {
        temp = await fs.mkdtemp(path.join(os.tmpdir(), 'send-nowrite-'));
        await fs.cp(fixturePath('fs110-ready-synthetic'), temp, { recursive: true });
        const project = await readProject(createNodeSpecSource(), temp, '1.10.0');
        const model = { project, lifecycle: deriveLifecycle(project) };
        const before = await snapshotTree(temp);
        const board = createBoardWorld(model);
        board.selection.set({ stem: model.lifecycle.entries[0]!.stem });
        await board.service.whenIdle();
        board.assistant.set({ assistant: 'copilot' });
        await board.service.whenIdle();
        board.assistant.set({ assistant: 'claudeCode' });
        await board.service.whenIdle();
        board.assistant.uninstall('claudeCode');
        await board.service.whenIdle();
        const view = board.service.detail();
        expect(view.kind).toBe('spec');
        expect(await snapshotTree(temp)).toEqual(before);
        board.service.dispose();
    });

    it('0024 AC-012: the assistant core, Open Settings and the host adapter call no configuration update and no file API', async () => {
        const files = ['src/core/assistant/assistants.ts', 'src/core/assistant/offer.ts', 'src/core/assistant/sendView.ts', 'src/core/assistant/send.ts', 'src/core/settings/openSettings.ts', 'src/adapters/vscode/assistantHost.ts'];
        for (const file of files) {
            const source = await fs.readFile(path.resolve(process.cwd(), ...file.split('/')), 'utf8');
            expect(source, file).not.toMatch(/\.update\(|\.inspect\(|writeFile|appendFile|mkdir|unlink|rename\(|rmSync|fs\./);
        }
        expect("config.update('assistant', 'copilot')").toMatch(/\.update\(/);
    });

    it('0025 AC-018: a step link, Ways to run it, Show in Plan Map and the card Copy leave a temp copy of fs110-parallel-synthetic unchanged and only navigate or copy', async () => {
        temp = await fs.mkdtemp(path.join(os.tmpdir(), 'map-nowrite-'));
        await fs.cp(fixturePath('fs110-parallel-synthetic'), temp, { recursive: true });
        await fs.rm(path.join(temp, '.memory-bank', 'activeContext.0001-T-003.md'));
        await fs.rm(path.join(temp, '.memory-bank', 'activeContext.0001-T-004.md'));
        const planFile = path.join(temp, '.specs', 'active', '0001-parallel-demo.plan.md');
        await fs.writeFile(planFile, (await fs.readFile(planFile, 'utf8')).replace('**Status:** Blocked', '**Status:** In Progress'));
        const project = await readProject(createNodeSpecSource(), temp, '1.10.0');
        const model = { project, lifecycle: deriveLifecycle(project) };
        const before = await snapshotTree(temp);
        const board = createBoardWorld(model);
        board.selection.set({ stem: '0001-parallel-demo' });
        await board.service.whenIdle();
        const detail = board.service.detail();
        const plan = detail.kind === 'spec' ? detail.plan : undefined;
        const copyLine = plan?.kind === 'plan' ? plan.stages.flatMap((entry) => entry.groups.flatMap((group) => group.steps)).find((entry) => entry.copy !== undefined)?.copy : undefined;
        expect(copyLine).toMatch(/^Implement T-003 of /);
        expect(detail.kind === 'spec' && 'parallel' in detail.nextStep ? detail.nextStep.parallel : undefined).toEqual({ stage: 2 });
        const written: string[] = [];
        const requests = createBoardRequests({
            send: async () => ({ outcome: 'copied', text: 'Copied to the clipboard.' }),
            board: board.service,
            openFile: { open: async () => ({ kind: 'opened' }) } as never,
            clipboard: { writeText: async (text) => void written.push(text) },
        });
        await requests.handlers.copyText({ text: copyLine! });
        const calls: string[] = [];
        const actions = createTreeActions({
            shell: { open: () => void calls.push('open'), select: () => void calls.push('select'), navigate: (request) => void calls.push(`navigate ${JSON.stringify(request.target)}`) },
            panel: { isOpen: () => false, show: () => void calls.push('show') },
            copy: async () => undefined,
            openFile: { open: async () => ({ kind: 'opened' }) } as never,
            warn: () => undefined,
        });
        const tree = buildSpecTree({ projectActive: true, projectName: 'x', projectCount: 1, state: undefined, model });
        const row = tree.items.filter((item): item is GroupModel => item.kind === 'group').flatMap((group) => group.children).find((candidate): candidate is SpecRowModel => candidate.stem === '0001-parallel-demo')!;
        actions.showInPlanMap(row);
        expect(written).toEqual([copyLine]);
        expect(calls[0]).toBe('open');
        expect(calls.slice(1)).toEqual([expect.stringMatching(/^navigate .*"step":"T-003"/), 'show']);
        expect(await snapshotTree(temp)).toEqual(before);
        board.service.dispose();
    });

    it('0025 AC-018: the sources of the step link, the ways link, the target and the Show in Plan Map action call no file API, no configuration update and start no process', async () => {
        const files = ['src/core/board/stepLinks.ts', 'src/core/planMap/returnedWork.ts', 'src/core/shell/treeActions.ts', 'src/webview/ui/StepLink.tsx', 'src/webview/detail/ParallelHint.tsx', 'src/webview/areas/planMap/target.ts', 'src/webview/areas/planMap/shows.ts'];
        for (const file of files) {
            const source = await fs.readFile(path.resolve(process.cwd(), ...file.split('/')), 'utf8');
            expect(source, file).not.toMatch(/\.update\(|\.inspect\(|writeFile|appendFile|mkdir|unlink|rename\(|rmSync|fs\.|child_process|spawn\(|exec\(|executeCommand/);
        }
        expect("child_process.spawn('x')").toMatch(/child_process/);
    });

    it('control: the snapshot sees a file that appears in the tree', async () => {
        temp = await fs.mkdtemp(path.join(os.tmpdir(), 'copy-nowrite-'));
        await fs.cp(fixturePath('fs110-ready-synthetic'), temp, { recursive: true });
        const before = await snapshotTree(temp);
        await fs.writeFile(path.join(temp, 'stray.txt'), 'x');
        expect(await snapshotTree(temp)).not.toEqual(before);
    });
});
