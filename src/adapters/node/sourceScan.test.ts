import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..', '..', '..');

async function filesUnder(directory: string): Promise<string[]> {
    const found: string[] = [];
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            found.push(...(await filesUnder(full)));
        } else {
            found.push(full);
        }
    }
    return found;
}

function relative(file: string): string {
    return path.relative(root, file).split(path.sep).join('/');
}

function isTestFile(name: string): boolean {
    return /\.test\.tsx?$/.test(name) || name.includes('/testing/');
}

export function hits(text: string, terms: readonly string[], caseInsensitive: boolean): string[] {
    const haystack = caseInsensitive ? text.toLowerCase() : text;
    return terms.filter((term) => haystack.includes(caseInsensitive ? term.toLowerCase() : term));
}

async function sourceFiles(): Promise<{ name: string; text: string }[]> {
    const files = (await filesUnder(path.join(root, 'src'))).filter((file) => /\.(ts|tsx|css)$/.test(file));
    return Promise.all(files.map(async (file) => ({ name: relative(file), text: await fs.readFile(file, 'utf8') })));
}

async function exists(relativePath: string): Promise<boolean> {
    return fs.access(path.join(root, ...relativePath.split('/'))).then(
        () => true,
        () => false,
    );
}

const PROCESS_TERMS = ['child_process', 'worker_threads', 'createTerminal', 'ShellExecution', 'ProcessExecution', 'executeTask'];
const NETWORK_TERMS = ['fetch(', 'node:http', 'node:https', 'node:net', 'node:tls', 'WebSocket'];
const NETWORK_ALLOWED = ['src/adapters/node/fetchReleaseHttp.ts', 'src/webview/main.tsx'];
const REMOVED_TERMS = [
    'agentcenter',
    'agent center',
    'agentstart',
    'orchestrator',
    'copilot',
    'fakeprovider',
    'agentprovider',
    'runhistory',
    'stoprun',
    'resumerun',
    'waitingforapproval',
];
const REMOVED_ALLOWED = [
    'src/core/runtime/earlierRunData.ts',
    'src/core/runtime/earlierRunData.test.ts',
    'src/adapters/node/earlierRunDataFiles.test.ts',
    'src/adapters/node/earlierRunData.endToEnd.test.ts',
    'src/adapters/node/sourceScan.test.ts',
    'src/adapters/node/docsScan.test.ts',
    'src/adapters/node/extensionBundle.test.ts',
    'src/adapters/node/webviewBundle.test.ts',
    'src/adapters/vscode/manifest.test.ts',
    'src/core/shell/shellService.navigation.test.ts',
    'src/core/shell/uiMemory.test.ts',
    'src/shared/protocol/messages.test.ts',
    'src/test/runtime.smoke.test.ts',
];
const REMOVED_FOLDERS = [
    'src/core/agentCenter',
    'src/core/agentStart',
    'src/core/orchestrator',
    'src/core/providers',
    'src/adapters/providers',
    'src/webview/areas/agentCenter',
    'src/webview/agentStart',
    'test/fixtures/copilot',
];

describe('0015 AC-019: no process is started', () => {
    it('production source names no child process, worker, terminal or task API', async () => {
        const offenders = (await sourceFiles()).filter((file) => !isTestFile(file.name) && hits(file.text, PROCESS_TERMS, false).length > 0).map((file) => file.name);
        expect(offenders).toEqual([]);
    });

    it('negative control: the scan finds every term in a planted sample', () => {
        for (const term of PROCESS_TERMS) {
            expect(hits(`const x = require('${term}');`, PROCESS_TERMS, false)).toContain(term);
        }
        expect(hits('const x = 1;', PROCESS_TERMS, false)).toEqual([]);
    });
});

describe('0015 AC-020: the network is reached only by the release adapter and the test-mode probe', () => {
    it('production source uses fetch, http, https, net, tls or WebSocket only in the two named files', async () => {
        const offenders = (await sourceFiles()).filter((file) => !isTestFile(file.name) && hits(file.text, NETWORK_TERMS, false).length > 0).map((file) => file.name);
        expect(offenders).toEqual(NETWORK_ALLOWED);
    });

    it('negative control: the scan finds every term in a planted sample', () => {
        for (const term of NETWORK_TERMS) {
            expect(hits(`use ${term} here`, NETWORK_TERMS, false)).toContain(term);
        }
        expect(hits('const x = 1;', NETWORK_TERMS, false)).toEqual([]);
    });
});

describe('0015 AC-021: the removed features leave no name behind', () => {
    it('the removed folders and the Copilot fixtures do not exist', async () => {
        for (const folder of REMOVED_FOLDERS) {
            expect(await exists(folder), folder).toBe(false);
        }
    });

    it('src, the host test configuration, the bundler configuration and the manifest name none of the removed features, except the named files', async () => {
        const extra = await Promise.all(
            ['.vscode-test.mjs', 'esbuild.js', 'package.json'].map(async (name) => ({ name, text: await fs.readFile(path.join(root, name), 'utf8') })),
        );
        const offenders = [...(await sourceFiles()), ...extra].filter((file) => hits(file.text, REMOVED_TERMS, true).length > 0).map((file) => file.name);
        expect(offenders.filter((name) => !REMOVED_ALLOWED.includes(name))).toEqual([]);
    });

    it('the named exceptions are all still needed: each one still names a removed feature', async () => {
        const byName = new Map((await sourceFiles()).map((file) => [file.name, file.text]));
        for (const name of REMOVED_ALLOWED) {
            expect(hits(byName.get(name) ?? '', REMOVED_TERMS, true).length, name).toBeGreaterThan(0);
        }
    });

    it('negative control: the scan finds every term, in any letter case, in a planted sample', () => {
        for (const term of REMOVED_TERMS) {
            expect(hits(`const name = '${term.toUpperCase()}';`, REMOVED_TERMS, true)).toContain(term);
        }
        expect(hits('const name = "spec board";', REMOVED_TERMS, true)).toEqual([]);
    });
});

describe('0015 AC-022: the host test suite', () => {
    it('holds no smoke test of the Agent Center, the start flow, Copilot, the orchestrator or the providers, and no opt-in Copilot runner', async () => {
        const names = (await fs.readdir(path.join(root, 'src', 'test'))).filter((name) => /\.test\.ts$/.test(name));
        expect(names.length).toBeGreaterThan(0);
        expect(names.filter((name) => /agentCenter|agentStart|copilot|orchestrator|providers/i.test(name))).toEqual([]);
        const config = await fs.readFile(path.join(root, '.vscode-test.mjs'), 'utf8');
        expect(config.toLowerCase()).not.toContain('copilot');
    });

    it('negative control: the name check finds a removed smoke test name', () => {
        expect(['copilot.smoke.test.ts', 'board.smoke.test.ts'].filter((name) => /agentCenter|agentStart|copilot|orchestrator|providers/i.test(name))).toEqual(['copilot.smoke.test.ts']);
    });
});
