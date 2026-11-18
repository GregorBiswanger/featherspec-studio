import { afterEach, describe, expect, it } from 'vitest';
import { createModelSource } from './modelSource';
import { createSpecTreeService, type SpecTreeService } from './specTreeService';
import type { GroupModel, SpecTreeModel } from './specTree';
import { addProject, createShellWorld, SPEC_HEADER, type ShellWorld } from './testing/world';

let world: ShellWorld | undefined;
let service: SpecTreeService | undefined;

afterEach(() => {
    service?.dispose();
    world?.dispose();
    service = undefined;
    world = undefined;
});

async function started(files: Record<string, string>, options: Parameters<typeof createShellWorld>[0] = {}): Promise<{ world: ShellWorld; service: SpecTreeService; seen: SpecTreeModel[] }> {
    world = createShellWorld(options);
    addProject(world, 'proj', files);
    service = createSpecTreeService({ shell: world.service, source: createModelSource(world.repository), discovery: world.controller, sameRoot: (first, second) => first === second });
    const seen: SpecTreeModel[] = [];
    service.onDidChange((model) => seen.push(model));
    await world.controller.start();
    await world.settle();
    return { world, service, seen };
}

function labels(model: SpecTreeModel, group: string): string[] {
    const found = model.items.find((item): item is GroupModel => item.kind === 'group' && item.label === group);
    return found?.children.map((row) => row.label) ?? [];
}

describe('0020 AC-013: the live tree (core part)', () => {
    it('shows Loading project… before the first model and the groups after it', async () => {
        world = createShellWorld();
        addProject(world, 'proj', { '.specs/active/0001-a.md': SPEC_HEADER('In Progress', 'Alpha') });
        service = createSpecTreeService({ shell: world.service, source: createModelSource(world.repository), discovery: world.controller, sameRoot: (a, b) => a === b });
        expect(service.model().message).toBe('Loading project…');
        await world.controller.start();
        await world.settle();
        expect(labels(service.model(), 'In progress')).toEqual(['0001 Alpha']);
    });

    it('a spec added shows in Backlog and a listener hears it', async () => {
        const current = await started({ '.specs/active/0001-a.md': SPEC_HEADER('In Progress', 'Alpha') });
        expect(labels(current.service.model(), 'Backlog')).toEqual([]);
        current.seen.length = 0;
        current.world.specs.setFile('proj', '.specs/backlog/0002-b.md', SPEC_HEADER('Draft', 'Beta'));
        await current.world.repository.rescan();
        expect(labels(current.service.model(), 'Backlog')).toEqual(['0002 Beta']);
        expect(current.seen.length).toBeGreaterThan(0);
        expect(current.seen.at(-1)).toEqual(current.service.model());
    });

    it('a state change moves its row to another group', async () => {
        const current = await started({ '.specs/backlog/0001-a.md': SPEC_HEADER('Draft', 'Alpha') });
        expect(labels(current.service.model(), 'Backlog')).toEqual(['0001 Alpha']);
        current.world.specs.move('proj', '.specs/backlog/0001-a.md', '.specs/done/0001-a.md');
        current.world.specs.setFile('proj', '.specs/done/0001-a.md', SPEC_HEADER('Baseline', 'Alpha'));
        await current.world.repository.rescan();
        expect(labels(current.service.model(), 'Backlog')).toEqual([]);
        expect(labels(current.service.model(), 'Done')).toEqual(['0001 Alpha']);
    });

    it('a ticked step changes the description of its row', async () => {
        const plan = (box: string) => `# Plan\n\n**Status:** In Progress\n\n### T-001 — A step\n\n- [${box}] **Verified (T-001):** ${box === ' ' ? '—' : 'done'}\n`;
        const spec = SPEC_HEADER('In Progress', 'Alpha').replace('_none yet_', '[0001-a.plan.md](0001-a.plan.md)');
        const current = await started({ '.specs/active/0001-a.md': spec, '.specs/active/0001-a.plan.md': plan(' ') });
        const description = () => (current.service.model().items[0] as GroupModel).children[0]!.tooltip;
        expect(description()).toContain('Steps 0/1');
        current.world.specs.setFile('proj', '.specs/active/0001-a.plan.md', plan('x'));
        await current.world.repository.rescan();
        expect(description()).toContain('Steps 1/1');
    });

    it('a second project sets the view description', async () => {
        world = createShellWorld({ roots: ['proj', 'other'] });
        addProject(world, 'proj', { '.specs/active/0001-a.md': SPEC_HEADER('In Progress') });
        addProject(world, 'other', { '.specs/active/0001-a.md': SPEC_HEADER('In Progress') });
        service = createSpecTreeService({ shell: world.service, source: createModelSource(world.repository), discovery: world.controller, sameRoot: (a, b) => a === b });
        await world.controller.start();
        await world.settle();
        expect(world.controller.snapshot().result?.folders.filter((folder) => folder.verdict === 'project')).toHaveLength(2);
        const name = world.controller.snapshot().active?.name;
        if (name !== undefined) {
            expect(service.model().description).toBe(name);
        } else {
            expect(service.model().description).toBeUndefined();
        }
    });

    it('control: one project gives no view description', async () => {
        const current = await started({ '.specs/active/0001-a.md': SPEC_HEADER('In Progress') });
        expect(current.service.model().description).toBeUndefined();
    });

    it('an unchanged rebuild notifies nobody', async () => {
        const current = await started({ '.specs/active/0001-a.md': SPEC_HEADER('In Progress') });
        current.seen.length = 0;
        await current.world.repository.rescan();
        await current.world.controller.refresh();
        await current.world.settle();
        expect(current.seen).toHaveLength(0);
    });

    it('dispose stops the notifications', async () => {
        const current = await started({ '.specs/active/0001-a.md': SPEC_HEADER('In Progress') });
        current.seen.length = 0;
        current.service.dispose();
        current.world.specs.setFile('proj', '.specs/backlog/0002-b.md', SPEC_HEADER('Draft'));
        await current.world.repository.rescan();
        expect(current.seen).toHaveLength(0);
    });

    it('a listener that throws does not stop the others', async () => {
        const current = await started({ '.specs/active/0001-a.md': SPEC_HEADER('In Progress') });
        const heard: number[] = [];
        current.service.onDidChange(() => {
            throw new Error('boom');
        });
        current.service.onDidChange(() => heard.push(1));
        current.world.specs.setFile('proj', '.specs/backlog/0002-b.md', SPEC_HEADER('Draft'));
        await current.world.repository.rescan();
        expect(heard.length).toBeGreaterThan(0);
    });
});
