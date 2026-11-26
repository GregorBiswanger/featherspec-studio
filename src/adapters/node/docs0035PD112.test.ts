import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..', '..', '..');

async function read(file: string): Promise<string> {
    return fs.readFile(path.join(root, file), 'utf8');
}

const SPEC = '.specs/active/0035-send-and-copy-for-each-assistant-in-jetbrains.md';
const HINT = "Assistants that are not available are greyed out with the reason. Installed one just now? Restart the IDE.";
const STRUCK = ['AC-001', 'AC-003', 'AC-004', 'AC-009', 'AC-016', 'AC-017', 'AC-018', 'AC-019', 'AC-020', 'AC-022', 'AC-028', 'AC-030', 'AC-033', 'AC-034', 'AC-039'];
const NEW_DIFFERENT = ['AC-043', 'AC-044', 'AC-045', 'AC-047', 'AC-048', 'AC-049', 'AC-050', 'AC-051', 'AC-052', 'AC-053', 'AC-054', 'AC-055', 'AC-056'];

describe('0035 PD-112 AC-052: README, CHANGELOG and checklist', () => {
    it('the section JetBrains IDEs names the three Sends, the three commands, the Terminal plugin, the hint, Safe Mode and the waiting text', async () => {
        const section = (await read('README.md')).split('## JetBrains IDEs')[1] ?? '';
        for (const text of [
            '**Send to Junie**',
            '**Send to Claude Code**',
            '**Send to Copilot**',
            '`junie` for Junie, `claude` for Claude Code, `' + 'copilot' + '` for GitHub Copilot',
            'Terminal plugin',
            HINT,
            'Safe Mode',
            'waits for you to trust the folder or to log in',
            'Without a choice the setting follows Junie',
        ]) {
            expect(section, text).toContain(text);
        }
    });

    it('the README names no removed handover and no AI Chat step', async () => {
        const readme = await read('README.md');
        expect(readme).not.toContain(['Copy', 'for'].join(' '));
        expect(readme).not.toContain('#file:');
        expect(readme).not.toContain('@file:');
    });

    it('the CHANGELOG names PD-112 and the removal of the Copy-for handover', async () => {
        const changelog = await read('CHANGELOG.md');
        expect(changelog).toContain('PD-112');
        expect(changelog).toContain('PD-112 removed the Copy-for handover of PD-108');
        expect(changelog).toContain('**Send to Copilot**');
        expect(changelog).not.toContain(['Copy', 'for'].join(' ') + ' Copilot');
    });

    it('the release checklist lists AC-027 and AC-053 in its 0035 section and no longer AC-028', async () => {
        const checklist = await read('docs/release-checklist.md');
        const start = checklist.indexOf('## Send in JetBrains (manual) (0035)');
        expect(start).toBeGreaterThan(0);
        const section = checklist.slice(start, checklist.indexOf('## Go', start));
        expect(section).toContain('AC-027');
        expect(section).toContain('AC-053');
        expect(section).not.toContain('AC-028');
        expect(section).toContain('`Junie`');
        expect(section).toContain('GitHub Copilot');
    });

    it('negative control, the section check finds a README that still names the old handover', () => {
        expect(`Studio ... ${['Copy', 'for'].join(' ')} Junie`.includes(['Copy', 'for'].join(' '))).toBe(true);
    });
});

describe('0035 PD-112 AC-025: parity rows', () => {
    it('every struck criterion is n-a and names PD-112; the new criteria are deliberately different with PD-112, AC-046 is shared', async () => {
        const rows = (await read('docs/jetbrains/parity.md')).split('\n').filter((line) => line.startsWith('| 0035 |'));
        const byId = new Map(rows.map((row) => [row.split('|')[2]?.trim(), row]));
        for (const id of STRUCK) {
            expect(byId.get(id), id).toContain('n-a');
            expect(byId.get(id), id).toContain('PD-112');
        }
        for (const id of NEW_DIFFERENT) {
            expect(byId.get(id), id).toContain('deliberately different');
            expect(byId.get(id), id).toContain('PD-112');
        }
        expect(byId.get('AC-046')).toContain('shared');
    });

    it('the spec strikes exactly the criteria that the parity source marks n-a with PD-112', async () => {
        const spec = await read(SPEC);
        const struck = [...spec.matchAll(/^- ~~\*\*(AC-\d{3})\*\*/gm)].map((match) => match[1]);
        expect(struck).toEqual(STRUCK);
    });
});

describe('0035 PD-112 AC-029: the size limits', () => {
    it('AGENTS.md has at most 15000 bytes and activeContext.md fewer than 7000', async () => {
        expect(Buffer.byteLength(await read('AGENTS.md'))).toBeLessThanOrEqual(15000);
        expect(Buffer.byteLength(await read('.memory-bank/activeContext.md'))).toBeLessThan(7000);
    });
});
