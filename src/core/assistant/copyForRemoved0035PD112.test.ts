import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PROTOCOL_VERSION } from '../../shared/protocol/envelope';
import { isSendView, waitsForStart, type SendView } from '../../shared/protocol/assistant';
import { sendTipText } from '../../shared/protocol/assistantTexts';
import { TIP_CLOSING, STEP_GUIDES, type StepCase } from '../../shared/protocol/nextStepTexts';
import { createJetBrainsAssistants } from '../../hosts/embedded/assistants';
import { ASSISTANTS } from './assistants';
import { offerOf } from './offer';
import { plainSendViewOf, sendViewOf, tipClosingOf } from './sendView';

const root = process.cwd();
const REMOVED = ['Copy for', `${'copilot'}CopyText`, 'junieCopyText', 'COPY_FOR_', 'openChat'];
const KOTLIN_REMOVED = [...REMOVED, 'ChatWindows', 'ChatAssistant', 'OPEN_CHAT', 'PluginIds.COPILOT', 'PluginIds.JUNIE', 'PluginIds.AI_ASSISTANT'];
const SELF = 'src/core/assistant/copyForRemoved0035PD112.test.ts';
const EXEMPT_UNTIL_DOCS = ['src/adapters/node/docs0035.test.ts', 'src/adapters/node/docsScan.test.ts'];
const AGENTS = ['junie', 'claudeCode', 'copilot'] as const;
const CASES = Object.keys(STEP_GUIDES) as StepCase[];

async function filesUnder(directory: string): Promise<string[]> {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(entries.map((entry) => (entry.isDirectory() ? filesUnder(path.join(directory, entry.name)) : [path.join(directory, entry.name)])));
    return nested.flat();
}

export function offenders(files: ReadonlyArray<{ name: string; text: string }>, exempt: readonly string[]): string[] {
    return files.filter((file) => !exempt.includes(file.name) && REMOVED.some((term) => file.text.includes(term))).map((file) => file.name);
}

describe('0035 PD-112 AC-050: Copy for is gone from the source', () => {
    it('no file under src holds one of the removed names of the Copy-for handover, except this test and the two documentation tests that T-024 cleans', async () => {
        const names = (await filesUnder(path.join(root, 'src'))).filter((file) => /\.(ts|tsx|css|json)$/.test(file));
        const files = await Promise.all(names.map(async (file) => ({ name: path.relative(root, file).split(path.sep).join('/'), text: await fs.readFile(file, 'utf8') })));
        expect(offenders(files, [SELF, ...EXEMPT_UNTIL_DOCS])).toEqual([]);
    });

    it('no Kotlin file under jetbrains/src holds one of the removed names, and the removed files are gone', async () => {
        const names = (await filesUnder(path.join(root, 'jetbrains', 'src'))).filter((file) => file.endsWith('.kt') || file.endsWith('.xml'));
        const files = await Promise.all(names.map(async (file) => ({ name: path.relative(root, file).split(path.sep).join('/'), text: await fs.readFile(file, 'utf8') })));
        expect(files.filter((file) => KOTLIN_REMOVED.some((term) => file.text.includes(term))).map((file) => file.name)).toEqual([]);
        for (const gone of ['ChatWindows.kt', 'IdeChatWindows.kt', 'ChatWindowsTest.kt']) {
            expect(files.map((file) => file.name).filter((name) => name.endsWith(`/${gone}`)), gone).toEqual([]);
        }
    });

    it('the exemptions are all still needed', async () => {
        for (const name of EXEMPT_UNTIL_DOCS) {
            const text = await fs.readFile(path.join(root, ...name.split('/')), 'utf8');
            expect(offenders([{ name, text }], []), name).toEqual([name]);
        }
    });

    it('negative control: the scan finds every term in a planted sample and nothing in a clean one', () => {
        for (const term of REMOVED) {
            expect(offenders([{ name: 'x.ts', text: `const x = '${term}';` }], []), term).toEqual(['x.ts']);
        }
        expect(offenders([{ name: 'x.ts', text: 'const x = "Send to Junie"; // copy prompt' }], [])).toEqual([]);
    });

    it('the bridge contract names no openChat call and no claudeTerminal call', async () => {
        const source = await fs.readFile(path.join(root, 'src', 'hosts', 'embedded', 'contract.ts'), 'utf8');
        expect(source).toContain("'assistant.terminal'");
        expect(source).not.toContain('openChat');
        expect(source).not.toContain('claudeTerminal');
    });
});

