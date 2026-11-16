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
        configuration?: { properties?: Record<string, { type?: string; default?: unknown; minimum?: number; scope?: string; description?: string }> };
    };
}

const manifest = JSON.parse(readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8')) as Manifest;

describe('extension manifest', () => {
    it('AC-019: activates when the workspace holds a root AGENTS.md or .specs, and never on startup', () => {
        expect(manifest.activationEvents).toEqual(['workspaceContains:AGENTS.md', 'workspaceContains:.specs']);
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
        expect(commands).toEqual([
            { command: 'featherspec-studio.selectProject', title: 'FeatherSpec Studio: Select Project' },
            { command: 'featherspec-studio.refreshDiscovery', title: 'FeatherSpec Studio: Refresh Project Discovery' },
            { command: 'featherspec-studio.clearRunHistory', title: 'FeatherSpec Studio: Clear Run History' },
        ]);
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
});
