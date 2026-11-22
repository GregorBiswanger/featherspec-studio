import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { NOTHING_UP_NEXT_SETUP_TEXT, NOTHING_UP_NEXT_TEXT, UP_NEXT_HEADING } from '../../webview/areas/overview/texts';
import { UP_NEXT_SET_LABEL } from '../../webview/areas/overview/requests';

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

const ASSISTANT_NAME_FORMS: readonly RegExp[] = [/GitHub\.copilot-chat/g, /\bcopilotCopyText\b/g, /GitHub Copilot/g, /'copilot'/g, /"copilot"/g, /\bCopilot(?![A-Za-z0-9.-])/g];

export function maskAssistantNames(text: string): string {
    return ASSISTANT_NAME_FORMS.reduce((rest, form) => rest.replace(form, ''), text);
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
        const offenders = [...(await sourceFiles()), ...extra].filter((file) => hits(maskAssistantNames(file.text), REMOVED_TERMS, true).length > 0).map((file) => file.name);
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

describe("0024 §5: 0015 AC-021 excepts 0024's own names of GitHub Copilot", () => {
    it('the extension ID, the product name, the quoted setting value and the capitalised word are masked', () => {
        const sample = "const id = 'GitHub.copilot-chat'; const v = 'copilot'; const w = \"copilot\"; // GitHub Copilot, Copilot's chat, Copilot";
        expect(hits(maskAssistantNames(sample), REMOVED_TERMS, true)).toEqual([]);
        expect(hits(sample, REMOVED_TERMS, true)).toEqual(['copilot']);
    });

    it('negative control: every other form is still found', () => {
        for (const sample of ['copilotProvider', 'copilot-agent', 'COPILOT', 'copilot.smoke', 'CopilotAgent', 'Copilot-agent', 'const copilot = 1;', 'github.copilot.chat', 'Copilot.ts', 'xCopilot']) {
            expect(hits(maskAssistantNames(sample), REMOVED_TERMS, true), sample).toEqual(['copilot']);
        }
    });
});

describe('0024 §5, F1: the exemptions stay as narrow as the names of 0024', () => {
    const FIVE = ['src/core/assistant/offer.test.ts', 'src/core/assistant/send.test.ts', 'src/webview/ui/SendButton.test.tsx', 'src/webview/detail/SpecDetail.test.tsx', 'src/shared/protocol/assistant.test.ts'];

    it('none of the five assistant test files is exempt from the removed terms, and each holds none after the mask', async () => {
        for (const name of FIVE) {
            expect(REMOVED_ALLOWED, name).not.toContain(name);
        }
        const byName = new Map((await sourceFiles()).map((file) => [file.name, file.text]));
        for (const name of FIVE) {
            expect(hits(maskAssistantNames(byName.get(name) ?? ''), REMOVED_TERMS, true), name).toEqual([]);
        }
    });

    it('negative control: any other removed term in such a file would be found', () => {
        for (const term of REMOVED_TERMS.filter((term) => term !== 'copilot')) {
            expect(hits(maskAssistantNames(`const x = '${term}';`), REMOVED_TERMS, true), term).toEqual([term]);
        }
    });
});

const SEND_FORBIDDEN_TERMS = ['submit', 'acceptInput', 'sendToNewChat', 'autoSend', 'isPartialQuery: false', 'chatgpt', 'github.copilot.', 'inlineChat', 'editorChat', 'vscode.lm', 'vscode://', 'preserveInput', 'modelSelector'];
const SEND_COMMANDS = ['workbench.action.chat.newChat', 'workbench.action.chat.open', 'claude-vscode.editor.open'];

export function chatCommandStrings(text: string): string[] {
    return [...text.matchAll(/(?:workbench\.action\.chat\.|claude-vscode\.)[A-Za-z.]*/g)].map((match) => match[0]);
}

describe('0024 AC-007: the Studio never submits a chat and names no other chat command', () => {
    async function productionFiles(): Promise<{ name: string; text: string }[]> {
        const extra = await fs.readFile(path.join(root, 'package.json'), 'utf8');
        return [...(await sourceFiles()).filter((file) => !isTestFile(file.name)), { name: 'package.json', text: extra }];
    }

    it('src without test files and package.json hold none of the forbidden terms, in any letter case', async () => {
        const offenders = (await productionFiles()).filter((file) => hits(file.text, SEND_FORBIDDEN_TERMS, true).length > 0).map((file) => `${file.name}: ${hits(file.text, SEND_FORBIDDEN_TERMS, true).join(', ')}`);
        expect(offenders).toEqual([]);
    });

    it('workbench.action.chat.open occurs exactly once, and every chat or Claude Code command string is one of the three', async () => {
        const files = await productionFiles();
        const strings = files.flatMap((file) => chatCommandStrings(file.text));
        expect(strings.filter((text) => text === 'workbench.action.chat.open')).toHaveLength(1);
        expect([...new Set(strings)].sort()).toEqual([...SEND_COMMANDS].sort());
        expect(files.filter((file) => file.text.includes('workbench.action.chat.open')).map((file) => file.name)).toEqual(['src/core/assistant/assistants.ts']);
    });

    it('0027 AC-007: attachFiles occurs exactly once in src without test files and package.json, in the file that owns the chat commands', async () => {
        const files = await productionFiles();
        expect(files.flatMap((file) => file.text.match(/attachFiles/g) ?? [])).toHaveLength(1);
        expect(files.filter((file) => file.text.includes('attachFiles')).map((file) => file.name)).toEqual(['src/core/assistant/assistants.ts']);
    });

    it('negative control: the scan finds each term, any letter case, and a command that is not one of the three', () => {
        for (const term of SEND_FORBIDDEN_TERMS) {
            expect(hits(`call ${term.toUpperCase()} here`, SEND_FORBIDDEN_TERMS, true), term).toContain(term);
        }
        expect(hits('const open = 1;', SEND_FORBIDDEN_TERMS, true)).toEqual([]);
        expect(chatCommandStrings("run('workbench.action.chat.submit'); run('claude-vscode.sidebar.open')")).toEqual(['workbench.action.chat.submit', 'claude-vscode.sidebar.open']);
        expect(chatCommandStrings('workbench.action.chat.open workbench.action.chat.open')).toHaveLength(2);
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

describe('0020 AC-018: the Spec Explorer is gone from the sources', () => {
    const TERMS = ['specexplorer', 'spec explorer'] as const;
    const MAPPING_FILE = 'src/core/shell/uiMemory.ts';

    it('src without test files names the Spec Explorer, in any letter case, only in the mapping of a remembered area', async () => {
        const files = (await sourceFiles()).filter((file) => !isTestFile(file.name));
        expect(files.length).toBeGreaterThan(0);
        const found = files.flatMap((file) => hits(file.text, TERMS, true).map((term) => `${file.name}: ${term}`));
        expect(found).toEqual([`${MAPPING_FILE}: specexplorer`]);
    });

    it('the one place left is the mapping: a single quoted area ID that is replaced by the default area', async () => {
        const mapping = (await sourceFiles()).find((file) => file.name === MAPPING_FILE)!;
        expect(mapping.text.match(/specExplorer/g)).toHaveLength(1);
        expect(mapping.text).toContain("value.area === 'specExplorer' ? DEFAULT_AREA : value.area");
    });

    it('negative control: the scan finds every term, in any letter case, in a planted sample', () => {
        for (const term of ['specExplorer', 'SpecExplorer', 'openSpecExplorer', 'Spec Explorer', 'OPENSPECEXPLORER']) {
            expect(hits(`const name = '${term}';`, TERMS, true).length, term).toBeGreaterThan(0);
        }
        expect(hits("const name = 'Spec board';", TERMS, true)).toEqual([]);
    });
});

describe('0022 AC-007: "up next" names one set', () => {
    const ALLOWED = [UP_NEXT_HEADING, NOTHING_UP_NEXT_TEXT, NOTHING_UP_NEXT_SETUP_TEXT, UP_NEXT_SET_LABEL];

    function literalsWithUpNext(text: string): string[] {
        return [...text.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)].map((match) => match[1] ?? match[2] ?? match[3] ?? '').filter((literal) => /up next/i.test(literal));
    }

    it('every literal of src without tests that holds "up next" is the Overview heading, its empty line or the named set', async () => {
        const files = (await sourceFiles()).filter((file) => !isTestFile(file.name));
        const found = files.flatMap((file) => literalsWithUpNext(file.text).map((literal) => `${file.name}: ${literal}`));
        expect(found.sort()).toEqual(
            [`src/webview/areas/overview/texts.ts: ${UP_NEXT_HEADING}`, `src/webview/areas/overview/texts.ts: ${NOTHING_UP_NEXT_TEXT}`, `src/webview/areas/overview/texts.ts: ${NOTHING_UP_NEXT_SETUP_TEXT}`, `src/webview/areas/overview/requests.ts: ${UP_NEXT_SET_LABEL}`].sort(),
        );
        expect(ALLOWED).toHaveLength(4);
    });

    it('package.json holds no "up next"', async () => {
        expect(await fs.readFile(path.join(root, 'package.json'), 'utf8')).not.toMatch(/up next/i);
    });

    it('negative control: the scan finds a group label and a tooltip that say up next, and passes the allowed texts', () => {
        expect(literalsWithUpNext("const GROUP = { upNext: 'Up next' };").filter((literal) => !ALLOWED.includes(literal))).toEqual([]);
        expect(literalsWithUpNext("const GROUP = 'Up next group';")).toEqual(['Up next group']);
        expect(literalsWithUpNext('const TIP = `The up next list`;')).toEqual(['The up next list']);
        expect(literalsWithUpNext("const x = 'Ready';")).toEqual([]);
    });
});


describe('0021 AC-013: the product names no model', () => {
    const MODEL_NAMES = ['Opus', 'Sonnet', 'Haiku', 'GPT-', 'Gemini', 'Llama', 'Mistral'];

    it('a case-insensitive search of src without test files and of package.json finds none of the model names', async () => {
        const files = (await sourceFiles()).filter((file) => !isTestFile(file.name));
        const offenders = files.map((file) => [file.name, hits(file.text, MODEL_NAMES, true)] as const).filter(([, found]) => found.length > 0);
        expect(offenders).toEqual([]);
        const manifest = await fs.readFile(path.join(root, 'package.json'), 'utf8');
        expect(hits(manifest, MODEL_NAMES, true)).toEqual([]);
        expect(files.length).toBeGreaterThan(50);
    });

    it('negative control: the scan finds each name in any case', () => {
        for (const name of MODEL_NAMES) {
            expect(hits(`const model = '${name.toUpperCase()}';`, MODEL_NAMES, true)).toEqual([name]);
            expect(hits(`const model = '${name.toLowerCase()}';`, MODEL_NAMES, true)).toEqual([name]);
        }
        expect(hits('const model = "strong model";', MODEL_NAMES, true)).toEqual([]);
    });
});

export function stringLiterals(text: string): string[] {
    return [...text.matchAll(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g)].map((match) => match[0]);
}

describe('0026 AC-002: one term for the open chat in the shipped sources', () => {
    const OLD_TERMS = ['same chat', 'this chat'];

    it('src without test files, package.json, README.md and docs/release-checklist.md hold neither same chat nor this chat, in any letter case', async () => {
        const files = (await sourceFiles()).filter((file) => !isTestFile(file.name));
        const offenders = files.map((file) => [file.name, hits(file.text, OLD_TERMS, true)] as const).filter(([, found]) => found.length > 0);
        expect(offenders).toEqual([]);
        for (const doc of ['package.json']) {
            expect(hits(await fs.readFile(path.join(root, doc), 'utf8'), OLD_TERMS, true), doc).toEqual([]);
        }
    });

    it('negative control: the scan finds each term in any case', () => {
        expect(hits("const a = 'SAME CHAT or new chat';", OLD_TERMS, true)).toEqual(['same chat']);
        expect(hits("const a = 'What This Chat knows';", OLD_TERMS, true)).toEqual(['this chat']);
        expect(hits("const a = 'the current chat';", OLD_TERMS, true)).toEqual([]);
    });
});

describe('0026 AC-021: Send, not Paste, in the text modules', () => {
    const ALLOWED = [
        'Paste it once every worker you started is back.',
        'before you paste.',
        'paste it there with',
    ];

    function offenders(text: string): string[] {
        return stringLiterals(text).filter((literal) => /paste/i.test(literal) && !ALLOWED.some((allowed) => literal.includes(allowed)));
    }

    it('the string literals of src without test files hold paste only in the three allowed sentences', async () => {
        const files = (await sourceFiles()).filter((file) => !isTestFile(file.name) && /\.tsx?$/.test(file.name));
        expect(files.map((file) => [file.name, offenders(file.text)] as const).filter(([, found]) => found.length > 0)).toEqual([]);
    });

    it('each allowed sentence is still needed: a literal of the shipped sources holds it', async () => {
        const files = (await sourceFiles()).filter((file) => !isTestFile(file.name) && /\.tsx?$/.test(file.name));
        const all = files.flatMap((file) => stringLiterals(file.text)).filter((literal) => /paste/i.test(literal));
        for (const allowed of ALLOWED) {
            expect(
                all.some((literal) => literal.includes(allowed)),
                allowed,
            ).toBe(true);
        }
    });

    it('negative control: a planted literal with Paste is found, an identifier and an allowed sentence are not', () => {
        expect(offenders("const a = 'Paste it now';")).toEqual(["'Paste it now'"]);
        expect(offenders('const a = `Then paste ${x}`;')).toHaveLength(1);
        expect(offenders('const pasteKey = pasteKeyOf(platform);')).toEqual([]);
        expect(offenders("const a = 'Paste it once every worker you started is back.';")).toEqual([]);
    });
});

describe('0026 AC-014: every text of §7 comes from a text module', () => {
    const SEVEN = ['current or new chat', 'Find blocker', 'Move back to Ready', 'Write plan', 'Next step: ', 'About these ways', 'One chat builds the steps', 'Send it once every worker', 'Send to a new chat'];

    it('no component or core file outside the text modules holds a §7 literal', async () => {
        const files = (await sourceFiles()).filter((file) => !isTestFile(file.name) && /\.tsx?$/.test(file.name) && !/(?:^|\/)(?:\w*[tT]exts?|texts)\.ts$/.test(file.name));
        const offenders = files.flatMap((file) => stringLiterals(file.text).filter((literal) => SEVEN.some((text) => literal.includes(text))).map((literal) => `${file.name}: ${literal}`));
        expect(offenders).toEqual([]);
    });

    it('negative control: a planted component literal is found', () => {
        expect(stringLiterals("const label = 'About these ways';").some((literal) => SEVEN.some((text) => literal.includes(text)))).toBe(true);
    });
});
