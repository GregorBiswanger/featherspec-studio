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
    contributes?: { commands?: { command: string; title: string }[] };
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

    it('AC-015, AC-016: contributes the select and refresh commands and no scaffold command', () => {
        const commands = manifest.contributes?.commands ?? [];
        expect(commands).toEqual([
            { command: 'featherspec-studio.selectProject', title: 'FeatherSpec Studio: Select Project' },
            { command: 'featherspec-studio.refreshDiscovery', title: 'FeatherSpec Studio: Refresh Project Discovery' },
        ]);
        expect(commands.map((entry) => entry.command)).not.toContain('featherspec-studio.helloWorld');
    });
});
