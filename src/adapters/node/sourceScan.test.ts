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

describe('0016 AC-021: the old texts are gone from the panel sources', () => {
    const OLD_TEXTS = ['Priority: not available', 'verdict: not available', 'Inter-spec dependencies', 'Derived: ', 'Model updated', 'Project diagnostics', 'project-level diagnostic', 'See its diagnostics'] as const;

    it('src/shared and src/webview hold none of the eight strings outside test files (Q-10)', async () => {
        const files = (await sourceFiles()).filter((file) => (file.name.startsWith('src/shared/') || file.name.startsWith('src/webview/')) && !isTestFile(file.name));
        expect(files.length).toBeGreaterThan(0);
        const found = files.flatMap((file) => hits(file.text, OLD_TEXTS, false).map((term) => `${file.name}: ${term}`));
        expect(found).toEqual([]);
    });

    it('negative control: the same search finds the model reasons that stay in src/core', async () => {
        const core = (await sourceFiles()).filter((file) => file.name.startsWith('src/core/') && !isTestFile(file.name));
        const found = new Set(core.flatMap((file) => hits(file.text, OLD_TEXTS, false)));
        expect(found.has('verdict: not available')).toBe(true);
        expect(found.has('Inter-spec dependencies')).toBe(true);
        expect(hits("const text = 'verdict: not available';", OLD_TEXTS, false)).toEqual(['verdict: not available']);
    });
});

describe('0017 AC-011: no move path is left in the source', () => {
    const MOVE_FILES = [
        'src/core/board/moves.ts',
        'src/core/lifecycle/transitions.ts',
        'src/webview/board/MoveMenu.tsx',
        'src/webview/board/Announcer.tsx',
        'src/adapters/vscode/boardPicks.ts',
    ];
    const MOVE_TERMS = ['judgeTransition', 'moveRequest', 'moveResult', 'requestMove', 'moveSpec', 'boardFocus', 'Move to…', 'Studio starts no agent'];

    it('the five move files do not exist', async () => {
        for (const file of MOVE_FILES) {
            expect(await exists(file), file).toBe(false);
        }
    });

    it('src without test files names none of the eight terms, in any letter case', async () => {
        const files = (await sourceFiles()).filter((file) => !isTestFile(file.name));
        expect(files.length).toBeGreaterThan(0);
        const found = files.flatMap((file) => hits(file.text, MOVE_TERMS, true).map((term) => `${file.name}: ${term}`));
        expect(found).toEqual([]);
    });

    it('negative control: the scan finds every term, in any letter case, in a planted sample', () => {
        for (const term of MOVE_TERMS) {
            expect(hits(`const name = '${term.toUpperCase()}';`, MOVE_TERMS, true)).toContain(term);
        }
        expect(hits('const name = "copy next step";', MOVE_TERMS, true)).toEqual([]);
    });
});

describe('0018 AC-001, AC-029: the old names and texts are gone from the sources', () => {
    const OLD_NAMES = ['mission control', 'spec board', '▸'];
    const OLD_TEXTS = [
        'Nothing needs attention.',
        'No recent activity.',
        'Specs by state',
        'Model updated',
        'specs with diagnostics',
        'Recent activity',
        'Needs attention',
        'Run /sdd-specify to write the first one',
        'No spec in the backlog.',
        'No spec is blocked.',
        'Tasks: ',
        'Criteria verified',
        'Last change: ',
        'Named set',
        'Rescan Project',
        'Refresh Project Discovery',
    ] as const;

    it('src without test files names neither old area, in any letter case, nor the marker', async () => {
        const files = (await sourceFiles()).filter((file) => !isTestFile(file.name));
        expect(files.length).toBeGreaterThan(0);
        const found = files.flatMap((file) => hits(file.text, OLD_NAMES, true).map((term) => `${file.name}: ${term}`));
        expect(found).toEqual([]);
    });

    it('0020 AC-018: no ▸ is left in src without test files, the marker of the Spec Explorer list went with it (0018 AC-029 exception void)', async () => {
        const files = (await sourceFiles()).filter((file) => !isTestFile(file.name));
        expect(files.filter((file) => file.text.includes('▸')).map((file) => file.name)).toEqual([]);
        expect(hits("const marker = '▸';", ['▸'], true)).toEqual(['▸']);
    });

    it('src without test files holds none of the old texts', async () => {
        const files = (await sourceFiles()).filter((file) => !isTestFile(file.name));
        const found = files.flatMap((file) => hits(file.text, OLD_TEXTS, false).map((term) => `${file.name}: ${term}`));
        expect(found).toEqual([]);
    });

    it('the old areas\' folders and files do not exist', async () => {
        for (const old of ['src/core/missionControl', 'src/webview/areas/missionControl', 'src/shared/protocol/missionControl.ts', 'src/test/missionControl.smoke.test.ts']) {
            expect(await exists(old), old).toBe(false);
        }
    });

    it('negative control: the scans find every name in any letter case and every text in a planted sample', () => {
        for (const name of OLD_NAMES) {
            expect(hits(`const name = '${name.toUpperCase()}';`, OLD_NAMES, true)).toContain(name);
        }
        for (const text of OLD_TEXTS) {
            expect(hits(`const text = '${text}';`, OLD_TEXTS, false)).toContain(text);
        }
        expect(hits('const name = "Overview and Board";', OLD_NAMES, true)).toEqual([]);
    });
});
