import { describe, expect, it } from 'vitest';
import type { SendRequest } from '../../shared/protocol/assistant';
import { specText } from '../lifecycle/testing/projects';
import type { ClipboardPort } from '../ports/board';
import { createCopyNextStep } from '../copyNextStep/copyNextStep';
import { createBoardRequests } from '../board/boardRequests';
import { nextStep } from '../board/nextStep';
import { createSetupClock } from '../setup/testing/setupClock';
import { createSend } from './send';
import { createFakeAssistantHost } from './testing/fakeAssistantHost';
import { createFakeMemory, createHandOverWorld, projectOf, type FakeMemory } from './testing/handOverWorld';
import { createHandOverMemory } from './handOver';

const KEY = '.specs/backlog/0007-x.md';
const OTHER = '.specs/backlog/0008-y.md';
const CLARIFY = `/sdd-clarify ${KEY}`;
const START = { modifiedMs: 1_000, size: 100 };

function clipboardOf(fails: { value: boolean }): ClipboardPort {
    return {
        async writeText() {
            if (fails.value) {
                throw new Error('no clipboard');
            }
        },
    };
}

async function sendWorld(options: { chosen?: 'copilot'; memory?: FakeMemory; files?: Record<string, string> } = {}) {
    const project = await projectOf(options.files ?? { [KEY]: specText() }, START);
    const world = createHandOverWorld(project, options.memory);
    const host = createFakeAssistantHost(['workbench.action.chat.newChat', 'workbench.action.chat.open']);
    host.install('GitHub.copilot-chat');
    const fails = { value: false };
    const sender = createSend({
        host,
        clipboard: clipboardOf(fails),
        ui: { warn: () => undefined },
        output: { appendBlock: () => undefined },
        clock: createSetupClock(),
        platform: 'win32',
        chosen: { read: () => options.chosen },
        handOver: world.handOvers,
    });
    const request = (line: string): SendRequest => ({ assistant: 'copilot', target: 'new', line });
    return { world, host, fails, send: (line: string) => sender.send(request(line)) };
}

function stored(memory: FakeMemory): unknown {
    return memory.value;
}

