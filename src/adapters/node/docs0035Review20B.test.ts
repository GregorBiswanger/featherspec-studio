import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..', '..', '..');

async function read(file: string): Promise<string> {
    return fs.readFile(path.join(root, file), 'utf8');
}

const PD_112_SENTENCE =
    "Studio starts no agent on its own and sends nothing. In JetBrains IDEs, Send to Junie, Claude Code or Copilot may start that assistant's command-line agent in a terminal tab when you click it.";

describe('0035 review 20 B-3 / PD-110 / AC-033: the README keeps its promise honest', () => {
    it('AC-033 the intro, the Local and read-only bullet and the Privacy bullet carry the sentence of PD-112, literally', async () => {
        const lines = (await read('README.md')).split('\n');
        const introduction = lines.find((line) => line.startsWith('Studio reads your project'));
        const bullet = lines.find((line) => line.startsWith('- **Local and read-only.**'));
        const privacy = lines.find((line) => line.startsWith('- Studio starts no agent on its own'));
        for (const line of [introduction, bullet, privacy]) {
            expect(line).toBeDefined();
            expect(line).toContain(PD_112_SENTENCE);
        }
    });

    it('AC-033 no README line still says that Studio starts no process or no agent without the JetBrains exception', async () => {
        const lines = (await read('README.md')).split('\n');
        expect(lines.filter((line) => line.includes('starts no process'))).toEqual([]);
        expect(lines.filter((line) => /starts no agent(?! on its own)/.test(line) && line.includes('Studio reads your project')).map((line) => line.slice(0, 60))).toEqual([]);
        expect(lines.filter((line) => line.includes('Send to Claude Code may start claude in a terminal tab'))).toEqual([]);
    });

    it('AC-052 the CHANGELOG names PD-110 and PD-112 and the decision of Gregor', async () => {
        const changelog = await read('CHANGELOG.md');
        expect(changelog).toContain('PD-110');
        expect(changelog).toContain('PD-112');
        expect(changelog).toContain(PD_112_SENTENCE.replace('Studio starts', 'Studio itself starts'));
    });

    it('AC-033 negative control, the old promise is found by the same check', () => {
        expect(/starts no agent(?! on its own)/.test('Studio reads your project and starts no agent; the work')).toBe(true);
        expect('Studio starts no process and no agent.'.includes('starts no process')).toBe(true);
    });
});

describe('0035 PD-112 / AC-050: README and CHANGELOG no longer tell to choose Junie in AI Chat', () => {
    it('AC-050 neither says it, and the README section names no AI Chat step', async () => {
        const [readme, changelog] = await Promise.all([read('README.md'), read('CHANGELOG.md')]);
        expect(readme).not.toContain('AI Chat opens with its recommended agent');
        expect(changelog).not.toContain('In AI Chat, choose Junie and paste it with Ctrl+V.');
        expect(readme.split('## JetBrains IDEs')[1]).not.toContain('AI Chat');
    });
});

describe('0035 review 20 S-6 and S-5 / AC-038, AC-039: the settings page names one short sentence and offers only what exists', () => {
    const TABLE = 'jetbrains/src/main/kotlin/com/gregorbiswanger/featherspec/studio/settings/SettingsTable.kt';

    it('AC-038 the settings table holds the new description literally and the three-sentence one is gone', async () => {
        const table = await read(TABLE);
        expect(table).toContain('const val ASSISTANT_DESCRIPTION = "The assistant your next step goes to. Studio sends nothing; Copy prompt stays in the button\'s menu."');
        expect(table).not.toContain('Your AI assistant for the next step');
        expect(table).not.toContain('Nothing is sent;');
    });

    it('AC-039 the README says that each option appears only while its assistant is available, and the stored value stays', async () => {
        const readme = await read('README.md');
        expect(readme).toContain('Each assistant is selectable only while the Terminal plugin and its command are available');
        expect(readme).toContain('A stored value whose assistant is not available shows `None: Copy prompt` and is kept.');
        expect(readme).not.toContain('*Junie* appears in the setting only while a Junie plugin is available');
    });

    it('AC-039 the settings table offers an option through one availability function, not a list of cases in the page', async () => {
        const [table, page] = await Promise.all([read(TABLE), read('jetbrains/src/main/kotlin/com/gregorbiswanger/featherspec/studio/settings/StudioConfigurable.kt')]);
        expect(table).toContain('fun assistantAvailable(value: String, plugins: List<String>): Boolean');
        expect(page).not.toContain('junieAvailable');
        expect(page).toContain('SettingsTable.unavailableReason(');
    });
});

