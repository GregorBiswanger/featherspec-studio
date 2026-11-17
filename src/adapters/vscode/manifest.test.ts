import { readFileSync } from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { MOVE_COMMAND_TITLE, S2_WELCOME } from '../../shared/protocol/texts';
import { FAKE_SCENARIOS } from '../providers/fake/scenarios';
import { PROVIDER_IDS } from '../../core/providers/testing/scan';

interface Manifest {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
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
        viewsWelcome?: { view: string; contents: string; when?: string }[];
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

    it('AC-012 (0009): no configuration property defaults to the fake provider, so the fake never ships as a default', () => {
        const defaults = Object.values(manifest.contributes?.configuration?.properties ?? {}).map((property) => property.default);
        expect(defaults).not.toContain('fake');
    });

    it('AC-012 (0009): negative control, the fake ID as a default would be found', () => {
        expect(['fake', 'copilot'].some((id) => (PROVIDER_IDS as readonly string[]).includes(id))).toBe(true);
        expect([false, 'happy-path', 90].some((value) => (PROVIDER_IDS as readonly unknown[]).includes(value))).toBe(false);
        expect([false, 'fake', 90]).toContain('fake');
    });

    it('FR-04 (0008): the default provider is one string setting, window scope, shipped as the first provider copilot and never as fake, its description naming fake for trying', () => {
        const setting = manifest.contributes?.configuration?.properties?.['featherspec-studio.defaultProvider'];
        expect(setting?.type).toBe('string');
        expect(setting?.default).toBe('copilot');
        expect(setting?.scope === undefined || setting.scope === 'window').toBe(true);
        expect(setting?.default).not.toBe('fake');
        expect(setting?.enum).toBeUndefined();
        expect(setting?.description ?? '').toContain('fake');
        expect((setting?.description ?? '').length).toBeGreaterThan(40);
    });

