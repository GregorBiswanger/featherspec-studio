import { afterEach, describe, expect, it } from 'vitest';
import { addProject, createShellWorld, SPEC_HEADER, type ShellWorld } from './testing/world';

let world: ShellWorld | undefined;

afterEach(() => {
    world?.dispose();
    world = undefined;
});

function ready(options: Parameters<typeof createShellWorld>[0] = {}, files: Record<string, string> = { '.specs/active/0001-a.md': SPEC_HEADER('In Progress') }): ShellWorld {
    world = createShellWorld(options);
    addProject(world, 'proj', files);
    return world;
}

describe('AC-014: loading (spec section 6)', () => {
    it('shows S4 before the first discovery result', () => {
        const current = ready();
        expect(current.service.view().state).toEqual({ id: 'S4' });
    });

    it('shows S4 while the active project has no model yet, then no state once the model has arrived', async () => {
        const current = ready();
        await current.controller.start();
        expect(current.controller.snapshot().active?.root).toBe('proj');
        await current.settle();
        expect(current.service.view().state).toBeUndefined();
        expect(current.service.view().projectName).toBe('proj');
    });

    it('control: a re-read of the same project keeps the content and never passes through S4', async () => {
        const current = ready();
        await current.controller.start();
        await current.settle();
        current.views.length = 0;
        current.specs.setFile('proj', '.specs/active/0002-b.md', SPEC_HEADER('Draft'));
        await current.repository.rescan();
        await current.controller.refresh();
        await current.settle();
        expect(current.views).not.toContain('S4');
        expect(current.service.view().state).toBeUndefined();
    });

    it('answers a navigate request while loading (the area changes, S4 stays)', async () => {
        const current = ready();
        await current.service.handlers.navigate({ area: 'board' });
        expect(current.service.view().area).toBe('board');
        expect(current.service.view().state).toEqual({ id: 'S4' });
    });
});

describe('AC-015: load errors', () => {
    it('a discovery failure gives S5 with the discovery reason and the message', async () => {
        const current = ready();
        await current.controller.start();
        await current.settle();
        current.host.output.appendBlock = () => {
            throw new Error('folder list broke');
        };
        await current.controller.refresh().catch(() => undefined);
        expect(current.service.view().state).toEqual({ id: 'S5', reason: { cause: 'discovery', message: 'folder list broke' } });
    });

    it('lifecycle folders that cannot be listed give S5 with the listing reason', async () => {
        const current = ready();
        current.specs.setUnlistable('proj', '.specs/active', 'EACCES: permission denied');
        await current.controller.start();
        await current.settle();
        expect(current.service.view().state).toEqual({
            id: 'S5',
            reason: { cause: 'listing', folder: '.specs/active', reason: 'EACCES: permission denied' },
        });
    });

    it('control: one unreadable spec file is no S5 (PD-038)', async () => {
        const current = ready();
        current.specs.setUnreadable('proj', '.specs/active/0001-a.md', 'EACCES');
        await current.controller.start();
        await current.settle();
        expect(current.service.view().state).toBeUndefined();
    });

    it('Show output opens the Output channel', async () => {
        const current = ready();
        await current.service.runAction('showOutput');
        expect(current.actions.calls).toEqual(['showOutput']);
    });

    it('Retry reruns discovery and a full re-read, passes through S4 and recovers', async () => {
        const current = ready();
        await current.controller.start();
        await current.settle();
        const appendBlock = current.host.output.appendBlock;
        current.host.output.appendBlock = () => {
            throw new Error('broke once');
        };
        await current.controller.refresh().catch(() => undefined);
        expect(current.service.view().state?.id).toBe('S5');
        current.host.output.appendBlock = appendBlock;
        let rescans = 0;
        const rescan = current.repository.rescan.bind(current.repository);
        current.repository.rescan = async () => {
            rescans += 1;
            await rescan();
        };
        current.views.length = 0;
        await current.service.runAction('retry');
        await current.settle();
        expect(current.views).toContain('S4');
        expect(current.service.view().state).toBeUndefined();
        expect(current.service.view().state?.id).not.toBe('S5');
        expect(rescans).toBe(1);
    });

    it('a second Retry during the first starts nothing', async () => {
        const current = ready();
        await current.controller.start();
        await current.settle();
        let refreshes = 0;
        const refresh = current.controller.refresh.bind(current.controller);
        current.controller.refresh = async () => {
            refreshes += 1;
            await refresh();
        };
        const first = current.service.runAction('retry');
        const second = current.service.runAction('retry');
        const third = current.service.runAction('refresh');
        await Promise.all([first, second, third]);
        expect(refreshes).toBe(1);
    });

    it('0018 AC-027: the panel action Refresh runs discovery, then the re-read once, with S4 while it runs', async () => {
        const current = ready();
        await current.controller.start();
        await current.settle();
        current.views.length = 0;
        const order: string[] = [];
        const discovery = current.controller.refresh.bind(current.controller);
        current.controller.refresh = async () => {
            order.push('discovery');
            await discovery();
        };
        const rescan = current.repository.rescan.bind(current.repository);
        current.repository.rescan = async () => {
            order.push('rescan');
            await rescan();
        };
        await current.service.runAction('refresh');
        expect(current.views).toContain('S4');
        expect(order).toEqual(['discovery', 'rescan']);
    });
});