describe('0035 review 20 S-3 / PD-110 / AC-037: README and CHANGELOG say what Safe Mode does', () => {
    it('AC-037 the README section, the Privacy bullet and the CHANGELOG carry the own text and the rule', async () => {
        const [readme, changelog] = await Promise.all([read('README.md'), read('CHANGELOG.md')]);
        expect(changelog).toContain('This project is not trusted, so Studio does not start claude. The prompt is copied.');
        expect(readme).toContain('This project is not trusted, so Studio does not start <command>. The prompt is copied.');
        expect(readme).toContain('In a project that is not trusted (Safe Mode) no Send starts an agent.');
        expect(readme).toContain('it types only into a running tab');
    });
});

describe('0035 review 20 S-2 / AC-036: README and CHANGELOG say what a missing claude shows', () => {
    it('AC-036 the README section and the CHANGELOG carry the own text', async () => {
        const [readme, changelog] = await Promise.all([read('README.md'), read('CHANGELOG.md')]);
        expect(changelog).toContain('Claude Code did not start. Is the claude command installed? The prompt is copied.');
        expect(readme).toContain('<Name> did not start. Is the <command> command installed? The prompt is copied.');
    });
});

describe('0035 review 20 S-1 / AC-035: README and CHANGELOG say what the main part does', () => {
    it('AC-035 the README section and the CHANGELOG say that the main part follows the Tip', async () => {
        const [readme, changelog] = await Promise.all([read('README.md'), read('CHANGELOG.md')]);
        expect(readme).toContain("The main part follows the step's Tip: where the Tip says to use a new chat (Verify and Write plan, for example) it opens a new tab, otherwise it uses the running tab if there is one;");
        expect(changelog).toContain("The main part of Send to Claude Code follows the Tip's session");
    });
});

describe('0035 review 20 S-7 / AC-040: prepared only, K-1 pending', () => {
    it('AC-040 the spec and the plan name the open point K-1 pending and AC-040', async () => {
        const [spec, plan] = await Promise.all([read('.specs/active/0035-send-and-copy-for-each-assistant-in-jetbrains.md'), read('.specs/active/0035-send-and-copy-for-each-assistant-in-jetbrains.plan.md')]);
        for (const text of [spec, plan]) {
            expect(text).toContain('K-1 pending');
            expect(text).toContain('AC-040');
            expect(text).toContain('isDisabled');
        }
        expect(spec).toContain('**Open: K-1 pending**');
    });

    it('AC-040 the platform glue asks through the strategy, today isLoaded, and the probe records both values', async () => {
        const main = 'jetbrains/src/main/kotlin/com/gregorbiswanger/featherspec/studio/';
        const [plugins, availability, probe] = await Promise.all([read(`${main}ports/IdePlugins.kt`), read(`${main}ports/PluginAvailability.kt`), read(`${main}probe/HandoverProbe.kt`)]);
        expect(plugins).toContain('PluginActivity.available(PluginManagerCore.isPluginInstalled(pluginId), PluginActivity.CURRENT');
        expect(availability).toContain('val CURRENT: ActivityCheck = ActivityCheck.LOADED');
        expect(probe).toContain('"PluginManagerCore.isLoaded"');
        expect(probe).toContain('"PluginManagerCore.isDisabled"');
    });
});

describe('0035 work list 3.6 / AC-041: the tab shows a loading state at once', () => {
    const main = 'jetbrains/src/main/kotlin/com/gregorbiswanger/featherspec/studio/';

    it('AC-041 the spec names the criterion, the addendum and 0034 AC-007', async () => {
        const spec = await read('.specs/active/0035-send-and-copy-for-each-assistant-in-jetbrains.md');
        expect(spec).toContain('- **AC-041**');
        expect(spec).toContain('Addendum 2026-11-23 (work list 3.6');
        expect(spec).toMatch(/AC-041\*\* [\s\S]*?within 1 s[\s\S]*?0034 AC-007/);
    });

    it('AC-041 the editor starts the browser in a later EDT turn and the smoke probe finds the placeholder', async () => {
        const [editor, probe] = await Promise.all([read(`${main}panel/StudioEditor.kt`), read(`${main}probe/SmokeProbe.kt`)]);
        expect(editor).toContain('DeferredStart { ApplicationManager.getApplication().invokeLater(it) }');
        expect(editor).toContain('browserStart.request { startBrowser(covered) }');
        expect(editor).not.toContain('JBLoadingPanel');
        expect(probe).toContain('component is LoadingPlaceholder');
        expect(probe).not.toContain('JBLoadingPanel');
    });

    it('AC-041 the placeholder text is the loading text and its accessible name', async () => {
        const placeholder = await read(`${main}panel/LoadingPlaceholder.kt`);
        expect(placeholder).toContain('LoadingPlaceholderText.accessibleName');
        expect(placeholder).toContain('UIUtil.getPanelBackground()');
    });
});