describe('0030 AC-001: hand-overs of /sdd-clarify are remembered with the time and size at the start', () => {
    it('0030 AC-001 a Send that opened stores the spec time and size for the project and key', async () => {
        const { world, send } = await sendWorld({ chosen: 'copilot' });
        expect((await send(CLARIFY)).outcome).toBe('opened');
        const root = world.source.current()!.project.root;
        expect(stored(world.memory)).toEqual({ v: 1, roots: { [root]: { [KEY]: START } } });
    });

    it('0030 AC-001 a Send that fell back to copying also stores; a copy that fails stores nothing', async () => {
        const fallback = await sendWorld({ chosen: 'copilot' });
        fallback.host.uninstall('GitHub.copilot-chat');
        expect((await fallback.send(CLARIFY)).outcome).toBe('copied');
        expect(fallback.world.memory.writes).toBe(1);
        const failing = await sendWorld({ chosen: 'copilot' });
        failing.host.uninstall('GitHub.copilot-chat');
        failing.fails.value = true;
        expect((await failing.send(CLARIFY)).outcome).toBe('copyFailed');
        expect(failing.world.memory.writes).toBe(0);
    });

    it('0030 AC-001 a Send of another assistant (copy only) stores on success', async () => {
        const { world, send } = await sendWorld();
        expect((await send(CLARIFY)).outcome).toBe('copied');
        expect(world.memory.writes).toBe(1);
    });

    it('0030 AC-001 a line that is not /sdd-clarify of a spec of the project stores nothing', async () => {
        const { world, send } = await sendWorld({ chosen: 'copilot' });
        await send(`/sdd-plan ${KEY}`);
        await send(`/sdd-clarify ${OTHER}`);
        await send('/sdd-clarify');
        expect(world.memory.writes).toBe(0);
    });

    it('0030 AC-001 a spec that changes before Send settles keeps the start time, so it counts as clarified', async () => {
        const { world, send } = await sendWorld({ chosen: 'copilot' });
        const changed = await projectOf({ [KEY]: specText() }, { modifiedMs: 9_000, size: 140 });
        const pending = send(CLARIFY);
        world.repository.set(changed);
        await pending;
        const root = world.source.current()!.project.root;
        expect(stored(world.memory)).toEqual({ v: 1, roots: { [root]: { [KEY]: START } } });
        expect(nextStep(world.source.current()!, KEY)).toMatchObject({ rule: 'NS-9', case: 'NS-10' });
    });

    it('0030 AC-005 a memory write alone refreshes the model when the file changed before the commit', async () => {
        const project = await projectOf({ [KEY]: specText() }, START);
        const world = createHandOverWorld(project);
        const handOver = world.handOvers.begin(CLARIFY)!;
        world.repository.set(await projectOf({ [KEY]: specText() }, { modifiedMs: 9_000, size: 140 }));
        const changes: number[] = [];
        world.source.onDidChange(() => changes.push(changes.length));
        expect(nextStep(world.source.current()!, KEY)).toMatchObject({ rule: 'NS-9', case: 'NS-9' });
        const seen = world.source.current()!.project;
        await handOver.commit();
        expect(changes).toHaveLength(1);
        expect(world.source.current()!.project).toBe(seen);
        expect(nextStep(world.source.current()!, KEY)).toMatchObject({ rule: 'NS-9', case: 'NS-10' });
    });

    it('0030 AC-001 the entry survives a reload and a later hand-over replaces it', async () => {
        const { world, send } = await sendWorld({ chosen: 'copilot' });
        await send(CLARIFY);
        const root = world.source.current()!.project.root;
        const reopened = createHandOverMemory(world.memory, () => world.source.current()?.project);
        expect(reopened.read(root)).toEqual({ [KEY]: START });
        expect(reopened.read('file:///elsewhere')).toEqual({});
        world.repository.set(await projectOf({ [KEY]: specText() }, { modifiedMs: 2_000, size: 120 }));
        await send(CLARIFY);
        expect(reopened.read(root)).toEqual({ [KEY]: { modifiedMs: 2_000, size: 120 } });
    });

    it('0030 AC-001 a write drops entries of keys that name no spec of the project', async () => {
        const project = await projectOf({ [KEY]: specText() }, START);
        const memory = createFakeMemory({ v: 1, roots: { [project.root]: { '.specs/backlog/0099-gone.md': START }, other: { 'x.md': START } } });
        const { world, send } = await sendWorld({ chosen: 'copilot', memory });
        await send(CLARIFY);
        const roots = (stored(world.memory) as { roots: Record<string, unknown> }).roots;
        expect(roots[world.source.current()!.project.root]).toEqual({ [KEY]: START });
        expect(roots.other).toEqual({ 'x.md': START });
    });

    it('0030 AC-001 Copy prompt stores on a successful copy only', async () => {
        const project = await projectOf({ [KEY]: specText() }, START);
        const world = createHandOverWorld(project);
        const fails = { value: false };
        const requests = createBoardRequests({
            board: { setSort: async () => undefined, setDone: async () => undefined, clearFilters: async () => undefined } as never,
            openFile: { open: async () => ({ kind: 'opened' }) } as never,
            clipboard: clipboardOf(fails),
            send: async () => ({ outcome: 'copied', text: '' }),
            handOver: world.handOvers,
        });
        fails.value = true;
        await requests.handlers.copyText({ text: CLARIFY } as never);
        expect(world.memory.writes).toBe(0);
        fails.value = false;
        await requests.handlers.copyText({ text: CLARIFY } as never);
        expect(world.memory.writes).toBe(1);
    });

    it('0030 AC-001 the Copy next step command stores on a successful copy only', async () => {
        const project = await projectOf({ [KEY]: specText() }, START);
        const world = createHandOverWorld(project);
        const fails = { value: false };
        const copy = createCopyNextStep({
            entry: { situation: () => ({ kind: 'line' }) as never, copied: () => undefined },
            clipboard: clipboardOf(fails),
            ui: { pick: async () => undefined, inform: async () => undefined, warn: () => undefined },
            actions: { selectProject: async () => undefined, openStudio: async () => undefined },
            handOver: world.handOvers,
        });
        fails.value = true;
        await copy.copy(CLARIFY);
        expect(world.memory.writes).toBe(0);
        fails.value = false;
        await copy.copy(CLARIFY);
        expect(world.memory.writes).toBe(1);
    });

    it('0030 AC-001 a memory that cannot be read or written never throws and reads as empty', async () => {
        const project = await projectOf({ [KEY]: specText() }, START);
        const broken = {
            get: (): unknown => {
                throw new Error('no store');
            },
            set: async (): Promise<void> => {
                throw new Error('no store');
            },
        };
        const memory = createHandOverMemory(broken, () => project);
        expect(memory.read(project.root)).toEqual({});
        await expect(memory.begin(CLARIFY)?.commit()).resolves.toBeUndefined();
    });
});
