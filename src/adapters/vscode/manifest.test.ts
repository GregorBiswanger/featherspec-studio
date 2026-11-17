import { readFileSync } from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { MOVE_COMMAND_TITLE } from '../../shared/protocol/texts';
import { FAKE_SCENARIOS } from '../providers/fake/scenarios';
import { PROVIDER_IDS } from '../../core/providers/testing/scan';

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
        configuration?: {
            properties?: Record<
                string,
                { type?: string; default?: unknown; minimum?: number; scope?: string; description?: string; enum?: string[]; enumDescriptions?: string[] }
            >;
        };
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
        const names = Object.keys(manifest.contributes?.configuration?.properties ?? {}).filter((name) => name.startsWith('featherspec-studio.runHistory.'));
        expect(names).toEqual(['featherspec-studio.runHistory.maxAgeDays']);
    });

    it('AC-012 (0009): the fake provider is off by default, a boolean with the default window scope', () => {
        const setting = manifest.contributes?.configuration?.properties?.['featherspec-studio.fakeProvider.enabled'];
        expect(setting?.type).toBe('boolean');
        expect(setting?.default).toBe(false);
        expect(setting?.scope === undefined || setting.scope === 'window').toBe(true);
        expect((setting?.description ?? '').length).toBeGreaterThan(20);
    });

    it('AC-012 (0009): the scenario setting lists exactly the fake scenarios, each described, default happy path', () => {
        const setting = manifest.contributes?.configuration?.properties?.['featherspec-studio.fakeProvider.scenario'];
        expect(setting?.enum).toEqual([...FAKE_SCENARIOS]);
        expect(setting?.enumDescriptions).toHaveLength(FAKE_SCENARIOS.length);
        expect(setting?.enumDescriptions?.every((text) => text.length > 10)).toBe(true);
        expect(setting?.default).toBe('happy-path');
        expect(setting?.scope === undefined || setting.scope === 'window').toBe(true);
    });

    it('AC-012 (0009): no configuration property defaults to a provider ID, so a default provider never ships as fake', () => {
        const defaults = Object.values(manifest.contributes?.configuration?.properties ?? {}).map((property) => property.default);
        for (const id of PROVIDER_IDS) {
            expect(defaults).not.toContain(id);
        }
    });

    it('AC-012 (0009): negative control, a provider ID as a default would be found', () => {
        expect(['fake', 'copilot'].some((id) => (PROVIDER_IDS as readonly string[]).includes(id))).toBe(true);
        expect([false, 'happy-path', 90].some((value) => (PROVIDER_IDS as readonly unknown[]).includes(value))).toBe(false);
    });

    it('AC-022 (0011): contributes "Stop Run" and "Resume Run" to the palette with their titles', () => {
        const commands = Object.fromEntries((manifest.contributes?.commands ?? []).map((command) => [command.command, command.title]));
        expect(commands['featherspec-studio.stopRun']).toBe('FeatherSpec Studio: Stop Run');
        expect(commands['featherspec-studio.resumeRun']).toBe('FeatherSpec Studio: Resume Run');
        const hidden = (manifest.contributes?.menus?.commandPalette ?? []).map((entry) => entry.command);
        expect(hidden).not.toContain('featherspec-studio.stopRun');
        expect(hidden).not.toContain('featherspec-studio.resumeRun');
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

    it('0007 AC-014: contributes the Move Spec command with the spec title, and it is not hidden from the palette', () => {
        const commands = manifest.contributes?.commands ?? [];
        expect(commands).toContainEqual({ command: 'featherspec-studio.moveSpec', title: MOVE_COMMAND_TITLE });
        const hidden = (manifest.contributes?.menus?.commandPalette ?? []).filter((entry) => entry.when === 'false').map((entry) => entry.command);
        expect(hidden).not.toContain('featherspec-studio.moveSpec');
        expect(hidden).toContain('featherspec-studio.shellAction');
    });
});