describe('0035 AC-042: the reopened Studio tab takes the parked panel browser', () => {
    const main = 'jetbrains/src/main/kotlin/com/gregorbiswanger/featherspec/studio/';

    it('AC-042 the spec names the criterion, the budget and the addendum', async () => {
        const spec = await read('.specs/active/0035-send-and-copy-for-each-assistant-in-jetbrains.md');
        expect(spec).toContain('- **AC-042**');
        expect(spec).toMatch(/AC-042\*\* [\s\S]*?within 1,000 ms[\s\S]*?without loading the panel page again/);
        expect(spec).toContain('Addendum 2026-11-23 (reopen of the Studio tab');
    });

    it('AC-042 the editor parks and takes through the service, the service closes the parking, and nothing disposes a parked browser', async () => {
        const [editor, service, panelBrowser] = await Promise.all([read(`${main}panel/StudioEditor.kt`), read(`${main}StudioProjectService.kt`), read(`${main}panel/PanelBrowser.kt`)]);
        expect(editor).toContain('service.panelParking.take()');
        expect(editor).toContain('service.panelParking.park(');
        expect(editor).toContain('ParkRule.parkable(');
        expect(editor).toContain('PanelMessages.openedPayload(');
        expect(service).toContain('val panelParking = PanelParking<PanelBrowser>');
        expect(service).toContain('panelParking.close()');
        expect(panelBrowser).toContain('Disposer.register(service, this)');
    });

    it('AC-042 the budgets of the smoke probe are unchanged', async () => {
        const report = await read(`${main}probe/SmokeReport.kt`);
        expect(report).toContain('AC-007 frame after reopening (best of');
        expect(report).toContain('SmokeBudgets.FRAME_MS');
    });
});

describe('0035 README polish: "on its own" everywhere the Studio is meant, and Send as a short list', () => {
    const AGENT_BULLET = '- `junie` for Junie, `claude` for Claude Code, `' + 'copilot' + '` for GitHub Copilot';

    it('every README sentence that says Studio starts no agent says "on its own", the Plan map and next step ones included', async () => {
        const readme = await read('README.md');
        expect(readme).toContain('Studio only shows and copies: it starts no agent on its own and writes no file.');
        expect(readme).toContain('Studio starts no agent on its own and changes no file;');
        expect(readme.match(/starts no agent(?! on its own)/g)).toBeNull();
    });

    it('negative control, the pattern finds a sentence without it', () => {
        expect('it starts no agent and writes no file'.match(/starts no agent(?! on its own)/g)).not.toBeNull();
    });

    it('the agent bullet is a short list with one fact per item', async () => {
        const lines = (await read('README.md')).split('\n');
        const start = lines.findIndex((line) => line.startsWith(AGENT_BULLET));
        expect(start).toBeGreaterThan(0);
        const items: string[] = [];
        for (let index = start + 1; index < lines.length && lines[index].startsWith('  - '); index++) {
            items.push(lines[index]);
        }
        expect(items).toHaveLength(6);
        const wanted = [
            "The main part follows the step's Tip",
            'It never presses Enter',
            'waits for you to trust the folder or to log in',
            '`Starting <Name>…`',
            '<Name> did not start. Is the <command> command installed? The prompt is copied.',
            'This project is not trusted, so Studio does not start <command>. The prompt is copied.',
        ];
        wanted.forEach((text, index) => expect(items[index], text).toContain(text));
        expect(lines[start].length).toBeLessThan(260);
        for (const item of items) {
            expect(item.length, item.slice(0, 40)).toBeLessThan(560);
        }
    });

    it('the list keeps the claims of the paragraph and adds none', async () => {
        const section = (await read('README.md')).split('## JetBrains IDEs')[1];
        for (const text of [
            'one ` @path` per attached file',
            'into a running tab of that agent in the IDE terminal',
            'a new tab in the project root after it has started the command, with no flag',
            'Send to the current chat** and **Send to a new chat**',
            'within 15 seconds',
            'not found on the PATH of the IDE',
            'it types only into a running tab',
        ]) {
            expect(section, text).toContain(text);
        }
    });
});