describe('state actions', () => {
    it('Open Folder, Open setup guide, Manage Workspace Trust and Reload go to the host actions', async () => {
        const current = ready();
        await current.service.runAction('openFolder');
        await current.service.runAction('openSetupGuide');
        await current.service.runAction('manageTrust');
        await current.service.runAction('reload');
        expect(current.actions.calls).toEqual(['openFolder', 'openSetupGuide', 'manageTrust', 'reloadPanel']);
    });

    it('AC-001, AC-002: Set up FeatherSpec and Copy merge prompt go to the host actions', async () => {
        const current = ready();
        await current.service.runAction('setUp');
        await current.service.runAction('copyMergePrompt');
        expect(current.actions.calls).toEqual(['setUp', 'copyMergePrompt']);
    });

    it('AC-013: Select project runs the project selection of spec 0001', async () => {
        const current = ready({ roots: ['a', 'b'] });
        addProject(current, 'a');
        addProject(current, 'b');
        await current.controller.start();
        expect(current.service.view().state).toEqual({ id: 'S3' });
        current.host.ui.pickAnswer = (items) => items[0]?.root;
        await current.service.runAction('selectProject');
        expect(current.host.ui.pickCalls).toHaveLength(1);
        expect(current.controller.snapshot().active?.root).toBe('a');
    });

    it('a runAction request through the router handler runs the action', async () => {
        const current = ready();
        await current.service.handlers.runAction({ action: 'showOutput' });
        expect(current.actions.calls).toEqual(['showOutput']);
    });
});

describe('AC-017: Restricted Mode', () => {
    it('the note flag follows trust and goes away when trust is granted, without a reopen', async () => {
        const current = ready({ trusted: false });
        await current.controller.start();
        await current.settle();
        expect(current.service.view().restricted).toBe(true);
        current.views.length = 0;
        current.trust.grant();
        expect(current.service.view().restricted).toBe(false);
        expect(current.views).toHaveLength(1);
    });

    it('control: a trusted workspace never shows the note', () => {
        const current = ready({ trusted: true });
        expect(current.service.view().restricted).toBe(false);
    });
});

describe('AC-001 sections S1 and no project through the service', () => {
    it('no folder gives S1 and a folder change updates the view', async () => {
        world = createShellWorld({ roots: [] });
        await world.controller.start();
        expect(world.service.view().state).toEqual({ id: 'S1' });
        world.host.folders.change([{ root: 'plain', name: 'plain' }]);
        expect(world.service.view().state).not.toEqual({ id: 'S1' });
    });

    it('a workspace without a project gives S2', async () => {
        world = createShellWorld({ roots: ['plain'] });
        await world.controller.start();
        expect(world.service.view().state).toEqual({ id: 'S2' });
    });
});

describe('0018 AC-027: the Refresh command', () => {
    it('runs discovery once, then the re-read once, while a project is active, with no S4', async () => {
        const current = ready();
        await current.controller.start();
        await current.settle();
        current.views.length = 0;
        const order: string[] = [];
        const discovery = current.controller.refresh.bind(current.controller);
        current.controller.refresh = async () => {
            order.push('discovery');
            await discovery();
        };
        const rescan = current.repository.rescan.bind(current.repository);
        current.repository.rescan = async () => {
            order.push('rescan');
            await rescan();
        };
        await current.service.refresh();
        expect(order).toEqual(['discovery', 'rescan']);
        expect(current.views).not.toContain('S4');
    });

    it('0018 AC-027, §8: a discovery that fails during Refresh leaves the panel state S5 and re-reads no spec, from the command and from the panel actions', async () => {
        const current = ready();
        await current.controller.start();
        await current.settle();
        const appendBlock = current.host.output.appendBlock;
        current.host.output.appendBlock = () => {
            throw new Error('broke during refresh');
        };
        let rescans = 0;
        const rescan = current.repository.rescan.bind(current.repository);
        current.repository.rescan = async () => {
            rescans += 1;
            await rescan();
        };
        await current.service.refresh();
        await current.service.runAction('refresh');
        await current.service.runAction('retry');
        expect(rescans).toBe(0);
        expect(current.service.view().state).toEqual({ id: 'S5', reason: { cause: 'discovery', message: 'broke during refresh' } });
        current.host.output.appendBlock = appendBlock;
        await current.service.refresh();
        expect(rescans).toBe(1);
    });

    it('runs discovery only while no project is active', async () => {
        world = createShellWorld({ roots: ['plain'] });
        await world.controller.start();
        let rescans = 0;
        let discoveries = 0;
        const discovery = world.controller.refresh.bind(world.controller);
        world.controller.refresh = async () => {
            discoveries += 1;
            await discovery();
        };
        world.repository.rescan = async () => {
            rescans += 1;
        };
        await world.service.refresh();
        expect(discoveries).toBe(1);
        expect(rescans).toBe(0);
    });

    it('0018 F-1 (0015 AC-017, 0006): the time is the last spec read: a read moves it, a change of area leaves it (negative control)', async () => {
        const current = ready();
        await current.controller.start();
        await current.settle();
        const first = current.service.view().updatedAt;
        expect(first).toMatch(/\S/);
        await current.service.handlers.navigate({ area: 'board' });
        expect(current.service.view().updatedAt).toBe(first);
        await current.service.refresh();
        await current.settle();
        expect(current.service.view().updatedAt).not.toBe(first);
    });

    it('0018 F-1: the view carries the version and the read time while a project is active, and neither without one', async () => {
        const current = ready();
        await current.controller.start();
        await current.settle();
        expect(current.service.view().projectVersion).toMatch(/\S/);
        expect(current.service.view().updatedAt).toMatch(/\S/);
        world = createShellWorld({ roots: ['plain'] });
        await world.controller.start();
        expect(world.service.view().projectVersion).toBeUndefined();
        expect(world.service.view().updatedAt).toBeUndefined();
    });
});
