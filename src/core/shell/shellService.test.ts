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
        await current.service.handlers.navigate({ area: 'agentCenter' });
        expect(current.service.view().area).toBe('agentCenter');
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

    it('Refresh runs discovery only, with S4 while it runs', async () => {
        const current = ready();
        await current.controller.start();
        await current.settle();
        current.views.length = 0;
        let rescans = 0;
        const rescan = current.repository.rescan.bind(current.repository);
        current.repository.rescan = async () => {
            rescans += 1;
            await rescan();
        };
        await current.service.runAction('refresh');
        expect(current.views).toContain('S4');
        expect(rescans).toBe(0);
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

describe('AC-029: Rescan Project', () => {
    it('calls the repository rescan once while a project is active', async () => {
        const current = ready();
        await current.controller.start();
        await current.settle();
        let rescans = 0;
        const rescan = current.repository.rescan.bind(current.repository);
        current.repository.rescan = async () => {
            rescans += 1;
            await rescan();
        };
        await current.service.rescan();
        expect(rescans).toBe(1);
    });

    it('calls nothing while no project is active', async () => {
        world = createShellWorld({ roots: ['plain'] });
        await world.controller.start();
        let rescans = 0;
        world.repository.rescan = async () => {
            rescans += 1;
        };
        await world.service.rescan();
        expect(rescans).toBe(0);
    });
});
