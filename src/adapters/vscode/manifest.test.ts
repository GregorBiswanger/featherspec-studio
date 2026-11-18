import { readFileSync } from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { OPEN_STUDIO_COMMAND_ID, S2_WELCOME, SELECT_PROJECT_COMMAND_ID } from '../../shared/protocol/texts';

interface Manifest {
    description?: string;
    keywords?: string[];
    dependencies?: Record<string, string>;
    scripts?: Record<string, string>;
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

    it('AC-015, AC-016: contributes the select and refresh commands and no scaffold command', () => {
        const commands = manifest.contributes?.commands ?? [];
        expect(commands).toEqual(
            expect.arrayContaining([
                { command: 'featherspec-studio.selectProject', title: 'FeatherSpec Studio: Select Project' },
                { command: 'featherspec-studio.refresh', title: 'FeatherSpec Studio: Refresh' },
            ]),
        );
        expect(commands.map((entry) => entry.command)).not.toContain('featherspec-studio.helloWorld');
    });










    it('AC-001, AC-005 (0005): contributes the Open command and one command per area with their titles', () => {
        const commands = Object.fromEntries((manifest.contributes?.commands ?? []).map((command) => [command.command, command.title]));
        expect(commands).toMatchObject({
            'featherspec-studio.open': 'FeatherSpec Studio: Open',
            'featherspec-studio.openOverview': 'FeatherSpec Studio: Open Overview',
            'featherspec-studio.openBoard': 'FeatherSpec Studio: Open Board',
            'featherspec-studio.openSpecExplorer': 'FeatherSpec Studio: Open Spec Explorer',
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

    it('the host suite never runs compiled tests of deleted files: compile-tests empties out/ first', () => {
        const script = manifest.scripts?.['compile-tests'] ?? '';
        expect(script).toMatch(/rmSync\('out'/);
        expect(script.indexOf("rmSync('out'")).toBeLessThan(script.indexOf('tsc -p . --outDir out'));
    });

    it('0018 AC-001: contributes exactly the commands of the spec with their titles and none of the old ones; the internal action command stays out of the palette', () => {
        const commands = Object.fromEntries((manifest.contributes?.commands ?? []).map((command) => [command.command, command.title]));
        expect(commands['featherspec-studio.refresh']).toBe('FeatherSpec Studio: Refresh');
        expect(commands['featherspec-studio.openOverview']).toBe('FeatherSpec Studio: Open Overview');
        expect(commands['featherspec-studio.openBoard']).toBe('FeatherSpec Studio: Open Board');
        for (const old of ['openMissionControl', 'openSpecBoard', 'rescan', 'refreshDiscovery']) {
            expect(commands[`featherspec-studio.${old}`]).toBeUndefined();
        }
        const titles = Object.values(commands);
        for (const old of ['Mission Control', 'Spec Board', 'Rescan Project', 'Refresh Project Discovery']) {
            expect(titles.some((title) => title.includes(old))).toBe(false);
        }
        expect(commands['featherspec-studio.shellAction']).toBeDefined();
        expect(manifest.contributes?.menus?.commandPalette).toEqual([
            { command: 'featherspec-studio.copyMergePrompt', when: 'false' },
            { command: 'featherspec-studio.shellAction', when: 'false' },
        ]);
    });

    it('0017 AC-009: contributes no moveSpec command and no title with "Move"; the internal action command stays hidden', () => {
        const commands = manifest.contributes?.commands ?? [];
        expect(commands.map((entry) => entry.command)).not.toContain('featherspec-studio.moveSpec');
        expect(commands.filter((entry) => /move/i.test(entry.title))).toEqual([]);
        const hidden = (manifest.contributes?.menus?.commandPalette ?? []).filter((entry) => entry.when === 'false').map((entry) => entry.command);
        expect(hidden).toContain('featherspec-studio.shellAction');
        expect(hidden).not.toContain('featherspec-studio.moveSpec');
    });

    it('0017 AC-009: negative control, the matcher finds a Move title', () => {
        expect(['FeatherSpec: Move Spec to…', 'FeatherSpec Studio: Open'].filter((title) => /move/i.test(title))).toEqual(['FeatherSpec: Move Spec to…']);
    });

    it('0017 AC-009: contributes "FeatherSpec Studio: Copy Next Step", not hidden from the Command Palette, and the activation events stay', () => {
        const commands = manifest.contributes?.commands ?? [];
        expect(commands).toContainEqual({ command: 'featherspec-studio.copyNextStep', title: 'FeatherSpec Studio: Copy Next Step' });
        const hidden = (manifest.contributes?.menus?.commandPalette ?? []).filter((entry) => entry.when === 'false').map((entry) => entry.command);
        expect(hidden).not.toContain('featherspec-studio.copyNextStep');
        expect(manifest.activationEvents).toEqual(['workspaceContains:AGENTS.md', 'workspaceContains:.specs', 'onWebviewPanel:featherspecStudio.main']);
    });

    it('0017 AC-009: the two commands the status bar tooltip links to are contributed commands, and so is the one a click runs', () => {
        const contributed = (manifest.contributes?.commands ?? []).map((entry) => entry.command);
        expect(contributed).toContain(OPEN_STUDIO_COMMAND_ID);
        expect(contributed).toContain(SELECT_PROJECT_COMMAND_ID);
        expect(contributed).toContain('featherspec-studio.copyNextStep');
    });

    it('AC-014 (0015): contributes no command to open the Agent Center, clear run history, stop a run or resume a run', () => {
        const commands = (manifest.contributes?.commands ?? []).map((entry) => entry.command);
        for (const removed of ['openAgentCenter', 'clearRunHistory', 'stopRun', 'resumeRun']) {
            expect(commands).not.toContain(`featherspec-studio.${removed}`);
        }
        const titles = (manifest.contributes?.commands ?? []).map((entry) => entry.title);
        expect(titles.filter((title) => /Agent|Run History|Stop Run|Resume Run/.test(title))).toEqual([]);
    });

    it('AC-014 (0015): negative control, the matcher finds the removed titles', () => {
        expect(['FeatherSpec Studio: Open Agent Center', 'FeatherSpec Studio: Clear Run History', 'FeatherSpec Studio: Stop Run', 'FeatherSpec Studio: Resume Run'].filter((title) => /Agent|Run History|Stop Run|Resume Run/.test(title))).toHaveLength(4);
    });

    it('AC-015 (0015): declares no configuration property', () => {
        expect(manifest.contributes?.configuration).toBeUndefined();
    });

    it('AC-015 (0015): negative control, a manifest with a configuration would be found', () => {
        const withConfiguration: Manifest = { contributes: { configuration: { properties: {} } } };
        expect(withConfiguration.contributes?.configuration).toBeDefined();
    });

    it('AC-016 (0015): the description reads as the product text and names no agent or Copilot; the keywords drop agents, ai agents and github copilot', () => {
        expect(manifest.description).toBe('Visual command center for spec-driven development with FeatherSpec: see every spec, know its next step.');
        expect(manifest.description ?? '').not.toMatch(/agent|copilot/i);
        for (const removed of ['agents', 'ai agents', 'github copilot']) {
            expect(manifest.keywords ?? []).not.toContain(removed);
        }
    });

    it('AC-016 (0015): negative control, the old description and keywords would be found', () => {
        expect('Visual command center for spec-driven development with FeatherSpec: see every spec, control every agent.').toMatch(/agent/i);
        expect(['featherspec', 'agents', 'ai agents'].filter((keyword) => ['agents', 'ai agents', 'github copilot'].includes(keyword))).toHaveLength(2);
    });
});