    it('FR-04 (0008): negative control, the manifest declares exactly one default-provider setting', () => {
        const names = Object.keys(manifest.contributes?.configuration?.properties ?? {}).filter((name) => /defaultProvider|defaultModel|permission/i.test(name));
        expect(names).toEqual(['featherspec-studio.defaultProvider']);
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

    it('AC-001 (0014): contributes the setup command, the hidden merge prompt command and the S2 welcome with the setup link alone on its line', () => {
        const commands = manifest.contributes?.commands ?? [];
        expect(commands).toEqual(
            expect.arrayContaining([
                { command: 'featherspec-studio.setup', title: 'FeatherSpec Studio: Set Up FeatherSpec' },
                { command: 'featherspec-studio.copyMergePrompt', title: 'FeatherSpec Studio: Copy Merge Prompt' },
            ]),
        );
        expect(manifest.contributes?.menus?.commandPalette).toContainEqual({ command: 'featherspec-studio.copyMergePrompt', when: 'false' });
        const welcome = manifest.contributes?.viewsWelcome ?? [];
        expect(welcome).toEqual([{ view: 'featherspec-studio.navigator', contents: S2_WELCOME, when: 'featherspec-studio.panelState == S2' }]);
        const lines = S2_WELCOME.split('\n');
        expect(lines).toContain('[Set up FeatherSpec](command:featherspec-studio.setup)');
        expect(lines.filter((line) => line.includes('featherspec-studio.setup'))).toHaveLength(1);
    });

    it('AC-003 (0005): the icon file ships as a monochrome SVG', () => {
        const svg = readFileSync(path.resolve(process.cwd(), 'media', 'studio.svg'), 'utf8');
        expect(svg).toContain('<svg');
        expect(svg).toContain('currentColor');
        expect(svg).not.toMatch(/#[0-9a-fA-F]{3,6}/);
    });

    it('PD-048: the Activity Bar icon is the filled FeatherSpec logo mark (frame, code lines and feather), not a line drawing', () => {
        const svg = readFileSync(path.resolve(process.cwd(), 'media', 'studio.svg'), 'utf8');
        expect(svg).toContain('fill="currentColor"');
        expect(svg).not.toContain('stroke');
        const [, , width, height] = (svg.match(/viewBox="([^"]+)"/)?.[1] ?? '').split(' ').map(Number);
        expect(width).toBeGreaterThan(0);
        expect(width).toBe(height);
        // The mark has separate shapes: the frame, the feather, "</>" and the text lines.
        expect((svg.match(/M/g) ?? []).length).toBeGreaterThanOrEqual(8);
        expect(Buffer.byteLength(svg)).toBeLessThan(20_000);
    });

    it('PD-054: the editor tab icons are the same logo mark as the Activity Bar icon, one fixed colour per theme kind', () => {
        const mark = (file: string): string => readFileSync(path.resolve(process.cwd(), 'media', file), 'utf8').match(/ d="([^"]+)"/)?.[1] ?? '';
        const fill = (file: string): string => readFileSync(path.resolve(process.cwd(), 'media', file), 'utf8').match(/ fill="([^"]+)"/)?.[1] ?? '';
        expect(mark('studio.svg')).not.toBe('');
        expect(mark('studio-light.svg')).toBe(mark('studio.svg'));
        expect(mark('studio-dark.svg')).toBe(mark('studio.svg'));
        expect(fill('studio-light.svg')).toBe('#424242');
        expect(fill('studio-dark.svg')).toBe('#C5C5C5');
    });

    it('AC-029 (0005): contributes "FeatherSpec Studio: Rescan Project"; the internal action command stays out of the palette', () => {
        const commands = Object.fromEntries((manifest.contributes?.commands ?? []).map((command) => [command.command, command.title]));
        expect(commands['featherspec-studio.rescan']).toBe('FeatherSpec Studio: Rescan Project');
        expect(commands['featherspec-studio.shellAction']).toBeDefined();
        expect(manifest.contributes?.menus?.commandPalette).toEqual([
            { command: 'featherspec-studio.copyMergePrompt', when: 'false' },
            { command: 'featherspec-studio.shellAction', when: 'false' },
        ]);
    });

    it('0007 AC-014: contributes the Move Spec command with the spec title, and it is not hidden from the palette', () => {
        const commands = manifest.contributes?.commands ?? [];
        expect(commands).toContainEqual({ command: 'featherspec-studio.moveSpec', title: MOVE_COMMAND_TITLE });
        const hidden = (manifest.contributes?.menus?.commandPalette ?? []).filter((entry) => entry.when === 'false').map((entry) => entry.command);
        expect(hidden).not.toContain('featherspec-studio.moveSpec');
        expect(hidden).toContain('featherspec-studio.shellAction');
    });
    it('AC-002 (0010): the CLI path setting is a machine-scoped string with an empty default', () => {
        const setting = manifest.contributes?.configuration?.properties?.['featherspec-studio.copilot.cliPath'];
        expect(setting?.type).toBe('string');
        expect(setting?.default).toBe('');
        expect(setting?.scope).toBe('machine');
        expect(setting?.description?.length ?? 0).toBeGreaterThan(10);
    });

    it('AC-008 (0010): the model setting is a window-scoped string with an empty default', () => {
        const setting = manifest.contributes?.configuration?.properties?.['featherspec-studio.copilot.model'];
        expect(setting?.type).toBe('string');
        expect(setting?.default).toBe('');
        expect(setting?.scope).toBe('window');
        expect(setting?.description?.length ?? 0).toBeGreaterThan(10);
    });

    it('AC-002 (0010): negative control, the manifest declares exactly the two copilot settings', () => {
        const keys = Object.keys(manifest.contributes?.configuration?.properties ?? {}).filter((key) => key.startsWith('featherspec-studio.copilot.'));
        expect(keys.sort()).toEqual(['featherspec-studio.copilot.cliPath', 'featherspec-studio.copilot.model']);
    });

    it('AC-005 (0010): the Copilot SDK is a devDependency pinned exactly and no production dependency exists, so the VSIX carries only the bundle', () => {
        expect(manifest.devDependencies?.['@github/copilot-sdk']).toBe('1.0.34');
        expect(manifest.dependencies ?? {}).toEqual({});
    });
});
