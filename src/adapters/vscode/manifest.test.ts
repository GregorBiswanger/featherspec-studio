import { readFileSync } from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

interface Manifest {
    activationEvents?: string[];
    extensionKind?: string[];
    capabilities?: {
        untrustedWorkspaces?: { supported?: unknown; description?: string };
        virtualWorkspaces?: unknown;
    };
    contributes?: {
        commands?: { command: string; title: string }[];
        viewsContainers?: { activitybar?: { id: string; title: string; icon: string }[] };
        views?: Record<string, { id: string; name: string }[]>;
        menus?: { commandPalette?: { command: string; when: string }[] };
        configuration?: { properties?: Record<string, { type?: string; default?: unknown; minimum?: number; scope?: string; description?: string }> };
    };
}

const manifest = JSON.parse(readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8')) as Manifest;

describe('extension manifest', () => {
    it('AC-019 (0001) and AC-009 (0005): activates when the workspace holds a root AGENTS.md or .specs, and when VS Code restores the Studio panel, never on startup', () => {
        expect(manifest.activationEvents).toEqual(['workspaceContains:AGENTS.md', 'workspaceContains:.specs', 'onWebviewPanel:featherspecStudio.main']);
    });

    it('AC-019: negative control, no eager activation event is declared', () => {
        const events = manifest.activationEvents ?? [];
        expect(events).not.toContain('*');
        expect(events).not.toContain('onStartupFinished');
    });

    it('AC-022: untrusted workspaces are supported in limited mode with a description', () => {
        const untrusted = manifest.capabilities?.untrustedWorkspaces;
        expect(untrusted?.supported).toBe('limited');
        expect(untrusted?.description?.length ?? 0).toBeGreaterThan(10);
    });

    it('AC-022: virtual workspaces are not supported, the extension runs where the files live', () => {
        expect(manifest.capabilities?.virtualWorkspaces).toBe(false);
        expect(manifest.extensionKind).toEqual(['workspace']);
    });

    it('AC-015, AC-016, 0004 AC-019: contributes the select, refresh and clear-history commands and no scaffold command', () => {
        const commands = manifest.contributes?.commands ?? [];
        expect(commands).toEqual(
            expect.arrayContaining([
                { command: 'featherspec-studio.selectProject', title: 'FeatherSpec Studio: Select Project' },
                { command: 'featherspec-studio.refreshDiscovery', title: 'FeatherSpec Studio: Refresh Project Discovery' },
                { command: 'featherspec-studio.clearRunHistory', title: 'FeatherSpec Studio: Clear Run History' },
            ]),
        );
        expect(commands.map((entry) => entry.command)).not.toContain('featherspec-studio.helloWorld');
    });

    it('0004 AC-018: the run-history age cap is a user setting, whole days, minimum 1, default 90', () => {
        const setting = manifest.contributes?.configuration?.properties?.['featherspec-studio.runHistory.maxAgeDays'];
        expect(setting?.type).toBe('integer');
        expect(setting?.default).toBe(90);
        expect(setting?.minimum).toBe(1);
        expect(setting?.scope).toBe('application');
        expect((setting?.description ?? '').length).toBeGreaterThan(20);
    });

    it('0004 AC-018: negative control, the manifest declares no other run-history setting', () => {
        const names = Object.keys(manifest.contributes?.configuration?.properties ?? {});
        expect(names).toEqual(['featherspec-studio.runHistory.maxAgeDays']);
    });

    it('AC-001, AC-005 (0005): contributes the Open command and one command per area with their titles', () => {
        const commands = Object.fromEntries((manifest.contributes?.commands ?? []).map((command) => [command.command, command.title]));
        expect(commands).toMatchObject({
            'featherspec-studio.open': 'FeatherSpec Studio: Open',
            'featherspec-studio.openMissionControl': 'FeatherSpec Studio: Open Mission Control',
            'featherspec-studio.openSpecBoard': 'FeatherSpec Studio: Open Spec Board',
            'featherspec-studio.openSpecExplorer': 'FeatherSpec Studio: Open Spec Explorer',
            'featherspec-studio.openAgentCenter': 'FeatherSpec Studio: Open Agent Center',
        });
    });

    it('AC-003 (0005): contributes the Activity Bar container with its icon and the view "FeatherSpec Studio"', () => {
        const container = manifest.contributes?.viewsContainers?.activitybar?.[0];
        expect(container).toMatchObject({ id: 'featherspec-studio', title: 'FeatherSpec Studio', icon: 'media/studio.svg' });
        expect(manifest.contributes?.views?.['featherspec-studio']).toEqual([{ id: 'featherspec-studio.navigator', name: 'FeatherSpec Studio' }]);
    });

    it('AC-003 (0005): the icon file ships as a monochrome SVG', () => {
        const svg = readFileSync(path.resolve(process.cwd(), 'media', 'studio.svg'), 'utf8');
        expect(svg).toContain('<svg');
        expect(svg).toContain('currentColor');
        expect(svg).not.toMatch(/#[0-9a-fA-F]{3,6}/);
    });

    it('AC-029 (0005): contributes "FeatherSpec Studio: Rescan Project"; the internal action command stays out of the palette', () => {
        const commands = Object.fromEntries((manifest.contributes?.commands ?? []).map((command) => [command.command, command.title]));
        expect(commands['featherspec-studio.rescan']).toBe('FeatherSpec Studio: Rescan Project');
        expect(commands['featherspec-studio.shellAction']).toBeDefined();
        expect(manifest.contributes?.menus?.commandPalette).toEqual([{ command: 'featherspec-studio.shellAction', when: 'false' }]);
    });
});
