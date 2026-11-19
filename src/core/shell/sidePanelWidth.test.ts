import { afterEach, describe, expect, it } from 'vitest';
import { parseSideWidth, serializeSideWidth } from './sidePanelWidth';
import { addProject, createShellWorld, SPEC_HEADER, type ShellWorld } from './testing/world';

let world: ShellWorld | undefined;

afterEach(() => {
    world?.dispose();
    world = undefined;
});

const FILES = { '.specs/active/0001-a.md': SPEC_HEADER('In Progress') };

async function ready(options: Parameters<typeof createShellWorld>[0] = {}): Promise<ShellWorld> {
    world = createShellWorld({ roots: ['proj'], ...options });
    addProject(world, 'proj', FILES);
    await world.controller.start();
    await world.settle();
    return world;
}

describe('0022 AC-024: the stored width is a fraction, parsed apart from the area and the selection', () => {
    it('parses { v: 1, fraction } and serializes it back', () => {
        expect(parseSideWidth({ v: 1, fraction: 0.6 })).toBe(0.6);
        expect(serializeSideWidth(0.6)).toEqual({ v: 1, fraction: 0.6 });
        expect(parseSideWidth(serializeSideWidth(0.333))).toBe(0.333);
    });

    it('ignores anything else: no value, another version, a missing or invalid fraction, extra shapes', () => {
        for (const value of [undefined, null, 0.5, '0.5', [], { v: 2, fraction: 0.5 }, { fraction: 0.5 }, { v: 1 }, { v: 1, fraction: 0 }, { v: 1, fraction: 1 }, { v: 1, fraction: -0.2 }, { v: 1, fraction: Number.NaN }, { v: 1, fraction: '0.5' }]) {
            expect(parseSideWidth(value), JSON.stringify(value)).toBeUndefined();
        }
    });
});

describe('0022 AC-024: the shell service remembers and resets the width', () => {
    it('without a stored value the view carries no width', async () => {
        const current = await ready();
        expect(current.service.view()).not.toHaveProperty('sideWidth');
    });

    it('setSideWidth stores { v: 1, fraction } through the side memory and shows it in the view', async () => {
        const current = await ready();
        await current.service.handlers.setSideWidth({ fraction: 0.6 });
        expect(current.sideMemory.value).toEqual({ v: 1, fraction: 0.6 });
        expect(current.service.view().sideWidth).toBe(0.6);
        expect(current.memory.writes).toEqual([]);
    });

    it('a stored width is used on the next start', async () => {
        const current = await ready({ sideMemory: { v: 1, fraction: 0.55 } });
        expect(current.service.view().sideWidth).toBe(0.55);
        await current.service.handlers.setSideWidth({ fraction: 0.6 });
        expect(current.restart().view().sideWidth).toBe(0.6);
    });

    it('changing the width notifies the view listeners', async () => {
        const current = await ready();
        const seen: (number | undefined)[] = [];
        current.service.onDidChangeView((view) => seen.push(view.sideWidth));
        await current.service.handlers.setSideWidth({ fraction: 0.6 });
        await current.service.handlers.resetSideWidth({});
        expect(seen).toEqual([0.6, undefined]);
    });

    it('resetSideWidth deletes the stored value: the memory is set to undefined and the view has no width', async () => {
        const current = await ready({ sideMemory: { v: 1, fraction: 0.55 } });
        await current.service.handlers.resetSideWidth({});
        expect(current.sideMemory.writes).toEqual([undefined]);
        expect(current.sideMemory.value).toBeUndefined();
        expect(current.service.view()).not.toHaveProperty('sideWidth');
    });

    it('each invalid stored value is ignored while the remembered area and selection still apply', async () => {
        for (const stored of [{ v: 1, fraction: 0 }, { v: 1, fraction: 1.5 }, { v: 1, fraction: Number.NaN }, { v: 1, fraction: '0.5' }, { v: 3, fraction: 0.5 }, 'wide', 0.5, null]) {
            const current = await ready({ memory: { v: 1, area: 'board', selection: { projectRoot: 'proj', stem: '0001-a' } }, sideMemory: stored });
            const view = current.service.view();
            expect(view, JSON.stringify(stored)).not.toHaveProperty('sideWidth');
            expect(view.area).toBe('board');
            expect(view.selection?.stem).toBe('0001-a');
            current.dispose();
        }
    });

    it('an invalid area and selection memory does not touch the stored width', async () => {
        const current = await ready({ memory: { v: 1, area: 'nowhere' }, sideMemory: { v: 1, fraction: 0.45 } });
        expect(current.service.view().sideWidth).toBe(0.45);
        expect(current.service.view().area).toBe('overview');
    });

    it('the area and the selection are written to their own memory, never to the width memory', async () => {
        const current = await ready();
        current.service.select({ stem: '0001-a' });
        await current.service.handlers.setSideWidth({ fraction: 0.5 });
        expect(current.sideMemory.writes).toEqual([{ v: 1, fraction: 0.5 }]);
        expect(current.memory.writes.every((value) => !JSON.stringify(value).includes('fraction'))).toBe(true);
    });

    it('a rejected write does not break the service and the view keeps the width', async () => {
        const current = await ready();
        current.sideMemory.set = async () => {
            throw new Error('disk full');
        };
        await expect(current.service.handlers.setSideWidth({ fraction: 0.5 })).resolves.toBeUndefined();
        expect(current.service.view().sideWidth).toBe(0.5);
    });

    it('control: an invalid fraction that reaches the handler is not stored', async () => {
        const current = await ready();
        await current.service.handlers.setSideWidth({ fraction: 2 });
        await current.service.handlers.setSideWidth({ fraction: Number.NaN });
        expect(current.sideMemory.writes).toEqual([]);
        expect(current.service.view()).not.toHaveProperty('sideWidth');
    });

    it('nothing reaches a workspace folder: the shell world has no file writer, the port is the only writer', async () => {
        const current = await ready();
        const before = current.specs.touched();
        await current.service.handlers.setSideWidth({ fraction: 0.5 });
        await current.service.handlers.resetSideWidth({});
        expect(current.specs.touched()).toEqual(before);
    });
});