describe('0035 PD-112 AC-050: the protocol is version 13 and a send view has no handover', () => {
    it('the version is 13', () => {
        expect(PROTOCOL_VERSION).toBe(13);
    });

    it('a send view with a handover key is refused, for every assistant', () => {
        for (const assistant of AGENTS) {
            const view = { assistant, target: 'new', targets: ['new'] };
            expect(isSendView({ ...view, handover: 'copyFor' }), assistant).toBe(false);
            expect(isSendView({ ...view, handover: 'send' }), assistant).toBe(false);
        }
    });

    it('terminal is optional, true only, and a JetBrains terminal view carries it for every agent', () => {
        for (const assistant of AGENTS) {
            const view = { assistant, target: 'current', targets: ['current', 'new'] };
            expect(isSendView({ ...view, terminal: true }), assistant).toBe(true);
            expect(isSendView({ ...view }), assistant).toBe(true);
            for (const bad of [false, 'true', 1, null]) {
                expect(isSendView({ ...view, terminal: bad }), `${assistant} ${String(bad)}`).toBe(false);
            }
        }
    });

    it('waitsForStart reads terminal: true for the three JetBrains Sends and is false for every VS Code view', () => {
        const table = createJetBrainsAssistants();
        for (const assistant of AGENTS) {
            const offer = offerOf(assistant, [`cli:${assistant === 'claudeCode' ? 'claude' : assistant}`], undefined, table)!;
            const view = plainSendViewOf(offer)!;
            expect(view.terminal, assistant).toBe(true);
            expect(waitsForStart(view), assistant).toBe(true);
            expect(waitsForStart({ ...view, target: 'new' }), assistant).toBe(true);
        }
        for (const [assistant, row] of Object.entries(ASSISTANTS)) {
            for (const targets of [[...row.targets], ['new', 'current'], ['current', 'new']] as SendView['targets'][]) {
                expect(waitsForStart({ assistant: assistant as 'copilot' | 'claudeCode', target: 'new', targets }), `${assistant} ${targets.join()}`).toBe(false);
            }
        }
    });

    it('a JetBrains view of every case keeps terminal and no handover; a VS Code view has neither', () => {
        const table = createJetBrainsAssistants();
        for (const assistant of AGENTS) {
            const offer = offerOf(assistant, [`cli:${assistant === 'claudeCode' ? 'claude' : assistant}`], undefined, table)!;
            expect(offer).not.toHaveProperty('handover');
            expect(offer).not.toHaveProperty('place');
            for (const stepCase of CASES) {
                const view = sendViewOf(offer, stepCase)!;
                expect(view.terminal).toBe(true);
                expect(view).not.toHaveProperty('handover');
                expect(isSendView(view)).toBe(true);
            }
        }
        for (const assistant of ['copilot', 'claudeCode'] as const) {
            const view = plainSendViewOf(offerOf(assistant, [ASSISTANTS[assistant].extensionId], undefined, ASSISTANTS))!;
            expect(view).not.toHaveProperty('terminal');
            expect(view).not.toHaveProperty('handover');
        }
    });
});

describe('0035 PD-112 AC-050: the toggletip names the Send of each agent', () => {
    it('the Send paragraph is the sentence of 0024 with the name of the agent', () => {
        const table = createJetBrainsAssistants();
        for (const [assistant, name] of [['junie', 'Junie'], ['claudeCode', 'Claude Code'], ['copilot', 'Copilot']] as const) {
            const offer = offerOf(assistant, [`cli:${assistant === 'claudeCode' ? 'claude' : assistant}`], undefined, table);
            expect(tipClosingOf(offer)).toEqual([sendTipText(name), TIP_CLOSING[1]]);
            expect(sendTipText(name)).toBe(`Send to ${name} puts the prompt into its chat and sends nothing: choose the model there, check the prompt, then send it.`);
        }
        expect(tipClosingOf(undefined)).toEqual(TIP_CLOSING);
    });
});
